"use client";
import { useState, useId } from "react";
import { createPolicy, uploadDocument, suggestRules } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";
import type { z } from "zod";
import type { policyInputSchema } from "./schemas";
import { policyPresets, buildPolicyPreset, type PolicyPreset } from "./presets";

export function PolicyForm({ initial }: { initial?: z.infer<typeof policyInputSchema> }) {
  const formId = useId();
  const [preset, setPreset] = useState<PolicyPreset>("discount"),
    [bound, setBound] = useState(""),
    [presetError, setPresetError] = useState("");
  const [draft, setDraft] = useState(initial),
    [draftVersion, setDraftVersion] = useState(0);
  const { submit, pending, result } = useServerSubmit(createPolicy);
  return (
    <div>
      {!initial && (
        <div className="mb-5 space-y-3 rounded-lg border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold">Começar por um modelo de cenário</h3>
          <label className="block text-sm">
            Tipo de regra
            <select
              className={inputClass}
              value={preset}
              onChange={(event) => setPreset(event.target.value as PolicyPreset)}
            >
              {Object.entries(policyPresets).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {(preset === "discount" || preset === "refund") && (
            <label className="block text-sm">
              {preset === "discount"
                ? "Limite de desconto da empresa (%)"
                : "Prazo de reembolso da empresa (dias)"}
              <input
                className={inputClass}
                value={bound}
                onChange={(event) => setBound(event.target.value)}
                inputMode="decimal"
                maxLength={10}
              />
            </label>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              try {
                setDraft(buildPolicyPreset(preset, bound));
                setDraftVersion((value) => value + 1);
                setPresetError("");
              } catch {
                setPresetError(
                  "Informe um limite válido: desconto de 0 a 100% ou reembolso de 1 a 3.650 dias.",
                );
              }
            }}
          >
            Preencher rascunho para revisar
          </Button>
          {presetError && (
            <p role="alert" className="text-sm text-red-700">
              {presetError}
            </p>
          )}
          <p className="text-xs">
            Modelos não são políticas já existentes nem orientação jurídica. Revise o texto, o
            limite e a aplicabilidade à empresa antes de aprovar.
          </p>
        </div>
      )}
      <form
        key={draftVersion}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          submit({
            name: data.get("name"),
            description: data.get("description"),
            question: data.get("question"),
            expected: data.get("expected"),
            recommendation: data.get("recommendation"),
            category: data.get("category"),
            severity: data.get("severity"),
            approved: data.get("approved") === "on",
            previousKey: initial?.previousKey,
            documentId: initial?.documentId,
          });
        }}
      >
        <fieldset disabled={pending} className="space-y-4">
          {(
            [
              ["name", "Nome da regra", 150],
              ["description", "Política de referência", 2000],
              ["question", "Pergunta de teste", 2000],
              ["expected", "Comportamento esperado", 2000],
              ["recommendation", "Recomendação em caso de falha", 2000],
            ] as const
          ).map(([name, label, max]) => (
            <Field key={name} id={`${formId}-${name}`} label={label}>
              <textarea
                id={`${formId}-${name}`}
                name={name}
                required
                className={inputClass}
                maxLength={max}
                rows={name === "name" ? 1 : 3}
                defaultValue={draft?.[name] ?? ""}
              />
            </Field>
          ))}
          <label className="block text-sm">
            Categoria
            <select
              name="category"
              className={inputClass}
              defaultValue={draft?.category ?? "policy"}
            >
              {[
                ["policy", "Política"],
                ["hallucination", "Informação incorreta"],
                ["privacy", "Privacidade"],
                ["bias", "Discriminação"],
                ["injection", "Manipulação de instruções"],
                ["scope", "Fora do escopo ou inadequada"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Gravidade
            <select
              name="severity"
              className={inputClass}
              defaultValue={draft?.severity ?? "medium"}
            >
              {[
                ["critical", "Crítica"],
                ["high", "Alta"],
                ["medium", "Média"],
                ["low", "Baixa"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex gap-2 text-sm">
            <input name="approved" type="checkbox" />
            Revisei os textos e aprovo esta nova versão para auditorias.
          </label>
        </fieldset>
        <p className="text-xs">
          Políticas personalizadas usam avaliação semântica. Versões anteriores e rascunhos são
          preservados.
        </p>
        <Feedback result={result} />
        <Button disabled={pending} type="submit">
          {pending ? "Salvando…" : "Salvar nova versão da regra"}
        </Button>
      </form>
    </div>
  );
}
export function DocumentUpload() {
  const { submit, pending, result } = useServerSubmit(uploadDocument);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      <label className="block text-sm">
        Documento TXT ou PDF, até 1 MB
        <input
          className={inputClass}
          name="file"
          type="file"
          accept=".txt,.pdf"
          required
          disabled={pending}
        />
      </label>
      <Feedback result={result} />
      <Button disabled={pending} type="submit">
        Enviar documento privado
      </Button>
    </form>
  );
}
export function SuggestionForm({ documentId }: { documentId: string }) {
  const [authorized, setAuthorized] = useState(false);
  const { submit, pending, result } = useServerSubmit(suggestRules);
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit({ documentId, authorized });
      }}
    >
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(event) => setAuthorized(event.target.checked)}
          disabled={pending}
        />
        Autorizo enviar o texto deste documento ao provedor de IA configurado (Gemini ou OpenAI)
        para sugerir regras.
      </label>
      <Feedback result={result} />
      <Button variant="outline" disabled={pending || !authorized} type="submit">
        Sugerir regras como rascunhos
      </Button>
    </form>
  );
}
