# Auditor de IA — convenções de desenvolvimento

## Continuidade

Antes de alterar o projeto, ler [docs/handoff.md](docs/handoff.md) para conhecer
o estado atual, verificações, migrations já aplicadas e o ponto de retomada.
O usuário encerrou o trabalho em 7 de outubro de 2026 antes da validação manual
da Fase 2. Aguardar nova solicitação para retomar; não reinicializar a aplicação
nem reaplicar as migrations existentes.

## Escopo e arquitetura

- Projeto único Next.js App Router, React e TypeScript strict.
- Interface e documentação em português brasileiro.
- `src/app`: rotas, layouts, Server Actions e Route Handlers.
- `src/components/ui`: componentes shadcn/ui mantidos no repositório.
- `src/components/layout`: estrutura visual compartilhada.
- `src/features`: código específico de uma funcionalidade.
- `src/lib`: configuração e utilitários compartilhados.
- Conforme necessário, criar `src/server/services`, `repositories`, `connectors` e
  `evaluators`. Não criar diretórios ou abstrações vazias.
- Consultas ao Supabase ficam em repositories. Regras de auditoria não ficam em React.
- Server Components por padrão. Client Components somente para interatividade real.

## Segurança

- Validar entradas no servidor com Zod. Não usar `any` para contornar tipos.
- Segredos, conectores externos e chamadas à IA exclusivamente no servidor.
- Nunca colocar chaves secret, service_role ou OpenAI em `NEXT_PUBLIC_*`.
- Usar a publishable key e a sessão do usuário nas operações comuns.
- Antes de persistir dados de usuários: migrations, RLS, vínculos de organização
  e testes de isolamento. Nunca desativar RLS para contornar falhas.
- Validar sessão com `getClaims()` ou `getUser()`, nunca confiar em `getSession()`.
- Autorização de organização e papéis deve ser verificada em cada operação no servidor.
- Não registrar tokens, documentos, respostas privadas ou dados pessoais em logs.
- Conectores HTTP exigirão proteção contra SSRF, limites e credenciais criptografadas.
- Preservar resultados originais e snapshots em auditorias e revisões humanas.
- Erros técnicos não são falhas comportamentais.

## Interface e manutenção

- Componentes acessíveis, labels claros, foco visível e layout responsivo.
- Não mostrar métricas falsas. Funcionalidades pendentes devem ser identificadas.
- Reutilizar componentes shadcn/ui; adicionar outros quando necessários.
- Estados vazios, loading e erro são parte da funcionalidade.
- Manter funções pequenas, responsabilidade definida e dependências justificadas.
- Atualizar README e docs ao concluir cada fase.

## Verificação

```sh
npm run check
npm run build
```

Nesta máquina sem Node no PATH, usar `powershell -ExecutionPolicy Bypass -File
scripts/npm.ps1 run check` (runtime local ignorado em `.tools`).

Testar regras críticas, permissões, isolamento e conectores. Não exigir chave de
OpenAI nos testes. Não alegar testes remotos, RLS ou E2E que não foram executados.
Playwright verifica redirects, formulários e navegação na Fase 1. Na Fase 2,
adicionar o fluxo da auditoria demonstrativa. Não criar usuários remotos de
teste nem enviar e-mails de teste sem autorização explícita; verificação de
conexão pode ser somente leitura.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
