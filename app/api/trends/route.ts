// app/api/trends/route.ts
// Lê o snapshot do Redis (gravado pelo cron) e calcula o MOVIMENTO de cada
// tema comparando a rodada atual com a anterior. NÃO chama o twitterapi.io —
// custo de API agora só ocorre no cron, com frequência fixa e previsível.

import { redis, KEYS } from "@/lib/redis";
import type { Snapshot } from "@/lib/twitter";

export const dynamic = "force-dynamic";

export async function GET() {
  const [latest, previous] = await Promise.all([
    redis.get<Snapshot>(KEYS.latest),
    redis.get<Snapshot>(KEYS.previous),
  ]);

  if (!latest) {
    return Response.json(
      { updatedAt: null, themes: [], trends: [], note: "aguardando primeira rodada do cron" },
      { headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }

  const prevById = new Map((previous?.themes ?? []).map((t) => [t.id, t]));

  const themes = latest.themes.map((t) => {
    const before = prevById.get(t.id)?.tweetCount ?? null;
    const delta = before == null ? null : t.tweetCount - before;
    const pct = before && before > 0 ? Math.round((delta! / before) * 100) : null;
    return { ...t, delta, pct };
  });

  return Response.json(
    { updatedAt: latest.updatedAt, themes, trends: latest.topTweets },
    {
      // cache curto de borda: snapshot só muda quando o cron roda
      headers: { "Cache-Control": "no-store" },
    }
  );
}
