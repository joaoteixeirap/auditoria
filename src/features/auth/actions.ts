"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createActionClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  recoverySchema,
  newPasswordSchema,
} from "@/lib/validations/entities";
import { allowPublicAction } from "@/server/services/action-guard";
import { actionError, type ActionResult } from "@/server/services/errors";
import { authenticatedClient, ORGANIZATION_COOKIE } from "@/server/services/workspace";

function appUrl() {
  const value =
    process.env.APP_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!URL.canParse(value)) throw new Error("APP_URL inválida");
  const parsed = new URL(value);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
  )
    throw new Error("APP_URL inválida");
  return parsed.origin;
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira seu e-mail e senha." };
  if (!(await allowPublicAction("login", parsed.data.email)))
    return { success: false, message: "Muitas tentativas. Aguarde um minuto." };
  try {
    const db = await createActionClient();
    const { error } = await db.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        success: false,
        message: "Não foi possível entrar. Confira suas credenciais e a confirmação do e-mail.",
      };
    return { success: true, message: "Login realizado.", redirectTo: "/dashboard" };
  } catch (error) {
    return actionError(error);
  }
}
export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: "Confira os campos e use uma senha de pelo menos 12 caracteres.",
    };
  if (!(await allowPublicAction("register", parsed.data.email)))
    return { success: false, message: "Muitas tentativas. Aguarde um minuto." };
  try {
    const db = await createActionClient();
    const { email, password, display_name } = parsed.data;
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { display_name }, emailRedirectTo: `${appUrl()}/auth/callback` },
    });
    if (error)
      return {
        success: false,
        message:
          "Não foi possível concluir o cadastro. Confira os dados ou tente novamente mais tarde.",
      };
    return {
      success: true,
      message:
        "Solicitação recebida. Se o cadastro for permitido, confirme seu e-mail para entrar.",
      ...(data.session ? { redirectTo: "/onboarding" } : {}),
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function recoverPassword(input: unknown): Promise<ActionResult> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Informe um e-mail válido." };
  if (!(await allowPublicAction("recovery", parsed.data.email)))
    return { success: false, message: "Muitas tentativas. Aguarde um minuto." };
  try {
    const db = await createActionClient();
    const { error } = await db.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
    });
    if (error)
      return {
        success: false,
        message: "Não foi possível processar a recuperação agora. Tente novamente mais tarde.",
      };
    return {
      success: true,
      message: "Se houver uma conta para esse e-mail, você receberá as instruções de recuperação.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Use uma senha de pelo menos 12 caracteres." };
  try {
    const { db, user } = await authenticatedClient(true);
    if (!(await allowPublicAction("password", user.id)))
      return { success: false, message: "Aguarde um minuto antes de tentar novamente." };
    const { error } = await db.auth.updateUser({ password: parsed.data.password });
    if (error)
      return {
        success: false,
        message:
          "Não foi possível alterar a senha. Abra um novo link de recuperação ou entre novamente.",
      };
    return { success: true, message: "Senha atualizada.", redirectTo: "/dashboard" };
  } catch (error) {
    return actionError(error);
  }
}
export async function signOut() {
  const db = await createActionClient();
  const { error } = await db.auth.signOut();
  if (error) redirect("/dashboard?logout=error");
  (await cookies()).delete(ORGANIZATION_COOKIE);
  redirect("/login");
}
