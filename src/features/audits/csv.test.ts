import { describe, expect, it } from "vitest";
import { parseAuditCsv } from "./csv";
describe("CSV importado", () => {
  it("preserva vírgulas, aspas escapadas e respostas em várias linhas", () => {
    expect(
      parseAuditCsv('cenario,resposta\r\ndiscount-limit,"Ele disse ""10%"",\nsem exceção."'),
    ).toEqual([{ scenario: "discount-limit", response: 'Ele disse "10%",\nsem exceção.' }]);
  });
  it("aceita BOM UTF-8 e delimitador ponto e vírgula", () => {
    expect(parseAuditCsv("\uFEFFcenario;resposta\na;Resposta")).toEqual([
      { scenario: "a", response: "Resposta" },
    ]);
  });
  it("rejeita colunas, duplicações, aspas abertas e respostas vazias", () => {
    for (const input of [
      "x,y\na,b",
      "cenario,resposta\na,x\na,y",
      'cenario,resposta\na,"ab',
      "cenario,resposta\na,",
      'cenario,resposta\na,"x"resto',
      "cenario,resposta\na,b,c",
    ])
      expect(() => parseAuditCsv(input)).toThrow();
  });
  it("rejeita mais de dez linhas e respostas acima do limite", () => {
    expect(() =>
      parseAuditCsv(
        "cenario,resposta\n" +
          Array.from({ length: 11 }, (_, index) => `s${index},resposta`).join("\n"),
      ),
    ).toThrow();
    expect(() => parseAuditCsv("cenario,resposta\na," + "x".repeat(10001))).toThrow();
  });
});
