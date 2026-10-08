"use client";
import { useState, useRef } from "react";
import { parseAuditCsv } from "./csv";
import { importCsv } from "./import-actions";
import { Button } from "@/components/ui/button";
import { Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";
export function ImportForm({
  versions,
}: {
  versions: { id: string; agent_id: string; label: string; agentName: string }[];
}) {
  const [csv, setCsv] = useState("cenario,resposta\n");
  const [versionId, setVersion] = useState(versions[0]?.id ?? ""),
    [authorized, setAuthorized] = useState(false),
    [aiAuthorized, setAiAuthorized] = useState(false);
  const [demoCriteriaAuthorized, setDemoCriteriaAuthorized] = useState(false);
  const key = useRef("");
  const { submit, pending, result } = useServerSubmit(importCsv);
  let preview: ReturnType<typeof parseAuditCsv> = [],
    error = "";
  try {
    preview = parseAuditCsv(csv);
  } catch {
    error = "Confira o cabeçalho cenario,resposta, aspas e limite de dez respostas.";
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const version = versions.find((item) => item.id === versionId);
        if (!version) return;
        if (!key.current) key.current = crypto.randomUUID();
        submit({
          csv,
          versionId,
          agentId: version.agent_id,
          requestKey: key.current,
          authorized,
          aiAuthorized,
          demoCriteriaAuthorized,
        });
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        <p className="text-sm">
          Use as chaves das políticas aprovadas da empresa. O catálogo fictício só deve ser usado
          para demonstrar o produto.
        </p>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={demoCriteriaAuthorized}
            onChange={(event) => setDemoCriteriaAuthorized(event.target.checked)}
          />
          Esta importação é demonstrativa e autorizo utilizar critérios fictícios do catálogo.
        </label>
        <label className="block text-sm">
          Chatbot e versão
          <select
            className={inputClass}
            value={versionId}
            onChange={(event) => {
              setVersion(event.target.value);
              key.current = "";
            }}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.agentName} · {version.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Arquivo CSV, até 150 KB
          <input
            type="file"
            accept=".csv"
            className={inputClass}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file && file.size <= 150000) {
                setCsv(await file.text());
                key.current = "";
              }
            }}
          />
        </label>
        <label className="block text-sm">
          Conteúdo CSV
          <textarea
            className={inputClass}
            rows={7}
            maxLength={150000}
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value);
              key.current = "";
            }}
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
          />
          Autorizo importar estas respostas para avaliar uma transcrição. Entendo que o chatbot não
          será chamado.
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={aiAuthorized}
            onChange={(event) => setAiAuthorized(event.target.checked)}
          />
          Se houver regras personalizadas, autorizo enviar perguntas, respostas, finalidade do
          chatbot e políticas ao provedor de IA configurado (Gemini ou OpenAI).
        </label>
      </fieldset>
      <section aria-label="Pré-visualização" className="overflow-x-auto rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">Pré-visualização</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Resposta importada</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.scenario}>
                  <td className="p-2">{row.scenario}</td>
                  <td className="max-w-md whitespace-pre-wrap break-words p-2">{row.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Feedback result={result} />
      <Button disabled={pending || !authorized || !!error || !versionId} type="submit">
        Preparar avaliação importada
      </Button>
    </form>
  );
}
