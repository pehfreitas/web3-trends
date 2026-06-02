// app/api/clients/[id]/posts/route.ts
// Busca, na hora, os posts mais recentes do @ do cliente e de cada concorrente.
import { redis, KEYS } from "@/lib/redis";
import { fetchUserRecentPosts, type Client } from "@/lib/twitter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clients = (await redis.get<Client[]>(KEYS.clients)) ?? [];
  const client = clients.find((c) => c.id === id);
  if (!client) return Response.json({ error: "cliente não encontrado" }, { status: 404 });

  // ordem: o @ do cliente primeiro, depois os concorrentes
  const handles = [
    { handle: client.handle, isClient: true },
    ...client.competitors.map((h) => ({ handle: h, isClient: false })),
  ].filter((h) => h.handle);

  const columns = await Promise.all(
    handles.map(async (h) => ({
      handle: h.handle,
      isClient: h.isClient,
      posts: await fetchUserRecentPosts(h.handle, 8),
    }))
  );

  return Response.json(
    { client: { id: client.id, name: client.name }, columns },
    { headers: { "Cache-Control": "no-store" } }
  );
}
