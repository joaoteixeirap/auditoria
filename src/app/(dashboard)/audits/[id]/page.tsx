import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceLayout } from "@/components/shared/resource-layout";
import { Badge } from "@/components/ui/badge";
import { pageWorkspace } from "@/server/services/workspace";
import { auditDetails } from "@/server/repositories/audits";
import { uuidSchema } from "@/lib/validations/entities";
import { summarizeResults } from "@/features/audits/metrics";
import { AuditSummary } from "@/features/audits/summary";
import { AuditRunner } from "@/features/audits/audit-runner";
import { verdictLabels, severityLabels, categoryLabels } from "@/features/audits/labels";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageWorkspace(),
    { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const details = await auditDetails(context.db, context.organization.id, id);
  if (!details) notFound();
  const summary = summarizeResults(details.executions, details.run.status);
  return (
    <ResourceLayout
      context={context}
      active="/audits"
      title={details.conditions.agent.name}
      description={`${details.conditions.client.name} · Versão ${details.conditions.version.label}`}
      action={{ href: `/audits/new?retest=${id}`, label: "Retestar outra versão" }}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge variant="outline">Demonstração · Dados fictícios</Badge>
        <Badge variant="outline">
          Bot{" "}
          {details.conditions.connector.revision === 1 ? "com falhas intencionais" : "corrigido"}
        </Badge>
        <Badge variant="outline">
          Critérios preservados · Catálogo v{details.criteria.catalogVersion}
        </Badge>
      </div>
      <AuditRunner
        auditId={id}
        canRun={context.membership.role === "owner"}
        initial={{
          status: details.run.status,
          total: details.run.total_tests,
          processed: details.run.processed_count,
          summary,
        }}
      />
      <AuditSummary summary={summary} />
      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Resultados e evidências</h2>
        {details.run.status === "completed" && (
          <Link
            href={`/audits/compare?before=${id}`}
            className="text-sm font-medium text-primary underline"
          >
            Comparar versões
          </Link>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Resultados persistidos dos cenários selecionados</caption>
          <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
            <tr>
              {["Cenário", "Gravidade", "Resultado", "Investigação"].map((label) => (
                <th scope="col" key={label} className="px-5 py-4 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.criteria.cases.map((test) => {
              const execution = details.executions.find((item) => item.test_case_id === test.id),
                finding = execution
                  ? details.findings.find((item) => item.test_execution_id === execution.id)
                  : undefined;
              return (
                <tr key={test.id} className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{test.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {categoryLabels[test.category]}
                    </p>
                  </td>
                  <td className="px-5 py-4">{severityLabels[test.severity]}</td>
                  <td className="px-5 py-4">
                    <Badge
                      variant="outline"
                      className={
                        execution?.verdict === "FAIL"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : execution?.verdict === "PASS"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : ""
                      }
                    >
                      {execution ? verdictLabels[execution.verdict] : "Não executado"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {finding ? (
                      <Link
                        href={`/audits/${id}/findings/${finding.id}`}
                        className="font-medium text-primary underline"
                      >
                        Investigar falha
                      </Link>
                    ) : execution ? (
                      <a href={`#test-${test.id}`} className="text-primary underline">
                        Ver evidência
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-6 space-y-3">
        {details.criteria.cases.map((test) => {
          const execution = details.executions.find((item) => item.test_case_id === test.id);
          if (!execution) return null;
          return (
            <details
              id={`test-${test.id}`}
              key={test.id}
              className="rounded-xl border bg-white p-5"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {test.name} · {verdictLabels[execution.verdict]}
              </summary>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  ["Pergunta enviada", test.question],
                  ["Resposta recebida", execution.response || "Sem resposta: erro técnico."],
                  ["Comportamento esperado", test.expectedBehavior],
                  ["Regra de referência", test.policy.description],
                  ["Motivo", execution.reason],
                  ["Trecho de evidência", execution.evidence || "Sem trecho conclusivo."],
                  ["Recomendação", execution.recommendation],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words leading-6">{value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="font-medium text-muted-foreground">Latência medida do conector</dt>
                  <dd className="mt-1">{execution.latency_ms} ms</dd>
                </div>
              </dl>
            </details>
          );
        })}
      </div>
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Avaliador {details.criteria.evaluator.name} v{details.criteria.evaluator.version}. As regras
        são determinísticas e restritas aos formatos explícitos deste catálogo. Ausência de
        evidência gera INCONCLUSIVE; erros de conexão geram ERROR. A elegibilidade apoia decisão
        humana e não é certificação.
      </p>
    </ResourceLayout>
  );
}
