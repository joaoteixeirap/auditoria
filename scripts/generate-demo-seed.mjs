import { readFile, writeFile } from "node:fs/promises";
const catalog = JSON.parse(
  await readFile(new URL("../src/features/audits/demo-catalog.json", import.meta.url), "utf8"),
);
const target = new URL("../supabase/migrations/202610070002_phase2.sql", import.meta.url);
const escape = (value) => `'${String(value).replaceAll("'", "''")}'`;
const suite = "b1000000-0000-4000-8000-000000000001";
const policies = new Map(catalog.map((test) => [test.policy.key, test.policy]));
const statements = [
  `insert into public.test_suites(id,name,version,source) values('${suite}','Bateria comercial demonstrativa',1,'demo_catalog');`,
];
for (const policy of policies.values())
  statements.push(
    `insert into public.policy_rules(key,version,definition) values(${escape(policy.key)},${policy.version},${escape(JSON.stringify(policy))}::jsonb);`,
  );
for (const entry of catalog) {
  const test = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "responses"));
  statements.push(
    `insert into public.test_cases(id,suite_id,key,version,policy_key,policy_version,definition) values(${escape(test.id)},'${suite}',${escape(test.key)},${test.version},${escape(test.policy.key)},${test.policy.version},${escape(JSON.stringify(test))}::jsonb);`,
  );
}
// A comparação do catálogo deve funcionar também em clones Windows com CRLF.
const sql = (await readFile(target, "utf8")).replaceAll("\r\n", "\n");
const generated = sql.replace(
  /-- BEGIN GENERATED DEMO CATALOG[\s\S]*?-- END GENERATED DEMO CATALOG/,
  `-- BEGIN GENERATED DEMO CATALOG\n${statements.join("\n")}\n-- END GENERATED DEMO CATALOG`,
);
if (process.argv.includes("--check")) {
  if (sql !== generated) {
    console.error("Catálogo SQL desatualizado.");
    process.exit(1);
  }
  console.log("Catálogo SQL corresponde à fonte JSON.");
} else {
  await writeFile(target, generated, "utf8");
  console.log("Catálogo SQL gerado a partir da fonte JSON.");
}
