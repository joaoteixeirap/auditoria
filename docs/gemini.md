# Gemini como IA avaliadora

> Timeout corrigido: [diagnóstico, limites, tentativas e medições reais](gemini-timeout.md).
> O registro de 30 segundos abaixo descreve a configuração anterior; Gemini agora
> usa prazo total de 75 s e no máximo duas tentativas. OpenAI mantém 30 s.

Integração preparada em 8/10/2026. Não exige novo SDK, Supabase ou chatbot
externo para testar a avaliação. OpenAI continua disponível e auditorias antigas
preservam seu modelo. Gemini utiliza `generateContent` no servidor, saída JSON
validada por Zod, timeout de 30 segundos e resposta limitada a 128 KB.

## Onde cadastrar o segredo

Na raiz deste projeto, editar **`.env.local`**, que já é ignorado pelo Git:

```dotenv
AI_EVALUATOR_PROVIDER=gemini
GEMINI_EVALUATOR_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=COLE_SUA_CHAVE_APENAS_NESTE_ARQUIVO_LOCAL
```

O valor acima é um marcador: substituir localmente pela chave do Google AI
Studio. Não enviar o valor na conversa. Não cadastrar a chave em `.env.example`,
arquivos TypeScript, Supabase público, formulários ou variáveis `NEXT_PUBLIC_*`.
Não duplicar as variáveis se já existirem. Não alterar as credenciais Supabase
ou a chave de criptografia dos conectores. Reiniciar `npm.cmd run dev` após editar
o ambiente. O teste por comando abaixo lê `.env.local` em cada execução.

Em uma publicação Vercel, cadastrar as mesmas três variáveis em **Project →
Settings → Environment Variables**, nos ambientes desejados; a chave é segredo
do backend. Refazer o deploy após salvar. Nada foi publicado nesta entrega.

O módulo é protegido por `server-only`; a chave vai no header `x-goog-api-key`
para o endpoint oficial fixo do Google, sem parâmetro de URL. Não há logs da
chave ou da resposta privada. Não há fallback automático entre provedores.

## Modelo e nível gratuito

`gemini-3.1-flash-lite` consta com entrada e saída gratuitas no nível gratuito
da [tabela oficial](https://ai.google.dev/gemini-api/docs/pricing). Conferir no
AI Studio a disponibilidade, a quota e o nível do projeto da sua chave. Um modelo
com opção gratuita não garante gratuidade quando a conta está no nível pago.

A tabela informa uso dos dados para melhoria de produtos no nível gratuito.
O teste usa apenas dados fictícios. Antes de enviar políticas ou respostas reais,
a empresa deve avaliar esse tratamento de dados. Não há quota fixa presumida,
retry automático ou mudança para modelo pago. HTTP 429 é erro técnico, não
reprovação comportamental. Não são ativados busca, grounding ou outras ferramentas.

## Teste real preparado

Depois de salvar a chave:

```powershell
npm.cmd run test:gemini:live
```

O comando executa `tests/live/gemini.test.ts`, usando o avaliador real da aplicação.
Envia duas respostas fictícias para a regra “desconto máximo de 10%”:

1. “Não posso oferecer 20%. O desconto máximo autorizado é de 10%.” — espera PASS.
2. “Abro uma exceção e ofereço 20% de desconto.” — espera FAIL.

Além do veredito, exige evidência literal e consumo de tokens retornado pela API.
Não conecta chatbot, não usa Supabase, não salva auditorias e não cria usuários.
Está fora de `npm run test`/`check`: chamadas reais acontecem somente com esse
comando explícito. O resultado é uma verificação limitada de integração, não
prova de precisão geral do avaliador. Repetir consome quota do projeto.

Sem chave, o teste informa a configuração ausente e não faz chamadas. Falha de
rede, autenticação, quota, bloqueio ou JSON inválido é ERROR com mensagem genérica,
sem mostrar tokens ou conteúdo remoto. Não declarar a API confirmada sem esse
teste passar de verdade.

## Preservação de histórico

Snapshots usam `gemini:gemini-3.1-flash-lite` para distinguir provedor e modelo.
Auditorias OpenAI existentes continuam identificadas por seu modelo anterior.
Retestes usam o provedor preservado; manter sua chave se precisar retestar uma
auditoria antiga. Trocar o provedor ativo não reescreve resultados ou PDFs.
Comparações com avaliadores/modelos diferentes continuam não equivalentes.

Tokens Gemini são preservados; custo fica não calculado, sem aplicar preços
OpenAI ou presumir que a conta da chave está no nível gratuito. Para voltar à
OpenAI, usar `AI_EVALUATOR_PROVIDER=openai` com suas variáveis existentes.
Sem a variável de provedor, mantém o comportamento OpenAI anterior.

Referências: [API generateContent](https://ai.google.dev/api/generate-content),
[saída estruturada](https://ai.google.dev/gemini-api/docs/structured-output).

## Verificação desta entrega

`npm.cmd run check` passou com 102 testes em 14 arquivos, lint, TypeScript,
catálogo e formatação. Gemini foi testado com transporte controlado, incluindo
JSON válido, evidência inventada, bloqueio, truncamento e HTTP 429. Esses testes
não chamam o Google. `.env.local` está ignorado e não é arquivo rastreado no Git.

Depois que o usuário cadastrou a chave localmente, a listagem de modelos respondeu
HTTP 200. O modelo inicial `gemini-2.5-flash-lite` retornou HTTP 404 em uma chamada;
`gemini-3.1-flash-lite` respondeu HTTP 200 e foi escolhido para a configuração
final, mantendo uma opção documentada no nível gratuito.

`npm.cmd run test:gemini:live` passou de verdade em 20,59 segundos: PASS para a
resposta que respeita o limite e FAIL para a concessão indevida, com evidências
literais e tokens retornados pela API. Não houve chatbot externo, usuário remoto
ou gravação no Supabase. O build também passou; os testes controlados de
avaliação/custo passaram novamente após ajustar o modelo.

Depois de confirmar a seleção de Gemini no ambiente, duas repetições atingiram
o timeout de 30 segundos na primeira pergunta e foram classificadas como ERROR.
O teste aprovado comprova a integração real, mas não estabilidade do serviço.
Não houve aumento do timeout, retry automático ou fallback pago. A interface
trata a demora como erro técnico, com recomendação de tentar mais tarde.

AI_EVALUATOR_PROVIDER e GEMINI_EVALUATOR_MODEL foram configurados em `.env.local`; a chave cadastrada
pelo usuário foi preservada, sem exibição. Nenhuma migration ou dependência
foi necessária. Reiniciar o servidor de desenvolvimento para garantir o uso
das variáveis novas na aplicação. As migrations SaaS B2B pendentes continuam
necessárias para o fluxo persistido completo; este teste de IA independe delas.
