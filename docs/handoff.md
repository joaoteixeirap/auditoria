# Passagem do projeto — equipe e próxima IA

Atualizado em **8 de outubro de 2026**.

VestCasa agora também no Dify Cloud: conexão real HTTP e Gemini validadas em
memória; diagnóstico/correção em [dify-validacao.md](dify-validacao.md).
Prazo Dify 30 s, demais HTTP 10 s; logs seguros e erros específicos na interface.
115 testes e build aprovados; não alegar fluxo autenticado salvo ou PDF Dify.

Atendimento VestCasa publicado no Botpress Vibe/Viber: investigação em
[botpress-vestcasa.md](botpress-vestcasa.md). Chat API não consta dos canais
documentados do Viber; aguarda conferência em Deploy > Channels da conta.
Nenhum adaptador ou chamada real implementado/executado sem essa confirmação.
Demonstração imediata possível por coleta manual no Webchat + CSV + Gemini/PDF.

O usuário confirmou CSV com Gemini, falha, revisão humana e PDF. Verificação
de isolamento/decisão: [validacao-isolamento.md](validacao-isolamento.md).
RLS local: 32 testes aprovados; REST remoto anônimo bloqueado com HTTP 401 nas
cinco tabelas privadas. Matriz autenticada remota depende das duas sessões
capturadas pelo usuário via scripts/check-organization-isolation.mjs --capture.
Decisão está implementada como select, administrador/concluída; visibilidade
na sessão do usuário ainda precisa de conferência. URLs assinadas de 60 s são
autorização temporária transferível; registrar essa ressalva ao isolamento por URL.

Correção posterior do timeout Gemini: [gemini-timeout.md](gemini-timeout.md).
Prazo total 75 s, até duas tentativas transitórias, logs somente de metadados,
temperatura padrão e thinking minimal. Avaliação real pós-correção aprovada:
PASS em 3.876 ms, FAIL em 12.698 ms, HTTP 200 e evidências literais.
Nenhuma operação no banco remoto nesta correção. Auditoria CSV anterior com
ERROR deve ser preservada; criar nova importação para conferir o fluxo corrigido.
Verificação final desta correção: 108 testes em 15 arquivos, check e build
aprovados. Nenhuma migration, dependência, commit, push ou deploy nesta rodada.

Gemini foi adicionado como provedor opcional, preservando OpenAI. Configuração
e teste real opt-in: [gemini.md](gemini.md). A chave fica exclusivamente em
GEMINI_API_KEY no backend. Nenhuma chave foi cadastrada automaticamente.
O usuário cadastrou a chave em `.env.local`. O teste real com dados fictícios
passou com gemini-3.1-flash-lite: PASS e FAIL esperados, evidência literal e
consumo de tokens. Modelo inicial 2.5 retornou HTTP 404; somente a variável
de modelo foi ajustada, sem alterar a chave. Check: 102 testes; build aprovado.
Em duas repetições posteriores houve timeout de 30 segundos. Não declarar
estabilidade da API; manter erro técnico separado de falha comportamental.

## Estado atual

O usuário autorizou continuar e terminar as fases. A implementação local das
Fases 3 a 5 e a medição inicial da Fase 6 estão prontas para ativação/validação.
O alinhamento SaaS B2B foi implementado depois dessa rodada, preservando a base.
Consultar [b2b-alinhamento.md](b2b-alinhamento.md) para a entrega mais recente.
As sete migrations foram aplicadas pelo usuário e seus marcadores confirmados
por leitura em 8/10/2026. Gemini está configurado; não exige OpenAI para esse fluxo.
Não declarar o projeto concluído em produção: faltam validação autenticada das
novas funcionalidades, endpoint real de chatbot e publicação na Vercel.

Projeto único Next.js App Router, React, TypeScript strict, Tailwind/shadcn,
Supabase Auth/PostgreSQL/Storage, Zod, Vitest e Playwright. Sem backend separado,
Prisma, Redis ou Docker obrigatório. Node.js 24.13.0 instalado no PATH.
Branch atual: `chore/validacao-fase2`. Nenhum commit ou push foi feito nesta
continuidade. Não alterar main diretamente nem enviar código automaticamente.

## Implementado e preservado

- Fases 0/1: base responsiva em português, autenticação SSR, onboarding,
  organizações, owner/member, clientes/chatbots, versões imutáveis e dashboard.
- Fase 2: dez cenários curados, bot fictício defeituoso/corrigido, execução por
  cenário, progresso salvo, retomada, cancelamento, evidências e comparação.
  O usuário confirmou manualmente o ciclo completo e acesso aos detalhes em
  8/10/2026; não informou contagens separadamente.
- Fase 3: HTTP message-text-v1, SSRF com DNS/IP fixado, limites/timeout,
  credenciais AES-256-GCM e configuração imutável por versão. CSV validado,
  pré-visualização e avaliação de respostas preservadas, sem chamar chatbot.
- Fase 4: políticas privadas versionadas, rascunho/aprovação humana, upload
  TXT/PDF privado, extração de texto, sugestões da IA como rascunhos e avaliação
  semântica com Responses API/Structured Outputs. Modelo explícito no snapshot.
- Fase 5: revisões de achados e decisões humanas append-only, bloqueio de
  liberação no servidor e RLS, relatórios PDF privados com snapshot imutável,
  links assinados e gráficos de resultados reais. Publicação preparada em docs.
- Fase 6 inicial: consumo de avaliações persistido atomicamente, estimativa
  opcional de custo, limites persistentes existentes e visualização em /usage.
  Não há filas duráveis, worker, lotes em background ou alertas operacionais.

PASS/FAIL exigem evidência literal. Falhas técnicas são ERROR; evidência
insuficiente é INCONCLUSIVE. Taxa: PASS/(PASS+FAIL); critérios diferentes não
produzem comparação equivalente. Revisões não sobrescrevem resultados originais.

## Banco remoto e próximo passo

Já aplicadas pelo usuário e verificadas somente por leitura:

1. `supabase/migrations/202610070001_phase1.sql`
2. `supabase/migrations/202610070002_phase2.sql`

As cinco incrementais abaixo também foram aplicadas pelo usuário e seus
marcadores confirmados. **Não reaplicar nem editar nenhuma das sete migrations.**

1. `202610080001_http.sql`
2. `202610080002_workflow.sql`
3. `202610080003_usage.sql`
4. `202610080004_b2b.sql`
5. `202610080005_memberships.sql`

`npm run supabase:check` confirmou Auth HTTP 200 e todos os sete marcadores
instalados após o usuário informar a aplicação dos arquivos. O comando não grava
dados nem mostra credenciais; marcadores não substituem testes remotos de RLS.
Se adotar Supabase CLI, reconciliar o histórico aplicado pelo SQL Editor antes
de db push/repair. Não desativar RLS nem usar service_role.

Roteiro completo: [workflow.md](workflow.md). Próximo passo: validar manualmente
com contas existentes e dados fictícios, sem reaplicar migrations.
Não criar usuários remotos ou enviar e-mails de teste sem autorização explícita.

## Configuração e serviços pendentes

`.env.local` está presente e ignorado pelo Git. Nunca imprimir seu conteúdo.
A configuração Supabase já funciona. Chave/modelo OpenAI e acesso Vercel não
estavam disponíveis na checagem local; foi perguntado ao usuário quais serviços
possui, sem solicitar secrets. O usuário informou que não há chatbot real.

Variáveis novas, exclusivamente no servidor:

- CONNECTOR_ENCRYPTION_KEY: 32 bytes em hexadecimal, necessária para toda conexão
  HTTP configurável e para Bearer HTTP legado.
- OPENAI_API_KEY e OPENAI_EVALUATOR_MODEL: necessárias para avaliação semântica
  e sugestões. Sem modelo padrão; escolher modelo compatível com Structured Outputs.
- OPENAI_INPUT_USD_PER_MILLION e OPENAI_OUTPUT_USD_PER_MILLION: preços opcionais,
  sem pressupor valores. Custo ausente aparece como não calculado.

OpenAI não é necessária para build, testes ou demonstração. Upload não envia
texto à IA; sugestões e avaliações exigem autorização na interface. Não houve
chamada real à OpenAI ou chatbot externo nesta entrega.

PDF usa pdf-parse para extração e pdf-lib para geração: as únicas duas novas
dependências de produção desta etapa, justificadas previamente ao usuário.
Não foi instalada CLI de publicação. Veja [deployment.md](deployment.md).
Sem commit/push, importação Git na Vercel não inclui as alterações locais;
um deploy da pasta pode ser realizado com CLI autenticada após revisar a entrega.

## Verificação

A rodada anterior está registrada em [validation-workflow.md](validation-workflow.md).
A rodada B2B mais recente está em [b2b-alinhamento.md](b2b-alinhamento.md).
SQL real foi executado no PGlite, com contrato mínimo local de Auth e Storage.
Isso verifica RLS/constraints e permissões locais, não o serviço remoto de Storage.
OpenAI e transporte HTTP foram testados com respostas controladas, sem tokens reais.

O ciclo PostgreSQL preservado produziu v1 = 3 PASS + 7 FAIL; v2 = 10 PASS,
com sete correções. Isso é resultado dos testes locais, distinto da confirmação
manual do usuário. E2E autenticado de gravação não foi executado.

## Execução e E2E

Usar `npm.cmd run dev`, `npm.cmd run check`, `npm.cmd run build` no PowerShell.
Em máquina sem Node no PATH, usar o wrapper `scripts/npm.ps1`, se o runtime
portátil .tools estiver disponível. Em nova máquina: Node 24 e npm ci.
O servidor de desenvolvimento existente foi preservado.

Playwright/Edge verifica rotas privadas, formulários e navegação sem cadastrar
usuários. `E2E_LIVE_SUPABASE=1` permite conexão somente leitura.
O fluxo autenticado opt-in está em `tests/e2e/audit-demo.spec.ts` e exige sessão
local .tools/e2e-state.json, E2E_AGENT_ID de agente demo próprio e autorização
explícita para E2E_WRITE_SUPABASE=1. Não salvar nem compartilhar a sessão no Git.
O script `npm run test:e2e:session` permite login manual no navegador sem pedir senha.

## Limitações a preservar

- Dez cenários, uma auditoria ativa e cem auditorias mensais por organização.
- Execução avança pela página; fechar permite retomar, mas não executa em background.
- Persistência idempotente não garante chamada externa única; concorrência ou
  falha antes de salvar pode repetir chamadas e gerar consumo adicional.
- Rate limits em memória não são controle distribuído de gastos.
- Uso mostra até 1.000 avaliações persistidas; não inclui sugestões de regras,
  falhas sem consumo retornado nem toda a conta do provedor. Custos são estimativas.
- Listagens novas têm limites explícitos (até 100); ver workflow.md.
- PDF: até 1 MB, 20 páginas e 50 mil caracteres; sem OCR/senha. Caracteres fora
  da fonte do relatório viram ? apenas na apresentação; snapshot mantém original.
- Upload e metadados não são uma transação conjunta: falha pode deixar arquivo
  privado órfão, para manutenção administrativa.
- Buckets privados e RLS precisam ser conferidos também no ambiente remoto.
- Preservar snapshots, versões, vereditos e evidências; nunca fabricar métricas.
- Convites por código e papéis administrador/membro implementados localmente;
  remoção de membros e alteração de papéis de membros existentes ficam para evolução.
- Filas, billing, WhatsApp e monitoramento agendado não estão implementados.

## Arquivos de entrada

Ler AGENTS.md, este handoff, README, docs/roadmap.md e docs/workflow.md.
Código: src/features/audits, src/features/policies, src/server/repositories,
src/server/connectors, src/server/evaluators e src/server/services.
Testes de banco: src/server/database/audits.test.ts e rls.test.ts.
Migrations anteriores são imutáveis; as novas ainda aguardam instalação remota.

Remote origin informado anteriormente: https://github.com/joaoteixeirap/auditoria.git.
Levar código, docs, migrations e package-lock.json; excluir node_modules, .next,
.tools, .env.local e sessões. Nenhum deploy foi realizado.
