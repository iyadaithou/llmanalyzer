"use client";

import { useEffect, useRef, useState } from "react";
import { X, Star, StickyNote, Download } from "lucide-react";
import Markdown from "./Markdown";
import {
  downloadText,
  safeFilename,
  windowToMarkdown,
} from "@/lib/markdown-export";

// Group models by vendor so related variants stay visually adjacent
// (e.g. all Perplexity Sonar models under one header).
function groupModels(models) {
  const buckets = new Map();
  for (const m of models) {
    const v = m.vendor || "Other";
    if (!buckets.has(v)) buckets.set(v, []);
    buckets.get(v).push(m);
  }
  return Array.from(buckets, ([label, items]) => ({ label, items }));
}

export default function ChatWindow({
  w,
  session,
  models,
  turns, // [{ prompt, response }]
  onChangeModel,
  onRemove,
  onRateResponse,
  onNoteResponse,
  busy,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const downloadThisChat = () => {
    if (!session) return;
    const md = windowToMarkdown({ session, window: w, turns, models });
    const modelPart = safeFilename(
      models.find((m) => m.id === w.model)?.label || w.model,
    );
    downloadText(`${safeFilename(session.name)}__${modelPart}.md`, md);
  };

  return (
    <div className="flex flex-col min-w-[320px] h-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-panel-2)]">
        <select
          value={w.model}
          onChange={(e) => onChangeModel(e.target.value)}
          className="bg-transparent text-sm outline-none flex-1 truncate"
        >
          {groupModels(models).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((m) => (
                <option key={m.id} value={m.id} className="bg-[color:var(--color-panel)]">
                  {m.label} — {m.vendor}
                </option>
              ))}
            </optgroup>
          ))}
          {!models.find((m) => m.id === w.model) && (
            <option value={w.model}>{w.model}</option>
          )}
        </select>
        {models.find((m) => m.id === w.model)?.kind === "web" && (
          <span className="badge badge-web" title="Web-connected model">
            Web
          </span>
        )}
        {busy && <span className="badge badge-streaming animate-pulse">streaming</span>}
        <button
          onClick={downloadThisChat}
          title="Download this chat as Markdown"
          disabled={turns.length === 0}
          className="p-1 rounded hover:bg-[color:var(--color-panel)] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Download size={14} />
        </button>
        <button
          onClick={onRemove}
          title="Remove window"
          className="p-1 rounded hover:bg-[color:var(--color-panel)]"
        >
          <X size={14} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {turns.length === 0 && (
          <div className="text-xs text-[color:var(--color-muted)] text-center py-10">
            Send a prompt below — it fans out to every window.
          </div>
        )}
        {turns.map((t, i) => (
          <Turn
            key={t.prompt?.id || i}
            t={t}
            onRate={(rating) =>
              t.response?.id && onRateResponse(t.response.id, rating)
            }
            onNote={(notes) =>
              t.response?.id && onNoteResponse(t.response.id, notes)
            }
          />
        ))}
      </div>
    </div>
  );
}

function Turn({ t, onRate, onNote }) {
  const [showNotes, setShowNotes] = useState(!!t.response?.notes);
  const [notes, setNotes] = useState(t.response?.notes || "");
  useEffect(() => setNotes(t.response?.notes || ""), [t.response?.id]);

  return (
    <div className="space-y-2">
      {t.prompt && (
        <div className="text-[12px] text-[color:var(--color-muted)] bg-[color:var(--color-panel-2)] rounded-md px-3 py-2 border border-[color:var(--color-border)]">
          <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">
            prompt
          </div>
          <div className="whitespace-pre-wrap">{t.prompt.content}</div>
        </div>
      )}
      <div className="rounded-md px-3 py-2">
        {t.response?.error ? (
          <div className="text-red-400 text-sm">
            <b>error:</b> {t.response.error}
          </div>
        ) : (
          <Markdown>{t.response?.content || "…"}</Markdown>
        )}
        {(t.response?.latency_ms || t.response?.tokens_out) && (
          <div className="mt-2 text-[11px] text-[color:var(--color-muted)] flex gap-3">
            {t.response.latency_ms != null && <span>{t.response.latency_ms} ms</span>}
            {t.response.tokens_in != null && <span>in: {t.response.tokens_in}</span>}
            {t.response.tokens_out != null && <span>out: {t.response.tokens_out}</span>}
            {t.response.finish_reason && <span>· {t.response.finish_reason}</span>}
          </div>
        )}
        {t.response?.id && (
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRate(n === t.response.rating ? null : n)}
                className={`p-0.5 rounded ${
                  (t.response.rating || 0) >= n
                    ? "text-yellow-400"
                    : "text-[color:var(--color-muted)] hover:text-yellow-400"
                }`}
                title={`Rate ${n}/5`}
              >
                <Star size={13} fill={(t.response.rating || 0) >= n ? "currentColor" : "none"} />
              </button>
            ))}
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="ml-1 p-0.5 text-[color:var(--color-muted)] hover:text-white"
              title="Notes"
            >
              <StickyNote size={13} />
            </button>
          </div>
        )}
        {showNotes && t.response?.id && (
          <textarea
            className="mt-2 w-full text-xs bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)] rounded p-2 outline-none focus:border-[color:var(--color-accent)]"
            placeholder="Research notes for this response…"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNote(notes)}
          />
        )}
      </div>
    </div>
  );
}
