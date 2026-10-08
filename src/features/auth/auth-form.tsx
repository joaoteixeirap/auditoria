"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  Feedback,
  fieldAccessibility,
  inputClass,
  useServerSubmit,
} from "@/components/shared/forms";
import { signIn, signUp, recoverPassword, changePassword } from "./actions";
import {
  loginSchema,
  registerSchema,
  recoverySchema,
  newPasswordSchema,
} from "@/lib/validations/entities";

type Mode = "login" | "register" | "recovery" | "reset";
const titles = {
  login: "Entrar",
  register: "Criar conta",
  recovery: "Enviar instruções",
  reset: "Salvar nova senha",
};

export function AuthForm({ mode, configured }: { mode: Mode; configured: boolean }) {
  const schema = z
    .object({ email: z.string(), password: z.string(), display_name: z.string() })
    .superRefine((values, context) => {
      const result = (
        mode === "register"
          ? registerSchema
          : mode === "login"
            ? loginSchema
            : mode === "recovery"
              ? recoverySchema
              : newPasswordSchema
      ).safeParse(values);
      if (!result.success)
        for (const issue of result.error.issues)
          context.addIssue({ code: "custom", message: issue.message, path: issue.path });
    });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", display_name: "" },
  });
  const action =
    mode === "login"
      ? signIn
      : mode === "register"
        ? signUp
        : mode === "recovery"
          ? recoverPassword
          : changePassword;
  const { submit, pending, result } = useServerSubmit<Values>(action);
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {!configured && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Configure o Supabase em{" "}
          <Link href="/settings" className="underline">
            Configuração
          </Link>{" "}
          antes de continuar.
        </p>
      )}
      <fieldset disabled={pending || !configured} className="space-y-5">
        {mode === "register" && (
          <Field id="display_name" label="Seu nome" error={errors.display_name?.message}>
            <input
              {...register("display_name")}
              {...fieldAccessibility("display_name", errors.display_name?.message)}
              autoComplete="name"
              className={inputClass}
              maxLength={100}
            />
          </Field>
        )}
        {mode !== "reset" && (
          <Field id="email" label="E-mail" error={errors.email?.message}>
            <input
              {...register("email")}
              {...fieldAccessibility("email", errors.email?.message)}
              type="email"
              autoComplete="email"
              className={inputClass}
              maxLength={254}
            />
          </Field>
        )}
        {mode !== "recovery" && (
          <Field
            id="password"
            label={mode === "reset" ? "Nova senha" : "Senha"}
            error={errors.password?.message}
          >
            <input
              {...register("password")}
              {...fieldAccessibility("password", errors.password?.message)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={inputClass}
              maxLength={128}
            />
            {mode !== "login" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Use pelo menos 12 caracteres. Prefira uma frase longa e única.
              </p>
            )}
          </Field>
        )}
        <Button type="submit" className="w-full">
          {pending ? "Processando…" : titles[mode]}
        </Button>
      </fieldset>
      <Feedback result={result} />
      {mode === "login" && (
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <Link href="/forgot-password" className="text-primary underline underline-offset-4">
            Esqueci minha senha
          </Link>
          <Link href="/register" className="text-primary underline underline-offset-4">
            Criar uma conta
          </Link>
        </div>
      )}
      {mode !== "login" && (
        <Link
          href="/login"
          className="block text-center text-sm text-primary underline underline-offset-4"
        >
          Voltar para entrar
        </Link>
      )}
    </form>
  );
}
