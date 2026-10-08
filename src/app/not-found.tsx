import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-3 text-muted-foreground">
        Confira o endereço ou volte ao início para acessar os módulos disponíveis.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-medium text-primary underline underline-offset-4"
      >
        Voltar à configuração
      </Link>
    </main>
  );
}
