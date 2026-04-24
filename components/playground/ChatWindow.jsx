"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Star,
  StickyNote,
  Download,
  Globe,
  ChevronDown,
  Check,
} from "lucide-react";
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

  const current = models.find((m) => m.id === w.model);

  return (
    <div className="flex flex-col min-w-[320px] h-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-panel-2)]">
        {current?.kind === "web" && (
          <span
            title="Web-connected model"
            className="shrink-0 flex items-center text-[color:var(--color-success)]"
          >
            <Globe size={14} aria-label="Web-connected" />
          </span>
        )}

        <ModelPicker
          value={w.model}
          models={models}
          onChange={onChangeModel}
        />

        {busy && (
          <span className="badge badge-streaming animate-pulse shrink-0">
            streaming
          </span>
        )}
        <button
          onClick={downloadThisChat}
          title="Download this chat as Markdown"
          disabled={turns.length === 0}
          className="shrink-0 p-1 rounded hover:bg-[color:var(--color-panel)] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Download size={14} />
        </button>
        <button
          onClick={onRemove}
          title="Remove window"
          className="shrink-0 p-1 rounded hover:bg-[color:var(--color-panel)]"
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

function ModelPicker({ value, models, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = models.find((m) => m.id === value);
  const currentLabel = current?.label || value;
  const currentVendor = current?.vendor;

  return (
    <div className="relative flex-1 min-w-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 text-left text-sm px-1.5 py-1 rounded-md hover:bg-[color:var(--color-panel)] transition-colors"
      >
        <span className="truncate flex-1 min-w-0">
          <span className="font-medium">{currentLabel}</span>
          {currentVendor && (
            <span className="text-[color:var(--color-muted)]">
              {" "}
              · {currentVendor}
            </span>
          )}
        </span>
        <ChevronDown
          size={13}
          className="shrink-0 text-[color:var(--color-muted)]"
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-1 z-30 w-[280px] max-h-[60vh] overflow-y-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-xl py-1"
        >
          {groupModels(models).map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)] bg-[color:var(--color-panel-2)]">
                {group.label}
              </div>
              {group.items.map((m) => {
                const selected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                      selected
                        ? "bg-[color:var(--color-accent-soft)]"
                        : "hover:bg-[color:var(--color-panel-2)]"
                    }`}
                  >
                    {m.kind === "web" ? (
                      <Globe
                        size={13}
                        className="mt-[3px] shrink-0 text-[color:var(--color-success)]"
                      />
                    ) : (
                      <span className="w-[13px] shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block truncate ${
                          selected
                            ? "text-[color:var(--color-accent)] font-medium"
                            : ""
                        }`}
                      >
                        {m.label}
                      </span>
                      {m.note && (
                        <span className="block text-[11px] text-[color:var(--color-muted)] truncate">
                          {m.note}
                        </span>
                      )}
                    </span>
                    {selected && (
                      <Check
                        size={13}
                        className="mt-[3px] shrink-0 text-[color:var(--color-accent)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {!current && (
            <div className="px-3 py-2 text-xs text-[color:var(--color-muted)]">
              Current: {value}
            </div>
          )}
        </div>
      )}
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
