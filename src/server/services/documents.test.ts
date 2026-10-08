import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractDocument } from "./documents";
describe("documentos privados", () => {
  it("aceita TXT UTF-8 e rejeita formatos e tamanhos inadequados", async () => {
    expect(
      (await extractDocument(new File(["Política: desconto de 10%."], "politica.txt"))).text,
    ).toContain("10%");
    await expect(extractDocument(new File(["x"], "arquivo.html"))).rejects.toThrow();
    await expect(extractDocument(new File(["x".repeat(1048577)], "arquivo.txt"))).rejects.toThrow();
    await expect(
      extractDocument(new File([new Uint8Array([255])], "arquivo.txt")),
    ).rejects.toThrow();
  });
  it("extrai um PDF real sem serviços externos", async () => {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("Desconto permitido: 10%.", { font });
    const bytes = await pdf.save();
    expect(
      (await extractDocument(new File([new Uint8Array(bytes).buffer], "politica.pdf"))).text,
    ).toContain("10%");
  }, 20000);
  it("rejeita PDF falso e sem texto selecionável", async () => {
    await expect(extractDocument(new File(["nao-pdf"], "arquivo.pdf"))).rejects.toThrow();
    const pdf = await PDFDocument.create();
    pdf.addPage();
    await expect(
      extractDocument(new File([new Uint8Array(await pdf.save()).buffer], "vazio.pdf")),
    ).rejects.toThrow();
  });
});
