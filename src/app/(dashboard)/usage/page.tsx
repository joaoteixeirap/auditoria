import { ResourceLayout } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { usage } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
import { ResultChart } from "@/features/audits/result-chart";
export default async function UsagePage() {
  const context = await pageWorkspace();
  let records: Awaited<ReturnType<typeof usage>> = [],
    ready = true;
  try {
    records = await usage(context.db, context.organization.id);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    ready = false;
  }
  const input = records.reduce((sum, row) => sum + row.input_tokens, 0),
    output = records.reduce((sum, row) => sum + row.output_tokens, 0);
  return (
    <ResourceLayout
      context={context}
      active="/usage"
      title="Uso e resultados"
      description="Medição por organização, sem registrar documentos ou respostas em logs."
    >
      <ResultChart db={context.db} org={context.organization.id} />
      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Avaliações por IA</h2>
        {!ready ? (
          <p className="mt-3">Medição de uso aguardando habilitação da migration correspondente.</p>
        ) : (
          <>
            <p className="mt-3 text-sm">
              {records.length} avaliações registradas · {input} tokens de entrada · {output} tokens
              de saída.
            </p>
            <p className="mt-2 text-xs">
              Até 1.000 registros mais recentes. Custo estimado somente com preços configurados;
              consulte o consumo e a cobrança do provedor. Falhas antes do retorno do consumo podem
              gerar cobrança sem registro de tokens.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Consumo registrado por avaliação</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Modelo</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row, index) => (
                    <tr key={index}>
                      <td className="py-3">
                        {new Date(row.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </td>
                      <td>{row.model}</td>
                      <td>{row.input_tokens}</td>
                      <td>{row.output_tokens}</td>
                      <td>
                        {row.estimated_cost === null
                          ? "Não calculado"
                          : `US$ ${row.estimated_cost.toFixed(6)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <p className="mt-5 text-sm">
        Limites atuais: uma auditoria ativa por organização, dez cenários por execução e cem
        auditorias mensais. Execução incremental com retomada dos resultados persistidos.
      </p>
    </ResourceLayout>
  );
}
