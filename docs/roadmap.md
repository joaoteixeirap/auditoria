# Roadmap

Atualizado em 8/10/2026. O usuário autorizou a continuidade das fases.
Ler [handoff.md](handoff.md) e [workflow.md](workflow.md) para retomar.
Implementação local e ativação remota são estados distintos.

## Fases 0 e 1 — base, acesso e dados

- [x] Next.js App Router, React, TypeScript strict, Tailwind e shadcn/ui.
- [x] ESLint, Prettier, Vitest, Playwright e scripts de validação.
- [x] Auth SSR, onboarding atômico, organizações e papéis owner/member.
- [x] Clientes/chatbots: cadastro, edição, arquivamento, busca e paginação.
- [x] Versões imutáveis e dashboard com dados reais.
- [x] Migration remota e marcadores confirmados; testes locais de RLS.
- [ ] Validar integralmente e-mails, cookies e CRUD com contas reais existentes.
- [x] Convites por código, e-mail confirmado, papéis administrador/membro e revogação de convite.
- [x] Cadastro direto de chatbot da empresa, mantendo vínculos de clientes antigos.
- [ ] Validar esses fluxos autenticados após migrations B2B/equipe no remoto.

## Fase 2 — demonstração do hackathon

- [x] Bot determinístico defeituoso/corrigido e dez cenários curados.
- [x] Auditorias, progresso persistido, retomada, cancelamento e evidências.
- [x] ERROR separado de FAIL; critérios e condições preservados em snapshots.
- [x] Reteste/comparação compatível, histórico e métricas reais.
- [x] Migration remota e ciclo PostgreSQL local: 3 PASS/7 FAIL → 10 PASS.
- [x] Usuário confirmou ciclo completo e acesso aos detalhes em 8/10/2026.
- [x] E2E autenticado opt-in implementado sem exigir OpenAI.
- [ ] Executar E2E autenticado remoto com sessão e autorização de gravação.

## Fase 3 — fontes de respostas

- [x] HTTP message-text-v1, versão imutável, SSRF, DNS/IP fixado e timeout.
- [x] HTTP JSON configurável: método, headers, query, corpo, extração e sessão.
- [x] Teste de conexão autorizado, credenciais/configuração criptografadas.
- [x] Tokens criptografados no servidor; snapshots sem credenciais.
- [x] CSV validado no servidor, pré-visualização e origem importada explícita.
- [x] Testes locais de conectores, criptografia e persistência/isolamento.
- [ ] Aplicar 202610080001_http.sql e 202610080002_workflow.sql no remoto.
- [ ] Validar HTTP com chatbot real autorizado quando a equipe tiver endpoint.
- [ ] Validar CSV no fluxo autenticado remoto.

## Fase 4 — políticas e avaliação semântica

- [x] Políticas manuais privadas, versões imutáveis e aprovação humana.
- [x] Modelos de rascunhos para seis categorias e limites informados pela empresa.
- [x] Novas auditorias HTTP exigem políticas privadas aprovadas e avaliador semântico.
- [x] TXT/PDF com limites, extração de texto e Storage privado com RLS.
- [x] Sugestões da IA como rascunhos, sem aprovação automática.
- [x] Responses API/Structured Outputs no servidor, modelo explícito e Zod.
- [x] Evidência literal exigida; saída inválida/incompleta é ERROR.
- [x] Testes locais com API controlada, documentos e RLS de políticas/Storage.
- [ ] Configurar chave/modelo OpenAI e executar avaliação real autorizada.
- [ ] Validar upload/download, isolamento e aprovação no Supabase remoto.

## Fase 5 — decisão, relatório e publicação

- [x] Revisão humana de achados sem alterar o resultado original.
- [x] Decisão de liberação com bloqueio de falhas pendentes, ERROR e INCONCLUSIVE.
- [x] PDF com evidências, histórico, limitações e snapshot imutável.
- [x] Download privado por URL assinada e gráficos com contagens reais.
- [x] Dashboard empresarial separa HTTP real, demonstração e CSV; histórico por versão.
- [x] Reteste preserva a bateria original; comparação verifica critérios, origem e avaliador.
- [x] Paginação das listagens centrais; limites explícitos nas novas listagens.
- [x] Build e roteiro de publicação preparados em deployment.md.
- [ ] Validar revisão/PDF autenticados e serviço remoto de Storage.
- [ ] Publicar Vercel com acesso da equipe e conferir domínio/Auth/runtime PDF.

## Fase 6 — operação inicial

- [x] Limites persistentes: 10 cenários, 1 auditoria ativa e 100 mensais.
- [x] Consumo de IA e resultado persistidos atomicamente/idempotentemente.
- [x] Estimativa opcional por preços configurados, sem custo zero presumido.
- [x] Página de uso e histórico de erros técnicos sem logs de conteúdo privado.
- [ ] Aplicar 202610080003_usage.sql e validar métricas/consumo remotos.
- [ ] Filas duráveis/lotes/controle de chamadas concorrentes, se exigidos por escala.
- [ ] Observabilidade operacional externa e alertas antes do uso em escala.

Não há gateway de pagamento, WhatsApp, monitoramento agendado, automação de
browser ou white-label avançado no MVP. As fases não estão concluídas em
produção enquanto os itens de ativação, validação real e publicação estiverem abertos.

Monitoramento futuro e roteiro de ativação B2B: [b2b-alinhamento.md](b2b-alinhamento.md).
