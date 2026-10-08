"use client";
import { Button } from "@/components/ui/button";
import { Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";
import { decideRelease, reviewFinding } from "./review-actions";
export function ReviewForm({ findingId, auditId }: { findingId?: string; auditId?: string }) {
  const { submit, pending, result } = useServerSubmit(
    async (input: { value: string; reason: string }) =>
      findingId
        ? reviewFinding({ findingId, verdict: input.value, reason: input.reason })
        : decideRelease({ auditId, decision: input.value, reason: input.reason }),
  );
  const choices = findingId
    ? [
        ["needs_review", "Necessita revisão"],
        ["confirmed", "Falha confirmada"],
        ["dismissed", "Falso positivo, com justificativa"],
      ]
    : [
        ["needs_review", "Aguardar revisão"],
        ["blocked", "Bloquear liberação"],
        ["released", "Liberar nos cenários testados"],
      ];
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        submit({ value: String(form.get("value")), reason: String(form.get("reason")) });
      }}
    >
      <fieldset disabled={pending} className="space-y-3">
        <label className="block text-sm">
          {findingId ? "Revisão humana do achado" : "Decisão humana de liberação"}
          <select name="value" className={inputClass}>
            {choices.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Justificativa
          <textarea
            name="reason"
            className={inputClass}
            required
            minLength={10}
            maxLength={2000}
            rows={3}
          />
        </label>
      </fieldset>
      <Feedback result={result} />
      <Button disabled={pending} type="submit">
        Registrar no histórico
      </Button>
    </form>
  );
}
