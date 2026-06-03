// app/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";

type HotTrend = { name: string; query: string; rank: number; volume: string; move: number | null };
type Tweet = { id: string; text: string; author: string; authorHandle: string; url: string; likes: number; retweets: number; replies: number; views: number; createdAt: string | null };
type Column = { handle: string; isClient: boolean; posts: Tweet[] };
type Client = { id: string; name: string; handle: string; competitors: string[] };

const nf = new Intl.NumberFormat("en", { notation: "compact" });
const parseHandles = (s: string) => s.split(/[\s,\n]+/).map((h) => h.trim().replace(/^@+/, "")).filter(Boolean);
// nunca renderiza objeto: coage qualquer valor pra texto
const text = (v: any): string =>
  v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? (v.name ?? v.query ?? v.text ?? "") : String(v);

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<{ type: "hot" } | { type: "client"; id: string }>({ type: "hot" });

  const [hot, setHot] = useState<HotTrend[]>([]);
  const [hotAt, setHotAt] = useState<string | null>(null);

  const [columns, setColumns] = useState<Column[]>([]);
  const [clientName, setClientName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<null | { id?: string; name: string; handle: string; competitors: string }>(null);

  const loadClients = useCallback(async () => {
    const r = await fetch("/api/clients");
    const d = await r.json();
    setClients(d.clients ?? []);
  }, []);

  const loadHot = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/hot-trends");
    const d = await r.json();
    setHot(d.trends ?? []);
    setHotAt(d.updatedAt ?? null);
    setLoading(false);
  }, []);

  const loadClientPosts = useCallback(async (id: string) => {
    setLoading(true);
    setColumns([]);
    const r = await fetch(`/api/clients/${id}/posts`);
    const d = await r.json();
    setColumns(d.columns ?? []);
    setClientName(d.client?.name ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => {
    if (view.type === "hot") loadHot();
    else loadClientPosts(view.id);
  }, [view, loadHot, loadClientPosts]);

  async function saveClient() {
    if (!modal) return;
    const body = {
      id: modal.id,
      name: modal.name,
      handle: modal.handle,
      competitors: parseHandles(modal.competitors),
    };
    const r = await fetch("/api/clients", { method: "POST", body: JSON.stringify(body) });
    const d = await r.json();
    setModal(null);
    await loadClients();
    if (d.client) setView({ type: "client", id: d.client.id });
  }

  async function deleteClient(id: string) {
    if (!confirm("Remover este cliente?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    await loadClients();
    setView({ type: "hot" });
  }

  const selectedId = view.type === "client" ? view.id : null;
  const editingClient = selectedId ? clients.find((c) => c.id === selectedId) : null;

  function Move({ move }: { move: number | null }) {
    if (move == null) return <span className="mv new">novo</span>;
    if (move > 0) return <span className="mv up">▲ {move}</span>;
    if (move < 0) return <span className="mv down">▼ {Math.abs(move)}</span>;
    return <span className="mv flat">=</span>;
  }

  return (
    <div className="app">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />

      <aside className="sidebar">
        <div className="logo">W3</div>
        <button className={`side-item ${view.type === "hot" ? "active" : ""}`} onClick={() => setView({ type: "hot" })}>
          <span className="dot" /> Hot Trends
        </button>

        <div className="side-label">Clientes</div>
        <div className="client-list">
          {clients.map((c) => (
            <button key={c.id} className={`side-item ${selectedId === c.id ? "active" : ""}`} onClick={() => setView({ type: "client", id: c.id })}>
              <span className="ci-name">{text(c.name)}</span>
              <span className="ci-count">{c.competitors.length + (c.handle ? 1 : 0)}</span>
            </button>
          ))}
          {!clients.length && <div className="side-empty">nenhum cliente ainda</div>}
        </div>

        <button className="add-btn" onClick={() => setModal({ name: "", handle: "", competitors: "" })}>+ Novo cliente</button>
      </aside>

      <main className="main">
        {view.type === "hot" ? (
          <>
            <header className="topbar">
              <div>
                <h1>Hot Trends</h1>
                <p className="sub">o que está bombando no X agora {hotAt ? `· sync ${new Date(hotAt).toLocaleTimeString()}` : ""}</p>
              </div>
              <button className="refresh" onClick={loadHot} disabled={loading}>{loading ? "···" : "↻ atualizar"}</button>
            </header>

            {!hot.length && !loading && <div className="waiting">aguardando a primeira rodada do cron…</div>}

            <div className="trend-grid">
              {hot.map((t) => (
                <a key={`${t.rank}-${text(t.name)}`} className="trend" href={`https://x.com/search?q=${encodeURIComponent(text(t.query))}`} target="_blank" rel="noreferrer">
                  <span className="t-rank">{Number(t.rank) || ""}</span>
                  <div className="t-body">
                    <span className="t-name">{text(t.name)}</span>
                    {text(t.volume) && <span className="t-vol">{text(t.volume)}</span>}
                  </div>
                  <Move move={t.move} />
                </a>
              ))}
            </div>
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <h1>{clientName || editingClient?.name}</h1>
                <p className="sub">posts mais recentes do cliente e dos concorrentes</p>
              </div>
              <div className="topright">
                {editingClient && (
                  <button className="ghost" onClick={() => setModal({ id: editingClient.id, name: editingClient.name, handle: editingClient.handle, competitors: editingClient.competitors.join(", ") })}>editar</button>
                )}
                {selectedId && <button className="ghost danger" onClick={() => deleteClient(selectedId)}>excluir</button>}
                <button className="refresh" onClick={() => selectedId && loadClientPosts(selectedId)} disabled={loading}>{loading ? "···" : "↻"}</button>
              </div>
            </header>

            {loading && <div className="waiting">buscando posts…</div>}

            <div className="board">
              {columns.map((col) => (
                <div className="col" key={col.handle}>
                  <div className={`col-head ${col.isClient ? "is-client" : ""}`}>
                    <span className="col-handle">@{text(col.handle)}</span>
                    {col.isClient && <span className="badge-client">cliente</span>}
                  </div>
                  <div className="cards">
                    {col.posts.map((p) => (
                      <a key={p.id} href={p.url || "#"} target="_blank" rel="noreferrer" className="card">
                        <p className="text">{text(p.text)}</p>
                        <div className="stats">
                          <span>♥ {nf.format(p.likes)}</span>
                          <span>⇄ {nf.format(p.retweets)}</span>
                          <span>↩ {nf.format(p.replies)}</span>
                        </div>
                      </a>
                    ))}
                    {!col.posts.length && !loading && <div className="col-empty">sem posts recentes</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.id ? "Editar cliente" : "Novo cliente"}</h2>
            <label>Nome do cliente</label>
            <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Ex.: Projeto DeFi X" />
            <label>@ do cliente</label>
            <input value={modal.handle} onChange={(e) => setModal({ ...modal, handle: e.target.value })} placeholder="@projetodefi" />
            <label>@ dos concorrentes (separados por vírgula ou linha)</label>
            <textarea value={modal.competitors} onChange={(e) => setModal({ ...modal, competitors: e.target.value })} placeholder="@aave, @uniswap, @compoundfinance" rows={4} />
            <div className="modal-actions">
              <button className="ghost" onClick={() => setModal(null)}>cancelar</button>
              <button className="primary" onClick={saveClient} disabled={!modal.name.trim()}>salvar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(*){box-sizing:border-box;}
        :global(body){margin:0;background:#f4f3ef;color:#1b1d22;font-family:"Plus Jakarta Sans",system-ui,sans-serif;}
        .app{display:flex;min-height:100vh;}

        .sidebar{width:240px;flex:none;background:#16171b;color:#cdd0d6;padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh;}
        .logo{width:40px;height:40px;border-radius:12px;background:#ffd84d;color:#16171b;display:grid;place-items:center;font-weight:800;font-size:15px;margin-bottom:14px;}
        .side-item{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;text-align:left;background:transparent;border:0;color:#9aa0a8;font:inherit;font-size:14px;font-weight:600;padding:10px 12px;border-radius:10px;cursor:pointer;transition:.15s;}
        .side-item:hover{background:#20222a;color:#e7e9ee;}
        .side-item.active{background:#23252b;color:#ffd84d;}
        .dot{width:8px;height:8px;border-radius:50%;background:#34f5a0;box-shadow:0 0 10px #34f5a0;}
        .side-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#5f636b;margin:16px 12px 4px;}
        .client-list{display:flex;flex-direction:column;gap:2px;flex:1;overflow-y:auto;}
        .ci-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ci-count{font-size:11px;color:#5f636b;background:#23252b;border-radius:99px;padding:1px 8px;}
        .side-empty{font-size:13px;color:#5f636b;padding:8px 12px;}
        .add-btn{margin-top:8px;background:#ffd84d;color:#16171b;border:0;border-radius:10px;padding:11px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;}
        .add-btn:hover{filter:brightness(1.05);}

        .main{flex:1;padding:30px 36px 60px;max-width:1200px;}
        .topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:16px;}
        h1{font-size:26px;font-weight:800;margin:0;letter-spacing:-.02em;}
        .sub{margin:4px 0 0;color:#8b8e96;font-size:13px;}
        .topright{display:flex;align-items:center;gap:8px;}
        .refresh{background:#16171b;color:#fff;border:0;border-radius:999px;padding:9px 15px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}
        .refresh:disabled{opacity:.5;}
        .ghost{background:#fff;border:1px solid #e2e0d9;color:#4c4f57;border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}
        .ghost:hover{border-color:#c9c7bf;}
        .ghost.danger{color:#c8443c;}

        .trend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
        .trend{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 16px rgba(0,0,0,.04);transition:.15s;}
        .trend:hover{transform:translateY(-2px);box-shadow:0 1px 2px rgba(0,0,0,.05),0 12px 26px rgba(0,0,0,.09);}
        .t-rank{font-size:15px;font-weight:800;color:#b9b6ad;min-width:22px;}
        .t-body{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .t-name{font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .t-vol{font-size:12px;color:#9a9da4;}

        .board{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;align-items:start;}
        .col{display:flex;flex-direction:column;gap:10px;}
        .col-head{display:flex;align-items:center;gap:8px;padding:6px 2px;}
        .col-handle{font-weight:700;font-size:14px;}
        .col-head.is-client .col-handle{color:#9a7b1e;}
        .badge-client{font-size:11px;font-weight:700;background:#fff2c2;color:#8a6b00;padding:3px 9px;border-radius:999px;}
        .cards{display:flex;flex-direction:column;gap:10px;}
        .card{display:block;text-decoration:none;color:inherit;background:#fff;border-radius:16px;padding:14px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 16px rgba(0,0,0,.04);transition:.15s;}
        .card:hover{transform:translateY(-2px);}
        .text{font-size:13.5px;line-height:1.5;margin:0 0 12px;color:#3c3f47;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;}
        .stats{display:flex;gap:14px;font-size:12px;color:#9a9da4;font-weight:600;border-top:1px solid #f1efe9;padding-top:10px;}

        .mv{font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;white-space:nowrap;}
        .mv.up{color:#1a8f5e;background:#d8f5e6;}
        .mv.down{color:#c8443c;background:#fde0dd;}
        .mv.new{color:#7a6b1e;background:#fff2c2;}
        .mv.flat{color:#8b8e96;background:#ecebe6;}

        .waiting{color:#9a9da4;padding:50px 0;text-align:center;font-size:15px;}
        .col-empty{font-size:13px;color:#b3b6bd;padding:14px 4px;}

        .overlay{position:fixed;inset:0;background:rgba(20,20,22,.5);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50;}
        .modal{background:#fff;border-radius:20px;padding:26px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.25);}
        .modal h2{font-size:19px;font-weight:800;margin:0 0 18px;}
        .modal label{display:block;font-size:13px;font-weight:600;color:#5c5f66;margin:14px 0 6px;}
        .modal input,.modal textarea{width:100%;border:1px solid #e2e0d9;border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;resize:vertical;}
        .modal input:focus,.modal textarea:focus{outline:none;border-color:#ffd84d;}
        .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;}
        .primary{background:#16171b;color:#fff;border:0;border-radius:999px;padding:10px 20px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;}
        .primary:disabled{opacity:.4;cursor:not-allowed;}

        @media(max-width:760px){.sidebar{width:200px;}.main{padding:22px 18px 50px;}}
      `}</style>
    </div>
  );
}
