import { z } from "zod";
const rowsSchema = z
  .array(
    z.object({
      scenario: z.string().trim().min(1).max(80),
      response: z.string().min(1).max(10000),
    }),
  )
  .min(1)
  .max(10);
export function parseAuditCsv(text: string) {
  if (new TextEncoder().encode(text).length > 150000) throw new Error("CSV acima de 150 KB.");
  const input = text.replace(/^\uFEFF/, "");
  const delimiter = input.split(/\r?\n/, 1)[0]?.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error("Aspas inválidas no CSV.");
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
      closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) throw new Error("Conteúdo depois de aspas no CSV.");
      field += char;
    }
    if (rows.length > 11 || row.length > 2)
      throw new Error("Use no máximo dez respostas e duas colunas.");
  }
  if (quoted) throw new Error("CSV com aspas não fechadas.");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  if (rows.shift()?.join(",") !== "cenario,resposta")
    throw new Error("Cabeçalho esperado: cenario,resposta.");
  if (rows.some((values) => values.length !== 2))
    throw new Error("Cada linha deve ter duas colunas.");
  const parsed = rowsSchema.parse(
    rows.map((values) => ({ scenario: values[0], response: values[1] })),
  );
  if (new Set(parsed.map((entry) => entry.scenario)).size !== parsed.length)
    throw new Error("Cenários duplicados.");
  return parsed;
}
