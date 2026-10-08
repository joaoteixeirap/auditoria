import Link from "next/link";
import { ResourceLayout } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { policies, documents } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
import { PolicyForm, DocumentUpload, SuggestionForm } from "@/features/policies/forms";
import { caseSchema } from "@/features/audits/schemas";
export const maxDuration = 120;
export default async function PoliciesPage() {
  const context = await pageWorkspace();
  let data: Awaited<ReturnType<typeof policies>> = [],
    files: Awaited<ReturnType<typeof documents>> = [],
    ready = true;
  try {
    [data, files] = await Promise.all([
      policies(context.db, context.organization.id),
      documents(context.db, context.organization.id),
    ]);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    ready = false;
  }
  const owner = context.membership.role === "owner";
  return (
    <ResourceLayout
      context={context}
      active="/policies"
      title="Políticas e documentos"
      description="Referências privadas, regras versionadas e aprovação humana."
    >
      {!ready ? (
        <p role="status">
          Funcionalidade aguardando habilitação das migrations de políticas e documentos neste
          ambiente.
        </p>
      ) : (
        <div className="space-y-6">
          {owner && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold">Nova regra manual</h2>
                <PolicyForm />
              </section>
              <section className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold">Documentos privados</h2>
                <DocumentUpload />
              </section>
            </div>
          )}
          <section className="space-y-4">
            <h2 className="font-semibold">Documentos · Até 100 mais recentes</h2>
            {!files.length && <p className="text-sm">Nenhum documento enviado.</p>}
            {files.map((file) => (
              <article key={file.id} className="rounded-xl border bg-white p-5">
                <Link className="text-primary underline" href={`/policies/documents/${file.id}`}>
                  {file.name}
                </Link>
                {owner && <SuggestionForm documentId={file.id} />}
              </article>
            ))}
          </section>
          <section className="space-y-4">
            <h2 className="font-semibold">Versões de regras · Até 100 mais recentes</h2>
            {!data.length && <p className="text-sm">Nenhuma regra personalizada.</p>}
            {data.map((record) => {
              const rule = caseSchema.parse(record.definition);
              return (
                <details key={record.id} className="rounded-xl border bg-white p-5">
                  <summary className="cursor-pointer font-medium">
                    {rule.name} · v{record.version} ·{" "}
                    {record.state === "approved" ? "Aprovada" : "Rascunho"}
                  </summary>
                  <p className="my-4 whitespace-pre-wrap text-sm">{rule.policy.description}</p>
                  {owner && (
                    <PolicyForm
                      initial={{
                        name: rule.name,
                        description: rule.policy.description,
                        question: rule.question,
                        expected: rule.expectedBehavior,
                        recommendation: rule.recommendation,
                        category: rule.category,
                        severity: rule.severity,
                        approved: false,
                        previousKey: record.rule_key,
                        ...(record.document_id ? { documentId: record.document_id } : {}),
                      }}
                    />
                  )}
                </details>
              );
            })}
          </section>
        </div>
      )}
    </ResourceLayout>
  );
}
