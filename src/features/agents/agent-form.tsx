"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentSchema, type CreateAgentInput } from "@/lib/validations/entities";
import { upsertAgent } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  Feedback,
  fieldAccessibility,
  inputClass,
  useServerSubmit,
} from "@/components/shared/forms";
import { categories, environments } from "./labels";

export function AgentForm({
  id,
  initial,
  clients,
}: {
  id?: string;
  initial?: CreateAgentInput;
  clients: { id: string; name: string; status: string }[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: initial ?? {
      name: "",
      client_id: "",
      description: "",
      category: "customer_service",
      environment: "staging",
      status: "active",
      version: "v1",
    },
  });
  const { submit, pending, result } = useServerSubmit<CreateAgentInput>((input) =>
    upsertAgent(input, id),
  );
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nome do chatbot" error={errors.name?.message}>
          <input
            {...register("name")}
            {...fieldAccessibility("name", errors.name?.message)}
            className={inputClass}
            maxLength={120}
          />
        </Field>
        {!!clients.length && (
          <Field
            id="client_id"
            label="Vínculo anterior (opcional)"
            error={errors.client_id?.message}
          >
            <select
              {...register("client_id")}
              {...fieldAccessibility("client_id", errors.client_id?.message)}
              className={inputClass}
            >
              <option value="">Minha empresa</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.status === "archived" ? " (arquivado)" : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="category" label="Setor de utilização" error={errors.category?.message}>
          <select
            {...register("category")}
            {...fieldAccessibility("category", errors.category?.message)}
            className={inputClass}
          >
            {Object.entries(categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="environment" label="Ambiente" error={errors.environment?.message}>
          <select
            {...register("environment")}
            {...fieldAccessibility("environment", errors.environment?.message)}
            className={inputClass}
          >
            {Object.entries(environments).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
        {!id && (
          <Field id="version" label="Versão inicial" error={errors.version?.message}>
            <input
              {...register("version")}
              {...fieldAccessibility("version", errors.version?.message)}
              className={inputClass}
              maxLength={80}
            />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field
            id="description"
            label="Descrição e finalidade (opcional)"
            error={errors.description?.message}
          >
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
      <p className="rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-indigo-900">
        Demonstração usa respostas fictícias com falhas intencionais. Em Homologação ou Produção,
        configure uma conexão HTTP por versão nos detalhes do chatbot antes de iniciar auditorias.
      </p>
      <Feedback result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar chatbot"}
      </Button>
    </form>
  );
}
