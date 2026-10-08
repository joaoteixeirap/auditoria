import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Entre para gerenciar seus clientes e chatbots.
      </p>
      {params.confirmation === "error" && (
        <p role="alert" className="mb-5 text-sm text-red-700">
          Link inválido ou expirado. Tente entrar ou solicite um novo link.
        </p>
      )}
      <AuthForm mode="login" configured={getSupabaseConfigurationStatus() === "configured"} />
    </>
  );
}
