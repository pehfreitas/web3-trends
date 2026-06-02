// app/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type Trend = {
  id: string; text: string; author: string; authorHandle: string; url: string;
  likes: number; retweets: number; replies: number; views: number; theme: string;
};
type Theme = {
  id: string; label: string; tweetCount: number; totalLikes: number;
  delta: number | null; pct: number | null;
};

const REFRESH_MS = 60 * 1000;
const nf = new Intl.NumberFormat("en", { notation: "compact" });

// paleta pastel por tema (tags estilo kanban das referências)
const PALETTE: Record<string, { tag: string; ink: string; bar: string }> = {
  core:   { tag: "#fff2c2", ink: "#8a6b00", bar: "#ffd84d" },
  tokens: { tag: "#ffe0ec", ink: "#b03a6a", bar: "#ff8fb8" },
  infra:  { tag: "#dceeff", ink: "#2b6cb0", bar: "#7db8f0" },
};
const fallback = { tag: "#eceaf3", ink: "#6b6580", bar: "#b9b2cf" };
const colorFor = (id: string) => PALETTE[id] ?? fallback;

function Move({ delta, pct }: { delta: number | null; pct: number | null }) {
  if (delta == null) return <span className="mv new">novo</span>;
  if (delta > 0) return <span className="mv up">▲ {pct != null ? `${pct}%` : `+${delta}`}</span>;
  if (delta < 0) return <span className="mv down">▼ {pct != null ? `${Math.abs(pct)}%` : Math.abs(delta)}</span>;
  return <span className="mv flat">estável</span>;
}

export default function Dashboard() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/trends");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setThemes(data.themes ?? []);
      setTrends(data.trends ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (e: any) { setError(e.message ?? "erro"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const totals = useMemo(() => ({
    posts: themes.reduce((s, t) => s + t.tweetCount, 0),
    likes: themes.reduce((s, t) => s + t.totalLikes, 0),
    rising: themes.filter((t) => (t.delta ?? 0) > 0).length,
  }), [themes]);

  const tweetsByTheme = (id: string) => trends.filter((t) => t.theme === id);

  return (
    <div className="app">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />

      <aside className="sidebar">
        <div className="logo">W3</div>
        <nav>
          <button className="nav active" title="Trends">◧</button>
          <button className="nav" title="Histórico (em breve)">◷</button>
          <button className="nav" title="Ajustes">⚙</button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Trends do mercado Web3</h1>
            <p className="sub">janela das últimas 6h · atualiza sozinho a cada rodada do cron</p>
          </div>
          <div className="topright">
            <span className="sync">{updatedAt ? `sincronizado ${new Date(updatedAt).toLocaleTimeString()}` : "—"}</span>
            <button className="refresh" onClick={load} disabled={loading}>{loading ? "···" : "↻ atualizar"}</button>
          </div>
        </header>

        {error && <div className="error">falha ao carregar: {error}</div>}

        <section className="kpis">
          <div className="kpi">
            <span className="kpi-label">Posts na janela</span>
            <span className="kpi-num">{totals.posts}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Engajamento</span>
            <span className="kpi-num">{nf.format(totals.likes)}<span className="kpi-suf"> ♥</span></span>
          </div>
          <div className="kpi accent">
            <span className="kpi-label">Temas em alta</span>
            <span className="kpi-num">{totals.rising}<span className="kpi-suf"> / {themes.length || 0}</span></span>
          </div>
        </section>

        <section className="board">
          {(themes.length ? themes : []).map((th) => {
            const c = colorFor(th.id);
            const list = tweetsByTheme(th.id);
            return (
              <div className="col" key={th.id}>
                <div className="col-head">
                  <div className="col-tag" style={{ background: c.tag, color: c.ink }}>{th.label}</div>
                  <Move delta={th.delta} pct={th.pct} />
                </div>
                <div className="col-count">
                  <strong>{th.tweetCount}</strong>
                  <span className="muted"> posts · {nf.format(th.totalLikes)} ♥</span>
                </div>
                <div className="col-bar"><span style={{ background: c.bar, width: `${Math.min(100, th.tweetCount * 4)}%` }} /></div>

                <div className="cards">
                  {list.map((t, i) => (
                    <a key={t.id} href={t.url || "#"} target="_blank" rel="noreferrer" className="card" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="card-top">
                        <span className="avatar" style={{ background: c.bar }}>{(t.author || "?").slice(0, 1).toUpperCase()}</span>
                        <div className="who">
                          <strong>{t.author || "—"}</strong>
                          {t.authorHandle && <span className="handle">@{t.authorHandle}</span>}
                        </div>
                      </div>
                      <p className="text">{t.text}</p>
                      <div className="stats">
                        <span>♥ {nf.format(t.likes)}</span>
                        <span>⇄ {nf.format(t.retweets)}</span>
                        <span>↩ {nf.format(t.replies)}</span>
                      </div>
                    </a>
                  ))}
                  {!list.length && !loading && <div className="col-empty">sem posts neste tema agora</div>}
                  {loading && !list.length && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card skel" />)}
                </div>
              </div>
            );
          })}

          {!themes.length && !loading && (
            <div className="waiting">aguardando a primeira rodada do cron…</div>
          )}
        </section>
      </main>

      <style jsx>{`
        :global(*){box-sizing:border-box;}
        :global(body){margin:0;background:#f4f3ef;color:#1b1d22;
          font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;}
        .app{display:flex;min-height:100vh;}

        .sidebar{width:72px;background:#16171b;display:flex;flex-direction:column;align-items:center;
          padding:20px 0;gap:24px;position:sticky;top:0;height:100vh;}
        .logo{width:40px;height:40px;border-radius:12px;background:#ffd84d;color:#16171b;
          display:grid;place-items:center;font-weight:800;font-size:15px;}
        .sidebar nav{display:flex;flex-direction:column;gap:8px;}
        .nav{width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:#6b6e76;
          font-size:18px;cursor:pointer;transition:.15s;}
        .nav:hover{background:#23252b;color:#cdd0d6;}
        .nav.active{background:#23252b;color:#ffd84d;}

        .main{flex:1;padding:30px 36px 60px;max-width:1280px;}
        .topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px;}
        h1{font-size:26px;font-weight:800;margin:0;letter-spacing:-.02em;}
        .sub{margin:4px 0 0;color:#8b8e96;font-size:13px;}
        .topright{display:flex;align-items:center;gap:14px;}
        .sync{font-size:12px;color:#9a9da4;}
        .refresh{background:#16171b;color:#fff;border:0;border-radius:999px;padding:9px 16px;
          font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;}
        .refresh:hover:not(:disabled){background:#000;transform:translateY(-1px);}
        .refresh:disabled{opacity:.5;cursor:wait;}

        .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;}
        .kpi{background:#fff;border-radius:20px;padding:20px 22px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 10px 30px rgba(0,0,0,.04);}
        .kpi.accent{background:linear-gradient(135deg,#fff6d6,#ffe9a3);}
        .kpi-label{display:block;font-size:13px;color:#8b8e96;font-weight:500;margin-bottom:8px;}
        .kpi.accent .kpi-label{color:#9a7b1e;}
        .kpi-num{font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1;}
        .kpi-suf{font-size:15px;font-weight:600;color:#a9acb3;}

        .board{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:start;}
        .col{display:flex;flex-direction:column;gap:12px;}
        .col-head{display:flex;justify-content:space-between;align-items:center;}
        .col-tag{font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;}
        .col-count{font-size:15px;}
        .col-count strong{font-size:20px;font-weight:800;}
        .muted{color:#9a9da4;font-weight:500;font-size:13px;}
        .col-bar{height:5px;background:#e7e5df;border-radius:99px;overflow:hidden;}
        .col-bar span{display:block;height:100%;border-radius:99px;transition:width .5s;}

        .cards{display:flex;flex-direction:column;gap:12px;margin-top:4px;}
        .card{display:block;text-decoration:none;color:inherit;background:#fff;border-radius:18px;
          padding:16px 16px 14px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 18px rgba(0,0,0,.04);
          animation:rise .4s both;transition:.18s;}
        .card:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(0,0,0,.05),0 14px 34px rgba(0,0,0,.10);}
        .card-top{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;
          font-size:13px;font-weight:800;color:#1b1d22;flex:none;}
        .who{font-size:13px;line-height:1.2;overflow:hidden;}
        .who strong{display:block;font-weight:700;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;}
        .handle{color:#9a9da4;font-size:12px;}
        .text{font-size:13.5px;line-height:1.5;margin:0 0 14px;color:#3c3f47;
          display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}
        .stats{display:flex;gap:16px;font-size:12px;color:#9a9da4;font-weight:600;
          border-top:1px solid #f1efe9;padding-top:11px;}

        .mv{font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;}
        .mv.up{color:#1a8f5e;background:#d8f5e6;}
        .mv.down{color:#c8443c;background:#fde0dd;}
        .mv.new{color:#7a6b1e;background:#fff2c2;}
        .mv.flat{color:#8b8e96;background:#ecebe6;}

        .skel{height:120px;animation:shimmer 1.4s infinite;}
        .col-empty{font-size:13px;color:#b3b6bd;padding:20px 4px;text-align:center;}
        .error{background:#fde0dd;color:#b3322a;padding:12px 16px;border-radius:14px;margin-bottom:18px;font-size:13px;}
        .waiting{grid-column:1/-1;text-align:center;color:#9a9da4;padding:70px 0;font-size:15px;}

        @keyframes rise{from{opacity:0;transform:translateY(10px);}}
        @keyframes shimmer{50%{opacity:.5;}}

        @media(max-width:680px){.kpis{grid-template-columns:1fr;}.main{padding:22px 18px 50px;}}
      `}</style>
    </div>
  );
}
