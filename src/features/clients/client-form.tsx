"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validations/entities";
import { upsertClient } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  Feedback,
  fieldAccessibility,
  inputClass,
  useServerSubmit,
} from "@/components/shared/forms";

export function ClientForm({ id, initial }: { id?: string; initial?: ClientInput }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ?? {
      name: "",
      contact_name: "",
      contact_email: "",
      description: "",
      status: "active",
    },
  });
  const { submit, pending, result } = useServerSubmit<ClientInput>((input) =>
    upsertClient(input, id),
  );
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nome da empresa" error={errors.name?.message}>
          <input
            {...register("name")}
            {...fieldAccessibility("name", errors.name?.message)}
            className={inputClass}
            maxLength={120}
            autoComplete="organization"
          />
        </Field>
        <Field id="status" label="Status" error={errors.status?.message}>
          <select
            {...register("status")}
            {...fieldAccessibility("status", errors.status?.message)}
            className={inputClass}
          >
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </Field>
        <Field
          id="contact_name"
          label="Responsável (opcional)"
          error={errors.contact_name?.message}
        >
          <input
            {...register("contact_name")}
            {...fieldAccessibility("contact_name", errors.contact_name?.message)}
            className={inputClass}
            maxLength={120}
            autoComplete="name"
          />
        </Field>
        <Field
          id="contact_email"
          label="E-mail de contato (opcional)"
          error={errors.contact_email?.message}
        >
          <input
            {...register("contact_email")}
            {...fieldAccessibility("contact_email", errors.contact_email?.message)}
            className={inputClass}
            type="email"
            maxLength={254}
            autoComplete="email"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field id="description" label="Descrição (opcional)" error={errors.description?.message}>
            <textarea
              {...register("description")}
              {...fieldAccessibility("description", errors.description?.message)}
              className={inputClass}
              rows={4}
              maxLength={2000}
            />
          </Field>
        </div>
      </fieldset>
      <Feedback result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar cliente"}
      </Button>
    </form>
  );
}
