import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Blocks,
  Check,
  ClipboardCheck,
  Code2,
  Database,
  GitCompareArrows,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigurationStatusPanel } from "@/features/setup/configuration-status";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const foundation = [
  {
    icon: Code2,
    title: "Aplicação e tipagem",
    detail: "Next.js App Router, React e TypeScript strict.",
  },
  {
    icon: Blocks,
    title: "Interface reutilizável",
    detail: "Tailwind CSS, shadcn/ui e ícones Lucide.",
  },
  {
    icon: Database,
    title: "Integração preparada",
    detail: "Clientes Supabase para navegador e servidor.",
  },
];

const nextSteps = [
  {
    number: "01",
    title: "Organize sua operação",
    detail: "Sua empresa, seus chatbots e suas políticas, com isolamento de dados.",
    phase: "Fase 1",
  },
  {
    number: "02",
    title: "Execute a primeira auditoria",
    detail: "Cenários determinísticos, evidências e resultados persistidos no Supabase.",
    phase: "Fase 2",
  },
  {
    number: "03",
    title: "Compare antes de entregar",
    detail: "Reteste a versão corrigida e investigue melhorias e regressões.",
    phase: "Fase 2",
  },
];

export default function HomePage() {
  if (getSupabaseConfigurationStatus() === "configured") redirect("/dashboard");
  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Configuração inicial
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Prepare o espaço da sua empresa
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            A base do Auditor de IA está pronta. Configure a infraestrutura para iniciar o uso do
            seu primeiro fluxo de auditoria.
          </p>
        </div>
        <Link href="/settings" className={buttonVariants({ size: "lg" })}>
          Configurar Supabase
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <ConfigurationStatusPanel status={getSupabaseConfigurationStatus()} />
      <section aria-labelledby="foundation" className="mt-9">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="foundation" className="text-base font-semibold">
            Fundação do produto
          </h2>
          <Badge variant="outline" className="gap-1.5 bg-white">
            <Check size={13} aria-hidden="true" />
            Implementada
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {foundation.map(({ icon: Icon, title, detail }) => (
            <Card key={title} className="shadow-none">
              <CardHeader>
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <div className="mt-9 grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">O caminho até a primeira auditoria</CardTitle>
              <Badge variant="secondary">Próximos marcos</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-7">
              {nextSteps.map((step) => (
                <li key={step.number} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-slate-50 font-mono text-xs text-slate-500">
                    {step.number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <span className="text-xs text-slate-500">{step.phase} · Implementada</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="border-indigo-100 bg-indigo-50/40 shadow-none">
          <CardHeader>
            <ShieldCheck size={24} className="mb-2 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Evidências para decidir com confiança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              O fluxo demonstrativo testa um assistente comercial fictício contra uma política de
              desconto máximo de 10%.
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <ClipboardCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm leading-5">
                  Investigue a pergunta, a resposta e a regra violada.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <GitCompareArrows
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm leading-5">Execute a mesma bateria na versão corrigida.</p>
              </div>
            </div>
            <p className="mt-6 border-t border-indigo-100 pt-4 text-xs leading-5 text-slate-600">
              A demonstração é reproduzível e funciona sem API de IA.
            </p>
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Configure o Supabase para acessar os cadastros e as auditorias persistidas. Funcionalidades
        futuras estão identificadas na navegação.
      </p>
    </AppShell>
  );
}
