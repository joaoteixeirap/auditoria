import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { authenticatedClient } from "@/server/services/workspace";
export const metadata = { title: "Nova senha" };
export default async function ResetPasswordPage() {
  try {
    await authenticatedClient();
  } catch {
    redirect("/login");
  }
  return (
    <>
      <h1 className="text-2xl font-semibold">Defina uma nova senha</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Escolha uma senha única para sua conta.
      </p>
      <AuthForm mode="reset" configured />
    </>
  );
}
