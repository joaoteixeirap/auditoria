import Link from "next/link";
export function AuditSetupNotice() {
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-900">Prepare o banco de auditorias</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Confira a conexão e aplique uma vez a migration supabase/migrations/202610070002_phase2.sql
        no SQL Editor do seu projeto. Seus cadastros da Fase 1 serão preservados.
      </p>
      <Link
        href="/settings"
        className="mt-4 inline-block text-sm font-medium text-primary underline"
      >
        Ver configuração
      </Link>
    </div>
  );
}
