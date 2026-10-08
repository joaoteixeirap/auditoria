import type { Metadata } from "next";
import { ExternalLink, KeyRound, Terminal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigurationStatusPanel } from "@/features/setup/configuration-status";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
import Link from "next/link";

export const metadata: Metadata = { title: "Configuração" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ database?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell active="/settings">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Infraestrutura
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Configure o Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Preencha as variáveis no seu computador. Não envie credenciais pela conversa.
        </p>
      </div>
      <ConfigurationStatusPanel status={getSupabaseConfigurationStatus()} />
      {params.database === "pending" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Não foi possível acessar o banco da aplicação. Teste a conexão e confirme se a migration
          foi aplicada no projeto correto.
        </p>
      )}
      <div className="mt-7 grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Configuração local, passo a passo</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-6 text-sm leading-6 break-words">
              <li>
                <h2 className="font-semibold">1. Crie um projeto Supabase</h2>
                <p className="mt-1 text-muted-foreground">
                  No painel do Supabase, crie um projeto. Em Project Settings → API, localize a
                  Project URL e a Publishable key.
                </p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 font-medium text-primary underline underline-offset-4"
                >
                  Abrir painel do Supabase
                  <ExternalLink size={14} aria-hidden="true" />
                  <span className="sr-only"> (nova aba)</span>
                </a>
              </li>
              <li>
                <h2 className="font-semibold">2. Copie o arquivo de exemplo</h2>
                <p className="mt-1 text-muted-foreground">
                  Na raiz do projeto, execute no PowerShell:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                  <code>
                    {"if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }"}
                  </code>
                </pre>
                <p className="mt-3 text-muted-foreground">
                  Edite .env.local e preencha estas duas variáveis com os valores do seu projeto:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg border bg-slate-50 p-4 text-xs">
                  <code>NEXT_PUBLIC_SUPABASE_URL={"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=</code>
                </pre>
              </li>
              <li>
                <h2 className="font-semibold">3. Reinicie a aplicação</h2>
                <p className="mt-1 text-muted-foreground">
                  Encerre o servidor com Ctrl+C e execute npm run dev novamente. Esta página
                  verificará o formato das variáveis.
                </p>
              </li>
              <li>
                <h2 className="font-semibold">4. Instale o banco da Fase 1</h2>
                <p className="mt-1 text-muted-foreground">
                  No SQL Editor do seu projeto, execute uma vez o conteúdo de
                  supabase/migrations/202610070001_phase1.sql. Depois use “Testar conexão real” para
                  confirmar o marcador da instalação. Não reexecute o SQL se a instalação já foi
                  confirmada.
                </p>
              </li>
              <li>
                <h2 className="font-semibold">5. Configure os links de autenticação</h2>
                <p className="mt-1 text-muted-foreground">
                  Em Authentication → URL Configuration, use http://localhost:3000 como Site URL e
                  permita http://localhost:3000/auth/callback e
                  http://localhost:3000/auth/callback?next=/reset-password nos redirects de
                  desenvolvimento. Na publicação, use seu domínio HTTPS e configure APP_URL.
                </p>
                <p className="mt-2 text-muted-foreground">
                  O README explica os templates de confirmação e recuperação com token_hash,
                  inclusive para abrir os e-mails em outro navegador.
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-none">
            <CardHeader>
              <KeyRound size={21} className="mb-2 text-primary" aria-hidden="true" />
              <CardTitle className="text-base">Qual chave utilizar?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Use a chave pública com prefixo sb_publishable_. Chaves secret e service_role não
                são aceitas pela configuração pública.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                O arquivo .env.local está ignorado pelo Git. As duas variáveis NEXT_PUBLIC são
                públicas por definição; a proteção dos dados dependerá de autenticação e RLS.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <Terminal size={21} className="mb-2 text-slate-600" aria-hidden="true" />
              <CardTitle className="text-base">Comece pela sua organização</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Após confirmar a instalação do banco, crie sua conta, confirme o e-mail e faça
                login. O cadastro inicial criará sua organização e seu vínculo como administrador em
                uma única transação.
              </p>
              <Link
                href="/register"
                className="mt-4 inline-block text-sm font-medium text-primary underline"
              >
                Criar minha conta
              </Link>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Consulte README.md e docs/roadmap.md no workspace para acompanhar o progresso.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
