# Isolamento entre organizações e decisão humana

8/10/2026. Escopo: revisão das migrations, testes locais com SQL real, leituras
remotas e URLs. Nenhum dado remoto foi cadastrado, editado ou excluído pelo agente.
Nenhuma migration, operação destrutiva, commit ou push foi executado.

## Validação informada pelo usuário

O usuário concluiu importação CSV, avaliação Gemini, identificação de falha,
revisão humana e geração de PDF. Isso confirma esse fluxo manual específico,
sem substituir os testes de isolamento entre duas contas.

## Decisão de liberação

A funcionalidade existe em `src/features/audits/human-review.tsx`,
`review-form.tsx`, `review-actions.ts` e nas políticas de `release_decisions`.
A página `/audits/[id]` inclui HumanReview. O formulário aparece para
administrador (`owner`) quando a auditoria está `completed`; membros consultam
o histórico. Na página de um achado o formulário é de revisão, não de liberação.

Nos detalhes da auditoria, antes da tabela de resultados, procurar:

- Seção “Decisão humana e relatório”.
- Campo “Decisão humana de liberação”.
- Opções “Aguardar revisão”, “Bloquear liberação”, “Liberar nos cenários testados”.
- Justificativa e botão “Registrar no histórico”.

Os testes de renderização usam os componentes reais, com histórico controlado:
administrador/concluída mostra decisão e PDF; membro, auditoria em andamento e
página do achado não oferecem liberação. Dois testes passaram. Não foi necessário
reimplementar a funcionalidade ou alterar sua permissão.

O backend e a RLS impedem liberação com ERROR/INCONCLUSIVE e falhas cuja revisão
mais recente não seja descarte justificado. Confirmar uma falha não a resolve:
usar decisão de bloqueio ou corrigir/retestar. Resultados originais permanecem.

**Pendência UI-01:** verificar na sessão do usuário por que o campo não foi
localizado. Ainda não reproduzido no navegador autenticado. Se o PDF estiver no
mesmo bloco, o formulário compartilha a condição administrador/concluída; conferir
código servido, atualização da página e localização do campo. Não relaxar regras
de liberação para corrigir uma questão de visibilidade.

## Revisão RLS e autorização

| Recurso                | Proteção na implementação                                                   |
| ---------------------- | --------------------------------------------------------------------------- |
| Chatbots/versões       | RLS por membership; gravação por administrador; FKs compostas               |
| Políticas privadas     | custom_scenarios por organization_id; RPC verifica administrador e vínculos |
| Documentos             | policy_documents por membership; caminho organização/UUID; bucket privado   |
| Auditorias/resultados  | membership, snapshots imutáveis; RPCs autorizadas e vínculos compostos      |
| Relatórios             | audit_reports por membership; FK organização/auditoria; bucket privado      |
| Downloads da aplicação | sessão + organização + consulta por ID/organization_id antes de assinar     |

O catálogo demonstrativo global é intencionalmente compartilhado; não contém
políticas privadas das empresas. Não há service_role nas operações comuns.
RPCs security definer verificam membership/papel; funções privadas têm
search_path explícito e grants restritos. Não foram modificadas políticas.

## Resultados executados

### PostgreSQL local

`npm.cmd exec vitest -- run src/server/database/rls.test.ts src/server/database/audits.test.ts`
passou com **32 testes em dois arquivos**. São migrations reais executadas no
PGlite, não mocks de RLS; os contratos mínimos de Auth/Storage são locais.

A matriz acrescentada cria fixtures somente no banco efêmero: usuários A/B,
chatbots, regras privadas, documentos, auditorias e relatórios. Cada usuário lê
seus próprios IDs como controle positivo; os mesmos IDs da outra organização
retornam zero linhas, **nos dois sentidos e sem filtro de organização na consulta**.
Caminhos exatos de Storage também são invisíveis para a outra empresa. Anon não
possui SELECT nas tabelas privadas e não vê os objetos.

Os demais testes cobrem FKs entre empresas, permissões administrador/membro,
snapshots/versões imutáveis, documentos/Storage, relatórios, revisões, decisões,
convites e RPCs. Não certificam o serviço remoto de Storage ou drift do banco.

### Supabase remoto sem sessão

Consultas REST somente leitura, usando a publishable key e sem JWT de usuário:

| Tabela           | HTTP | Resultado                |
| ---------------- | ---- | ------------------------ |
| agents           | 401  | Acesso anônimo bloqueado |
| custom_scenarios | 401  | Acesso anônimo bloqueado |
| policy_documents | 401  | Acesso anônimo bloqueado |
| audit_runs       | 401  | Acesso anônimo bloqueado |
| audit_reports    | 401  | Acesso anônimo bloqueado |

Isso comprova bloqueio anônimo nessas consultas, não isolamento entre usuários
autenticados. Definições atuais de pg_policies no remoto não foram obtidas com
acesso administrativo; marcadores de migration não comprovam ausência de drift.

### Navegação sem sessão e verificação completa

`npm run check` passou: **111 testes em 16 arquivos**, lint, TypeScript,
catálogo e formatação. `npm run build` concluiu com sucesso.
Playwright passou com **5 testes**, usando Edge e Supabase real sem operações
de gravação (`E2E_WRITE_SUPABASE=0`). Playwright inclui IDs
diretos de chatbot/auditoria e URLs de documentos/relatórios, sem login, criação
de contas, cadastro ou e-mail. Não confundir redirects de usuário anônimo com
teste A/B autenticado.

## Teste autenticado remoto preparado

O usuário informou que já existem duas contas. A tentativa de abrir o navegador
pelo ambiente do agente não ficou visível no desktop do usuário. A execução
ficou incompleta: há um arquivo local da conta A, mas não há sessão da conta B
nem resultados autenticados A/B. A existência do arquivo não comprova que a
sessão esteja válida. Não foram solicitadas senhas ou tokens na conversa.

No terminal do VS Code, executar:

```powershell
node scripts/check-organization-isolation.mjs --capture
```

Entrar manualmente na conta A e depois B e acessar a organização existente.
As contas precisam ser distintas e não podem ter membership na organização
oposta. Não criar dados de produção para completar lacunas do teste.

Sessões ficam em `.tools/isolation-a.json` e `isolation-b.json`, ignoradas pelo
Git. São segredos: não compartilhar, copiar para docs ou enviar na conversa.
Para repetir com sessões ainda válidas:

```powershell
node scripts/check-organization-isolation.mjs
```

O script lê metadados mínimos dos cinco recursos existentes, confirma acesso
próprio e tenta acessar os IDs estrangeiros sem filtro de organização. Testa
URLs da aplicação, Storage autenticado, URL pública sem sessão, RPC de equipe
da outra empresa e presença do formulário de decisão em auditoria concluída.
Nenhuma ação de auditoria, revisão ou decisão é submetida.

Arquivos inexistentes ou recursos ausentes ficam **PENDING**, nunca PASS.
Resultados são salvos em `.tools/isolation-results.json`, sem IDs, nomes,
URLs assinadas, conteúdo privado ou credenciais. A matriz autenticada remota
só pode ser declarada comprovada depois de esses testes efetivamente passarem.

## Ressalva de URLs assinadas — pendência SEC-01

Os Route Handlers atuais devolvem 303 para URLs assinadas do Supabase, válidas
por 60 segundos. A organização é verificada antes da emissão, mas a URL completa
contém uma autorização temporária: quem a possuir poderá baixar o arquivo durante
a validade, sem uma nova verificação da membership da aplicação.

Isso é diferente de acessar um ID ou URL privada sem assinatura. Não indica por
si só falha na RLS, mas **não atende à interpretação estrita de que nem uma URL
válida compartilhada de B pode ser aberta por A**. O script registra esse caso
separadamente como SIGNED_URL_BEARER_ACCESS; nenhum link será impresso.

Se o requisito for conferir organização a cada download, substituir o redirect
por entrega do arquivo pelo backend autenticado, com sessão/membership/RLS em
cada GET, Cache-Control private/no-store e sem expor signedUrl no navegador.
Isso pode ser feito localmente sem migration destrutiva. Não foi alterado nesta
rodada de verificação; não interrompe os testes CSV/Gemini/revisão/PDF.

Comportamento documentado pelo [Supabase](https://supabase.com/docs/guides/storage/serving/downloads).
