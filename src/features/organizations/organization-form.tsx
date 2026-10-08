"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { organizationSchema, type OrganizationInput } from "@/lib/validations/entities";
import { createOrganization } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  Feedback,
  fieldAccessibility,
  inputClass,
  useServerSubmit,
} from "@/components/shared/forms";

export function OrganizationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "" },
  });
  const { submit, pending, result } = useServerSubmit<OrganizationInput>(createOrganization);
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      <Field id="name" label="Nome da organização" error={errors.name?.message}>
        <input
          {...register("name")}
          {...fieldAccessibility("name", errors.name?.message)}
          className={inputClass}
          autoComplete="organization"
          maxLength={120}
          disabled={pending}
        />
      </Field>
      <Feedback result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar organização"}
      </Button>
    </form>
  );
}
