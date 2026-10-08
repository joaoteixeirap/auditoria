# Arquitetura inicial

## Modelo SaaS B2B atual

Cada empresa usa uma organização independente. O fluxo principal cadastra seus
próprios chatbots, sem exigir cadastro de cliente ou agência. `organizations`,
`profiles` e `organization_members` continuam como fonte de identidade e acesso.
A camada `clients` é mantida para compatibilidade: um registro interno por
organização atende às FKs existentes; vínculos antigos permanecem intactos.

`create_company_agent` resolve esse vínculo no servidor. Convites individuais
armazenam somente hash do código, exigem e-mail confirmado, expiram em sete dias
e não permitem promoção de membro existente. UI e RLS mantêm administrador com
gravação e membro com leitura; nenhuma operação usa service_role.

`http-json-v1` parametriza método, headers, query, corpo e caminhos JSON. A
configuração inteira é criptografada com contexto organização/versão, além dos
limites e proteção SSRF já existentes. `message-text-v1` continua compatível.
Auditorias HTTP novas exigem cenários privados aprovados e avaliação semântica.
Retestes copiam o snapshot original, mesmo após mudanças de políticas. Dashboard
real exclui demonstração e CSV; comparações exigem critérios, origem, avaliador
e contexto compatíveis. Ver [entrega B2B](b2b-alinhamento.md).

## Aplicação única e módulos por funcionalidade

Next.js App Router concentra UI, Server Actions e Route Handlers. Supabase é
a infraestrutura de PostgreSQL, Auth e Storage. Não há Prisma, backend separado,
Redis, monorepo ou infraestrutura obrigatória com Docker.

Existem módulos de autenticação, organização, clientes, agentes e auditorias,
repositories tipados e formulários com React Hook Form/Zod. Rotas e consultas
usam Server Components; formulários interativos são Client Components.
O status de ambiente é lido por páginas dinâmicas, não fixado no build.

## Fluxo de dados previsto

```mermaid
flowchart LR
  UI[Interface] --> Actions[Server Actions e Route Handlers]
  Actions --> Services[Services por funcionalidade]
  Services --> Repositories[Repositories com sessão do usuário]
  Repositories --> DB[Supabase PostgreSQL e RLS]
  Services --> Connectors[Conectores de chatbot no servidor]
  Services --> Evaluators[Avaliadores isolados da UI]
```

Services e repositories atendem aos cadastros e auditorias persistidas.
O DemoConnector executa respostas fictícias determinísticas; o avaliador
processa essas respostas e os resultados são salvos no banco. Não há timers
de progresso nem métricas inventadas para preencher a interface.

## Supabase SSR

- `client.ts`: cliente browser com configuração pública validada.
- `server.ts`: cliente somente leitura para renderização e cliente que pode
  escrever cookies para Actions e Route Handlers. Não há catch que silencie erros.
- `session.ts`: helper de renovação com `getClaims()`, cookies sincronizados
  entre request/response e resposta privada sem cache. Está ligado ao `proxy.ts`,
  preservando cookies em redirects.
- `config.ts`: validação compartilhada com Zod, sem credenciais de serviço.

Cada operação confirma identidade com `getUser()` e consulta membership.
O cookie HttpOnly da organização é validado contra os vínculos do usuário.
Owner pode cadastrar/editar; member só lê. RLS protege também o acesso direto.

Server Actions usam a verificação de origem do Next.js. Auth tem os limites do
Supabase e limites adicionais por processo com chaves hash e teto de requisições.
Os limites locais reiniciam com a instância e não são controle distribuído;
o limite persistente de autenticação permanece no Supabase.
Não são registrados tokens nem erros remotos completos. Logs de callbacks de
autenticação são omitidos no desenvolvimento.

## Decisões e trade-offs

- Tailwind v4 e componentes shadcn/ui versionados permitem evolução visual simples.
- Fonte do sistema evita dependência de downloads no build.
- URL/chave vazias não impedem a aplicação base de iniciar. Operações reais
  exigirão configuração válida; não existe fallback de dados em memória.
- Publishable keys modernas são aceitas; JWTs legados ficam fora da base inicial.
- Auditorias usam uma requisição por cenário, com persistência atômica. Não há
  background volátil; ao fechar a página, resultados salvos podem ser retomados.
- React Hook Form atende aos formulários da Fase 1; Playwright verifica os
  redirects, validação e navegação. Gráficos acessíveis usam contagens reais,
  renderizadas no servidor com CSS, sem dependência adicional de gráficos.

Referências: [Next.js](https://nextjs.org/docs/app/getting-started/installation),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
e [shadcn/ui](https://ui.shadcn.com/docs/installation/manual).

## Motor da Fase 2

`ChatbotConnector` separa envio de mensagens da avaliação. `executeTest` trata
falhas técnicas como ERROR. O avaliador exige evidência reconhecida; ausência
de evidência suficiente gera INCONCLUSIVE, não PASS.

Os critérios são snapshots do catálogo no banco. O catálogo SQL foi gerado de
uma fonte JSON e a consistência é verificada por `npm run catalog:check`.
Uma vez aplicada a migration, mudanças de catálogo precisam de nova migration.

RPCs com permissão owner criam auditorias e acrescentam resultados de forma
atômica. Grants impedem alterações diretas nos snapshots e evidências.
Idempotência, row locks e uma execução ativa por organização evitam duplicação.
Não há service_role nas operações da aplicação.

A comparação verifica os critérios preservados antes de declarar correções e
regressões. A taxa é PASS/(PASS+FAIL); erros e inconclusivos são separados.
O estado atual e os testes pendentes estão em [handoff.md](handoff.md).

## Conector HTTP da Fase 3

Homologação e Produção usam configuração HTTP imutável por versão. Demonstração
preserva o conector determinístico. O tipo de conexão do cadastro é sincronizado
pelo banco quando o ambiente muda; auditorias anteriores preservam seus snapshots.
Não foi adicionado backend separado, worker ou dependência npm.

HttpConnector executa o contrato message-text-v1 com HTTPS nativo do Node,
IP público validado e fixado no socket, timeout e limites de resposta. Tokens
são criptografados no servidor e nunca entram nos snapshots. Repositories
centralizam a configuração; Actions validam sessão, organização e papel owner.
A execução reaproveita o avaliador e a persistência existentes. Ver
[http-connector.md](http-connector.md) para contrato, segurança e limitações.

## Políticas, CSV, revisão e relatórios

Repositories centralizam cenários privados, documentos/Storage, revisões,
decisões e relatórios. Server Actions validam Zod, sessão, organização e owner.
Cenários aprovados entram no snapshot do banco, sem modificar o catálogo global.
CSV usa o mesmo motor e persistência, lendo respostas do snapshot sem conexão externa.

O avaliador semântico chama Responses API via fetch no servidor, com Structured
Outputs e validação Zod. Modelo explícito é preservado no snapshot. Evidência
literal é verificada novamente; saída inválida é ERROR. Não há SDK OpenAI.

`pdf-parse` extrai texto de documentos privados; `pdf-lib` gera relatórios.
São as duas novas dependências de produção, justificadas pela leitura e geração
de PDF. Buckets privados têm RLS por organização e downloads assinados curtos.
Revisões, decisões, versões e snapshots de PDFs são acrescentados sem sobrescrita.

A persistência de consumo e resultados de IA é atômica. Não há fila durável nem
garantia de chamada externa única; resultados salvos são idempotentes. Limites,
estimativas e validações pendentes estão em [workflow.md](workflow.md).
