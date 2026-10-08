import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
export const metadata = { title: "Recuperar senha" };
export const dynamic = "force-dynamic";
export default function RecoveryPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Recupere seu acesso</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Enviaremos um link para redefinir sua senha.
      </p>
      <AuthForm mode="recovery" configured={getSupabaseConfigurationStatus() === "configured"} />
    </>
  );
}
