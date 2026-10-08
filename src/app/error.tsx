"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Não registrar mensagens que possam conter respostas de provedores ou credenciais.
    console.error("Falha na renderização", { digest: error.digest ?? "indisponível" });
  }, [error]);
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-2xl font-semibold">Não foi possível carregar esta página</h1>
      <p className="mt-3 text-muted-foreground">
        Tente novamente. Se o problema continuar, consulte a configuração do projeto.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-5 py-3 font-medium text-white"
      >
        Tentar novamente
      </button>
    </main>
  );
}
