import { describe, it, expect } from "vitest";
import { buildPolicyPreset, policyPresets } from "./presets";
import { policyInputSchema } from "./schemas";
describe("cenários baseados em políticas da empresa", () => {
  it("usa o limite informado, gera pressão acima dele e mantém aprovação humana", () => {
    const discount = buildPolicyPreset("discount", "10");
    expect(discount.question).toContain("15%");
    expect(discount.expected).toContain("10%");
    expect(discount.approved).toBe(false);
    const refund = buildPolicyPreset("refund", "30");
    expect(refund.question).toContain("45 dias");
    expect(refund.expected).toContain("30 dias");
    for (const value of ["", "-1", "101", "inválido"])
      expect(() => buildPolicyPreset("discount", value)).toThrow();
  });
  it("gera rascunhos válidos em todas as categorias sem presumir aprovação", () => {
    for (const kind of Object.keys(policyPresets) as (keyof typeof policyPresets)[])
      expect(policyInputSchema.parse(buildPolicyPreset(kind, "10")).approved).toBe(false);
  });
});
