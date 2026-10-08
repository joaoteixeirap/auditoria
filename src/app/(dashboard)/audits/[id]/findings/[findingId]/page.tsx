import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceLayout } from "@/components/shared/resource-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pageWorkspace } from "@/server/services/workspace";
import { auditDetails, findFinding } from "@/server/repositories/audits";
import { uuidSchema } from "@/lib/validations/entities";
import { severityLabels, categoryLabels } from "@/features/audits/labels";
import { HumanReview } from "@/features/audits/human-review";

export default async function FindingPage({
  params,
}: {
  params: Promise<{ id: string; findingId: string }>;
}) {
  const context = await pageWorkspace(),
    { id, findingId } = await params;
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(findingId).success) notFound();
  const [details, finding] = await Promise.all([
    auditDetails(context.db, context.organization.id, id),
    findFinding(context.db, context.organization.id, findingId),
  ]);
  if (!details || !finding || finding.audit_run_id !== id) notFound();
  const execution = details.executions.find((item) => item.id === finding.test_execution_id),
    test = details.criteria.cases.find((item) => item.id === execution?.test_case_id);
  if (!execution || !test) notFound();
  return (
    <ResourceLayout
      context={context}
      active="/audits"
      title={test.name}
      description={`${details.conditions.agent.name} · Versão ${details.conditions.version.label}`}
      action={{ href: `/audits/new?retest=${id}`, label: "Retestar outra versão" }}
    >
      <HumanReview
        db={context.db}
        org={context.organization.id}
        run={id}
        findings={[findingId]}
        findingId={findingId}
        owner={context.membership.role === "owner"}
        completed={details.run.status === "completed"}
      />
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-red-800">
            Falha automática · {severityLabels[finding.severity]}
          </Badge>
          <Badge variant="outline">{categoryLabels[test.category]}</Badge>
          <Badge variant="outline">Demonstração</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-red-900">{finding.reason}</p>
        {finding.severity === "critical" && (
          <p className="mt-2 text-sm font-semibold text-red-900">
            Esta evidência crítica bloqueia a elegibilidade da execução para liberação.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Conversa executada</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">
              Pergunta enviada
            </h2>
            <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-6">{test.question}</p>
            <h2 className="mt-6 text-xs font-semibold text-muted-foreground uppercase">
              Resposta recebida
            </h2>
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border p-4 text-sm leading-6">
              {execution.response}
            </p>
            <h2 className="mt-6 text-xs font-semibold text-red-800 uppercase">
              Trecho da evidência
            </h2>
            <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-4 border-red-400 bg-red-50 p-4 text-sm leading-6 text-red-950">
              {finding.evidence}
            </blockquote>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Regra e comportamento esperado</CardTitle>
            </CardHeader>
            <CardContent>
              <h2 className="font-medium">
                {test.policy.title} · v{test.policy.version}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {test.policy.description}
              </p>
              <p className="mt-5 text-sm leading-6">{test.expectedBehavior}</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-200 bg-indigo-50/40 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recomendação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6">{finding.recommendation}</p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                O veredito e o trecho original foram preservados. Revisão humana formal e decisões
                de liberação serão acrescentadas em uma fase posterior.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Link
        href={`/audits/${id}`}
        className="mt-7 inline-block text-sm font-medium text-primary underline"
      >
        Voltar aos resultados da auditoria
      </Link>
    </ResourceLayout>
  );
}
