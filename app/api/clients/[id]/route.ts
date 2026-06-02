// app/api/clients/[id]/route.ts
import { redis, KEYS } from "@/lib/redis";
import type { Client } from "@/lib/twitter";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clients = (await redis.get<Client[]>(KEYS.clients)) ?? [];
  const next = clients.filter((c) => c.id !== id);
  await redis.set(KEYS.clients, next);
  return Response.json({ ok: true });
}
