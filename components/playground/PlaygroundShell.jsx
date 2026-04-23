"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Download,
  Settings2,
  SendHorizonal,
  Loader2,
  Repeat,
} from "lucide-react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import {
  downloadText,
  safeFilename,
  sessionToMarkdown,
  windowToMarkdown,
} from "@/lib/markdown-export";

// Default trio for a new session. Web-connected variants so we're comparing
// models under conditions closest to what end users actually experience
// (ChatGPT with search, Claude with web, Perplexity).
const DEFAULT_MODELS = [
  "openai/gpt-4o-search-preview",
  "anthropic/claude-sonnet-4.5:online",
  "perplexity/sonar-pro",
];

export default function PlaygroundShell() {
  // ---------- global state ----------
  const [folders, setFolders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [modelCatalog, setModelCatalog] = useState([]);

  // ---------- active session ----------
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [windows, setWindows] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [responses, setResponses] = useState([]); // indexed by prompt_id + window_id
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ---------- input ----------
  const [input, setInput] = useState("");
  const [streamingWindows, setStreamingWindows] = useState(() => new Set());
  const abortersRef = useRef(new Map()); // windowId -> AbortController

  // ---------- boot ----------
  useEffect(() => {
    (async () => {
      const [f, s, m] = await Promise.all([
        fetch("/api/folders").then((r) => r.json()),
        fetch("/api/sessions").then((r) => r.json()),
        fetch("/api/models").then((r) => r.json()),
      ]);
      setFolders(f.folders || []);
      setSessions(s.sessions || []);
      setModelCatalog(m.models || []);
    })();
  }, []);

  // load active session detail
  useEffect(() => {
    if (!activeSessionId) {
      setSession(null);
      setWindows([]);
      setPrompts([]);
      setResponses([]);
      return;
    }
    (async () => {
      const r = await fetch(`/api/sessions/${activeSessionId}`).then((r) => r.json());
      setSession(r.session);
      setWindows(r.windows || []);
      setPrompts(r.prompts || []);
      setResponses(r.responses || []);
    })();
  }, [activeSessionId]);

  // ---------- sidebar actions ----------
  const newSession = useCallback(async () => {
    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Session ${new Date().toLocaleString()}`,
        models: DEFAULT_MODELS,
        multi_turn: true,
      }),
    }).then((r) => r.json());
    if (r.error) return alert(r.error);
    setSessions((prev) => [
      { ...r.session, updated_at: r.session.updated_at },
      ...prev,
    ]);
    setActiveSessionId(r.session.id);
  }, []);

  const newFolder = useCallback(async () => {
    const name = prompt("Folder name");
    if (!name) return;
    const r = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    if (r.error) return alert(r.error);
    setFolders((prev) => [...prev, r.folder]);
  }, []);

  const renameSession = async (id, name) => {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    if (session?.id === id) setSession((s) => ({ ...s, name }));
  };
  const deleteSession = async (id) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };
  const renameFolder = async (id, name) => {
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  };
  const deleteFolder = async (id) => {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setSessions((prev) =>
      prev.map((s) => (s.folder_id === id ? { ...s, folder_id: null } : s)),
    );
  };
  const moveSession = async (id, folder_id) => {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id }),
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, folder_id } : s)),
    );
  };

  // ---------- session-level actions ----------
  const updateSessionSetting = async (patch) => {
    const r = await fetch(`/api/sessions/${activeSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => r.json());
    if (r.session) {
      setSession(r.session);
      setSessions((prev) =>
        prev.map((s) => (s.id === r.session.id ? { ...s, ...r.session } : s)),
      );
    }
  };

  const addWindow = async (modelId) => {
    const r = await fetch(`/api/sessions/${activeSessionId}/windows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId }),
    }).then((r) => r.json());
    if (r.window) setWindows((prev) => [...prev, r.window]);
  };

  const changeWindowModel = async (windowId, model) => {
    const r = await fetch(`/api/windows/${windowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    }).then((r) => r.json());
    if (r.window)
      setWindows((prev) =>
        prev.map((w) => (w.id === windowId ? { ...w, ...r.window } : w)),
      );
  };

  const removeWindow = async (windowId) => {
    await fetch(`/api/windows/${windowId}`, { method: "DELETE" });
    setWindows((prev) => prev.filter((w) => w.id !== windowId));
    setResponses((prev) => prev.filter((r) => r.chat_window_id !== windowId));
  };

  const rateResponse = async (id, rating) => {
    const r = await fetch(`/api/responses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    }).then((r) => r.json());
    if (r.response)
      setResponses((prev) =>
        prev.map((x) => (x.id === id ? { ...x, rating: r.response.rating } : x)),
      );
  };
  const noteResponse = async (id, notes) => {
    const r = await fetch(`/api/responses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }).then((r) => r.json());
    if (r.response)
      setResponses((prev) =>
        prev.map((x) => (x.id === id ? { ...x, notes: r.response.notes } : x)),
      );
  };

  // ---------- sending prompts ----------
  const buildMessagesFor = useCallback(
    (windowId, currentPromptContent) => {
      const msgs = [];
      if (session?.system_prompt)
        msgs.push({ role: "system", content: session.system_prompt });

      if (session?.multi_turn) {
        // stitch prior turns: for each past prompt, attach that window's response
        for (const p of prompts) {
          msgs.push({ role: "user", content: p.content });
          const past = responses.find(
            (r) => r.prompt_id === p.id && r.chat_window_id === windowId,
          );
          if (past?.content)
            msgs.push({ role: "assistant", content: past.content });
        }
      }
      msgs.push({ role: "user", content: currentPromptContent });
      return msgs;
    },
    [session, prompts, responses],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeSessionId || windows.length === 0) return;
    setInput("");

    // 1. Persist prompt
    const promptRes = await fetch(
      `/api/sessions/${activeSessionId}/prompts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      },
    ).then((r) => r.json());
    if (promptRes.error) return alert(promptRes.error);
    const prompt = promptRes.prompt;
    setPrompts((prev) => [...prev, prompt]);

    // 2. Seed empty responses so the UI shows streaming placeholders
    setResponses((prev) => [
      ...prev,
      ...windows.map((w) => ({
        id: null,
        prompt_id: prompt.id,
        chat_window_id: w.id,
        model: w.model,
        content: "",
      })),
    ]);

    // 3. Fan out
    const nextStreaming = new Set(streamingWindows);
    windows.forEach((w) => nextStreaming.add(w.id));
    setStreamingWindows(nextStreaming);

    await Promise.all(
      windows.map((w) => runWindow(w, prompt, text)),
    );
  }, [input, activeSessionId, windows, streamingWindows, buildMessagesFor]);

  const runWindow = useCallback(
    async (w, prompt, text) => {
      const controller = new AbortController();
      abortersRef.current.set(w.id, controller);

      const t0 = performance.now();
      let accumulated = "";
      let finish = null;
      let usage = null;
      let errMsg = null;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: w.model,
            messages: buildMessagesFor(w.id, text),
            temperature: Number(session?.temperature ?? 0.7),
            max_tokens: Number(session?.max_tokens ?? 1024),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          errMsg = `HTTP ${res.status}`;
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const raw of lines) {
              const line = raw.trim();
              if (!line.startsWith("data:")) continue;
              try {
                const obj = JSON.parse(line.slice(5).trim());
                if (obj.delta) {
                  accumulated += obj.delta;
                  setResponses((prev) =>
                    prev.map((r) =>
                      r.prompt_id === prompt.id && r.chat_window_id === w.id
                        ? { ...r, content: accumulated }
                        : r,
                    ),
                  );
                } else if (obj.done) {
                  finish = obj.finish_reason;
                  usage = obj.usage;
                } else if (obj.error) {
                  errMsg = obj.error;
                }
              } catch {}
            }
          }
        }
      } catch (e) {
        if (e.name !== "AbortError") errMsg = e.message || "stream failed";
      }

      const latency_ms = Math.round(performance.now() - t0);
      abortersRef.current.delete(w.id);
      setStreamingWindows((prev) => {
        const n = new Set(prev);
        n.delete(w.id);
        return n;
      });

      // Persist the finished (or errored) response
      const saved = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_id: prompt.id,
          chat_window_id: w.id,
          model: w.model,
          content: accumulated || null,
          finish_reason: finish,
          latency_ms,
          tokens_in: usage?.prompt_tokens ?? null,
          tokens_out: usage?.completion_tokens ?? null,
          error: errMsg,
        }),
      }).then((r) => r.json());

      if (saved.response) {
        setResponses((prev) =>
          prev.map((r) =>
            r.prompt_id === prompt.id && r.chat_window_id === w.id
              ? { ...saved.response }
              : r,
          ),
        );
      }
    },
    [session, buildMessagesFor],
  );

  const stopAll = () => {
    for (const [, c] of abortersRef.current) c.abort();
    abortersRef.current.clear();
    setStreamingWindows(new Set());
  };

  // ---------- derived data ----------
  const turnsByWindow = useMemo(() => {
    const map = new Map();
    for (const w of windows) {
      const turns = prompts.map((p) => ({
        prompt: p,
        response: responses.find(
          (r) => r.prompt_id === p.id && r.chat_window_id === w.id,
        ),
      }));
      map.set(w.id, turns);
    }
    return map;
  }, [windows, prompts, responses]);

  const anyStreaming = streamingWindows.size > 0;

  // ---------- render ----------
  return (
    <div className="flex h-screen">
      <Sidebar
        folders={folders}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={newSession}
        onNewFolder={newFolder}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onDeleteFolder={deleteFolder}
        onRenameFolder={renameFolder}
        onMoveSession={moveSession}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {!session ? (
          <EmptyState onNew={newSession} />
        ) : (
          <>
            <TopBar
              session={session}
              windows={windows}
              prompts={prompts}
              responses={responses}
              modelCatalog={modelCatalog}
              onAddWindow={addWindow}
              onRename={(name) => updateSessionSetting({ name })}
              onToggleMultiTurn={() =>
                updateSessionSetting({ multi_turn: !session.multi_turn })
              }
              onOpenSettings={() => setSettingsOpen((v) => !v)}
              settingsOpen={settingsOpen}
            />
            {settingsOpen && (
              <SettingsPanel
                session={session}
                onChange={updateSessionSetting}
              />
            )}

            <div className="flex-1 min-h-0 overflow-x-auto">
              <div
                className="h-full p-3 grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(
                    windows.length,
                    1,
                  )}, minmax(340px, 1fr))`,
                  gridAutoFlow: "column",
                }}
              >
                {windows.map((w) => (
                  <ChatWindow
                    key={w.id}
                    w={w}
                    session={session}
                    models={modelCatalog}
                    turns={turnsByWindow.get(w.id) || []}
                    busy={streamingWindows.has(w.id)}
                    onChangeModel={(m) => changeWindowModel(w.id, m)}
                    onRemove={() => removeWindow(w.id)}
                    onRateResponse={rateResponse}
                    onNoteResponse={noteResponse}
                  />
                ))}
              </div>
            </div>

            <PromptBar
              value={input}
              onChange={setInput}
              onSend={send}
              onStop={stopAll}
              streaming={anyStreaming}
              disabled={windows.length === 0}
              multiTurn={session.multi_turn}
            />
          </>
        )}
      </main>
    </div>
  );
}

// ---------------- sub-UI ----------------

function EmptyState({ onNew }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-semibold mb-2">Start a session</div>
        <p className="text-[color:var(--color-muted)] max-w-md mb-6">
          A session holds one or more chat windows, each bound to a model. The
          prompt bar fans out to every window in parallel.
        </p>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-md bg-[color:var(--color-accent)] hover:opacity-90"
        >
          + New session
        </button>
      </div>
    </div>
  );
}

function TopBar({
  session,
  windows,
  prompts,
  responses,
  modelCatalog,
  onAddWindow,
  onRename,
  onToggleMultiTurn,
  onOpenSettings,
  settingsOpen,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.name);
  useEffect(() => setDraft(session.name), [session.name]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft && draft !== session.name) onRename(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="bg-transparent border border-[color:var(--color-border)] rounded px-2 py-1 text-sm"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-medium hover:underline"
        >
          {session.name}
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={onToggleMultiTurn}
        title={session.multi_turn ? "Multi-turn (history kept)" : "One-shot mode"}
        className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border ${
          session.multi_turn
            ? "border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
            : "border-[color:var(--color-border)] text-[color:var(--color-muted)]"
        }`}
      >
        <Repeat size={13} />
        {session.multi_turn ? "Multi-turn" : "One-shot"}
      </button>

      <AddWindowMenu models={modelCatalog} onAdd={onAddWindow} />

      <DownloadMenu
        session={session}
        windows={windows}
        prompts={prompts}
        responses={responses}
        models={modelCatalog}
      />

      <button
        onClick={onOpenSettings}
        className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border ${
          settingsOpen
            ? "border-[color:var(--color-accent)]"
            : "border-[color:var(--color-border)] hover:bg-[color:var(--color-panel)]"
        }`}
      >
        <Settings2 size={13} /> Settings
      </button>
    </div>
  );
}

function DownloadMenu({ session, windows, prompts, responses, models }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const hasData = prompts.length > 0 && windows.length > 0;

  const downloadAllMarkdown = () => {
    close();
    if (!hasData) return;
    const md = sessionToMarkdown({ session, windows, prompts, responses, models });
    downloadText(`${safeFilename(session.name)}.md`, md);
  };

  const downloadEachSeparate = () => {
    close();
    if (!hasData) return;
    windows.forEach((w, i) => {
      const turns = prompts.map((p) => ({
        prompt: p,
        response: responses.find(
          (r) => r.prompt_id === p.id && r.chat_window_id === w.id,
        ),
      }));
      const md = windowToMarkdown({ session, window: w, turns, models });
      const modelPart = safeFilename(
        models.find((m) => m.id === w.model)?.label || w.model,
      );
      // slight stagger so browsers don't collapse simultaneous downloads
      setTimeout(
        () => downloadText(`${safeFilename(session.name)}__${modelPart}.md`, md),
        i * 150,
      );
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border border-[color:var(--color-border)] hover:bg-[color:var(--color-panel)]"
        title="Download"
      >
        <Download size={13} /> Download
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-9 z-20 w-64 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-xl py-1 text-sm">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
              All chats in one file
            </div>
            <button
              onClick={downloadAllMarkdown}
              disabled={!hasData}
              className="w-full text-left px-3 py-1.5 hover:bg-[color:var(--color-panel-2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Markdown (.md)</span>
              <span className="text-[10px] text-[color:var(--color-muted)]">human-readable</span>
            </button>
            <a
              href={`/api/sessions/${session.id}/export?format=json`}
              onClick={(e) => (hasData ? close() : e.preventDefault())}
              className={`px-3 py-1.5 hover:bg-[color:var(--color-panel-2)] flex items-center justify-between ${
                hasData ? "" : "opacity-40 cursor-not-allowed pointer-events-none"
              }`}
            >
              <span>JSON (.json)</span>
              <span className="text-[10px] text-[color:var(--color-muted)]">structured</span>
            </a>
            <a
              href={`/api/sessions/${session.id}/export?format=csv`}
              onClick={(e) => (hasData ? close() : e.preventDefault())}
              className={`px-3 py-1.5 hover:bg-[color:var(--color-panel-2)] flex items-center justify-between ${
                hasData ? "" : "opacity-40 cursor-not-allowed pointer-events-none"
              }`}
            >
              <span>CSV (.csv)</span>
              <span className="text-[10px] text-[color:var(--color-muted)]">for spreadsheets</span>
            </a>
            <div className="my-1 border-t border-[color:var(--color-border)]" />
            <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
              One file per chat
            </div>
            <button
              onClick={downloadEachSeparate}
              disabled={!hasData}
              className="w-full text-left px-3 py-1.5 hover:bg-[color:var(--color-panel-2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Markdown × {windows.length}</span>
              <span className="text-[10px] text-[color:var(--color-muted)]">one per model</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddWindowMenu({ models, onAdd }) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const buckets = {
      "Web-connected (live)": [],
      "Standard": [],
      "Reasoning": [],
    };
    for (const m of models) {
      if (m.kind === "web") buckets["Web-connected (live)"].push(m);
      else if (m.kind === "reasoning") buckets["Reasoning"].push(m);
      else buckets["Standard"].push(m);
    }
    return Object.entries(buckets).filter(([, items]) => items.length);
  }, [models]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-[color:var(--color-panel)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-panel-2)]"
      >
        <Plus size={13} /> Add model
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-20 w-80 max-h-[60vh] overflow-y-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-xl py-1">
            {groups.map(([label, items]) => (
              <div key={label}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                  {label}
                </div>
                {items.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setOpen(false);
                      onAdd(m.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--color-panel-2)] flex items-center gap-2"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{m.label}</span>
                      {m.note && (
                        <span className="block text-[10px] text-[color:var(--color-muted)] truncate">
                          {m.note}
                        </span>
                      )}
                    </span>
                    {m.kind === "web" && (
                      <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-[color:var(--color-accent-2)]/15 text-[color:var(--color-accent-2)]">
                        WEB
                      </span>
                    )}
                    <span className="text-[10px] text-[color:var(--color-muted)] shrink-0">
                      {m.vendor}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SettingsPanel({ session, onChange }) {
  return (
    <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-[color:var(--color-muted)]">System prompt</span>
        <textarea
          defaultValue={session.system_prompt || ""}
          onBlur={(e) => onChange({ system_prompt: e.target.value || null })}
          rows={2}
          placeholder="Optional. Sent to every model."
          className="bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)] rounded p-2 outline-none focus:border-[color:var(--color-accent)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-[color:var(--color-muted)]">
          Temperature ({session.temperature ?? 0.7})
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          defaultValue={session.temperature ?? 0.7}
          onChange={(e) => onChange({ temperature: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-[color:var(--color-muted)]">Max tokens</span>
        <input
          type="number"
          defaultValue={session.max_tokens ?? 1024}
          onBlur={(e) =>
            onChange({ max_tokens: Number(e.target.value) || 1024 })
          }
          className="bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)] rounded p-1.5 outline-none focus:border-[color:var(--color-accent)]"
        />
      </label>
    </div>
  );
}

function PromptBar({ value, onChange, onSend, onStop, streaming, disabled, multiTurn }) {
  const ref = useRef(null);
  return (
    <div className="border-t border-[color:var(--color-border)] p-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!streaming) onSend();
              }
            }}
            rows={2}
            placeholder={
              disabled
                ? "Add at least one model window to start."
                : multiTurn
                  ? "Ask every window (⏎ to send, ⇧⏎ for newline). History is kept."
                  : "Ask every window (⏎ to send). One-shot: each prompt is independent."
            }
            disabled={disabled}
            className="w-full resize-none bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 pr-12 outline-none focus:border-[color:var(--color-accent)] text-sm"
          />
        </div>
        {streaming ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-red-500/20 text-red-300 border border-red-500/40"
          >
            <Loader2 className="animate-spin" size={15} /> Stop
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-[color:var(--color-accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendHorizonal size={15} /> Send to all
          </button>
        )}
      </div>
    </div>
  );
}
