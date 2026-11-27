# Testes e entrega do OrbCommu

## O que fica na spec

A spec registra o comportamento que importa para a comunidade. Por exemplo, se a resposta se perder depois que o servidor gravar o pedido, a pessoa pode reenviar e conserva a posição original. Cada funcionalidade entra com critérios de aceite e os comportamentos já entregues continuam cobertos pela suíte de regressão.

## O que fica no plano de implementação

Cada task identifica os arquivos, o comportamento a verificar, o teste que deve falhar, o comando para executá-lo e o resultado esperado. A camada depende da pergunta.

| Camada | Exemplo da primeira entrega | Ferramenta |
|---|---|---|
| Unidade | Um WhatsApp com DDD informado com ou sem `+55` resulta na mesma chave. | Vitest para os módulos TypeScript da aplicação. |
| Integração | Dois envios simultâneos gravam uma única linha. Uma conta sem permissão também fica sem acesso ao total da fila. | Vitest e PostgreSQL/Supabase local, com contas fictícias. |
| E2E | Uma pessoa envia e repete o pedido no navegador. A administração abre a fila e encontra a primeira inscrição uma única vez. | Playwright. No piloto, o cenário também passa pelo login administrativo real. |

## Como desenvolver cada funcionalidade

1. Escrever o menor teste que expressa o comportamento e rodá-lo. Confirmar que falha porque a regra está ausente. Uma falha de infraestrutura precisa ser resolvida antes de interpretar o resultado.
2. Implementar o mínimo para o teste passar e executar o teste novamente.
3. Refatorar e rodar a suíte completa. A regressão é a repetição dos testes acumulados. Para corrigir um bug, começar com um teste que reproduza o defeito e mantê-lo na suíte.
4. Registrar a mudança com um commit convencional em inglês, como `test(queue): cover duplicate requests` ou `feat(queue): preserve the first active request`.

## Regressão local e CI

O GitHub Actions executa `npm test` em pull requests e em pushes na `main`. A suíte inicial cobre a regra de validade das campanhas e o percurso de reenvio no protótipo. Ambos exercitam o comportamento existente com dados fictícios no navegador. [Workflow de CI](../.github/workflows/ci.yml)

Para reproduzir localmente, usar Node.js 22, npm e Python 3:

```sh
npm ci
npx playwright install chromium
npm test
```

O segundo job verifica a aplicação em `web/`. Com Docker em execução, rode a partir da raiz:

```sh
npm --prefix web ci
npm --prefix web run local:prepare
npm --prefix web test
npm --prefix web run build
npm --prefix web run typecheck
cd web
npx playwright install chromium
npm run test:e2e
```

O preparo inicia PostgreSQL e Auth locais, aplica as migrações e gera os arquivos de ambiente de desenvolvimento e de fixtures. O Playwright inicia o servidor de produção na porta 4174. Para repetir só a fila, execute na raiz `npm --prefix web test -- tests/integration/fila.test.ts` e, depois do build, `npm --prefix web run test:e2e -- tests/e2e/fila.spec.ts`. O aceite passa pelo link geral, pelo reenvio do mesmo WhatsApp com outro nome e pela leitura do primeiro pedido, com o mesmo instante de chegada, em duas sessões independentes.

## Vistoria, convites e retenção

Os testes locais usam contas e pedidos fictícios. O Playwright intercepta o destino do WhatsApp. Duas sessões verificam a reserva de um pedido, a confirmação de envio, a conferência após 24 horas e a atualização do resultado na fila. A conta de leitura consulta os pedidos e recebe uma negativa ao tentar operar ou acessar a configuração do convite.

Para verificar a retenção, execute `npm --prefix web test -- tests/integration/retencao.test.ts`. Ao completar 2.160 horas desde `encerrado_em`, o pedido sai da consulta, da busca e da contagem. Uma aba aberta solicita nova leitura no próximo vencimento. O job PostgreSQL `orbcommu-retencao` executa a limpeza a cada minuto, inclusive com o painel fechado. O teste verifica que uma segunda limpeza remove zero pedidos e que a nova inscrição do mesmo telefone conserva a autoria.

## Publicação e aceite no piloto

Antes de publicar a aplicação no Render, confirmar o CI, conferir a disponibilidade de `pg_cron`, contar os pedidos elegíveis com `encerrado_em <= now() - interval '2160 hours'` e aplicar as migrações na ordem. Conferir em `cron.job` o agendamento ativo e em `cron.job_run_details` a execução bem-sucedida. Em seguida, verificar o formulário público e o painel com a conta de leitura.

O aceite com a equipe usa um pedido identificado e um WhatsApp controlado. Joana aprova e registra o envio, Cris confere o resultado na própria sessão e ambas validam a autoria e o estado final. Registrar o resultado e a data quando esse percurso for realizado no piloto.
