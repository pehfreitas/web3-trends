# web3-trends — Hot Trends + Radar de Clientes

Next.js (App Router) + twitterapi.io + Upstash Redis, na Vercel.

## O que faz
- **Hot Trends** (página principal): trending topics globais do X (`/twitter/trends`),
  com ▲▼ de movimento de ranking vs. a rodada anterior do cron.
- **Clientes** (barra lateral): você cadastra cada cliente com nome, @ do cliente e
  @s de concorrentes. Ao selecionar um cliente, vê os **posts mais recentes** de cada @.

## Arquitetura
- `app/api/cron/scan` — cron horário: tira snapshot do Hot Trends e grava no Redis
  (`trends:x:latest` / `trends:x:previous`). É o que paga o twitterapi.io de forma fixa.
- `app/api/hot-trends` — lê o Redis e calcula o movimento de ranking.
- `app/api/clients` — GET lista / POST cria-ou-edita clientes (guardados em `clients:all`).
- `app/api/clients/[id]` — DELETE remove um cliente.
- `app/api/clients/[id]/posts` — busca na hora os posts recentes do cliente + concorrentes.
- `app/page.tsx` — sidebar (Hot Trends + clientes + "Novo cliente"), página de trends e
  visão por cliente, com modal de cadastro.

## Variáveis de ambiente (Vercel)
- `TWITTERAPI_IO_KEY` — chave do twitterapi.io
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — injetadas pela integração Upstash
  (o `lib/redis.ts` aceita também variações com prefixo, ex.: `STORAGE_*`)
- `CRON_SECRET` — provisionada pela Vercel

## Ajustes
- **Praça do Hot Trends**: `HOT_TRENDS_WOEID` em `lib/twitter.ts` (Brasil = 23424768,
  Mundo = 1, São Paulo = 455827).
- **Quantos posts por @**: 2º argumento de `fetchUserRecentPosts` (padrão 8).

## Custos (twitterapi.io ~$0.15/1.000 tweets)
- Hot Trends: 1 chamada/hora (barato).
- Clientes: cada @ monitorado = 1 chamada, só quando você abre o cliente.
