import Link from "next/link";
import { companyDashboard } from "@/server/repositories/company";
import type { WorkflowDB } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
import { categoryLabels } from "./labels";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export async function CompanyDashboard({ db, org }: { db: WorkflowDB; org: string }) {
  let data: Awaited<ReturnType<typeof companyDashboard>>;
  try {
    data = await companyDashboard(db, org);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    return (
      <p role="status" className="mb-6 rounded-xl border p-4 text-sm">
        Indicadores de auditorias reais aguardam a ativação da migration B2B. A demonstração e seu
        histórico foram preservados.
      </p>
    );
  }
  const counts = data.counts,
    conclusive = counts.pass + counts.fail;
  const rate = conclusive
    ? `${Math.round((counts.pass / conclusive) * 1000) / 10}%`
    : "Não calculável";
  return (
    <section className="mb-8 space-y-5" aria-label="Qualidade dos chatbots da empresa">
      <h2 className="font-semibold">Auditorias reais concluídas</h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Auditorias via API", data.audits],
          ["Testes executados", counts.total],
          ["Taxa de aprovação", rate],
          ["Falhas críticas", counts.critical],
        ].map(([label, value]) => (
          <Card key={label} className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Somente auditorias concluídas de chatbots reais via API. Demonstrações (
        {data.demonstrations}) e transcrições CSV ficam separadas no histórico. Taxa = aprovados /
        (aprovados + falhas); {counts.error} erros técnicos e {counts.inconclusive} inconclusivos
        não entram na taxa.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 font-semibold">Falhas por categoria</h3>
          {Object.keys(data.categories).length ? (
            <dl className="space-y-3">
              {Object.entries(data.categories).map(([category, total]) => (
                <div className="flex justify-between gap-3 text-sm" key={category}>
                  <dt>{categoryLabels[category as keyof typeof categoryLabels] ?? category}</dt>
                  <dd>{total}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm">
              Nenhuma falha comportamental registrada em auditorias reais concluídas.
            </p>
          )}
        </section>
        <section className="overflow-x-auto rounded-xl border bg-white p-5">
          <h3 className="mb-4 font-semibold">Histórico de qualidade por versão</h3>
          {data.history.length ? (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Últimas doze auditorias reais concluídas</caption>
              <thead>
                <tr>
                  <th>Chatbot / versão</th>
                  <th>Aprovação</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      {item.agent} · {item.version}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </span>
                    </td>
                    <td>
                      {item.pass + item.fail
                        ? `${Math.round((item.pass / (item.pass + item.fail)) * 1000) / 10}%`
                        : "Não calculável"}
                    </td>
                    <td>
                      <Link className="text-primary underline" href={`/audits/${item.id}`}>
                        Ver auditoria
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm">
              Execute sua primeira auditoria real para acompanhar os resultados.
            </p>
          )}
          <p className="mt-4 text-xs">
            A evolução só é comparável para o mesmo chatbot e critérios compatíveis. Use a
            comparação de versões para identificar regressões.
          </p>
        </section>
      </div>
    </section>
  );
}
