import { summarizeResults } from "./metrics";
import { releaseLabels, verdictLabels } from "./labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuditSummary({ summary }: { summary: ReturnType<typeof summarizeResults> }) {
  return (
    <section aria-label="Resultados da auditoria">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Object.entries(summary.counts).map(([verdict, count]) => (
          <Card key={verdict} className="shadow-none">
            <CardHeader>
              <CardTitle className="text-xs sm:text-sm">
                {verdictLabels[verdict as keyof typeof verdictLabels]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5 rounded-xl border bg-white p-5">
        <div>
          <p className="text-sm font-medium">Taxa de aprovação dos testes conclusivos</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary.approvalRate === null ? "Não calculável" : `${summary.approvalRate}%`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            PASS ÷ (PASS + FAIL) × 100. Inconclusivos e erros técnicos ficam fora do denominador.
          </p>
        </div>
        <div className="max-w-sm">
          <p
            className={`text-sm font-semibold ${summary.release === "BLOCKED" ? "text-red-800" : summary.release === "ELIGIBLE" ? "text-emerald-800" : "text-amber-800"}`}
          >
            {releaseLabels[summary.release as keyof typeof releaseLabels]}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {summary.release === "BLOCKED"
              ? "Há falha crítica com evidência nos testes executados."
              : summary.release === "ELIGIBLE"
                ? "Todos os cenários executados foram aprovados. A liberação ainda exige decisão humana."
                : "Há execução incompleta, falha não crítica, incerteza ou erro técnico. Investigue os resultados antes de decidir."}
          </p>
        </div>
      </div>
    </section>
  );
}
