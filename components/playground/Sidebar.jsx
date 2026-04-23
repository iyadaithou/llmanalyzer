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

  const ungrouped = sessions.filter((s) => !s.folder_id);
  const byFolder = (fid) => sessions.filter((s) => s.folder_id === fid);

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

      <nav className="flex-1 overflow-y-auto px-1 pb-3">
        {folders.map((f) => {
          const open = openFolders.has(f.id);
          const inside = byFolder(f.id);
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

        <div className="mt-3 px-2 text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">
          Ungrouped
        </div>
        {ungrouped.length === 0 && (
          <div className="text-xs text-[color:var(--color-muted)] px-3 py-2">
            No sessions yet. Click <b>New session</b> to start.
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
    </aside>
  );
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
  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 mx-1 my-0.5 rounded-md text-sm cursor-pointer transition-colors ${
        active
          ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] font-medium"
          : "hover:bg-[color:var(--color-panel-2)]"
      }`}
      onClick={onSelect}
    >
      <span className="truncate flex-1">{s.name}</span>
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
