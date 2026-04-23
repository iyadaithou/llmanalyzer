"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/playground";

  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || "Wrong password");
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[color:var(--color-accent)] to-[color:var(--color-accent-2)]" />
          <span className="font-semibold tracking-tight">LLM Analyzer</span>
        </div>
        <div>
          <label className="text-xs text-[color:var(--color-muted)]">Password</label>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)] rounded-md px-3 py-2 outline-none focus:border-[color:var(--color-accent)]"
          />
        </div>
        {err && <div className="text-xs text-red-400">{err}</div>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full px-3 py-2 rounded-md bg-[color:var(--color-accent)] hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-[11px] text-[color:var(--color-muted)]">
          Single-user research tool. The password is set in the{" "}
          <code>APP_PASSWORD</code> environment variable.
        </p>
      </form>
    </main>
  );
}
