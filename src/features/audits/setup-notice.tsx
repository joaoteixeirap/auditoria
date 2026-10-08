import Link from "next/link";
export function AuditSetupNotice({ http = false }: { http?: boolean }) {
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-900">Prepare o banco de auditorias</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        {http
          ? "A integração HTTP ainda não está habilitada neste ambiente. Consulte a documentação da Fase 3 para aplicar somente a migration incremental."
          : "Confira a conexão e as migrations instaladas. Consulte a documentação antes de aplicar SQL; migrations existentes não devem ser reaplicadas."}
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
