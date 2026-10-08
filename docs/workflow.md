# Fluxo completo — fases 3 a 6

Implementado localmente em 8/10/2026. A ativação remota e os testes autenticados
das novas funcionalidades ainda estão pendentes. A demonstração existente foi
preservada e continua sem dependência da OpenAI.

## Ativação no Supabase existente

As migrations `202610070001_phase1.sql` e `202610070002_phase2.sql` já foram
aplicadas. **Não reexecutá-las.** No SQL Editor do mesmo projeto, executar uma
vez cada arquivo novo, inteiro, nesta ordem:

1. `supabase/migrations/202610080001_http.sql`
2. `supabase/migrations/202610080002_workflow.sql`
3. `supabase/migrations/202610080003_usage.sql`
4. `supabase/migrations/202610080004_b2b.sql`
5. `supabase/migrations/202610080005_memberships.sql`

Cada arquivo usa uma transação. Se falhar, conferir a mensagem no painel antes
de seguir; não desativar RLS. `npm run supabase:check` verifica somente leitura:
Auth e marcadores `phase1-v1`, `phase2-v1`, `phase3-http-v1`, `workflow-v1` e
`usage-v1`, `b2b-v1` e `memberships-v1`. Os marcadores não comprovam isolamento
remoto nem operações de Storage.

Em uma instalação nova, aplicar também as duas migrations anteriores, em ordem.
Não usar `db push` sem reconciliar o histórico quando o SQL Editor foi utilizado.

## Configuração local

Manter as variáveis Supabase existentes em `.env.local`. Não compartilhar secrets.
Para avaliação semântica e sugestão de regras, acrescentar somente no servidor:

```dotenv
OPENAI_API_KEY=
OPENAI_EVALUATOR_MODEL=
```

Escolher explicitamente um modelo disponível na conta que suporte Responses API
e Structured Outputs; não há modelo padrão. Chave ausente não impede build,
demonstração ou importação com regras determinísticas. Upload de documentos não
chama a OpenAI. A sugestão e a avaliação semântica exigem autorização na interface.
Chamadas usam `store: false`, sem ferramentas. Isso não substitui a política de
tratamento de dados da organização nem as configurações da conta do provedor.

Para a conexão HTTP configurável (e tokens Bearer legados), configurar `CONNECTOR_ENCRYPTION_KEY` como
descrito em [http-connector.md](http-connector.md). Não alterar essa chave sem
planejar migração das credenciais já criptografadas.

## Políticas e documentos

Em `/policies`, owners criam regras com pergunta, política de referência,
comportamento esperado, categoria, gravidade e recomendação. Cada salvamento
acrescenta uma versão imutável. Rascunhos não entram no catálogo de auditoria;
o usuário precisa revisar e aprovar uma nova versão. A listagem exibe até 100
versões recentes. As regras privadas não são inseridas no catálogo global.

TXT precisa usar UTF-8. PDF precisa ter texto selecionável, até 20 páginas,
sem senha. Limites: 1 MB e 50.000 caracteres extraídos. Não há OCR. Os arquivos
ficam no bucket privado `policy-documents`, com caminho organização/UUID,
e o texto extraído fica em tabela com RLS. Download usa URL assinada por 60 segundos.

Sugestões da IA geram até cinco rascunhos; nada é aprovado automaticamente.
Se uma falha ocorrer durante salvamentos sucessivos, rascunhos anteriores podem
permanecer. Upload e metadados usam serviços distintos: uma falha no registro
pode deixar um arquivo privado sem metadados, para manutenção administrativa.

## HTTP e importação CSV

HTTP admite [contratos JSON configuráveis](http-connector.md), preservando o contrato inicial. Como ainda não há chatbot
real da equipe, não foi comprovada compatibilidade com uma API externa.

Em `/audits/import`, selecionar uma versão, carregar ou colar um CSV e conferir
a pré-visualização. São aceitos vírgula ou ponto e vírgula, BOM UTF-8, campos
entre aspas e respostas com múltiplas linhas. Cabeçalho obrigatório:

```csv
cenario,resposta
discount-limit,"Posso oferecer 20% de desconto."
```

`cenario` aceita a chave ou UUID mostrado no catálogo aprovado. Limites:
150.000 bytes, dez cenários distintos e 10.000 caracteres por resposta.
A seleção apresenta até 100 agentes e as 15 versões recentes de cada um.
A validação é repetida no servidor. As respostas entram no snapshot imutável;
clicar em Executar cenários avalia esses textos, sem chamar o chatbot.
O relatório identifica explicitamente a origem importada.

Regras personalizadas usam avaliação semântica em CSV ou HTTP; a demonstração
continua com os dez critérios curados. Auditorias HTTP novas usam somente políticas aprovadas
da própria organização; o catálogo fictício fica na demonstração. Na importação
CSV, usar esse catálogo requer confirmação explícita de critérios demonstrativos.
PASS/FAIL exigem evidência literal
presente na resposta. Evidência inventada gera INCONCLUSIVE. Falhas de rede,
recusa, saída inválida ou incompleta geram ERROR, sem achado comportamental.

## Revisão humana e PDF

Nos detalhes de um achado, owners acrescentam revisões com justificativa:
confirmado, descartado ou requer revisão. Resultados automáticos nunca são
sobrescritos. Auditorias concluídas aceitam decisões humanas de liberação,
bloqueio ou revisão. O banco também impede liberar auditoria com ERROR,
INCONCLUSIVE ou achados cuja revisão mais recente não seja descarte.

Gerar PDF preserva um snapshot dos critérios, respostas, evidências, revisões
e decisões existentes naquele momento. Novas revisões não alteram PDFs antigos.
Downloads em `/reports` usam bucket privado `audit-reports` e URL assinada de
60 segundos. Listagem: até 100 relatórios recentes. PDF usa Helvetica; caracteres
sem suporte são substituídos por `?` apenas na apresentação, preservando os
dados originais no snapshot e na interface. Não é certificação de conformidade.

## Uso, custos e execução

`/usage` mostra contagens reais de todos os resultados de auditorias concluídas
e os últimos 1.000 registros de consumo das avaliações semânticas persistidas.
Tokens vêm da resposta do provedor. Não incluem sugestões de regras, chamadas
que falharam antes de persistir nem outras utilizações da conta OpenAI.

Os preços opcionais `OPENAI_INPUT_USD_PER_MILLION` e
`OPENAI_OUTPUT_USD_PER_MILLION` habilitam uma estimativa em USD no momento de
cada execução. Configurar ambos para o modelo escolhido. Não há preços
presumidos; ausência significa custo não calculado. Não considera descontos
de cache e não substitui a fatura. Estimativas históricas são preservadas.
Se uma auditoria preservou um modelo diferente do configurado atualmente, o
custo permanece não calculado para evitar aplicar o preço de outro modelo.

Limites existentes: dez cenários por auditoria, uma execução ativa por organização
e 100 auditorias mensais, protegidos no banco. A página dispara um cenário por
requisição; fechar interrompe o avanço e permite retomar resultados salvos.
Persistência é idempotente, mas tentativas concorrentes ou falha antes de salvar
podem repetir chamadas externas e gerar consumo adicional. Não há fila durável,
execução agendada, cobrança ou promessa de chamada externa exatamente uma vez.
Rate limits adicionais por processo não são limites distribuídos de gasto.

## Validação manual após ativação

1. Com uma conta owner existente, repetir a demonstração v1 → v2.
2. Criar rascunho e comprovar que não aparece como cenário disponível; aprovar
   uma nova versão e conferir a preservação da anterior.
3. Enviar TXT/PDF fictício, baixar e conferir isolamento com outra organização.
4. Importar CSV com regra curada, executar, conferir origem e respostas.
5. Com chave/modelo configurados, autorizar um teste com regra personalizada.
6. Revisar um achado, tentar liberar antes da revisão, justificar descarte e
   gerar PDF. Conferir que o resultado automático continua preservado.
7. Conferir leitura por member e bloqueio de gravação; tentar acessar documento,
   relatório e auditoria de outra organização, esperando bloqueio.
8. Conferir métricas/consumo e registrar o resultado em `docs/handoff.md`.

Não criar usuários nem enviar e-mails de teste automaticamente. A execução
autenticada remota ainda precisa de sessão e autorização específica.

Referências técnicas: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Storage/RLS](https://supabase.com/docs/guides/storage/security/access-control),
[pdf-parse](https://github.com/mehmet-kozan/pdf-parse) e [pdf-lib](https://pdf-lib.js.org/).
