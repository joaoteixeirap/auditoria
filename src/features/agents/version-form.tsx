"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { versionSchema, type VersionInput } from "@/lib/validations/entities";
import { addVersion } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  Feedback,
  fieldAccessibility,
  inputClass,
  useServerSubmit,
} from "@/components/shared/forms";

export function VersionForm({ agentId, isDemo = true }: { agentId: string; isDemo?: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VersionInput>({
    resolver: zodResolver(versionSchema),
    defaultValues: { label: "", notes: "", demo_revision: "2" },
  });
  const { submit, pending, result } = useServerSubmit<VersionInput>((input) =>
    addVersion(agentId, input),
  );
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field id="label" label="Identificação da nova versão" error={errors.label?.message}>
        <input
          {...register("label")}
          {...fieldAccessibility("label", errors.label?.message)}
          className={inputClass}
          disabled={pending}
          maxLength={80}
        />
      </Field>
      <Field id="notes" label="O que mudou? (opcional)" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          {...fieldAccessibility("notes", errors.notes?.message)}
          className={inputClass}
          disabled={pending}
          rows={3}
          maxLength={2000}
        />
      </Field>
      <Feedback result={result} />
      {isDemo && (
        <Field
          id="demo_revision"
          label="Comportamento do bot de demonstração"
          error={errors.demo_revision?.message}
        >
          <select
            {...register("demo_revision")}
            {...fieldAccessibility("demo_revision", errors.demo_revision?.message)}
            className={inputClass}
            disabled={pending}
          >
            <option value="1">Versão 1 · Falhas intencionais</option>
            <option value="2">Versão 2 · Corrigida</option>
          </select>
        </Field>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar versão"}
      </Button>
    </form>
  );
}
