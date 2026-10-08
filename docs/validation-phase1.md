# Verificações da Fase 1

Executadas em 7 de outubro de 2026, no workspace Windows.

Após adicionar as dependências da Fase 1, `npm audit --omit=dev` retornou zero
vulnerabilidades reportadas em produção.

## Verificações executadas

| Verificação                                   | Resultado                                 |
| --------------------------------------------- | ----------------------------------------- |
| Supabase Auth remoto, usando `.env.local`     | HTTP 200                                  |
| Migration aplicada pelo usuário no SQL Editor | Marcador `phase1-v1` confirmado no remoto |
| `npm run lint`                                | Aprovado, zero erros e avisos             |
| `npm run typecheck`                           | Aprovado                                  |
| `npm run test`                                | 41 testes em 4 arquivos aprovados         |
| `npm run format:check`                        | Aprovado                                  |
| `npm run build`                               | Aprovado com as rotas da Fase 1 e proxy   |
| Playwright com Edge headless                  | 5 testes aprovados                        |

## RLS e integridade

13 cenários executam a migration SQL real no PostgreSQL embutido PGlite.
O contrato de auth.users/auth.uid é adaptado ao ambiente de teste; as roles,
políticas RLS, grants, constraints e funções são reais e executadas pelo banco.

Cobertura: SELECT por organização, acesso por IDs manipulados, usuário sem
membership, member sem permissão de alteração, bloqueio de autopromoção,
INSERT entre organizações, FKs compostas, colunas imutáveis, versões preservadas,
rollback do cadastro de agente quando a versão falha, cadastro/edição/arquivamento
de cliente, onboarding atômico, acesso anon e DELETE protegido por FK.

Os demais testes verificam validação pública, senhas/inputs, redirects fechados,
paginação, limite por processo e respostas controladas no teste de conexão.

## Navegador

Os testes Playwright usaram o Edge instalado e o servidor de desenvolvimento
que o usuário já tinha aberto em localhost:3000. Esse servidor foi preservado.
Não foram criadas contas nem enviados e-mails pelo agente.

- Oito rotas privadas redirecionam usuários sem sessão para login.
- Cadastro rejeita e-mail inválido e senha curta antes de enviar ao servidor.
- Recuperação exige e-mail válido.
- O botão de conexão realiza a chamada real, identifica a migration e altera o
  badge para “Conexão verificada”.
- Navegação móvel funciona em viewport 390 × 844, sem overflow horizontal.

Um teste detectou overflow na configuração causado pela largura mínima dos
cards com blocos de código; o layout foi corrigido e os cinco testes passaram.

Reprodução nesta máquina, que precisa de um diretório temporário existente:

```powershell
New-Item -ItemType Directory -Path '.tools\playwright-tmp' -Force | Out-Null
$env:TEMP = "$PWD\.tools\playwright-tmp"
$env:TMP = $env:TEMP
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:E2E_LIVE_SUPABASE = '1'
powershell -ExecutionPolicy Bypass -File scripts/npm.ps1 run test:e2e
```

A verificação remota é opt-in e somente leitura. Sem `E2E_LIVE_SUPABASE`, esse
teste é explicitamente pulado; os outros quatro verificam a interface local.

## Limites e validação manual restante

Ainda não foi executado o ciclo com uma conta real: criação/entrega dos e-mails,
confirmação, login, renovação/expiração, logout, troca de organização e CRUD
autenticado no Supabase remoto. O usuário deve executar esse fluxo sem enviar
senha ao agente. Não houve deploy.

O marcador da migration confirma a instalação esperada, mas não é uma inspeção
administrativa das políticas remotas. Os testes de RLS são locais com a SQL
versionada, não uma alegação de teste multi-tenant remoto autenticado.

Limites adicionais de endpoints são por processo e reiniciam com a instância;
Supabase Auth mantém seus próprios limites. Para produção, revisar SMTP,
domínios permitidos e controle de abuso do ambiente de hospedagem.

Os cinco avisos transitivos de desenvolvimento do ESLint da Fase 0 continuam
documentados em [validation.md](validation.md). Não foi aplicado downgrade do
Next.js nem `npm audit fix --force`.
