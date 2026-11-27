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

## CI atual e CD previsto

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

Para o piloto hospedado, a proposta é conectar a `main` ao Render com **After CI Checks Pass**. A ativação depende da existência do serviço e das variáveis de ambiente do piloto. [Deploy no Render](https://render.com/docs/deploys)
