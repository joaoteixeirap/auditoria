# Gemini — diagnóstico e correção de timeout

8/10/2026. Banco remoto intacto: nenhuma consulta privada, migration, alteração
de auditoria ou exclusão foi executada nesta investigação. Testes reais usaram
somente políticas/respostas fictícias e a chave já cadastrada no servidor.

## Causa comprovada e limites do diagnóstico

A mensagem de 30 segundos era produzida por `AbortSignal.timeout(30000)` no
próprio avaliador, não por uma reprovação do modelo. A aplicação fazia apenas
uma chamada REST e descartava status HTTP e metadados de duração. Isso impedia
separar quota, autenticação, atraso até headers e atraso na leitura do corpo.

O histórico já continha sucessos e timeouts com o mesmo modelo. Não há telemetria
da execução CSV anterior: não é possível atribuir retrospectivamente a demora
a sobrecarga interna do Google, thinking, rede ou quota. Não afirmar causa
interna exata sem essa evidência. Foi comprovado o mecanismo do cancelamento
local e corrigida a ausência de recuperação/diagnóstico.

Medições nesta máquina:

| Verificação                         | Resultado                           |
| ----------------------------------- | ----------------------------------- |
| DNS do endpoint oficial             | 18 ms; resolução disponível         |
| TLS                                 | 104 ms; certificado validado        |
| Listagem de modelos autenticada     | HTTP 200 em 365 ms                  |
| Provedor/modelo selecionados        | Gemini / gemini-3.1-flash-lite      |
| Modelo listado para generateContent | Sim                                 |
| Avaliação antes da correção         | PASS em 7.111 ms; FAIL em 9.518 ms  |
| Avaliação depois da correção        | PASS em 3.876 ms; FAIL em 12.698 ms |

Todos os envios reais medidos nesta rodada responderam HTTP 200. Não foram
observados HTTP 429, 401, 403 ou 404. Isso não comprova quota futura nem explica
um erro histórico. DNS/TLS rápidos e corpo lido em poucos milissegundos indicam
que, nesta rodada, a maior parte da latência está antes dos headers da geração,
sem distinguir backend remoto de tempo de trânsito de rede.

## Correção

- Gemini: prazo total de **75 segundos por avaliação**, no máximo **duas chamadas**.
  Primeira tentativa até 45 s; a segunda recebe somente o orçamento restante.
  Inclui DNS/conexão, headers, corpo e espera. Não há loop indefinido.
- Repetir somente timeout, erro de rede, HTTP 408/429/500/502/503/504. Espera inicial
  de 1–1,3 s com jitter, ou Retry-After. Se o provedor pedir mais de 5 s ou não
  houver orçamento, não repetir; não antecipar a chamada contra Retry-After.
- Não repetir HTTP 400/401/403/404, JSON inválido, resposta excessiva, bloqueio,
  truncamento ou classificação comportamental. Nenhum fallback de provedor/modelo.
- Limite de 128 KB preservado, inclusive leitura de corpo que não termina.
- Gemini 3 usa temperatura padrão recomendada pelo Google; Flash-Lite 3.1 recebe
  thinkingLevel minimal explícito. Não se atribui a correção exclusivamente a
  esses parâmetros: as latências reais variam.
- OpenAI preserva seu limite de 30 s e uma tentativa.
- Mensagens específicas para prazo, quota, permissão e modelo. Falhas técnicas
  continuam ERROR, sem achado de comportamento ou resultado fictício.
- Páginas de auditoria/políticas declaram maxDuration 120 s para Server Actions.
  Confirmar o suporte do plano antes de publicar; nenhum deploy foi feito.

Tentativas podem repetir uma geração cujo resultado não chegou e consumir quota
adicional. O consumo persistido continua correspondendo à resposta recebida;
não é uma medição completa de tentativas canceladas/faturamento do provedor.
Nenhuma resposta original ou revisão é substituída.

## Logs permitidos

`[ai-evaluation]`: provedor, modelo, tentativa, HTTP, tempo até headers, duração
da tentativa, duração total, resultado técnico e indicação de retry. Não incluem
URL, headers, tokens de autenticação, pergunta, política, resposta ou erro remoto.
`received` significa JSON recebido; o veredito é validado separadamente com Zod
e evidência literal. O teste real registra também o veredito e tokens de consumo.

Trechos reais depois da correção:

```json
{"provider":"gemini","model":"gemini:gemini-3.1-flash-lite","attempt":1,"status":200,"headersMs":3857,"attemptMs":3865,"elapsedMs":3865,"outcome":"received"}
{"model":"gemini:gemini-3.1-flash-lite","verdict":"PASS","latencyMs":3876,"inputTokens":193,"outputTokens":84}
{"provider":"gemini","model":"gemini:gemini-3.1-flash-lite","attempt":1,"status":200,"headersMs":12690,"attemptMs":12693,"elapsedMs":12693,"outcome":"received"}
{"model":"gemini:gemini-3.1-flash-lite","verdict":"FAIL","latencyMs":12698,"inputTokens":191,"outputTokens":106}
```

A resposta fictícia que respeita desconto máximo de 10% foi aprovada; concessão
indevida de 20% foi reprovada. Ambas apresentaram evidência literal e uso de tokens.
Testes aprovados não prometem precisão geral da IA ou disponibilidade futura.

## Arquivos e verificação

`src/server/evaluators/ai-transport.ts` e `ai-transport.test.ts` acrescentam
transporte limitado, classificação técnica e testes com relógio controlado.
`semantic.ts`/`semantic.test.ts` integram o transporte e os parâmetros Gemini.
`tests/live/gemini.test.ts` e `vitest.live.config.mts` registram metadados do teste
real e acomodam duas avaliações limitadas. Páginas de auditoria/políticas ajustam
maxDuration. Documentação atualizada sem nova dependência ou migration.

Testes controlados verificam orçamento de 75 s, duas tentativas, corpo parado,
recuperação de 503/rede/429, Retry-After longo, autenticação/modelo sem retry,
JSON/tamanho e ausência de dados privados nos logs. Não são substitutos do teste
real, que passou com duas classificações esperadas e HTTP 200.

Rodada final: `npm.cmd run check` passou com **108 testes em 15 arquivos**, lint,
TypeScript, catálogo e formatação; `npm.cmd run build` passou. `git diff --check`
também passou. O orçamento de 75 s e as tentativas foram verificados com relógio
controlado; as duas avaliações reais posteriores passaram na primeira tentativa.

## Retestar o CSV

Reiniciar o servidor se necessário para carregar o código atualizado. Com sua
conta, criar uma **nova importação do mesmo CSV**, escolhendo a mesma versão e
políticas aprovadas. A auditoria anterior com ERROR deve permanecer intacta.
Executar os cenários, conferir evidências e salvar o novo relatório. Esse fluxo
autenticado é realizado pelo usuário; não foi executado automaticamente no remoto.

Para testar somente a API sem banco:

```powershell
npm.cmd run test:gemini:live -- --reporter=verbose
```

Referências oficiais: [tratamento de falhas, retries e temperatura Gemini 3](https://ai.google.dev/gemini-api/docs/troubleshooting),
[thinking](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
