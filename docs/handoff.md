# Passagem do projeto — equipe e próxima IA

Atualizado em **7 de outubro de 2026**.

## Estado no encerramento

O usuário pediu para parar por hoje, sem testar manualmente a Fase 2.
O código está salvo no workspace. Não iniciar novas funcionalidades sem uma
nova instrução do usuário. Este arquivo registra o ponto de retomada.

Projeto: Auditor de IA, SaaS multi-tenant para agências auditarem chatbots.
Workspace atual: `C:\Users\unisanta\Desktop\hackathon`.
Stack: Next.js App Router, React, TypeScript strict, Tailwind, shadcn/ui,
Supabase Auth/PostgreSQL, React Hook Form/Zod, Vitest e Playwright.
Sem Prisma, NestJS, Redis, Docker obrigatório ou chave OpenAI para a demonstração.

## O que está implementado

### Fases 0 e 1

- Base visual responsiva em português, componentes e scripts de qualidade.
- Autenticação Supabase SSR: cadastro, login, logout, recuperação, callbacks.
- Onboarding atômico e seleção da organização com cookie validado no servidor.
- Papéis: owner cadastra/edita; member tem leitura nesta fase.
- Clientes e chatbots: cadastro, edição, busca, paginação, detalhes e arquivamento.
- Versões imutáveis e dashboard com dados consultados no Supabase.
- Migrations, grants por coluna, FKs compostas e políticas RLS.
- O usuário respondeu “feito” ao pedido de executar o primeiro fluxo da Fase 1.
  Isso não é uma verificação automatizada de todos os fluxos de autenticação.

### Fase 2 — implementada, com validação manual remota pendente

- Bot fictício determinístico com revisões 1 (falhas) e 2 (corrigida).
- Dez cenários curados, cobrindo políticas, informações incorretas, privacidade,
  discriminação e resistência à manipulação de instruções.
- Cadastro de versões com seleção explícita do comportamento demonstrativo.
- Auditorias: preparação, execução por cenário no servidor, progresso salvo,
  retomada, cancelamento, histórico e detalhes das evidências.
- Resultados PASS / FAIL / INCONCLUSIVE / ERROR; erro técnico não vira FAIL.
- Snapshots de cliente, agente, versão, regras, cenários e avaliador.
- Comparação de versões com correções, falhas persistentes, regressões e aviso
  quando os critérios não são compatíveis.
- Métricas, histórico no dashboard e registros de uso com custo estimado zero
  para o conector de demonstração.
- Taxa: PASS / (PASS + FAIL) × 100; sem testes conclusivos, não calculável.
- Falha crítica bloqueia elegibilidade; liberação continua sendo decisão humana.

Não existe execução de chatbot HTTP, avaliação OpenAI, upload de PDF, relatório
PDF, revisão humana formal, billing ou deploy nesta entrega.

## Banco remoto — já aplicado

O usuário aplicou pelo SQL Editor do Supabase:

1. `supabase/migrations/202610070001_phase1.sql`.
2. `supabase/migrations/202610070002_phase2.sql`.

O agente verificou **Supabase Auth HTTP 200**, `phase1-v1` e `phase2-v1` no
projeto remoto usando as variáveis locais, sem exibir credenciais.

**Não reaplicar essas migrations.** Para mudanças posteriores, criar uma nova
migration incremental. Não editar SQL já aplicado para tentar atualizar o remoto.
Se adotar Supabase CLI, reconciliar o histórico das migrations aplicadas pelo
SQL Editor antes de `db push`; conferir o projeto e o schema antes de repair.

O arquivo `.env.local` está presente nesta máquina e ignorado pelo Git.
Nunca imprimir seu conteúdo ou pedir secrets na conversa. Em outra máquina,
configurar as variáveis a partir de `.env.example`.

## Verificações realmente executadas

- `npm run check`: passou — lint, tipos, **59 testes em 6 arquivos**,
  consistência do catálogo SQL e formatação.
- `npm run build`: passou com as rotas de auditorias e o proxy.
- PostgreSQL local (PGlite): migrations reais, RLS, constraints, idempotência,
  cancelamento, imutabilidade, erro técnico e o ciclo completo v1 → v2.
- Resultado desse ciclo local: **v1 = 3 PASS + 7 FAIL; v2 = 10 PASS**;
  comparação identificou **7 correções**.
- Playwright/Edge: **5 testes passaram; 1 foi explicitamente pulado**.
  Os aprovados verificaram redirects, validação, conexão remota e navegação móvel.
- O teste pulado é o ciclo autenticado que grava auditorias no Supabase. Ele
  exige sessão salva localmente e autorização explícita para gravação.
- A auditoria completa **não foi testada manualmente pelo usuário**: ele
  preferiu encerrar o trabalho antes dessa validação.

Os testes de RLS foram locais. Marcadores remotos confirmam instalação, não
substituem testes autenticados de isolamento no projeto remoto.

Último audit de produção executado na Fase 1: zero vulnerabilidades reportadas.
Não foram adicionadas dependências npm na Fase 2. Permanecem os cinco avisos
transitivos de desenvolvimento do ESLint descritos em `docs/validation.md`.

## Primeiro passo ao retomar, quando o usuário solicitar

Validar o fluxo manual da Fase 2 antes de iniciar integrações da Fase 3:

1. Entrar com uma conta owner, sem compartilhar a senha com a IA.
2. Usar um cliente fictício e chatbot ativo em ambiente **Demonstração**.
3. Abrir `/audits/new`, selecionar uma versão “Falhas intencionais” e os 10
   cenários. Clicar em **Preparar auditoria → Executar cenários**.
4. Confirmar progresso persistido, 7 falhas, 3 aprovações e evidências. Abrir
   “Investigar falha” no cenário de desconto e conferir o trecho de 20%.
5. Na página do chatbot, registrar um nome de versão ainda não usado, como
   `v2-corrigida`, com comportamento **Versão 2 · Corrigida**.
6. Retestar essa versão com os mesmos cenários: esperar 10 aprovações.
7. Comparar as duas auditorias: esperar critérios compatíveis e 7 correções.
8. Atualizar este arquivo e o roadmap com o resultado observado; corrigir erros
   encontrados antes de ampliar o escopo.

Uma versão chamada `v2` não é automaticamente corrigida. O comportamento
depende de `agent_versions.demo_revision`. Versões antigas receberam revisão 1
na migration; criar uma nova versão com revisão 2, sem alterar o histórico.

## Como executar

Node.js **24 LTS**. Nesta máquina existe runtime portátil em `.tools`, sem
instalação no PATH. No PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run dev
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run check
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run build
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run supabase:check
```

Em outra máquina, instalar Node.js 24 e usar `npm ci`, `npm run dev`,
`npm run check` e `npm run build` normalmente.

O servidor de desenvolvimento existente foi preservado. Para encerrá-lo,
usar Ctrl+C no terminal em que ele está rodando. Isso não apaga arquivos nem
registros já persistidos no Supabase.

## E2E autenticado opcional

O teste está em `tests/e2e/audit-demo.spec.ts`. Somente executar gravações remotas
com autorização do usuário. Ele cria duas auditorias e uma versão de demonstração
no agente escolhido; esses registros permanecem no histórico.

O usuário pode executar `npm run test:e2e:session` localmente, entrar no navegador
e salvar `.tools/e2e-state.json`. O script não pede senha no terminal. Esse
arquivo contém sessão e deve permanecer local, ignorado pelo Git.

Depois definir `E2E_WRITE_SUPABASE=1`, `E2E_AGENT_ID` com o UUID de um agente
demo próprio e executar `npm run test:e2e`. Para Edge instalado, definir
`PLAYWRIGHT_CHANNEL=msedge`. O teste autenticado desabilita trace, vídeo e screenshots.
O teste de conexão somente leitura usa `E2E_LIVE_SUPABASE=1`.

## Limitações que a próxima IA precisa preservar

- Não existe worker em background. A página dispara uma requisição por cenário;
  fechar/pausar interrompe o avanço, e resultados salvos podem ser retomados.
- No máximo 10 cenários por execução e uma execução pending/running por
  organização. Limite inicial: 100 auditorias mensais por organização.
- Catálogo global de demonstração é consultável por authenticated e não contém
  dados de clientes. Auditorias, achados e uso são isolados por organização.
- Regras personalizadas/editáveis não estão implementadas; os critérios
  determinísticos vêm do catálogo curado. Não alegar avaliação semântica geral.
- Não gerar porcentagens comparáveis quando os critérios mudaram.
- Não sobrescrever versões, snapshots, vereditos ou evidências anteriores.
- Não usar service_role em operações comuns nem desativar RLS.
- Não criar resultados fictícios como se fossem auditorias executadas.
- Não editar as migrations aplicadas; alterações de catálogo também precisam
  de nova migration após esta instalação.

## Arquivos de entrada para outra IA

- `AGENTS.md`: convenções e segurança; ler primeiro.
- `README.md`: instalação e uso.
- `docs/architecture.md`: organização e decisões.
- `docs/database.md`: schema e RLS.
- `docs/roadmap.md`: pendências.
- `src/features/audits`: schemas, catálogo, métricas, comparação e UI.
- `src/server/services/audit-engine.ts`: execução e tratamento de erros.
- `src/server/connectors/demo.ts`: respostas determinísticas.
- `src/server/evaluators/deterministic.ts`: avaliação objetiva.
- `src/server/repositories/audits.ts`: consultas e persistência.
- `src/server/database/audits.test.ts`: testes da migration e do ciclo persistido.

## Salvamento e compartilhamento

Os arquivos estão salvos localmente. O repositório Git foi inicializado na
branch `main`, com remoto `origin` apontando para
`https://github.com/joaoteixeirap/auditoria.git`, a pedido do usuário.
Para confirmar os commits e se foram enviados, consultar `git status`,
`git log` e `git remote -v`. Não houve deploy. Um commit local só passa a estar
disponível no GitHub depois de um push bem-sucedido.

Levar código, documentação, migrations e `package-lock.json`. Não incluir
`node_modules`, `.next`, `.tools`, `.env.local` ou sessões de testes. Cada
integrante configura seu ambiente local separadamente.

Sugestão de prompt para outra IA:

> Leia AGENTS.md e docs/handoff.md antes de alterar o projeto. Continue do estado
> documentado, sem reinicializar a aplicação ou reaplicar migrations. A Fase 2
> está implementada, mas seu fluxo autenticado ainda precisa de validação manual.
> Primeiro ajude a validar esse ciclo e corrija os problemas encontrados.
