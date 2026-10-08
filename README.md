# Auditor de IA

Integração Atendimento VestCasa (Botpress Vibe/Viber): veja o
[diagnóstico e roteiro da demonstração](docs/botpress-vestcasa.md).

SaaS B2B para empresas brasileiras auditarem seus próprios chatbots contra
políticas internas, investigarem evidências e compararem versões.

**Marco atual: fluxo das Fases 3 a 5 implementado localmente; ativação remota pendente.**
Além da demonstração validada manualmente, há HTTP, CSV com pré-visualização,
políticas versionadas, documentos privados, avaliação semântica com OpenAI,
revisão humana, decisão de liberação, PDF e métricas reais de resultados/consumo.
As duas migrations iniciais estão no Supabase; as cinco novas precisam ser
aplicadas. Veja [ativação e validação do fluxo](docs/workflow.md).

**Para retomar com outra pessoa ou IA, começar por [docs/handoff.md](docs/handoff.md).**
Em 8 de outubro de 2026, o usuário confirmou o ciclo completo e o acesso aos
detalhes das auditorias. O E2E autenticado remoto continua pendente.

## Requisitos e instalação

- Node.js **24 LTS** e npm.
- Um projeto Supabase com as migrations das Fases 1 e 2 instaladas.
- OpenAI não é necessário para a demonstração ou CSV com regras curadas.
- Regras personalizadas e sugestões exigem chave/modelo Gemini ou OpenAI no servidor.
  Veja [configuração Gemini e teste real](docs/gemini.md).
- Docker não é obrigatório.

Na raiz do workspace:

```sh
npm ci
npm run dev
```

Abra <http://localhost:3000>. `/settings` orienta a configuração;
`/register` cria sua conta e `/login` permite entrar.

### Esta máquina Windows

Nesta máquina, Node.js 24.13.0 está no PATH: usar `npm.cmd run dev`,
`npm.cmd run check` e `npm.cmd run build` no PowerShell.
O wrapper abaixo atende à máquina anterior, com runtime portátil em `.tools`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run dev
```

Use o mesmo wrapper para outros comandos, por exemplo `run check`, `run build`
e `run start`. Em outra máquina, instale Node.js 24 LTS e use npm normalmente;
o runtime portátil não será versionado.

## Configuração do Supabase

1. Crie seu projeto no [painel Supabase](https://supabase.com/dashboard).
2. Abra Project Settings → API e localize Project URL e Publishable key.
3. Copie o arquivo de exemplo e edite localmente:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

| Variável                               | Finalidade                                  |
| -------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL HTTPS do projeto                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública com prefixo `sb_publishable_` |

As variáveis ficam vazias no exemplo. Nunca use `sb_secret_*` ou `service_role`
nelas, e nunca envie secrets na conversa. A configuração inicial aceita as
publishable keys modernas; chaves legadas `anon` em JWT não são aceitas.

Reinicie o servidor após editar `.env.local`. Em `/settings`, clique em
**Testar conexão real**. O servidor verifica Supabase Auth e o marcador público
da migration sem gravar dados ou revelar credenciais. O resultado não certifica RLS.

`APP_URL` define a origem da aplicação para e-mails. Em desenvolvimento usa
`http://localhost:3000` quando ausente. Em produção, preencha com o domínio HTTPS,
sem caminho, antes do build. Não é uma variável pública nem uma credencial.

Clientes browser e SSR estão em `src/lib/supabase`. O servidor fornece fábricas
distintas para leitura em Server Components e escrita de cookies em Server
Actions/Route Handlers. `refreshSession` está ligado ao `proxy.ts` nas rotas
autenticadas. Cada operação também verifica identidade com `getUser()` e
membership atual, sem utilizar service_role.

## Autenticação e primeiro uso

Em Supabase → Authentication → URL Configuration:

- Site URL em desenvolvimento: `http://localhost:3000`.
- Redirect URLs: `http://localhost:3000/auth/callback` e
  `http://localhost:3000/auth/callback?next=/reset-password`.
- Para produção, substitua pelo domínio HTTPS publicado e configure `APP_URL`.

O callback implementa PKCE. Para confirmar e-mail ou recuperar senha em outro
navegador, configure os templates em Authentication → Email Templates:

Confirm signup:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

Reset password:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a>
```

Mantenha a confirmação de e-mail habilitada. O envio usa o Supabase Auth e seus
limites. Antes de atender usuários externos, verifique as restrições do remetente
padrão no painel e configure SMTP para produção.

Fluxo: criar conta → confirmar e-mail → criar organização → cadastrar chatbot →
configurar conexão → adicionar e aprovar políticas → executar auditoria →
analisar evidências → gerar PDF. Administradores gerenciam; membros consultam.
Em Empresa e equipe, administradores geram convites individuais por código,
válidos por sete dias e vinculados ao e-mail confirmado do destinatário.
O código é compartilhado manualmente; a aplicação não envia e-mails de convite.
Clientes antigos continuam preservados como vínculo opcional, sem intermediário obrigatório.
Até 5 organizações por usuário podem ser criadas e selecionadas pelo menu da conta.

Clientes e chatbots podem ser arquivados na edição. Exclusão física não é exposta
para preservar vínculos. Ambiente Demonstração usa o conector fictício;
Homologação/Produção aceita configuração HTTP por versão. CSV avalia respostas
importadas, com identificação explícita da origem. O motor demonstrativo não
usa API externa de IA.

## Demonstração da auditoria

Use um chatbot ativo no ambiente
Demonstração. Em `/audits/new`, selecione a versão com falhas intencionais e
os 10 cenários, prepare a auditoria e clique em Executar cenários.

Depois investigue as evidências, registre uma versão com comportamento corrigido
e reteste a mesma bateria. O ciclo esperado e os limites da validação estão em
[docs/handoff.md](docs/handoff.md). O ciclo completo passou nos testes locais
com PostgreSQL; o usuário confirmou o ciclo manual e o acesso aos detalhes em
8 de outubro de 2026. O E2E autenticado remoto ainda não foi executado.

## Qualidade

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run supabase:check
npm run catalog:check
npm run format:check
npm run check
npm run build
```

`npm run format` formata arquivos. `typecheck` gera os tipos das rotas antes de
executar TypeScript. `check` reúne lint, typecheck, Vitest e formatação.
Vitest verifica configuração, validação, redirects, limites e conexão, além
da migration real em PostgreSQL embutido (PGlite) com roles anon/authenticated.
Somente o contrato de Auth é adaptado no teste; RLS e constraints não são mocks.

Playwright verifica redirects de rotas privadas, validação e navegação móvel.
Não envia cadastros ou e-mails. Configure as variáveis públicas para esses testes.
Para Chromium, execute `npx playwright install chromium`. Nesta máquina, use
o Edge já instalado:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run test:e2e
```

O teste remoto de conexão só executa com `E2E_LIVE_SUPABASE=1`; é somente leitura.
Login, e-mails e CRUD com conta real ainda precisam de validação manual. Nunca
envie sua senha na conversa.

## Banco e migrations

Migrations: `supabase/migrations/202610070001_phase1.sql` e
`supabase/migrations/202610070002_phase2.sql`, nessa ordem.
Em um projeto novo, abra SQL Editor e execute o arquivo inteiro uma vez.
Uma transação impede instalação parcial. Não reexecute quando
`npm run supabase:check` confirmar os marcadores `phase1-v1` e `phase2-v1`.

No projeto existente, aplicar somente as cinco migrations novas, em ordem:
`202610080001_http.sql`, `202610080002_workflow.sql`, `202610080003_usage.sql`,
`202610080004_b2b.sql` e `202610080005_memberships.sql`.
Elas habilitam HTTP, políticas/Storage/CSV/revisão/PDF e métricas/consumo.
O roteiro completo está em [docs/workflow.md](docs/workflow.md).

Também pode usar Supabase CLI: `supabase login`,
`supabase link --project-ref <referência>` e `supabase db push`.
Se já aplicou pelo SQL Editor, marque a migration como aplicada antes de adotar
o CLI: `supabase migration repair 202610070001 --status applied`.
Não execute repair em outro projeto sem conferir o schema.

`src/types/database.ts` representa o contrato das migrations locais, mantido
manualmente. Gerar os tipos pelo CLI a partir do schema remoto é uma
evolução recomendada; não foi feito nesta sessão.

## Publicação

A preparação da Vercel, variáveis e validação está em
[docs/deployment.md](docs/deployment.md). Build usa `npm run build`, sem APIs
externas ou downloads de fontes. Nenhum deploy foi realizado. As alterações
permanecem na branch de continuidade, sem commit ou push automático.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Entrega e validação do alinhamento SaaS B2B](docs/b2b-alinhamento.md)
- [Configuração segura do Gemini e teste real fictício](docs/gemini.md)
- [Diagnóstico e correção de timeout do Gemini](docs/gemini-timeout.md)
- [Banco e segurança](docs/database.md)
- [Conector HTTP e habilitação da Fase 3](docs/http-connector.md)
- [Fluxo completo e ativação das fases seguintes](docs/workflow.md)
- [Publicação na Vercel](docs/deployment.md)
- [Roadmap](docs/roadmap.md)
- [Verificações](docs/validation.md)
- [Verificações da Fase 1](docs/validation-phase1.md)
- [Passagem do projeto e estado atual](docs/handoff.md)
- [Convenções para agentes e desenvolvedores](AGENTS.md)

O produto apoia decisões humanas sobre os cenários efetivamente testados.
Não constitui certificação jurídica, garantia de segurança ou prova de
conformidade integral com a LGPD.
