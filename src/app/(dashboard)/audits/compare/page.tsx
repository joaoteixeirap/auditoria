import { notFound } from "next/navigation";
import { ResourceLayout, EmptyState } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { auditDetails, auditOptions } from "@/server/repositories/audits";
import { uuidSchema } from "@/lib/validations/entities";
import { compareResults } from "@/features/audits/comparison";
import { comparisonLabels, verdictLabels } from "@/features/audits/labels";
import { summarizeResults } from "@/features/audits/metrics";
import Link from "next/link";

export const metadata = { title: "Comparação de versões" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; after?: string }>;
}) {
  const context = await pageWorkspace(),
    params = await searchParams;
  const shell = {
    context,
    active: "/audits",
    title: "Compare versões",
    description: "Compare os cenários preservados de duas auditorias do mesmo chatbot.",
  };
  if (!params.before)
    return (
      <ResourceLayout {...shell}>
        <EmptyState
          title="Selecione a auditoria de referência"
          description="Abra uma auditoria concluída e clique em Comparar versões para escolher o antes e o depois."
        />
      </ResourceLayout>
    );
  if (!uuidSchema.safeParse(params.before).success) notFound();
  const before = await auditDetails(context.db, context.organization.id, params.before);
  if (!before || before.run.status !== "completed") notFound();
  const options = await auditOptions(context.db, context.organization.id, before.run.agent_id);
  const after =
    params.after && uuidSchema.safeParse(params.after).success
      ? await auditDetails(context.db, context.organization.id, params.after)
      : null;
  if (
    params.after &&
    (!after ||
      after.run.agent_id !== before.run.agent_id ||
      after.run.status !== "completed" ||
      after.run.id === before.run.id)
  )
    notFound();
  const comparable = after && before.run.criteria_fingerprint === after.run.criteria_fingerprint;
  const beforeResults = before.executions.map((execution) => ({
    test: before.criteria.cases.find((test) => test.id === execution.test_case_id)!,
    verdict: execution.verdict,
  }));
  const afterResults =
    after?.executions.map((execution) => ({
      test: after.criteria.cases.find((test) => test.id === execution.test_case_id)!,
      verdict: execution.verdict,
    })) ?? [];
  const rows = after ? compareResults(beforeResults, afterResults) : [];
  const totals = after
    ? {
        fixed: rows.filter((row) => row.classification === "fixed").length,
        persistent: rows.filter((row) => row.classification === "persistent").length,
        regressions: rows.filter((row) => row.classification === "regression").length,
        newFailures: rows.filter((row) => row.classification === "new_failure").length,
      }
    : null;
  return (
    <ResourceLayout {...shell}>
      <form
        action="/audits/compare"
        className="mb-7 grid grid-cols-1 items-end gap-4 rounded-xl border bg-white p-5 md:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="before" className="mb-2 block text-sm font-medium">
            Antes · Referência
          </label>
          <select
            id="before"
            name="before"
            defaultValue={before.run.id}
            className="w-full min-w-0 rounded-lg border p-3 text-sm"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ·{" "}
                {new Date(option.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="after" className="mb-2 block text-sm font-medium">
            Depois · Candidata
          </label>
          <select
            id="after"
            name="after"
            defaultValue={after?.run.id ?? ""}
            required
            className="w-full min-w-0 rounded-lg border p-3 text-sm"
          >
            <option value="">Selecione uma execução</option>
            {options
              .filter((option) => option.id !== before.run.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ·{" "}
                  {new Date(option.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </option>
              ))}
          </select>
        </div>
        <button
          className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
          type="submit"
        >
          Comparar
        </button>
      </form>
      {!after ? (
        <EmptyState
          title="Escolha a auditoria candidata"
          description="Execute a mesma bateria na versão corrigida e selecione a nova auditoria acima."
        />
      ) : (
        <>
          <div
            className={`mb-6 rounded-xl border p-5 text-sm leading-6 ${comparable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
          >
            {comparable
              ? "Critérios compatíveis: cenários, regras e configuração do avaliador são os mesmos nas duas execuções."
              : "Os cenários ou critérios mudaram. Os percentuais não são diretamente comparáveis; somente cenários com critérios idênticos são classificados como correção ou regressão."}
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Antes", details: before },
              { label: "Depois", details: after },
            ].map(({ label, details }) => {
              const metrics = summarizeResults(details.executions, details.run.status);
              return (
                <div key={label} className="rounded-xl border bg-white p-5">
                  <p className="text-xs text-muted-foreground">
                    {label} · {details.conditions.version.label} · Demonstração
                  </p>
                  <p className="mt-3 text-3xl font-semibold">
                    {metrics.approvalRate === null ? "Não calculável" : `${metrics.approvalRate}%`}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {metrics.counts.PASS} aprovados · {metrics.counts.FAIL} falhas ·{" "}
                    {metrics.counts.INCONCLUSIVE} inconclusivos · {metrics.counts.ERROR} erros
                  </p>
                  <Link
                    href={`/audits/${details.run.id}`}
                    className="mt-3 inline-block text-sm text-primary underline"
                  >
                    Abrir evidências
                  </Link>
                </div>
              );
            })}
          </div>
          {totals && (
            <p className="mb-5 text-sm leading-6">
              {totals.fixed} falha(s) corrigida(s) · {totals.persistent} persistente(s) ·{" "}
              {totals.regressions} regressão(ões) · {totals.newFailures} nova(s) falha(s)
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Comparação por cenário e critérios preservados</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  {["Cenário", "Antes", "Depois", "Mudança"].map((label) => (
                    <th
                      scope="col"
                      key={label}
                      className="px-5 py-4 text-xs font-medium text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="px-5 py-4 font-medium">{row.test.name}</td>
                    <td className="px-5 py-4">
                      {row.before ? verdictLabels[row.before] : "Não testado"}
                    </td>
                    <td className="px-5 py-4">
                      {row.after ? verdictLabels[row.after] : "Não retestado"}
                    </td>
                    <td
                      className={`px-5 py-4 ${row.classification === "fixed" ? "text-emerald-800" : row.classification === "regression" ? "font-semibold text-red-800" : ""}`}
                    >
                      {comparisonLabels[row.classification]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Taxa: PASS ÷ (PASS + FAIL) × 100. As métricas incluem apenas as condições e os cenários
            efetivamente testados. Nenhum resultado anterior foi sobrescrito.
          </p>
        </>
      )}
    </ResourceLayout>
  );
}
