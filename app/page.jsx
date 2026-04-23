import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[color:var(--color-accent)] to-[color:var(--color-accent-2)]" />
          <span className="font-semibold tracking-tight">LLM Analyzer</span>
        </div>
        <Link
          href="/playground"
          className="px-4 py-1.5 text-sm rounded-md bg-[color:var(--color-accent)] hover:opacity-90"
        >
          Open playground
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            One prompt.{" "}
            <span className="bg-gradient-to-r from-[color:var(--color-accent)] to-[color:var(--color-accent-2)] bg-clip-text text-transparent">
              Every model.
            </span>
          </h1>
          <p className="mt-6 text-[color:var(--color-muted)] text-lg">
            Spin up a session, pick the models you care about, and watch them
            answer the same question side by side. Every run is saved for later
            analysis, rating, and export.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/playground"
              className="px-5 py-2.5 rounded-md bg-[color:var(--color-accent)] hover:opacity-90"
            >
              Open playground
            </Link>
            <a
              href="https://openrouter.ai/models"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-md border border-[color:var(--color-border)] hover:bg-[color:var(--color-panel)]"
            >
              Browse models
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-4 text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)]">
        Powered by OpenRouter + Supabase.
      </footer>
    </main>
  );
}
