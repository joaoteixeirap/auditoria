import "server-only";
import { ApplicationError } from "./errors";
export async function extractDocument(file: File) {
  if (file.size === 0 || file.size > 1048576)
    throw new ApplicationError("FILE", "Envie TXT ou PDF de até 1 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string, type: string;
  if (file.name.toLowerCase().endsWith(".pdf")) {
    if (Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-")
      throw new ApplicationError("FILE", "Arquivo PDF inválido.");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({
      data: bytes,
      isEvalSupported: false,
      stopAtErrors: true,
      verbosity: 0,
    });
    try {
      const info = await parser.getInfo();
      if (info.total > 20) throw new Error("pages");
      text = (await parser.getText()).pages.map((page) => page.text).join("\n");
    } catch {
      throw new ApplicationError(
        "FILE",
        "Não foi possível extrair o texto. Use PDF sem senha, com texto selecionável e até 20 páginas.",
      );
    } finally {
      await parser.destroy();
    }
    type = "application/pdf";
  } else if (file.name.toLowerCase().endsWith(".txt")) {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ApplicationError("FILE", "O TXT precisa usar UTF-8.");
    }
    type = "text/plain";
  } else throw new ApplicationError("FILE", "Formato permitido: TXT ou PDF.");
  text = text.trim();
  if (!text || text.length > 50000 || text.includes("\0"))
    throw new ApplicationError(
      "FILE",
      "Use um documento com 1 a 50.000 caracteres de texto; PDF digitalizado precisa de OCR prévio.",
    );
  return { bytes, text, type };
}
