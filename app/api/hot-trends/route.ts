// app/api/hot-trends/route.ts
import { redis, KEYS } from "@/lib/redis";
import type { HotTrend } from "@/lib/twitter";

export const dynamic = "force-dynamic";

type Snap = { updatedAt: string; trends: HotTrend[] };

export async function GET() {
  const [latest, previous] = await Promise.all([
    redis.get<Snap>(KEYS.hotLatest),
    redis.get<Snap>(KEYS.hotPrevious),
  ]);

  if (!latest) {
    return Response.json(
      { updatedAt: null, trends: [], note: "aguardando primeira rodada do cron" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const prevRank = new Map((previous?.trends ?? []).map((t) => [t.name, t.rank]));

  const trends = latest.trends.map((t) => {
    const before = prevRank.get(t.name);
    // rank menor = posição melhor. delta positivo = subiu.
    const move = before == null ? null : before - t.rank;
    return { ...t, move };
  });

  return Response.json(
    { updatedAt: latest.updatedAt, trends },
    { headers: { "Cache-Control": "no-store" } }
  );
}
