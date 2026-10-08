# Dify: conexão real e diagnóstico

8/10/2026. Aplicativo identificado pela API como `advanced-chat`.
Nenhuma migration, alteração no Supabase, commit ou mudança de credenciais.
Chamadas ao Dify geram conversas de teste; não removidas nem alteradas depois.

## Evidência e limites do diagnóstico

O teste inicial passou em 9.236 ms com prazo de dez segundos. Após relato de
falha na interface, uma repetição anterior à correção passou em 4.994 ms.
Gemini retornou PASS em 3.551 ms nessa repetição.

A interface e o teste usam a mesma classe HttpConnector. O teste inicial usava
pergunta breve sobre finalidade e usuário por sessão; a interface relatada usa
`auditor-vestcasa` fixo. A sessão retornada é validada, mas não é reusada pelo motor
para outra pergunta. Não incluir conversation_id com o ID interno do Auditor.

A falha histórica não foi reproduzida e não havia diagnóstico granular no
conector. Não afirmar que foi comprovadamente timeout, token inválido ou problema
de extração. Latência variável e a pequena margem inicial sustentam a ampliação
controlada; logs novos permitem distinguir as causas na próxima ocorrência.

## Correção

- Prazo total de 30 segundos somente para origem HTTPS api.dify.ai e caminho
  /v1/chat-messages; demais destinos preservam dez segundos.
- AbortSignal cobre resolução de DNS, transporte e leitura do corpo.
- Não há retries: evita duplicação de perguntas/conversas e consumo adicional.
- SSRF, IP público fixado no socket, bloqueio de redirects, limite de 64 KB,
  validação de JSON/texto/sessão e proteção contra reflexão de segredo preservados.
- Logs contêm apenas fase, resultado, status HTTP, prazo e duração. Não contêm
  URL, headers, token, pergunta, resposta, usuário ou identificador de conversa.
- Botão de teste apresenta mensagem segura específica de timeout, status HTTP
  ou extração. Erros permanecem técnicos e não se tornam falhas comportamentais.

## Testes executados

`npm run check`: 115 testes em 16 arquivos, lint, TypeScript, catálogo e formatação.
`npm run build`: aprovado. Quatro testes adicionados verificam escopo do prazo,
contrato Dify da interface, aborto e diagnóstico sem dados privados.

`npm exec vitest -- run --config vitest.dify-live.config.mts`: uma pergunta real
com o corpo da interface e sua pergunta padrão. HTTP 200, 7.267 ms, dentro de
30 segundos; answer e conversation_id válidos. Gemini HTTP 200, PASS em
4.337 ms, evidência literal conferida, 301 tokens de entrada e 134 de saída.
Nenhum resultado salvo no Supabase. Critério técnico de pertinência à finalidade,
sem presumir política comercial. Não comprova ainda o fluxo autenticado salvo,
PDF ou estabilidade de todas as chamadas futuras.

## Repetir na interface

Atualizar a página do Auditor local que serve o código corrigido. Manter POST,
endpoint https://api.dify.ai/v1/chat-messages, headers/parâmetros {}, token sem
prefixo Bearer, caminho answer e sessão conversation_id.

```json
{
  "inputs": {},
  "query": "{{message}}",
  "response_mode": "blocking",
  "user": "auditor-vestcasa"
}
```

Clicar em Testar conexão (a configuração ainda não é salva por esse botão).
Se falhar, informar somente a mensagem nova e os metadados [http-connector] do
terminal. Não compartilhar formulário preenchido, chaves ou respostas privadas.
Salvar conexão ou executar auditoria persistente exige autorização de gravação;
não fazer automaticamente como parte deste diagnóstico.
