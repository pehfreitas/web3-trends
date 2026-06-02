// app/api/cron/scan/route.ts
// Disparada pelo cron da Vercel. Tira o snapshot do Hot Trends global e guarda
// no Redis (latest + previous) pra calcular movimento de ranking.

import { redis, KEYS } from "@/lib/redis";
import { fetchHotTrends, type HotTrend } from "@/lib/twitter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const trends = await fetchHotTrends();
  const snapshot = { updatedAt: new Date().toISOString(), trends };

  const current = await redis.get<{ updatedAt: string; trends: HotTrend[] }>(KEYS.hotLatest);
  if (current) await redis.set(KEYS.hotPrevious, current);
  await redis.set(KEYS.hotLatest, snapshot);

  return Response.json({ ok: true, updatedAt: snapshot.updatedAt, count: trends.length });
}
