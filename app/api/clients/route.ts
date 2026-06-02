// app/api/clients/route.ts
import { redis, KEYS } from "@/lib/redis";
import { cleanHandle, type Client } from "@/lib/twitter";

export const dynamic = "force-dynamic";

async function getClients(): Promise<Client[]> {
  return (await redis.get<Client[]>(KEYS.clients)) ?? [];
}

export async function GET() {
  return Response.json({ clients: await getClients() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").trim();
  const handle = cleanHandle(body.handle ?? "");
  const competitors = (Array.isArray(body.competitors) ? body.competitors : [])
    .map((c: string) => cleanHandle(c))
    .filter(Boolean);

  if (!name) return Response.json({ error: "nome obrigatório" }, { status: 400 });

  const clients = await getClients();
  let client: Client;

  if (body.id) {
    // edição
    const idx = clients.findIndex((c) => c.id === body.id);
    if (idx === -1) return Response.json({ error: "cliente não encontrado" }, { status: 404 });
    client = { ...clients[idx], name, handle, competitors };
    clients[idx] = client;
  } else {
    client = { id: crypto.randomUUID(), name, handle, competitors };
    clients.push(client);
  }

  await redis.set(KEYS.clients, clients);
  return Response.json({ client });
}
