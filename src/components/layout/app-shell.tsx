import Link from "next/link";
import {
  Bot,
  ChevronDown,
  FileChartColumn,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";

const navigation: { label: string; icon: typeof Bot; href?: string; phase?: string }[] = [
  { label: "Visão geral", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Chatbots", icon: Bot, href: "/agents" },
  { label: "Auditorias", icon: FlaskConical, href: "/audits" },
  { label: "Políticas", icon: ShieldCheck, href: "/policies" },
  { label: "Empresa e equipe", icon: Users, href: "/organizations" },
  { label: "Importar CSV", icon: FileChartColumn, href: "/audits/import" },
  { label: "Relatórios", icon: FileChartColumn, href: "/reports" },
  { label: "Uso", icon: FileChartColumn, href: "/usage" },
  { label: "Configuração", icon: Settings2, href: "/settings" },
];

function Navigation({ active }: { active: string }) {
  return (
    <nav aria-label="Navegação principal" className="space-y-1">
      {navigation.map(({ label, icon: Icon, href, phase }) =>
        href ? (
          <Link
            key={label}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100",
              active === href ? "bg-indigo-50 text-indigo-800" : "text-slate-600",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ) : (
          <span
            key={label}
            aria-disabled="true"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500"
          >
            <Icon size={18} aria-hidden="true" />
            {label}
            <span className="ml-auto text-[11px]">{phase}</span>
          </span>
        ),
      )}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Auditor de IA, início">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
        <ShieldCheck size={24} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-base font-bold tracking-tight">Auditor de IA</span>
        <span className="block text-[11px] text-slate-500">Qualidade em cada entrega</span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  active = "/",
  workspace,
}: {
  children: React.ReactNode;
  active?: string;
  workspace?: { name: string; email: string; role: "owner" | "member" };
}) {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 bg-white p-4 focus:not-sr-only focus:absolute">
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-white px-5 py-7 lg:flex">
        <Brand />
        <div className="mt-9 rounded-lg border bg-slate-50 p-3">
          <p className="truncate text-xs font-semibold">
            {workspace?.name ?? "Configure sua organização"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {workspace
              ? workspace.role === "owner"
                ? "Administrador · Gerenciamento"
                : "Membro · Leitura"
              : "Entre para acessar sua organização"}
          </p>
        </div>
        <p className="mb-3 mt-8 px-3 text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
          Plataforma
        </p>
        <Navigation active={active} />
        <div className="mt-auto rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <LockKeyhole size={18} className="text-primary" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold">Segurança desde a base</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Dados protegidos por sessão, permissões no servidor e políticas RLS por organização.
          </p>
        </div>
        <p className="mt-5 px-1 text-[11px] text-slate-500">UNISANTA · Hackathon 2026</p>
      </aside>
      <div className="lg:pl-64">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b bg-white px-5 sm:px-9">
          <div className="lg:hidden">
            <Brand />
          </div>
          <p className="hidden text-sm text-slate-500 lg:block">
            Organização <span className="mx-3 text-slate-300">/</span>
            <span className="font-medium text-foreground">
              {navigation.find((item) => item.href === active)?.label ?? "Configuração inicial"}
            </span>
          </p>
          <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600 sm:flex">
            <span className="size-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
            Auditorias · Demonstração, HTTP e CSV
          </div>
          {workspace ? (
            <details className="relative text-sm">
              <summary className="max-w-44 cursor-pointer truncate font-medium">
                {workspace.email}
              </summary>
              <div className="absolute right-0 z-20 mt-3 w-56 space-y-3 rounded-lg border bg-white p-4 shadow-md">
                <Link href="/onboarding" className="block text-sm text-primary">
                  Criar outra organização
                </Link>
                <Link href="/organizations" className="block text-sm text-primary">
                  Trocar organização
                </Link>
                <form action={signOut}>
                  <button type="submit" className="text-sm text-red-700">
                    Sair da conta
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <Link href="/login" className="text-sm font-medium text-primary">
              Entrar
            </Link>
          )}
        </header>
        <details className="border-b bg-white px-5 py-3 lg:hidden">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
            Navegação
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="pt-3">
            <Navigation active={active} />
          </div>
        </details>
        <main id="main" className="mx-auto max-w-7xl px-5 py-8 sm:px-9 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-5 pb-7 text-xs leading-5 text-slate-500 sm:px-9">
          Auditorias apoiam decisões humanas nos cenários testados. Não constituem certificação
          jurídica ou garantia de conformidade.
        </footer>
      </div>
    </div>
  );
}
