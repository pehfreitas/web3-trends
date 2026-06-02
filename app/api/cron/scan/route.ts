// app/api/cron/scan/route.ts
// Disparada pelo cron da Vercel. É o ÚNICO ponto que paga o twitterapi.io.
// Grava o snapshot mais recente, move o anterior, e adiciona à história.

import { redis, KEYS, HISTORY_LIMIT } from "@/lib/redis";
import { buildSnapshot, type Snapshot } from "@/lib/twitter";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Pro: até 300s; Hobby: ~10s

export async function GET(req: Request) {
  // Protege a rota: só a Vercel (com o CRON_SECRET) pode disparar.
  // O CRON_SECRET é provisionado automaticamente pela Vercel.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const snapshot = await buildSnapshot(6);

  // o latest atual vira o previous (para o cálculo de movimento)
  const current = await redis.get<Snapshot>(KEYS.latest);
  if (current) await redis.set(KEYS.previous, current);

  await redis.set(KEYS.latest, snapshot);

  // história compacta (só contagens por tema) para gráfico futuro
  await redis.lpush(KEYS.history, {
    t: snapshot.updatedAt,
    themes: snapshot.themes.map((th) => ({ id: th.id, c: th.tweetCount })),
  });
  await redis.ltrim(KEYS.history, 0, HISTORY_LIMIT - 1);

  return Response.json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    tweets: snapshot.topTweets.length,
  });
}
