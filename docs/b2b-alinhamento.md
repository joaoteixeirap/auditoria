# Entrega técnica — alinhamento SaaS B2B

Data: 8/10/2026. Branch: `chore/validacao-fase2`. Alterações locais, sem commit,
push, deploy ou aplicação de migrations remotas. Nenhuma credencial foi alterada.

## 1. O que já estava correto

Next.js App Router, React e TypeScript strict concentram a aplicação existente.
Server Components, Server Actions, repositories, conectores e avaliadores já
separavam interface, dados e regras. A identidade visual e os componentes
shadcn/ui foram preservados. Não foi criado outro projeto ou backend.

Supabase Auth SSR valida identidade no servidor. `organizations`, `profiles` e
`organization_members` representam empresas, usuários e vínculos. RLS e FKs
compostas protegiam organização, chatbot, versão, auditoria e evidência.
Administradores escrevem; membros consultam. Publishable key mais sessão é o
contrato comum, sem service_role.

Já existiam demonstração identificada, versões/snapshots imutáveis, motor
incremental, comparação, políticas/documentos privados, avaliação semântica,
CSV, revisão humana e PDF. HTTP tinha SSRF, IP fixado, timeout, limites e
criptografia de Bearer. Parte dessas funcionalidades vinha da continuidade
local anterior, ainda aguardando ativação remota. Tudo foi reaproveitado.

## 2. O que mudou

### Empresa independente e equipe

O fluxo principal agora é empresa → chatbot, sem agência ou cliente obrigatório.
`clients` permanece como compatibilidade: um registro interno por organização
atende às FKs existentes; clientes antigos não são apagados ou desvinculados.
Novas organizações recebem esse registro automaticamente. Cadastro e criação
de organização não exigem intervenção manual da equipe.

Empresa e equipe permite convites de administrador/membro por código de uso
único, sete dias e destinatário com e-mail confirmado. Somente o hash é armazenado.
Administradores revogam convites pendentes. Não há envio automático de e-mails,
remoção de membros ou troca de papel de membros existentes nesta entrega.

### Conexão, políticas e auditoria

HTTP genérico admite GET/POST/PUT/PATCH, headers, autenticação Bearer/customizada,
query, corpo JSON, extração de resposta e identificador de sessão. A configuração
inteira é criptografada no backend e nunca retornada à UI ou aos relatórios.
O contrato antigo continua compatível. Testar conexão exige autorização e não
persiste a resposta como auditoria.

Novas auditorias HTTP exigem políticas próprias aprovadas e avaliador semântico.
O catálogo fictício fica na demonstração; sua utilização em CSV requer confirmação
explícita. Modelos manuais criam rascunhos para as seis categorias, com desconto
e reembolso baseados em limites informados pela empresa. Documentos TXT/PDF e
sugestões da IA permanecem privados; sugestões nunca são aprovadas automaticamente.

A execução identifica chatbot/versão, congela políticas e contexto, envia perguntas
ao endpoint, preserva respostas, avalia, classifica e registra evidência. O avaliador
recebe pergunta, resposta, critério, política, categoria, gravidade esperada e
finalidade/setor. PASS/FAIL exigem evidência literal; evidência insuficiente é
INCONCLUSIVE; falha técnica é ERROR. Gravidade é configurada no critério da empresa.
A IA pode errar; revisão humana acrescenta dados sem apagar resultados originais.

### Painel, PDF e comparação

O painel agrega somente auditorias HTTP concluídas: testes, taxa, falhas críticas,
categorias e histórico por versão. Demonstrações e CSV são identificados e ficam
fora dessas métricas. Taxa = PASS/(PASS+FAIL); erros e inconclusivos aparecem
separadamente. Não há métricas simuladas.

Reteste copia exatamente a bateria original, mesmo após edições das políticas.
A comparação verifica fingerprint, avaliador/modelo, origem e contexto antes de
declarar regressão/correção. Histórico com critérios diferentes não representa
evolução diretamente comparável.

PDF preserva políticas, expectativas, respostas, vereditos, justificativas,
gravidade, recomendações, evidências e revisões. Origem e limitações são explícitas,
sem prometer certificação jurídica ou segurança absoluta.

## 3. Arquivos modificados

`git status --short` lista todas as alterações ainda não commitadas, incluindo
trabalho anterior. Os principais arquivos desta rodada são:

| Área                 | Arquivos                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empresa/equipe       | `src/features/organizations/invitation-actions.ts`, `invitation-forms.tsx`, `src/server/repositories/memberships.ts`, páginas organizations/onboarding                                                                                |
| Cadastro/conexão     | `src/features/agents/actions.ts`, `agent-form.tsx`, `connection-form.tsx`, `connection-schema.ts`, `http-contract.ts`, páginas de cadastro/edição/detalhes, `src/lib/validations/entities.ts`, `src/server/repositories/resources.ts` |
| HTTP                 | `src/server/connectors/http.ts`, `connection.ts`, `http.test.ts`                                                                                                                                                                      |
| Políticas            | `src/features/policies/presets.ts`, `presets.test.ts`, `forms.tsx`, `actions.ts`, schemas de categorias                                                                                                                               |
| Auditoria            | `src/server/repositories/audits.ts`, `src/server/services/audit-form.ts`, `audit-engine.ts`, `src/features/audits/actions.ts`, `new-audit-form.tsx`, `schemas.ts`, `import-actions.ts`, `import-form.tsx`                             |
| Avaliação/comparação | `src/server/evaluators/semantic.ts`, `semantic.test.ts`, `src/features/audits/comparison.ts`, `audits.test.ts`, página de comparação                                                                                                  |
| Painel/PDF           | `src/server/repositories/company.ts`, `src/features/audits/company-dashboard.tsx`, `audit-table.tsx`, `audit-table.test.ts`, `labels.ts`, páginas dashboard/detalhes de auditoria, `src/server/services/report-pdf.ts`                |
| Contratos/testes     | `src/types/database.ts`, `src/server/database/audits.test.ts`, `scripts/check-supabase.mjs`, `tests/e2e/phase1.spec.ts`, `.env.example`                                                                                               |
| Navegação/textos     | `src/components/layout/app-shell.tsx`, `src/components/shared/resource-layout.tsx`, páginas inicial/settings                                                                                                                          |
| Documentação         | `README.md`, `docs/architecture.md`, `database.md`, `handoff.md`, `roadmap.md`, `workflow.md`, `http-connector.md`, `relatorio-tecnico.md`, este relatório                                                                            |

Nenhuma dependência foi instalada nesta rodada B2B. As dependências PDF da
continuidade anterior foram reutilizadas.

## 4. Migrations criadas

1. `202610080004_b2b.sql`: compatibilidade segura de clientes, cadastro direto,
   configuração HTTP criptografada, categoria escopo, políticas privadas
   obrigatórias, reteste com snapshot e agregações empresariais.
2. `202610080005_memberships.sql`: convites por hash, expiração, destinatário
   confirmado, aceitação/revogação e consulta autorizada de equipe.

São incrementais, sem apagar dados ou recriar tabelas existentes. As duas de
7/10 não foram modificadas nem reaplicadas. Antes das novas, aplicar também
`202610080001_http.sql`, `202610080002_workflow.sql` e `202610080003_usage.sql`
da continuidade anterior. Cinco migrations pendentes ao todo.

## 5. Verificações executadas

- `npm.cmd run check`: passou; ESLint, TypeScript, **98 testes em 14 arquivos**,
  consistência do catálogo e formatação.
- `npm.cmd run build`: passou, compilação e geração das rotas concluídas.
- SQL real no PGlite: preservação de dados anteriores, novas organizações com
  cadastro direto, isolamento, owner/member, cenários privados, reteste após edição
  da política, idempotência, dashboard sem demonstração e convites seguros.
- HTTP/avaliador controlados: configuração, extração, sessão, templates,
  credenciais, SSRF, limites e evidência. Nenhum chatbot externo foi chamado.
- `npm.cmd run supabase:check`: somente leitura; Auth HTTP 200, Fases 1 e 2
  instaladas; os cinco marcadores seguintes retornaram HTTP 404.

Playwright/Edge: a primeira rodada teve quatro testes aprovados e uma falha porque
o teste móvel ainda procurava o item antigo Clientes. A expectativa foi atualizada
para Empresa e equipe; a repetição passou com **cinco testes em 25,9 segundos**:
redirects privados, validação de cadastro/recuperação, conexão Supabase somente
leitura e navegação móvel sem overflow. `E2E_WRITE_SUPABASE=0`; não houve gravação
autenticada. Após a documentação final, `npm.cmd run format:check` e
`git diff --check` também passaram.

## 6. Funcionalidades efetivamente validadas

Regras, SQL, RLS, constraints e permissões foram executados localmente, com usuários
e roles de teste locais. O serviço remoto de Auth responde e os marcadores
iniciais existem. A demonstração anterior foi confirmada visualmente pelo usuário.
Mocks de transporte/IA não comprovam compatibilidade com chatbot ou modelo real.

Não foram validados: login com contas reais no fluxo novo, RLS remoto depois das
migrations, upload/download remoto, convites reais, OpenAI real, chatbot real,
PDF remoto ou publicação. Chave/modelo e endpoint não estavam disponíveis.
Não foi criado usuário remoto nem enviado e-mail de teste.

## 7. Pendências e evolução futura

Prioridade imediata: aplicar as cinco migrations pendentes no projeto correto,
configurar segredos no servidor e validar o fluxo abaixo com contas existentes
e chatbot autorizado. Conferir isolamento no Supabase remoto, Storage e papéis.
Publicação e SMTP de produção continuam pendentes.

Limites do MVP: dez testes por auditoria, uma ativa e cem mensais por organização.
Fechar a página interrompe o avanço, com retomada dos resultados salvos.
Concorrência/falha antes de persistir pode repetir chamadas externas. Limites em
memória não são controle distribuído de gastos. Não há worker/fila durável.
HTTP não implementa streaming, OAuth renovável ou sessão multi-turno. Documentos
não têm OCR; sugestões precisam de revisão humana.

Monitoramento futuro deverá reutilizar auditorias e snapshots:

1. Agendamento vinculado à organização, versão e bateria aprovada, com fuso,
   frequência, consentimento e orçamento/limites persistentes.
2. Worker com autorização restrita por organização, lease, idempotência e retomada;
   sem desativar RLS ou colocar credenciais nas tarefas.
3. Comparação somente de critérios/avaliadores equivalentes, distinguindo falhas,
   erros técnicos e inconclusivos.
4. Alertas por regressão/limiar para destinatários autorizados, sem respostas
   privadas no texto; links exigem sessão e acesso à organização.
5. Histórico, pausas, cancelamento, retenção e controles de custo antes de escala.

Nenhuma tabela vazia ou integração de agendamento foi criada. Cobrança, planos,
alertas, novas integrações e white-label ficam como evolução futura.

## 8. Como executar e testar o fluxo completo

1. Revisar/aplicar somente as cinco migrations pendentes, em ordem, conforme
   [workflow.md](workflow.md). Não reaplicar as duas iniciais. Nenhuma alteração
   remota foi feita automaticamente nesta entrega.
2. Manter URL/publishable key Supabase em `.env.local`; configurar somente no
   servidor `CONNECTOR_ENCRYPTION_KEY`, `OPENAI_API_KEY`, `OPENAI_EVALUATOR_MODEL`.
   Não usar `NEXT_PUBLIC_*` para secrets ou trocar chave de criptografia existente.
3. Executar `npm.cmd run dev`, abrir `http://localhost:3000`. Reiniciar somente
   se alterar variáveis. Em outra máquina: Node 24 e `npm ci`.
4. Criar/confirmar conta ou usar conta existente; criar/selecionar organização.
   Testar convite com destinatário autorizado e e-mail confirmado.
5. Cadastrar chatbot da empresa com finalidade/setor em Homologação, sem cliente
   obrigatório. Configurar conexão conforme [http-connector.md](http-connector.md).
   Autorizar o teste somente contra endpoint que a empresa tenha autorizado.
6. Adicionar políticas reais manualmente ou por TXT/PDF, revisar os rascunhos
   e aprovar. Informar limites verdadeiros, sem assumir os exemplos como requisitos.
7. Preparar auditoria da versão com essas regras, autorizar envio ao chatbot e
   ao avaliador, executar. Conferir pergunta/resposta, evidência, justificativa,
   gravidade e recomendação. ERROR não deve aparecer como reprovação comportamental.
8. Revisar achados e gerar PDF; conferir preservação do resultado original e
   bloqueio de documento, relatório e auditoria de outra organização.
9. Registrar nova versão/conexão, retestar a bateria original e comparar.
10. Conferir painel; executar `npm.cmd run check` e `npm.cmd run build`.
    Registrar validação autenticada no handoff.

O produto apoia decisões humanas sobre cenários testados. Não oferece certificação
jurídica, prova de conformidade integral ou segurança absoluta.
