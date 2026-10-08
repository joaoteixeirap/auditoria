# Conector HTTP — Fase 3

## Atualização SaaS B2B

O contrato atual `http-json-v1` permite configurar GET/POST/PUT/PATCH, headers,
autenticação Bearer/customizada, parâmetros de query, corpo JSON, caminho de
extração da resposta (`data.answer`, `choices.0.message.content`, `$` para raiz
textual) e caminho opcional de sessão. O contrato inicial abaixo é preservado
para conexões antigas; APIs compatíveis com o contrato configurável dispensam
adaptador exclusivo. Aplicar também a migration B2B conforme [workflow.md](workflow.md).

Variáveis aceitas: `{{message}}`, `{{sessionId}}`, `{{secret.nome}}`. Exemplo de
corpo: `{"inputs":[{"content":"{{message}}"}],"session":"{{sessionId}}"}`.
Header: `{"X-API-Key":"{{secret.chave}}"}`; cadastrar `chave` separadamente em
credenciais nomeadas. GET exige corpo vazio e pode usar query
`{"q":"{{message}}"}`. Esses exemplos não foram testados contra APIs externas.

A URL-base continua HTTPS/443 sem query; os parâmetros configuráveis são
acrescentados depois da validação DNS. Headers reservados, duplicados, CRLF,
variáveis desconhecidas e propriedades inseguras são rejeitados. Limites:
20 headers, 20 parâmetros, 10 credenciais, configuração de 24 KB UTF-8,
JSON até oito níveis, corpo final até 64 KiB e URL final limitada.

Toda configuração genérica exige `CONNECTOR_ENCRYPTION_KEY`: headers, query,
corpo e credenciais são criptografados com contexto organização/versão, sem
devolução à UI ou aos relatórios. A chave continua necessária para Bearer legado.
O botão **Testar conexão** exige autorização explícita, envia a pergunta
informada e retorna somente sucesso/erro; não grava resposta nem cria auditoria.
Salvar a configuração não chama o endpoint.

Auditorias HTTP novas exigem políticas privadas aprovadas e avaliação semântica.
Os critérios fictícios permanecem na demonstração. Sessão é um identificador
separado por teste; não há fluxo multi-turno ou handshake de múltiplas chamadas.
Streaming, endpoints somente IPv6, respostas não JSON e OAuth renovável ficam
fora do contrato. Testes locais verificaram configuração, transporte e isolamento;
nenhum chatbot externo foi chamado. Estado atual: [b2b-alinhamento.md](b2b-alinhamento.md).

## Registro histórico da implementação inicial

Implementação preparada em 8 de outubro de 2026. Ainda não há chatbot real
da equipe para teste. A migration desta fase não foi aplicada no remoto.

## Contrato inicial

Como não havia API escolhida, foi definido um contrato inicial versionado
`message-text-v1`. Não é uma integração universal com qualquer provedor.
Um chatbot incompatível precisará de um adaptador no servidor.

O conector envia POST para uma URL HTTPS na porta padrão, sem query, fragmento
ou credenciais na URL. Headers: Content-Type e Accept application/json,
Authorization Bearer opcional. Corpo:

```json
{ "message": "Pergunta do cenário", "sessionId": "auditoria:cenario" }
```

Resposta HTTP 2xx, Content-Type application/json, sem compressão:

```json
{ "text": "Resposta do chatbot", "sessionId": "identificador opcional" }
```

Limites: pergunta de 2.000 caracteres, resposta textual de 10.000 caracteres,
corpo de resposta de 64 KiB e prazo total de 10 segundos incluindo DNS.
Cada cenário recebe uma sessão separada. Não há streaming nem conversa multi-turno.
Falhas de transporte ou contrato viram ERROR; respostas não reconhecidas pelo
avaliador determinístico viram INCONCLUSIVE. Mensagens internas do serviço
externo não são exibidas nem registradas em logs.

## Habilitar no Supabase existente

1. Conferir se o projeto é o mesmo utilizado nas Fases 1 e 2.
2. Aplicar **somente** `supabase/migrations/202610080001_http.sql` pelo SQL Editor.
   Não reaplicar nem editar as migrations anteriores.
3. Se o endpoint exigir Bearer, configurar `CONNECTOR_ENCRYPTION_KEY` no
   servidor: 32 bytes aleatórios em hexadecimal, mantidos em `.env.local`.
   Uma forma de gerar localmente é:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Não compartilhar a chave na conversa, no Git ou em NEXT_PUBLIC_*.
   Guardá-la com segurança: trocá-la sem migrar as credenciais criptografadas
   impede abrir os tokens existentes. Não há rotação automática nesta entrega.

4. Reiniciar o servidor somente se adicionar ou alterar a variável de ambiente.
5. Cadastrar um chatbot separado em Homologação, com cliente fictício para teste.
6. Nos detalhes do chatbot, selecionar uma versão sem conexão e registrar a
   URL, token opcional e confirmação de autorização/compatibilidade.
7. Preparar a auditoria. A opção da versão será identificada como HTTP.
   Confirmar explicitamente o envio das perguntas ao endpoint externo.

Salvar a configuração não realiza chamadas. A execução só chama o endpoint
quando o owner inicia os cenários. Não conectar um serviço sem autorização.

## Segurança e persistência

- HTTPS com validação TLS padrão; redirects não são seguidos.
- Resolução IPv4 antes de cada chamada; todos os registros A retornados são
  verificados. Destinos privados, loopback, metadata e reservados são recusados.
- O IP validado é fixado no socket, preservando Host e hostname TLS. A primeira
  versão aceita somente IPv4; endpoints exclusivamente IPv6 não são suportados.
- Token criptografado com AES-256-GCM, nonce aleatório e dados autenticados
  vinculados à organização e à versão. Tokens refletidos no texto são recusados.
- Configuração imutável por versão, com FK composta e RLS. Somente owners
  acessam/configuram conexões. Não há edição ou exclusão de conexões.
- A UI recebe somente metadados; tokens e ciphertext não são enviados aos componentes.
- Snapshots preservam endpoint, contrato e ID da conexão, sem incluir token.
- Continua o limite de uma auditoria ativa e 100 auditorias mensais por organização.
- Custo externo desconhecido fica null; não é apresentado como custo zero.

O catálogo curado contém políticas fictícias; regras próprias versionadas estão
disponíveis pelo [fluxo completo](workflow.md). O owner deve verificar sua
compatibilidade antes de usar HTTP; essa avaliação não prova conformidade geral.
O snapshot preserva a configuração, mas não congela um deployment externo:
para comparar versões reais, cada endpoint precisa representar o deployment
identificado na versão. Uma retomada pode repetir uma chamada se a resposta
anterior não foi persistida; não há garantia de envio exatamente uma vez.

Referência de proteção SSRF:
[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Verificações

Testes controlados verificam transporte, contrato, DNS misto público/privado,
IP fixado, redirects, tamanhos, credenciais refletidas e criptografia.
PGlite executa a migration incremental real e verifica isolamento, owner/member,
imutabilidade, snapshots sem token, idempotência e persistência HTTP.
Isso não substitui teste de rede com o chatbot real ou RLS autenticado remoto.

Em 8/10/2026, `npm run check` passou com 70 testes em sete arquivos e
`npm run build` passou. O localhost `/login` respondeu HTTP 200.
