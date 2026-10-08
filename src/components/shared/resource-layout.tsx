import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import type { workspaceContext } from "@/server/services/workspace";

type Context = Awaited<ReturnType<typeof workspaceContext>>;
export function ResourceLayout({
  context,
  active,
  title,
  description,
  action,
  children,
}: {
  context: Context;
  active: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <AppShell
      active={active}
      workspace={{
        name: context.organization.name,
        email: context.user.email ?? "Minha conta",
        role: context.membership.role,
      }}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight break-words">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action && context.membership.role === "owner" && (
          <Link href={action.href} className={buttonVariants()}>
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </AppShell>
  );
}

export function AccessDenied() {
  return (
    <div role="alert" className="rounded-xl border bg-white p-6">
      <h2 className="font-semibold">Acesso de leitura</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Somente administradores podem criar ou editar recursos desta organização.
      </p>
    </div>
  );
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white p-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function Pagination({
  pathname,
  page,
  count,
  pageSize,
  search = "",
  filters = {},
}: {
  pathname: string;
  page: number;
  count: number;
  pageSize: number;
  search?: string;
  filters?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const url = (number: number) =>
    `${pathname}?${new URLSearchParams({ ...filters, page: String(number), q: search })}`;
  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span className="text-muted-foreground">
        {count} registro(s) · Página {page} de {pages}
      </span>
      <div className="flex gap-3">
        {page > 1 && (
          <Link href={url(page - 1)} className="text-primary underline">
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link href={url(page + 1)} className="text-primary underline">
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
export function SearchForm({
  pathname,
  search,
  label,
}: {
  pathname: string;
  search: string;
  label: string;
}) {
  return (
    <form action={pathname} className="mb-5 flex max-w-lg gap-2">
      <label htmlFor="q" className="sr-only">
        {label}
      </label>
      <input
        id="q"
        type="search"
        name="q"
        defaultValue={search}
        maxLength={120}
        placeholder={label}
        className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus-visible:outline-ring"
      />
      <button type="submit" className="rounded-lg border bg-white px-4 py-2 text-sm font-medium">
        Buscar
      </button>
    </form>
  );
}
