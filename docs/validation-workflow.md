# Validação da continuidade — 8/10/2026

Branch: chore/validacao-fase2. Sem commit, push ou deploy.

## Verificação local

- Vitest: 87 testes em 12 arquivos. SQL real das cinco migrations no PGlite,
  roles anon/authenticated, organizações distintas, owner/member, RLS,
  FKs compostas, snapshots, versão/aprovação, CSV, revisão, liberação e relatórios.
- HTTP: transporte controlado, SSRF, IP fixado, limites, redirects e criptografia.
- OpenAI: fetch controlado; nenhuma chamada real nem chave real nos testes.
- PDF: leitura de PDF gerado, TXT UTF-8, limites, rejeição de conteúdo vazio e
  geração de relatório paginado. Teste local não comprova o runtime publicado.
- Ciclo preservado: bot v1 3 PASS + 7 FAIL; bot v2 10 PASS; sete correções.
- npm run check: aprovado — lint, tipos, 87 testes, catálogo SQL e formatação.
- npm run build: aprovado — compilação de produção e tipos das rotas.
- Localhost /login: HTTP 200 após o build; servidor existente preservado.

## Navegador

Playwright com Microsoft Edge: **5 testes passaram**, somente phase1.spec.ts.
Verificou redirects sem sessão (incluindo políticas, documentos, importação,
relatórios e uso), validação de cadastro/recuperação, conexão Supabase somente
leitura e navegação em tela pequena. Não criou usuário nem enviou e-mail.

E2E autenticado de gravação não foi executado: não há sessão local salva nem
autorização específica para os registros de teste. O usuário já confirmou
manualmente a demonstração anterior; isso não valida as funcionalidades novas.

## Serviços remotos

npm run supabase:check, somente leitura:

- Auth HTTP 200; phase1-v1 e phase2-v1 instalados.
- phase3_health, phase4_health e phase6_health: HTTP 404, não instalados.

Não foram aplicadas migrations remotas nem feitos testes remotos de isolamento,
Storage, avaliação OpenAI ou endpoint de chatbot. Não há deploy Vercel.
Chaves e conteúdos privados não foram impressos. Próximas verificações:
[workflow.md](workflow.md) e [deployment.md](deployment.md).

O ambiente mínimo de Storage nos testes verifica políticas PostgreSQL; não
reproduz o serviço HTTP de Storage. Custos são estimativas opcionais, sem preços
presumidos ou equivalência com a fatura do provedor.
