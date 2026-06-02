// lib/twitter.ts
// Definição dos temas pesquisados + fetch/normalização do twitterapi.io.
// Usado pelo cron (escreve no Redis). O dashboard nunca chama isto direto.

export type Trend = {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  theme: string;
  createdAt: string | null;
};

export type ThemeStat = {
  id: string;
  label: string;
  tweetCount: number;
  totalLikes: number;
};

export type Snapshot = {
  updatedAt: string;
  themes: ThemeStat[];
  topTweets: Trend[];
};

// Edite aqui para afinar o que conta como "trend". Aceita os operadores de
// busca do X (min_faves:, -filter:retweets, lang:, from:, etc.).
export const THEMES = [
  { id: "core",   label: "Web3 / DeFi",        query: '(web3 OR onchain OR DeFi) min_faves:50 -filter:retweets lang:en' },
  { id: "tokens", label: "Tokens / Airdrops",  query: '("token launch" OR airdrop OR memecoin) min_faves:100 -filter:retweets' },
  { id: "infra",  label: "L2 / Infra / RWA",   query: '(L2 OR rollup OR restaking OR RWA) min_faves:50 -filter:retweets lang:en' },
] as const;

function fmtUTC(d: Date) {
  return d.toISOString().slice(0, 19).replace("T", "_") + "_UTC";
}

// O shape do twitterapi.io pode variar entre campos — tenta os nomes mais
// prováveis com fallback. Rode uma chamada real e ajuste se algo vier vazio.
function normalize(t: any, theme: string): Trend {
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
    theme,
    createdAt: t.createdAt ?? t.created_at ?? null,
  };
}

async function fetchTheme(theme: (typeof THEMES)[number], key: string, since: Date, until: Date) {
  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.set("query", theme.query);
  url.searchParams.set("queryType", "Latest");
  url.searchParams.set("since_time", fmtUTC(since));
  url.searchParams.set("until_time", fmtUTC(until));

  try {
    const r = await fetch(url, { headers: { "X-API-Key": key } });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.tweets ?? data.data ?? []).map((t: any) => normalize(t, theme.id));
  } catch {
    return [];
  }
}

// Busca todos os temas, dedupa e monta o snapshot da rodada.
export async function buildSnapshot(hoursBack = 6): Promise<Snapshot> {
  const key = process.env.TWITTERAPI_IO_KEY;
  if (!key) throw new Error("Missing TWITTERAPI_IO_KEY");

  const until = new Date();
  const since = new Date(until.getTime() - hoursBack * 60 * 60 * 1000);

  const perTheme = await Promise.all(THEMES.map((th) => fetchTheme(th, key, since, until)));

  const seen = new Set<string>();
  const all: Trend[] = [];
  const themes: ThemeStat[] = [];

  THEMES.forEach((th, i) => {
    const tweets = perTheme[i].filter((t: Trend) => t.id && !seen.has(t.id) && seen.add(t.id));
    themes.push({
      id: th.id,
      label: th.label,
      tweetCount: tweets.length,
      totalLikes: tweets.reduce((s: number, t: Trend) => s + t.likes, 0),
    });
    all.push(...tweets);
  });

  const topTweets = all
    .sort((a, b) => b.likes + 2 * b.retweets - (a.likes + 2 * a.retweets))
    .slice(0, 30);

  return { updatedAt: until.toISOString(), themes, topTweets };
}
