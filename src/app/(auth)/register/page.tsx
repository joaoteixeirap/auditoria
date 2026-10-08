import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
export const metadata = { title: "Criar conta" };
export const dynamic = "force-dynamic";
export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie sua conta</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Depois, crie sua organização para começar.
      </p>
      <AuthForm mode="register" configured={getSupabaseConfigurationStatus() === "configured"} />
    </>
  );
}
