# web3-trends

Dashboard de trends do mercado web3 com **histórico e movimento** (▲▼ entre rodadas).
Next.js (App Router) + twitterapi.io + Upstash Redis. O cron busca e grava; o
dashboard só lê do Redis.

## Arquitetura

```
cron (vercel.json)            dashboard
   │                             │
   ▼                             ▼
/api/cron/scan  ──grava──►  Redis  ◄──lê──  /api/trends ──►  app/page.tsx
   │ (paga twitterapi.io)   (latest/previous/history)
```

- **`/api/cron/scan`** é o ÚNICO ponto que paga o twitterapi.io. Roda no schedule,
  monta o snapshot (contagem + engajamento por tema, top tweets) e grava no Redis.
  O custo fica fixo e previsível, independente do tráfego do dashboard.
- **`/api/trends`** lê `trends:latest` e `trends:previous` e calcula o movimento de
  cada tema (delta e % vs. rodada anterior). Nunca chama o twitterapi.io.
- **`app/page.tsx`** mostra a faixa de movimento por tema + os top tweets.

## Setup

```bash
npm install
```

1. **Upstash Redis**: no painel da Vercel → **Storage / Marketplace → Upstash Redis**.
   Isso injeta `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` automaticamente.
2. **Env vars** (Settings → Environment Variables):
   - `TWITTERAPI_IO_KEY` — sua chave do twitterapi.io
   - `CRON_SECRET` — a Vercel provisiona sozinha ao detectar o cron; a rota verifica.
3. **tsconfig** — o código usa o alias `@/`. Garanta no `tsconfig.json`:
   ```json
   { "compilerOptions": { "paths": { "@/*": ["./*"] } } }
   ```
   (o `create-next-app` já adiciona isso.)
4. Deploy. Na primeira execução do cron o dashboard mostra "aguardando…"; depois da
   2ª rodada o movimento (▲▼) aparece, pois passa a haver `previous` para comparar.

### Rodar o cron manualmente para testar

No dashboard da Vercel (Deployments → Functions) dá pra disparar o cron à mão, ou
chame a rota com o secret:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-APP.vercel.app/api/cron/scan
```

## Frequência do cron

`vercel.json` está em `0 * * * *` (de hora em hora).
- **Hobby**: o deploy rejeita schedules mais frequentes que diário — use `0 9 * * *`.
- **Pro**: até 1x por minuto. Para "trends", de hora em hora costuma ser o sweet spot
  de custo × frescor.

## Ajustes

- **Temas / termos**: `THEMES` em `lib/twitter.ts` (aceita operadores do X:
  `min_faves:`, `-filter:retweets`, `lang:`, `from:`, etc.).
- **Janela**: `buildSnapshot(6)` no cron = últimas 6h. Alinhe com a frequência do cron.
- **Campos da resposta**: a função `normalize()` em `lib/twitter.ts` tenta os nomes
  mais prováveis com fallback. Rode `/api/cron/scan` uma vez e confira se likes/views
  vêm preenchidos; ajuste os nomes se necessário.
- **Retenção do histórico**: `HISTORY_LIMIT` em `lib/redis.ts` (a lista `trends:history`
  guarda contagens compactas por tema para um gráfico de volume futuro).

## Custos

- **twitterapi.io**: ~$0,15 / 1.000 tweets. Com 3 temas × ~20 tweets, cada rodada do
  cron lê ~60 tweets (~$0,009). De hora em hora ≈ $0,21/dia ≈ ~$6,5/mês.
- **Upstash**: free tier cobre folgado esse volume.
- **Vercel**: cron entra na cota de invocações de função (sem cobrança separada).
