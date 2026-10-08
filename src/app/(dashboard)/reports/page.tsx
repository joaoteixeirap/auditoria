import Link from "next/link";
import { ResourceLayout } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { reports } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
export default async function ReportsPage() {
  const context = await pageWorkspace();
  let data: Awaited<ReturnType<typeof reports>> = [];
  let ready = true;
  try {
    data = await reports(context.db, context.organization.id);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    ready = false;
  }
  return (
    <ResourceLayout
      context={context}
      active="/reports"
      title="Relatórios privados"
      description="PDFs com resultados originais, revisões e decisões preservados no momento da geração."
    >
      {!ready ? (
        <p role="status">Relatórios aguardam habilitação das migrations de workflow e Storage.</p>
      ) : !data.length ? (
        <p>Nenhum relatório gerado. Abra uma auditoria finalizada para gerar seu PDF.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((item) => (
            <li className="rounded-xl border bg-white p-5" key={item.id}>
              <p className="text-sm">
                {new Date(item.created_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <Link className="text-primary underline" href={`/reports/${item.id}`}>
                  Baixar PDF privado
                </Link>
                <Link className="text-primary underline" href={`/audits/${item.audit_run_id}`}>
                  Abrir auditoria
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs">
        Até 100 relatórios mais recentes. Links de download expiram em 60 segundos. Relatórios não
        são certificações.
      </p>
    </ResourceLayout>
  );
}
