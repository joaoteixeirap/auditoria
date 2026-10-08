# Atendimento VestCasa: preparação da demonstração

Verificação em 8/10/2026. Nenhuma chamada ao chatbot, migration, alteração remota,
instalação de dependência ou commit nesta rodada.

Verificação executada nesta rodada: `npm run check` aprovado (111 testes em
16 arquivos, lint, TypeScript, catálogo e formatação); `npm run build` aprovado;
`git diff --check` aprovado. Nenhum teste Botpress remoto ou teste de adaptador
foi executado, pois não há integração HTTP habilitada confirmada para o agente.

## Resultado da investigação

A documentação específica do Botpress Vibe/Viber lista Webchat, WhatsApp,
Telegram, Instagram, Messenger, Slack e Twilio em Deploy > Channels. Não lista
Chat API. A documentação de ferramentas esclarece que Build > Tools configura
ações de saída e não habilita automaticamente um canal de entrada.

Isso não comprova impossibilidade técnica no runtime, mas impede afirmar que
a Chat API pode ser habilitada nesse agente. Não aplicar instruções do Studio
como se fossem instruções do Viber. Conferir o catálogo da conta existente.

Fontes oficiais:

- [Canais do Viber](https://botpress.com/docs/viber/deploy/channels/).
- [Ferramentas e integrações](https://botpress.com/docs/viber/build/tools-and-integrations/).
- [Publicação](https://botpress.com/docs/viber/deploy/publish-and-share/).
- [Chat API](https://botpress.com/docs/api-reference/chat-api/introduction/).
- [Integrações no Studio](https://botpress.com/docs/studio/concepts/integrations/).
- [Planos](https://botpress.com/pricing).

O Free anuncia 100 conversas e três agentes; isso não comprova disponibilidade
da integração Chat no Viber. Conferir cota e recursos na conta. Não recomendar
upgrade como solução sem confirmação do suporte ao canal.

## Ação na conta

Abrir Atendimento VestCasa > Deploy > Channels e conferir se existe Chat ou API.
Não alterar o bot publicado. Se existir, conferir sua configuração e o endereço
oficial; não enviar credenciais na conversa. Se não existir, solicitar ao suporte
oficial um método documentado de entrada HTTP para esse agente específico.

O usuário conferiu a conta nesta rodada e confirmou: **não aparece Chat nem API**.
A configuração HTTP não está disponível nessa interface; a compatibilidade por
outro caminho oficial continua não comprovada. Não afirmar que upgrade resolve.

Studio possui instalação oficial via ícone de integrações (quebra-cabeça), busca
por Chat e configuração da integração. Um bot separado no Studio é alternativa
para demonstrar auditoria HTTP, mas não é automaticamente o Atendimento VestCasa
existente. Criar esse bot ou copiar regras exige autorização e conferência de
equivalência; não presumir migração ou exportação entre os produtos.

## Caminho imediato com o agente existente

1. No Auditor, escolher uma política aprovada e copiar sua pergunta exata e
   chave/ID do cenário. Não inventar regras comerciais da VestCasa.
2. No Webchat publicado, abrir uma conversa nova manualmente e enviar a pergunta.
3. Copiar a resposta completa, sem edição, e anotar versão/publicação e horário.
4. Criar CSV UTF-8 com cabeçalho `cenario,resposta`. Na primeira coluna usar a
   chave/ID real do cenário e na segunda a resposta coletada. Colocar respostas
   entre aspas e duplicar aspas internas. Não usar texto de exemplo como evidência.
5. Abrir /audits/import, selecionar chatbot/versão, conferir a prévia e autorizar
   avaliação com IA. Uma política semântica aprovada usa o Gemini configurado;
   cenários determinísticos não passam automaticamente a usar IA.
6. Iniciar a avaliação, conferir evidência literal, revisar e gerar PDF.
7. Depois de alterar/republicar o bot, coletar resposta para a mesma pergunta em
   conversa nova e importar na nova versão. Comparar as auditorias com os mesmos
   critérios e avaliador. Não declarar equivalente uma comparação CSV versus HTTP.

Limites atuais do CSV: dez respostas, 150 KB e dez mil caracteres por resposta.
Essa demonstração usa respostas reais coletadas manualmente e avaliação real;
nunca apresentar a coleta como integração HTTP automática.

## Adaptador HTTP: condição para implementação

O conector atual espera uma resposta JSON síncrona em até dez segundos. A Chat
API exige usuário autorizado, criação de conversa, POST /messages e recuperação
assíncrona das mensagens, com paginação e seleção das respostas do bot.

Não foi implementado adaptador para um canal cuja disponibilidade no agente não
está comprovada. Se confirmado, preservar HttpConnector e adicionar adaptador
server-only com credenciais criptografadas, conversa isolada por cenário, prazo
total limitado, prevenção de mensagens duplicadas e erros técnicos como ERROR.
Testar criação, envio, espera, seleção de respostas, paginação, timeout e erros;
depois validar uma pergunta real autorizada antes de ampliar o fluxo.

Testes locais não comprovam compatibilidade com o agente publicado. A primeira
chamada real depende de acesso oficial habilitado e autorização para criar
usuário/conversa e enviar a mensagem no Botpress.
