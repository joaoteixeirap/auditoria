import { auditHistory, type WorkflowDB } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
import { ReviewForm } from "./review-form";
import { ReportButton } from "./report-button";
const humanLabels = {
  confirmed: "Falha confirmada",
  dismissed: "Achado descartado",
  needs_review: "Requer revisão",
  released: "Liberado",
  blocked: "Bloqueado",
};
export async function HumanReview({
  db,
  org,
  run,
  findings,
  owner,
  completed,
  findingId,
}: {
  db: WorkflowDB;
  org: string;
  run: string;
  findings: string[];
  owner: boolean;
  completed: boolean;
  findingId?: string;
}) {
  let history: Awaited<ReturnType<typeof auditHistory>>;
  try {
    history = await auditHistory(db, org, run, findings);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    return (
      <p className="mt-6 text-sm">
        Revisão humana e relatórios aguardam habilitação neste ambiente.
      </p>
    );
  }
  const entries = findingId
    ? history.reviews.filter((review) => review.finding_id === findingId)
    : history.decisions;
  return (
    <section className="mt-8 space-y-4 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">
        {findingId ? "Revisão humana do achado" : "Decisão humana e relatório"}
      </h2>
      <p className="text-sm">
        Os resultados automáticos são preservados. Novas decisões e revisões são acrescentadas ao
        histórico.
      </p>
      {entries.length ? (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{humanLabels["verdict" in entry ? entry.verdict : entry.decision]}</strong> ·{" "}
              {new Date(entry.created_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
              <p className="whitespace-pre-wrap">{entry.reason}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">Nenhum registro humano.</p>
      )}
      {owner && (findingId || completed) && (
        <ReviewForm findingId={findingId} auditId={findingId ? undefined : run} />
      )}{" "}
      {owner && completed && !findingId && <ReportButton auditId={run} />}
    </section>
  );
}
