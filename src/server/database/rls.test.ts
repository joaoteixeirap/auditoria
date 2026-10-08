import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const member = "33333333-3333-4333-8333-333333333333";
const outsider = "44444444-4444-4444-8444-444444444444";
let db: PGlite;
let orgA: string, orgB: string, clientA: string, clientB: string, agentA: string, agentB: string;

async function asUser<T>(userId: string, work: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  try {
    return await work();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Somente Auth é adaptado. Tabelas, funções, constraints e RLS usam a migration real.
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(
    await readFile(
      new URL("../../../supabase/migrations/202610070001_phase1.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const id of [ownerA, ownerB, member, outsider])
    await db.query("insert into auth.users(id) values ($1)", [id]);
  orgA = await asUser(
    ownerA,
    async () =>
      (await db.query<{ id: string }>("select public.create_organization('Agência A') as id"))
        .rows[0]!.id,
  );
  orgB = await asUser(
    ownerB,
    async () =>
      (await db.query<{ id: string }>("select public.create_organization('Agência B') as id"))
        .rows[0]!.id,
  );
  await db.query(
    "insert into public.organization_members(organization_id,user_id,role) values ($1,$2,'member')",
    [orgA, member],
  );
  const createClient = async (org: string, name: string) =>
    (
      await db.query<{ id: string }>(
        "insert into public.clients(organization_id,name) values ($1,$2) returning id",
        [org, name],
      )
    ).rows[0]!.id;
  clientA = await asUser(ownerA, () => createClient(orgA, "Cliente A"));
  clientB = await asUser(ownerB, () => createClient(orgB, "Cliente B"));
  const createAgent = async (org: string, client: string) =>
    (
      await db.query<{ id: string }>(
        "select public.create_agent($1,$2,'Assistente','','sales','demo','v1') as id",
        [org, client],
      )
    ).rows[0]!.id;
  agentA = await asUser(ownerA, () => createAgent(orgA, clientA));
  agentB = await asUser(ownerB, () => createAgent(orgB, clientB));
}, 30_000);
afterAll(async () => {
  if (db) await db.close();
});

describe("RLS e integridade no PostgreSQL", () => {
  it("owner vê apenas sua organização, clientes, agentes, versões e perfil", async () => {
    await asUser(ownerA, async () => {
      expect(
        (await db.query<{ id: string }>("select id from public.organizations")).rows.map(
          (r) => r.id,
        ),
      ).toEqual([orgA]);
      expect(
        (await db.query<{ id: string }>("select id from public.clients")).rows.map((r) => r.id),
      ).toEqual([clientA]);
      expect(
        (await db.query<{ id: string }>("select id from public.agents")).rows.map((r) => r.id),
      ).toEqual([agentA]);
      expect(
        (
          await db.query<{ agent_id: string }>("select agent_id from public.agent_versions")
        ).rows.map((r) => r.agent_id),
      ).toEqual([agentA]);
      expect(
        (await db.query<{ id: string }>("select id from public.profiles")).rows.map((r) => r.id),
      ).toEqual([ownerA]);
    });
  });
  it("IDs manipulados não revelam recursos de outra organização", async () => {
    await asUser(ownerA, async () => {
      expect((await db.query("select * from public.clients where id=$1", [clientB])).rows).toEqual(
        [],
      );
      expect((await db.query("select * from public.agents where id=$1", [agentB])).rows).toEqual(
        [],
      );
      expect(
        (
          await db.query("select * from public.organization_members where organization_id=$1", [
            orgB,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query("update public.clients set name='Invadido' where id=$1 returning id", [
            clientB,
          ])
        ).rows,
      ).toEqual([]);
    });
  });
  it("usuário sem vínculo não acessa nenhuma organização", async () => {
    await asUser(outsider, async () => {
      expect((await db.query("select * from public.organizations")).rows).toEqual([]);
      expect((await db.query("select * from public.clients")).rows).toEqual([]);
      await expect(
        db.query("insert into public.clients(organization_id,name) values($1,'Ataque')", [orgA]),
      ).rejects.toThrow();
    });
  });
  it("member pode ler, mas não editar nem se promover a owner", async () => {
    await asUser(member, async () => {
      expect((await db.query("select * from public.clients")).rows).toHaveLength(1);
      expect(
        (
          await db.query("update public.clients set name='Ataque' where id=$1 returning id", [
            clientA,
          ])
        ).rows,
      ).toEqual([]);
      await expect(
        db.query("insert into public.clients(organization_id,name) values($1,'Ataque')", [orgA]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.organization_members set role='owner' where user_id=$1", [member]),
      ).rejects.toThrow();
      await expect(
        db.query(
          "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'owner')",
          [orgB, member],
        ),
      ).rejects.toThrow();
    });
  });
  it("owner não insere cliente na organização de outro usuário", async () => {
    await asUser(ownerA, () =>
      expect(
        db.query("insert into public.clients(organization_id,name) values($1,'Ataque')", [orgB]),
      ).rejects.toThrow(),
    );
  });
  it("FK composta bloqueia chatbot vinculado a cliente de outro tenant", async () => {
    await asUser(ownerA, async () => {
      await expect(
        db.query("select public.create_agent($1,$2,'Ataque','','sales','demo','v1')", [
          orgA,
          clientB,
        ]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.agents set client_id=$1 where id=$2", [clientB, agentA]),
      ).rejects.toThrow();
    });
  });
  it("colunas de identidade, tenant e timestamps são imutáveis", async () => {
    await asUser(ownerA, async () => {
      await expect(
        db.query("update public.clients set organization_id=$1 where id=$2", [orgB, clientA]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.agents set id=$1 where id=$2", [agentB, agentA]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.organizations set created_by=$1 where id=$2", [ownerB, orgA]),
      ).rejects.toThrow();
    });
  });
  it("versões anteriores não podem ser alteradas ou apagadas", async () => {
    await asUser(ownerA, async () => {
      await expect(
        db.query("update public.agent_versions set label='reescrito' where agent_id=$1", [agentA]),
      ).rejects.toThrow();
      await expect(
        db.query("delete from public.agent_versions where agent_id=$1", [agentA]),
      ).rejects.toThrow();
      await db.query(
        "insert into public.agent_versions(organization_id,agent_id,label) values($1,$2,'v2')",
        [orgA, agentA],
      );
      expect(
        (
          await db.query<{ label: string }>(
            "select label from public.agent_versions where agent_id=$1 order by label",
            [agentA],
          )
        ).rows.map((r) => r.label),
      ).toEqual(["v1", "v2"]);
      await expect(
        db.query(
          "insert into public.agent_versions(organization_id,agent_id,label) values($1,$2,'v2')",
          [orgA, agentA],
        ),
      ).rejects.toThrow();
    });
  });
  it("erro na primeira versão desfaz também o cadastro do agente", async () => {
    await asUser(ownerA, async () => {
      await expect(
        db.query("select public.create_agent($1,$2,'Rollback','','sales','demo','')", [
          orgA,
          clientA,
        ]),
      ).rejects.toThrow();
      expect((await db.query("select id from public.agents where name='Rollback'")).rows).toEqual(
        [],
      );
    });
  });
  it("owner cadastra, edita e arquiva cliente sem destruir vínculos", async () => {
    await asUser(ownerA, async () => {
      const created = (
        await db.query<{ id: string }>(
          "insert into public.clients(organization_id,name) values($1,'Novo cliente') returning id",
          [orgA],
        )
      ).rows[0]!.id;
      const changed = await db.query<{ name: string; status: string }>(
        "update public.clients set name='Nome atualizado',status='archived' where id=$1 returning name,status",
        [created],
      );
      expect(changed.rows).toEqual([{ name: "Nome atualizado", status: "archived" }]);
      await expect(db.query("delete from public.clients where id=$1", [created])).rejects.toThrow();
    });
  });
  it("onboarding exige sessão e cria vínculo owner de modo atômico", async () => {
    await asUser("", () =>
      expect(db.query("select public.create_organization('Anônima')")).rejects.toThrow(),
    );
    await asUser(outsider, async () => {
      await expect(db.query("select public.create_organization('a')")).rejects.toThrow();
      expect((await db.query("select id from public.organizations")).rows).toEqual([]);
      const org = (
        await db.query<{ id: string }>(
          "select public.create_organization('Nova organização') as id",
        )
      ).rows[0]!.id;
      const result = await db.query<{ role: string; user_id: string }>(
        "select role,user_id from public.organization_members where organization_id=$1",
        [org],
      );
      expect(result.rows).toEqual([{ role: "owner", user_id: outsider }]);
    });
  });
  it("anon acessa somente marcador de instalação, sem tabelas privadas", async () => {
    await db.exec("set role anon");
    try {
      expect(
        (await db.query<{ marker: string }>("select public.phase1_health() as marker")).rows[0]!
          .marker,
      ).toBe("phase1-v1");
      await expect(db.query("select * from public.clients")).rejects.toThrow();
      await expect(db.query("select public.create_organization('Ataque')")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("FKs impedem remover organizações e clientes com evidências vinculadas", async () => {
    await expect(db.query("delete from public.clients where id=$1", [clientA])).rejects.toThrow();
    await expect(
      db.query("delete from public.organizations where id=$1", [orgA]),
    ).rejects.toThrow();
  });
});
