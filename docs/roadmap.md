# Roadmap

O usuário encerrou o trabalho antes de testar manualmente a Fase 2.
Para retomar, ler [handoff.md](handoff.md). Não avançar sem nova instrução.

## Fase 0 — primeiro marco

- [x] Verificar ambiente e preparar runtime local.
- [x] Next.js App Router, React e TypeScript strict.
- [x] Tailwind CSS e componentes shadcn/ui.
- [x] ESLint, Prettier, Vitest e scripts de validação.
- [x] Clientes Supabase browser/SSR e validação de ambiente.
- [x] Base visual responsiva em português, estados de loading e erro.
- [x] `.env.example`, README, AGENTS e arquitetura inicial.
- [x] Autenticação e dados reais implementados na Fase 1.

O resultado das verificações executadas está em [validation.md](validation.md).

## Fase 1 — acesso e dados reais

- [x] Migration aplicada no remoto e marcador confirmado.
- [x] Testes PostgreSQL locais de RLS e constraints com duas organizações.
- [x] Login, cadastro, logout, recuperação, callbacks e renovação implementados.
- [x] Onboarding atômico, seleção de organização e papéis owner/member.
- [x] Clientes/chatbots: cadastro, edição, arquivamento, busca, paginação e detalhes.
- [x] Versões acrescentadas sem alterar registros anteriores.
- [x] React Hook Form e Zod nos formulários.
- [x] Dashboard com métricas consultadas do banco.
- [ ] Validar fluxo completo com conta real: e-mails, cookies e CRUD remoto.
- [ ] Convites e gerenciamento de membros: evolução futura.

## Fase 2 — demonstração central do hackathon

- [x] Conector determinístico com versões defeituosa e corrigida.
- [x] Dez cenários curados, regras explícitas e veredictos defensáveis.
- [x] Migration aplicada no remoto e marcador confirmado.
- [x] Execução no servidor, persistência incremental e retomada idempotente.
- [x] Cancelamento, progresso, evidências e erros técnicos separados de FAIL.
- [x] Reteste e comparação com indicação de mudança de critérios.
- [x] Histórico no dashboard e registros de utilização.
- [x] Ciclo v1 → v2 executado nos testes locais de PostgreSQL.
- [x] Teste E2E autenticado implementado como opt-in, sem chave OpenAI.
- [ ] Executar o E2E autenticado no remoto com sessão e autorização do usuário.
- [ ] Validar manualmente as auditorias, falhas, reteste e comparação.

## Fases 3 a 5

- HTTP autorizado com SSRF, timeout, limites e credenciais criptografadas.
- CSV validado com pré-visualização e indicação de avaliação importada.
- Políticas manuais, documentos privados, regras sugeridas com revisão humana.
- Avaliação semântica no servidor e resultados estruturados validados.
- Revisão de achados, decisão de liberação e PDF com limitações explícitas.
- Gráficos de dados reais, paginação, deploy Vercel e Supabase.

## Fase 6 — somente após fluxo central

Filas persistentes se necessárias, lotes, concorrência, limites de uso,
medição de custos e observabilidade.

Sem gateway de pagamento, WhatsApp, monitoramento agendado, alertas, automação
de browser ou white-label avançado no MVP.
