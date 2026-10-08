import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { criteriaSchema } from "@/features/audits/schemas";
import { conditionsSchema } from "@/server/repositories/audits";
import {
  verdictLabels,
  severityLabels,
  categoryLabels,
  statusLabels,
} from "@/features/audits/labels";
import { summarizeResults } from "@/features/audits/metrics";
export const reportSnapshotSchema = z.object({
  generatedAt: z.string(),
  organization: z.string(),
  auditId: z.string(),
  source: z.string(),
  status: z.string(),
  criteria: criteriaSchema,
  conditions: conditionsSchema,
  executions: z.array(
    z.object({
      test_case_id: z.string(),
      verdict: z.string(),
      response: z.string(),
      reason: z.string(),
      evidence: z.string(),
      recommendation: z.string(),
    }),
  ),
  reviews: z.array(
    z.object({
      finding_id: z.string(),
      verdict: z.string(),
      reason: z.string(),
      created_by: z.string(),
      created_at: z.string(),
    }),
  ),
  decisions: z.array(
    z.object({
      decision: z.string(),
      reason: z.string(),
      created_by: z.string(),
      created_at: z.string(),
    }),
  ),
});
export async function generatePdf(input: unknown) {
  const snapshot = reportSnapshotSchema.parse(input),
    pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage([595.28, 841.89]),
    y = 790;
  const clean = (text: string) =>
    Array.from(text)
      .map((char) => {
        try {
          font.encodeText(char);
          return char;
        } catch {
          return "?";
        }
      })
      .join("");
  const draw = (value: string, size = 10) => {
    const paragraphs = clean(value).split(/\r?\n/);
    for (const paragraph of paragraphs) {
      let line = "";
      for (const char of paragraph) {
        if (font.widthOfTextAtSize(line + char, size) > 485) {
          write(line, size);
          line = "";
        }
        line += char;
      }
      write(line, size);
    }
    y -= 5;
  };
  const write = (line: string, size: number) => {
    if (y < 55) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    page.drawText(line, { x: 55, y, size, font, color: rgb(0.1, 0.15, 0.22) });
    y -= size + 5;
  };
  draw("Auditor de IA — Relatório de auditoria", 18);
  draw(`Organização: ${snapshot.organization}`);
  draw(`Auditoria: ${snapshot.auditId}`);
  draw(`Gerado: ${snapshot.generatedAt}`);
  draw(
    `Origem: ${{ demo: "Demonstração — chatbot fictício", http: "Chatbot real via API", csv: "Respostas importadas" }[snapshot.source] ?? snapshot.source} · Estado: ${statusLabels[snapshot.status as keyof typeof statusLabels] ?? snapshot.status}`,
  );
  draw(`Chatbot: ${snapshot.conditions.agent.name} · Versão: ${snapshot.conditions.version.label}`);
  if (snapshot.conditions.agent.description)
    draw(`Finalidade e contexto: ${snapshot.conditions.agent.description}`);
  draw(
    `Avaliador: ${snapshot.criteria.evaluator.name} v${snapshot.criteria.evaluator.version}${snapshot.criteria.evaluator.name === "semantic" ? ` · Modelo ${snapshot.criteria.evaluator.model}` : ""}`,
  );
  draw(
    "Limitações: relatório dos cenários efetivamente testados. Não constitui certificação jurídica, garantia de segurança ou conformidade integral. Avaliação por IA pode errar. Revisões humanas não apagam resultados originais.",
  );
  if (snapshot.source === "csv")
    draw("Respostas importadas: o chatbot não foi executado nesta auditoria.");
  if (snapshot.criteria.cases.some((test) => test.evaluation.kind !== "semantic"))
    draw(
      "Critérios demonstrativos: políticas fictícias do catálogo, sem presunção de aplicabilidade à empresa.",
    );
  const summary = summarizeResults(
    snapshot.executions.map((execution) => ({
      verdict: execution.verdict as keyof typeof verdictLabels,
      severity:
        snapshot.criteria.cases.find((test) => test.id === execution.test_case_id)?.severity ??
        "medium",
    })),
    snapshot.status as keyof typeof statusLabels,
  );
  draw(
    `Resultados: ${summary.counts.PASS} aprovados, ${summary.counts.FAIL} falhas, ${summary.counts.INCONCLUSIVE} inconclusivos, ${summary.counts.ERROR} erros técnicos.`,
  );
  draw(
    `Taxa de aprovação: ${summary.approvalRate === null ? "Não calculável" : `${summary.approvalRate}%`}. Considera apenas resultados conclusivos.`,
  );
  for (const test of snapshot.criteria.cases) {
    draw(test.name, 14);
    draw(`Regra: ${test.policy.description}`);
    draw(
      `Categoria: ${categoryLabels[test.category]} · Gravidade: ${severityLabels[test.severity]}`,
    );
    draw(`Comportamento esperado: ${test.expectedBehavior}`);
    draw(`Pergunta: ${test.question}`);
    const execution = snapshot.executions.find((entry) => entry.test_case_id === test.id);
    if (!execution) {
      draw("Não executado.");
      continue;
    }
    draw(
      `Resultado original: ${verdictLabels[execution.verdict as keyof typeof verdictLabels] ?? execution.verdict}`,
    );
    draw(`Resposta: ${execution.response || "Sem resposta."}`);
    draw(`Justificativa: ${execution.reason}`);
    draw(`Evidência: ${execution.evidence || "Não conclusiva."}`);
    draw(`Recomendação: ${execution.recommendation}`);
  }
  draw("Histórico de revisões humanas", 14);
  for (const review of snapshot.reviews)
    draw(
      `${review.created_at} · ${review.created_by} · Achado ${review.finding_id} · ${review.verdict}: ${review.reason}`,
    );
  draw("Decisões humanas de liberação", 14);
  if (!snapshot.decisions.length) draw("Nenhuma decisão registrada.");
  for (const decision of snapshot.decisions)
    draw(
      `${decision.created_at} · ${decision.created_by} · ${decision.decision}: ${decision.reason}`,
    );
  const pages = pdf.getPages();
  pages.forEach((item, index) =>
    item.drawText(`${index + 1}/${pages.length}`, { x: 500, y: 25, size: 9, font }),
  );
  pdf.setTitle("Auditor de IA — Relatório de auditoria");
  return pdf.save();
}
