import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { HumanReview } from "./human-review";
import { auditHistory, type WorkflowDB } from "@/server/repositories/workflow";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/server/repositories/workflow", () => ({ auditHistory: vi.fn() }));
vi.mock("./review-actions", () => ({ decideRelease: vi.fn(), reviewFinding: vi.fn() }));
vi.mock("./report-actions", () => ({ createReport: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const db = {} as WorkflowDB; // Não consultado: apenas auditHistory é controlado no teste de renderização.
async function markup(owner: boolean, completed: boolean, findingId?: string) {
  vi.mocked(auditHistory).mockResolvedValue({ reviews: [], decisions: [] });
  return renderToStaticMarkup(
    await HumanReview({ db, org: "org", run: "run", findings: [], owner, completed, findingId }),
  );
}
it("administrador de auditoria concluída vê decisão real e PDF no mesmo bloco", async () => {
  const html = await markup(true, true);
  expect(html).toContain("Decisão humana de liberação");
  expect(html).toContain('value="released"');
  expect(html).toContain("Liberar nos cenários testados");
  expect(html).toContain("Registrar no histórico");
  expect(html).toContain("Gerar relatório PDF privado");
});
it("membro ou auditoria em andamento não oferece decisão, e achado usa revisão", async () => {
  expect(await markup(false, true)).not.toContain('value="released"');
  expect(await markup(true, false)).not.toContain('value="released"');
  const finding = await markup(true, true, "finding");
  expect(finding).toContain('value="dismissed"');
  expect(finding).not.toContain('value="released"');
});
