"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderPlus,
  MessageSquarePlus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Pencil,
  LogOut,
  Search,
  X,
  Wallet,
  RefreshCw,
} from "lucide-react";

const LS_KEY = "llma_sidebar_collapsed";

export default function Sidebar({
  folders,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onNewFolder,
  onDeleteSession,
  onRenameSession,
  onDeleteFolder,
  onRenameFolder,
  onMoveSession,
}) {
  const router = useRouter();
  const [openFolders, setOpenFolders] = useState(() => new Set());
  const [menuFor, setMenuFor] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  // Load persisted collapsed state after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(LS_KEY);
        if (saved === "1") setCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(LS_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const toggleFolder = (id) => {
    const next = new Set(openFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenFolders(next);
  };

  const q = query.trim().toLowerCase();
  const matches = (s) => !q || (s.name || "").toLowerCase().includes(q);
  const filtered = sessions.filter(matches);
  const ungrouped = filtered.filter((s) => !s.folder_id);
  const byFolder = (fid) => filtered.filter((s) => s.folder_id === fid);
  // When searching, auto-expand folders that contain matches so the user
  // actually sees the hits instead of collapsed-folder silence.
  const searching = q.length > 0;

  if (collapsed) {
    return (
      <aside className="w-14 shrink-0 h-screen flex flex-col items-center border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)] py-3 gap-2">
        <button
          onClick={toggleCollapsed}
          title="Expand sidebar"
          className="btn btn-ghost"
          style={{ padding: "8px" }}
        >
          <PanelLeft size={16} />
        </button>
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[color:var(--color-accent)] to-[color:var(--color-accent-2)] shrink-0" />
        <div className="h-px w-8 bg-[color:var(--color-border)] my-1" />
        <button
          onClick={onNewSession}
          title="New session"
          className="btn btn-primary"
          style={{ padding: "8px" }}
        >
          <MessageSquarePlus size={16} />
        </button>
        <button
          onClick={onNewFolder}
          title="New folder"
          className="btn btn-secondary"
          style={{ padding: "8px" }}
        >
          <FolderPlus size={15} />
        </button>

        <div className="flex-1" />
        <button
          onClick={logout}
          title="Sign out"
          className="btn btn-ghost"
          style={{ padding: "8px" }}
        >
          <LogOut size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 h-screen flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)]">
      <div className="px-3 py-3 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[color:var(--color-accent)] to-[color:var(--color-accent-2)] shrink-0" />
          <span className="font-semibold text-sm tracking-tight truncate">
            LLM Analyzer
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggleCollapsed}
            title="Collapse sidebar"
            className="btn btn-ghost"
            style={{ padding: "6px" }}
          >
            <PanelLeftClose size={14} />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="btn btn-ghost"
            style={{ padding: "6px" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div className="p-2 flex gap-2">
        <button
          onClick={onNewSession}
          className="btn btn-primary flex-1 justify-center"
          style={{ padding: "9px 12px", fontSize: "13px" }}
        >
          <MessageSquarePlus size={15} /> New session
        </button>
        <button
          onClick={onNewFolder}
          title="New folder"
          className="btn btn-secondary"
          style={{ padding: "9px 10px" }}
        >
          <FolderPlus size={15} />
        </button>
      </div>

      <div className="px-2 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            className="w-full text-sm bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)] rounded-md pl-7 pr-7 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              title="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[color:var(--color-muted)] hover:bg-[color:var(--color-panel-hover)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-1 pb-3">
        {folders.map((f) => {
          const inside = byFolder(f.id);
          if (searching && inside.length === 0) return null;
          const open = searching ? true : openFolders.has(f.id);
          return (
            <div key={f.id} className="mt-1">
              <div className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[color:var(--color-panel-2)]">
                <button
                  onClick={() => toggleFolder(f.id)}
                  className="flex items-center gap-1 flex-1 text-left text-sm min-w-0"
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} className="text-[color:var(--color-muted)]" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-xs text-[color:var(--color-muted)]">
                    {inside.length}
                  </span>
                </button>
                <FolderMenu
                  open={menuFor === `f:${f.id}`}
                  setOpen={(v) => setMenuFor(v ? `f:${f.id}` : null)}
                  onRename={() => {
                    const name = prompt("Rename folder", f.name);
                    if (name && name.trim()) onRenameFolder(f.id, name.trim());
                  }}
                  onDelete={() => {
                    if (
                      confirm(
                        `Delete folder "${f.name}"? Sessions will be moved to Ungrouped.`,
                      )
                    )
                      onDeleteFolder(f.id);
                  }}
                />
              </div>
              {open && (
                <div className="ml-5 border-l border-[color:var(--color-border)] pl-1">
                  {inside.length === 0 && (
                    <div className="text-xs text-[color:var(--color-muted)] px-2 py-1">
                      empty
                    </div>
                  )}
                  {inside.map((s) => (
                    <SessionRow
                      key={s.id}
                      s={s}
                      active={s.id === activeSessionId}
                      folders={folders}
                      menuKey={`s:${s.id}`}
                      menuFor={menuFor}
                      setMenuFor={setMenuFor}
                      onSelect={() => onSelectSession(s.id)}
                      onRename={() => {
                        const name = prompt("Rename session", s.name);
                        if (name && name.trim()) onRenameSession(s.id, name.trim());
                      }}
                      onDelete={() => {
                        if (confirm(`Delete session "${s.name}"?`))
                          onDeleteSession(s.id);
                      }}
                      onMove={(fid) => onMoveSession(s.id, fid)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!searching && (
          <div className="mt-3 px-2 text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">
            Ungrouped
          </div>
        )}
        {ungrouped.length === 0 && !searching && (
          <div className="text-xs text-[color:var(--color-muted)] px-3 py-2">
            No sessions yet. Click <b>New session</b> to start.
          </div>
        )}
        {searching && filtered.length === 0 && (
          <div className="text-xs text-[color:var(--color-muted)] px-3 py-6 text-center">
            No sessions match "{query}".
          </div>
        )}
        {ungrouped.map((s) => (
          <SessionRow
            key={s.id}
            s={s}
            active={s.id === activeSessionId}
            folders={folders}
            menuKey={`s:${s.id}`}
            menuFor={menuFor}
            setMenuFor={setMenuFor}
            onSelect={() => onSelectSession(s.id)}
            onRename={() => {
              const name = prompt("Rename session", s.name);
              if (name && name.trim()) onRenameSession(s.id, name.trim());
            }}
            onDelete={() => {
              if (confirm(`Delete session "${s.name}"?`)) onDeleteSession(s.id);
            }}
            onMove={(fid) => onMoveSession(s.id, fid)}
          />
        ))}
      </nav>

      <BalanceFooter />
    </aside>
  );
}

function BalanceFooter() {
  const [state, setState] = useState({ loading: true });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch("/api/credits", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "failed");
      setState({ loading: false, ...j });
    } catch (e) {
      setState({ loading: false, error: e.message });
    }
  };

  // Load once on mount; refresh every 60s so long research sessions stay
  // informed without hammering OpenRouter.
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const fmt = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

  const remaining = state.remaining ?? 0;
  const total = state.total ?? 0;
  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
  const low = total > 0 && remaining < Math.min(1, total * 0.1);
  const barColor = low
    ? "var(--color-danger)"
    : pct < 30
      ? "#d97706"
      : "var(--color-success)";

  return (
    <div className="border-t border-[color:var(--color-border)] px-3 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Wallet size={12} className="text-[color:var(--color-muted)]" />
        <span className="text-[color:var(--color-muted)] flex-1">
          OpenRouter balance
        </span>
        <button
          onClick={load}
          title="Refresh balance"
          disabled={state.loading}
          className="p-0.5 rounded text-[color:var(--color-muted)] hover:bg-[color:var(--color-panel-2)] disabled:opacity-40"
        >
          <RefreshCw
            size={11}
            className={state.loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {state.error ? (
        <div className="text-[color:var(--color-danger)] text-[11px]">
          {state.error}
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">${fmt(remaining)}</span>
            <span className="text-[10.5px] text-[color:var(--color-muted)]">
              used ${fmt(state.used)} / ${fmt(total)}
            </span>
          </div>
          {total > 0 && (
            <div className="mt-1.5 h-1 rounded-full bg-[color:var(--color-panel-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
          )}
          {low && (
            <div className="mt-1 text-[10.5px] text-[color:var(--color-danger)]">
              Low balance — top up at openrouter.ai
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatSessionTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SessionRow({
  s,
  active,
  folders,
  menuKey,
  menuFor,
  setMenuFor,
  onSelect,
  onRename,
  onDelete,
  onMove,
}) {
  const time = formatSessionTime(s.created_at || s.updated_at);
  return (
    <div
      className={`group flex items-start gap-1 px-2 py-1.5 mx-1 my-0.5 rounded-md cursor-pointer transition-colors ${
        active
          ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]"
          : "hover:bg-[color:var(--color-panel-2)]"
      }`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${active ? "font-medium" : ""}`}>
          {s.name || "Untitled session"}
        </div>
        {time && (
          <div
            className={`text-[10.5px] mt-0.5 truncate ${
              active
                ? "text-[color:var(--color-accent)] opacity-70"
                : "text-[color:var(--color-muted)]"
            }`}
          >
            {time}
          </div>
        )}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition"
      >
        <RowMenu
          open={menuFor === menuKey}
          setOpen={(v) => setMenuFor(v ? menuKey : null)}
          folders={folders}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
        />
      </div>
    </div>
  );
}

function FolderMenu({ open, setOpen, onRename, onDelete }) {
  return (
    <div className="relative opacity-0 group-hover:opacity-100 transition">
      <button
        className="p-1 rounded hover:bg-[color:var(--color-panel-hover)]"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-40 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-xl py-1 text-sm">
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[color:var(--color-panel-2)]"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[color:var(--color-danger)] hover:bg-[color:var(--color-panel-2)]"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ open, setOpen, folders, onRename, onDelete, onMove }) {
  return (
    <div className="relative">
      <button
        className="p-1 rounded hover:bg-[color:var(--color-panel-hover)]"
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-48 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-xl py-1 text-sm">
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[color:var(--color-panel-2)]"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <Pencil size={13} /> Rename
            </button>
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-[color:var(--color-muted)]">
              Move to
            </div>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[color:var(--color-panel-2)]"
              onClick={() => {
                setOpen(false);
                onMove(null);
              }}
            >
              Ungrouped
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[color:var(--color-panel-2)]"
                onClick={() => {
                  setOpen(false);
                  onMove(f.id);
                }}
              >
                <Folder size={12} /> {f.name}
              </button>
            ))}
            <div className="my-1 h-px bg-[color:var(--color-border)]" />
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[color:var(--color-danger)] hover:bg-[color:var(--color-panel-2)]"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
