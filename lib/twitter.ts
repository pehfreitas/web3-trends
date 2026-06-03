// lib/twitter.ts
// Funções de acesso ao twitterapi.io: hot trends globais e posts recentes
// de um usuário. Toda chamada paga roda no servidor (chave fica server-side).

const API = "https://api.twitterapi.io/twitter";

// WOEID = identificador de localidade do X. Brasil = 23424768; Mundo = 1;
// São Paulo (cidade) = 455827. Troque aqui pra mudar a praça do Hot Trends.
export const HOT_TRENDS_WOEID = 23424768;

export type HotTrend = {
  name: string;
  query: string;
  rank: number;
  volume: string; // descrição/volume, quando o X fornece
};

export type Tweet = {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  createdAt: string | null;
};

export type Client = {
  id: string;
  name: string;       // nome do cliente (ex.: "Projeto X")
  handle: string;     // @ do cliente (sem o @)
  competitors: string[]; // @s de concorrentes a analisar (sem o @)
};

function key(): string {
  const k = process.env.TWITTERAPI_IO_KEY;
  if (!k) throw new Error("Missing TWITTERAPI_IO_KEY");
  return k;
}

const clean = (h: string) => h.trim().replace(/^@+/, "");

// ---- Hot trends globais -------------------------------------------------
export async function fetchHotTrends(woeid = HOT_TRENDS_WOEID): Promise<HotTrend[]> {
  const url = new URL(`${API}/trends`);
  url.searchParams.set("woeid", String(woeid));
  const r = await fetch(url, { headers: { "X-API-Key": key() } });
  if (!r.ok) return [];
  const data = await r.json();
  const list = data.trends ?? data.data ?? [];
  // garante texto mesmo se o campo vier como objeto (ex.: {query: "..."})
  const toText = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (typeof v === "object") return v.name ?? v.query ?? v.text ?? "";
    return String(v);
  };
  return list.map((t: any, i: number) => ({
    name: toText(t.name ?? t.trend ?? t),
    query: toText(t.target?.query ?? t.query ?? t.name),
    rank: Number(t.rank ?? i + 1),
    volume: toText(t.meta_description ?? t.tweet_volume ?? t.volume),
  }));
}

// ---- Posts recentes de um usuário --------------------------------------
function normalize(t: any): Tweet {
  const author = t.author ?? t.user ?? {};
  const m = t.public_metrics ?? {};
  const handle = author.userName ?? author.username ?? author.screen_name ?? "";
  return {
    id: String(t.id ?? t.id_str ?? t.tweetId ?? ""),
    text: t.text ?? t.full_text ?? t.content ?? "",
    author: author.name ?? author.displayName ?? handle,
    authorHandle: handle,
    url: t.url ?? (handle && t.id ? `https://x.com/${handle}/status/${t.id}` : ""),
    likes: t.likeCount ?? m.like_count ?? t.favorite_count ?? 0,
    retweets: t.retweetCount ?? m.retweet_count ?? 0,
    replies: t.replyCount ?? m.reply_count ?? 0,
    views: t.viewCount ?? t.views ?? m.impression_count ?? 0,
    createdAt: t.createdAt ?? t.created_at ?? null,
  };
}

export async function fetchUserRecentPosts(handle: string, limit = 8): Promise<Tweet[]> {
  const h = clean(handle);
  if (!h) return [];
  const url = new URL(`${API}/user/last_tweets`);
  url.searchParams.set("userName", h);
  try {
    const r = await fetch(url, { headers: { "X-API-Key": key() } });
    if (!r.ok) return [];
    const data = await r.json();
    // a resposta pode vir como {tweets:[...]} ou {data:{tweets:[...]}}
    const list = data.tweets ?? data.data?.tweets ?? data.data ?? [];
    return list.map(normalize).slice(0, limit);
  } catch {
    return [];
  }
}

export { clean as cleanHandle };
