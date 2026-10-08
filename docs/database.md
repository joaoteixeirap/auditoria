# Banco e segurança multi-tenant

**Estado atual:** migrations `202610070001_phase1.sql` e
`202610070002_phase2.sql` aplicadas no Supabase pelo usuário. Os marcadores
remotos `phase1-v1` e `phase2-v1` foram confirmados.
RLS e constraints foram executados no PostgreSQL local com duas organizações;
o fluxo autenticado no remoto ainda precisa da validação com uma conta real.

## Fase 1

Tabelas implementadas: profiles, organizations, organization_members, clients,
agents e agent_versions. UUIDs, timestamps, constraints e índices estão na
migration. `create_organization` cria organização e vínculo owner atomicamente.
`create_agent` cria o agente e a primeira versão em uma única transação.

Foreign keys compostas `(organization_id, client_id)` e
`(organization_id, agent_id)` impedem vínculos entre tenants.
Índices apoiam paginação por organização e created_at e listagem por cliente.

Todas as tabelas têm RLS. Usuários só consultam organizações de que participam.
Owner cadastra/edita; member lê. Membership não tem grants de alteração para
authenticated, impedindo autopromoção. Convites ainda não são expostos na UI.
Funções de membership ficam no schema private, não exposto pela Data API,
com search_path vazio e execute restrito.

Grants por coluna impedem alterar tenant, IDs, created_by e timestamps.
Versões são imutáveis: SELECT/INSERT para os papéis permitidos, sem UPDATE/DELETE.
Não são concedidas exclusões físicas; use status archived em clientes e agentes.
FKs usam RESTRICT para preservar vínculos. Profiles são criados por trigger,
inclusive para usuários existentes no momento da migration.

Os testes em `src/server/database/rls.test.ts` executam a migration real no
PGlite, com roles, políticas, grants, constraints e chamadas RPC reais.
Somente auth.users/auth.uid são adaptados ao ambiente de teste. SELECT entre
tenants retorna vazio; INSERT e alteração de colunas protegidas são recusados.
Também são verificados rollback atômico e imutabilidade de versões.

`phase1_health()` retorna somente uma constante de versão e pode ser chamada
por anon. Nenhuma tabela privada tem SELECT para anon.

## Fase 2

Implementados: test_suites, policy_rules, test_cases, audit_runs,
test_executions, findings e usage_records. O catálogo curado é global,
somente leitura para authenticated, e não contém dados de organizações.
Auditorias, resultados, achados e uso são protegidos por membership da organização.

`agent_versions.demo_revision` identifica o comportamento fictício 1 ou 2.
Versões existentes receberam revisão 1; correções exigem nova versão, sem UPDATE.

RPCs criam snapshots a partir do banco e acrescentam uma execução por transação.
Não há grants diretos de INSERT/UPDATE/DELETE para tabelas de evidências.
Resultados têm unicidade por auditoria/cenário, e evidências PASS/FAIL precisam
estar presentes na resposta armazenada. Cancelamento preserva os registros.

Os testes em `src/server/database/audits.test.ts` executam as duas migrations
e o ciclo persistido v1 → v2 em PostgreSQL local. Não reaplicar as migrations
no projeto remoto. O fluxo manual remoto permanece pendente.

## Fases posteriores

Adicionar agent_connections, policy_documents, políticas personalizadas,
finding_reviews e audit_reports conforme cada módulo for implementado.

Preservar snapshots e evidências históricas. Não usar exclusões em cascata que
destruam auditorias. Revisões humanas são anexadas e não apagam vereditos originais.
Documentos e relatórios ficam em buckets privados com políticas por organização.

Credenciais de conectores serão criptografadas no servidor; a publishable key
é a única chave utilizada nas operações comuns, junto da sessão autenticada.
RLS não será contornado com service_role.
