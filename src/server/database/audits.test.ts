import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { DemoConnector } from "@/server/connectors/demo";
import { executeTest, type ExecutedTest } from "@/server/services/audit-engine";
import { criteriaSchema } from "@/features/audits/schemas";
import { summarizeResults } from "@/features/audits/metrics";
import { compareResults } from "@/features/audits/comparison";

const ownerA = "11111111-1111-4111-8111-111111111111",
  ownerB = "22222222-2222-4222-8222-222222222222",
  member = "33333333-3333-4333-8333-333333333333";
let db: PGlite, orgA: string, orgB: string, agent: string, version1: string, version2: string;
const case1 = "a1000000-0000-4000-8000-000000000001",
  case3 = "a1000000-0000-4000-8000-000000000003";
async function user<T>(id: string, callback: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await callback();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
}
async function createRun(ids: string[], version = version1, key = crypto.randomUUID()) {
  return (
    await db.query<{ id: string }>("select public.create_demo_audit($1,$2,$3,$4,$5,true) as id", [
      orgA,
      agent,
      version,
      ids,
      key,
    ])
  ).rows[0]!.id;
}
async function append(run: string, id: string, result: ExecutedTest) {
  return db.query("select public.append_demo_execution($1,$2,$3,$4,$5,$6,$7,$8)", [
    run,
    id,
    result.verdict,
    result.response,
    result.reason,
    result.evidence,
    result.recommendation,
    result.latencyMs,
  ]);
}
const fail = {
  verdict: "FAIL" as const,
  response: "Resposta 20%",
  reason: "Acima do limite",
  evidence: "20%",
  recommendation: "Corrigir o limite",
  latencyMs: 1,
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const filename of ["202610070001_phase1.sql", "202610070002_phase2.sql"])
    await db.exec(
      await readFile(new URL(`../../../supabase/migrations/${filename}`, import.meta.url), "utf8"),
    );
  for (const id of [ownerA, ownerB, member])
    await db.query("insert into auth.users(id) values($1)", [id]);
  orgA = await user(
    ownerA,
    async () =>
      (await db.query<{ id: string }>("select public.create_organization('Agência A') as id"))
        .rows[0]!.id,
  );
  orgB = await user(
    ownerB,
    async () =>
      (await db.query<{ id: string }>("select public.create_organization('Agência B') as id"))
        .rows[0]!.id,
  );
  await db.query(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [orgA, member],
  );
  await user(ownerA, async () => {
    const client = (
      await db.query<{ id: string }>(
        "insert into public.clients(organization_id,name) values($1,'Empresa Exemplo') returning id",
        [orgA],
      )
    ).rows[0]!.id;
    agent = (
      await db.query<{ id: string }>(
        "select public.create_agent($1,$2,'Assistente','','sales','demo','v1') as id",
        [orgA, client],
      )
    ).rows[0]!.id;
    version1 = (
      await db.query<{ id: string }>("select id from public.agent_versions where agent_id=$1", [
        agent,
      ])
    ).rows[0]!.id;
    version2 = (
      await db.query<{ id: string }>(
        "insert into public.agent_versions(organization_id,agent_id,label,notes,demo_revision) values($1,$2,'v2','Correção',2) returning id",
        [orgA, agent],
      )
    ).rows[0]!.id;
  });
}, 30_000);
afterAll(async () => {
  if (db) await db.close();
});
afterEach(async () => {
  await db.exec(
    "update public.audit_runs set status='cancelled',completed_at=now() where status in ('pending','running')",
  );
});

describe("auditorias persistidas e RLS no PostgreSQL", () => {
  it("criação e append são idempotentes e os achados não se duplicam", async () => {
    await user(ownerA, async () => {
      const key = crypto.randomUUID(),
        run = await createRun([case1], version1, key);
      expect(await createRun([case1], version1, key)).toBe(run);
      await append(run, case1, fail);
      await append(run, case1, fail);
      const saved = (
        await db.query<{ status: string; processed_count: number }>(
          "select status,processed_count from public.audit_runs where id=$1",
          [run],
        )
      ).rows[0];
      expect(saved).toEqual({ status: "completed", processed_count: 1 });
      expect(
        (await db.query("select id from public.test_executions where audit_run_id=$1", [run])).rows,
      ).toHaveLength(1);
      expect(
        (await db.query("select id from public.findings where audit_run_id=$1", [run])).rows,
      ).toHaveLength(1);
      expect(
        (
          await db.query<{ units: number }>(
            "select units from public.usage_records where audit_run_id=$1",
            [run],
          )
        ).rows[0]!.units,
      ).toBe(1);
    });
  });
  it("IDs de outra organização não revelam auditorias nem permitem operações", async () => {
    const run = await user(ownerA, () => createRun([case1]));
    await user(ownerB, async () => {
      expect((await db.query("select id from public.audit_runs where id=$1", [run])).rows).toEqual(
        [],
      );
      await expect(append(run, case1, fail)).rejects.toThrow();
      await expect(db.query("select public.cancel_demo_audit($1)", [run])).rejects.toThrow();
      await expect(
        db.query("select public.create_demo_audit($1,$2,$3,$4,$5,true)", [
          orgB,
          agent,
          version1,
          [case1],
          crypto.randomUUID(),
        ]),
      ).rejects.toThrow();
    });
  });
  it("member lê resultados, mas não pode criar, executar ou cancelar", async () => {
    const run = await user(ownerA, () => createRun([case1]));
    await user(member, async () => {
      expect(
        (await db.query("select id from public.audit_runs where id=$1", [run])).rows,
      ).toHaveLength(1);
      await expect(createRun([case1])).rejects.toThrow();
      await expect(append(run, case1, fail)).rejects.toThrow();
      await expect(db.query("select public.cancel_demo_audit($1)", [run])).rejects.toThrow();
    });
  });
  it("não permite alterar snapshots, estados ou evidências diretamente", async () => {
    await user(ownerA, async () => {
      const run = await createRun([case1]);
      await append(run, case1, fail);
      await expect(
        db.query("update public.audit_runs set criteria_snapshot='{}' where id=$1", [run]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.test_executions set verdict='PASS' where audit_run_id=$1", [run]),
      ).rejects.toThrow();
      await expect(
        db.query("delete from public.findings where audit_run_id=$1", [run]),
      ).rejects.toThrow();
      await expect(
        db.query("update public.agent_versions set demo_revision=2 where id=$1", [version1]),
      ).rejects.toThrow();
    });
  });
  it("evidência inexistente é rejeitada e a transação não avança o progresso", async () => {
    await user(ownerA, async () => {
      const run = await createRun([case1]);
      await expect(append(run, case1, { ...fail, evidence: "trecho inventado" })).rejects.toThrow();
      expect(
        (
          await db.query<{ processed_count: number }>(
            "select processed_count from public.audit_runs where id=$1",
            [run],
          )
        ).rows[0]!.processed_count,
      ).toBe(0);
      expect(
        (await db.query("select id from public.test_executions where audit_run_id=$1", [run])).rows,
      ).toEqual([]);
      await expect(append(run, case3, fail)).rejects.toThrow();
    });
  });
  it("cancelamento preserva resultados e impede novos testes", async () => {
    await user(ownerA, async () => {
      const run = await createRun([case1, case3]);
      await append(run, case1, fail);
      await db.query("select public.cancel_demo_audit($1)", [run]);
      await append(run, case3, fail);
      expect(
        (
          await db.query<{ status: string; processed_count: number }>(
            "select status,processed_count from public.audit_runs where id=$1",
            [run],
          )
        ).rows[0],
      ).toEqual({ status: "cancelled", processed_count: 1 });
    });
  });
  it("impede execução concorrente por organização e chave reutilizada com novos critérios", async () => {
    await user(ownerA, async () => {
      const key = crypto.randomUUID();
      await createRun([case1], version1, key);
      await expect(createRun([case3])).rejects.toThrow();
      await expect(createRun([case3], version1, key)).rejects.toThrow();
    });
  });
  it("erro técnico é persistido como ERROR sem gerar achado comportamental", async () => {
    await user(ownerA, async () => {
      const run = await createRun([case1]);
      await append(run, case1, {
        verdict: "ERROR",
        response: "",
        reason: "Conector indisponível",
        evidence: "",
        recommendation: "Tentar novamente",
        latencyMs: 0,
      });
      expect(
        (await db.query("select id from public.findings where audit_run_id=$1", [run])).rows,
      ).toEqual([]);
      expect(
        (
          await db.query<{ status: string }>("select status from public.audit_runs where id=$1", [
            run,
          ])
        ).rows[0]!.status,
      ).toBe("completed");
    });
  });
  it("bot v1 → evidências → bot v2: dez testes persistidos e sete correções", async () => {
    await user(ownerA, async () => {
      const ids = (
        await db.query<{ id: string }>("select id from public.test_cases order by key")
      ).rows.map((item) => item.id);
      const history = [];
      for (const [version, revision] of [
        [version1, 1],
        [version2, 2],
      ] as const) {
        const run = await createRun(ids, version);
        const criteria = criteriaSchema.parse(
          (
            await db.query<{ criteria_snapshot: unknown }>(
              "select criteria_snapshot from public.audit_runs where id=$1",
              [run],
            )
          ).rows[0]!.criteria_snapshot,
        );
        const results = [];
        for (const [index, test] of criteria.cases.entries()) {
          const result = await executeTest(new DemoConnector(revision), test, `${run}:${test.id}`);
          await append(run, test.id, result);
          const saved = (
            await db.query<{ processed_count: number; status: string }>(
              "select processed_count,status from public.audit_runs where id=$1",
              [run],
            )
          ).rows[0]!;
          expect(saved.processed_count).toBe(index + 1);
          expect(saved.status).toBe(index === 9 ? "completed" : "running");
          results.push({ test, verdict: result.verdict, severity: test.severity });
        }
        history.push(results);
        expect(
          (await db.query("select id from public.test_executions where audit_run_id=$1", [run]))
            .rows,
        ).toHaveLength(10);
      }
      const before = summarizeResults(history[0]!, "completed"),
        after = summarizeResults(history[1]!, "completed");
      expect(before.counts).toEqual({ PASS: 3, FAIL: 7, INCONCLUSIVE: 0, ERROR: 0 });
      expect(before.approvalRate).toBe(30);
      expect(before.release).toBe("BLOCKED");
      expect(after.counts.PASS).toBe(10);
      expect(after.approvalRate).toBe(100);
      expect(after.release).toBe("ELIGIBLE");
      expect(
        compareResults(history[0]!, history[1]!).filter((item) => item.classification === "fixed"),
      ).toHaveLength(7);
    });
  });
  it("anomalia fatal preserva resultados e impede continuar execução", async () => {
    await user(ownerA, async () => {
      const run = await createRun([case1]);
      await db.query("select public.fail_demo_audit($1,'SNAPSHOT_INVALID')", [run]);
      await append(run, case1, fail);
      expect(
        (
          await db.query<{ status: string; processed_count: number }>(
            "select status,processed_count from public.audit_runs where id=$1",
            [run],
          )
        ).rows[0],
      ).toEqual({ status: "failed", processed_count: 0 });
    });
  });
});
