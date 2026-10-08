# Publicação na Vercel

O código foi preparado e o build local validado. Nenhuma publicação foi feita.
Não há autenticação Vercel disponível nesta sessão. As mudanças locais não
foram commitadas nem enviadas ao GitHub; importar o repositório agora não publica
essas alterações.

## Preparação

1. Ativar as três migrations novas conforme [workflow.md](workflow.md), sem
   reaplicar as duas existentes.
2. Validar o fluxo manual e o isolamento no Supabase remoto.
3. Criar/selecionar o projeto da equipe na Vercel, preset Next.js, Node.js 24,
   instalação `npm ci` e build `npm run build`.
4. Configurar variáveis por ambiente no painel, usando `.env.example` como lista.
   Supabase URL/publishable key são públicas; chave OpenAI e chave de criptografia
   permanecem privadas. Configurar modelo explicitamente. Preços são opcionais.
5. Configurar `APP_URL` com a origem HTTPS escolhida. No Supabase Auth, configurar
   Site URL, callbacks e links de confirmação/recuperação descritos no README.

Usar dados fictícios na primeira validação. O tratamento dos documentos e
respostas pelo provedor de IA deve corresponder às autorizações da equipe.

## Entrega do código

Como não foi autorizado commit/push automático, há duas opções:

- A equipe revisa e envia a branch de continuidade; depois importa essa branch
  na Vercel e confere a configuração de Preview antes de promover a produção.
- Com Vercel CLI autenticado, vincular a pasta e publicar uma Preview diretamente
  do código local, sem commit/push. A CLI não foi instalada nesta sessão; ela
  seria uma ferramenta de publicação, não dependência da aplicação.

Com a CLI disponível e após configurar o projeto:

```sh
vercel login
vercel link
vercel deploy
```

Conferir a URL gerada, login/logout, redirects, upload e download privados,
CSV/demonstração, PDF e uma avaliação autorizada. Só depois publicar produção:

```sh
vercel deploy --prod
```

Não enviar `.env.local`, `.tools/e2e-state.json`, `node_modules` ou `.next`.
Não colocar secrets em argumentos de comandos. Backups do Supabase e retenção
de Storage precisam ser definidos pela equipe antes do uso operacional.

## Limites da entrega

A auditoria continua por requisição de cenário, com retomada. Conferir duração
das funções do plano escolhido para acomodar HTTP (10 s) + Gemini (até 75 s,
com no máximo duas tentativas; OpenAI mantém 30 s) e
persistência. Extração de PDF foi testada localmente, mas precisa ser validada
também no runtime publicado. Sem conta/projeto não é possível comprovar domínio,
variáveis remotas, duração das funções ou implantação.

Detalhes da auditoria e políticas exportam `maxDuration = 120` para as Server
Actions correspondentes. O prazo da IA inclui headers, corpo e espera entre
tentativas; uma publicação cujo plano não permita esse tempo precisa ajustar
o orçamento ou adotar worker. A configuração local não garante o limite remoto.

Não há worker, fila durável, agendamento, alertas externos nem cobrança. Erros
técnicos ficam registrados como ERROR e não como falhas comportamentais; a
aplicação evita logs de conteúdos e credenciais. Acompanhamento operacional
inicial usa o histórico e as métricas internas, além do painel da hospedagem.

Referências: [Deployments](https://vercel.com/docs/deployments),
[CLI deploy](https://vercel.com/docs/cli/deploy),
[Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
e [variáveis de ambiente](https://vercel.com/docs/environment-variables).
