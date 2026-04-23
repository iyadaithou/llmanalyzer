# LLM Analyzer

Compare how different LLMs respond to the **same prompt at the same time**, side by side.
Built for prompt research: every session is stored, every response can be rated, and
everything exports to JSON/CSV for offline analysis.

- One prompt input → fans out to N chat windows in parallel (streaming)
- Each window bound to a model of your choice (OpenRouter catalog)
- Multi-turn or one-shot per session
- Folders + sessions in the left panel for organization
- Per-response star rating + research notes
- Export sessions as JSON or CSV
- **Single-user auth: one shared password** (no Clerk, no multi-user overhead)

**Stack:** Next.js 16 App Router (JSX) · Supabase Postgres · OpenRouter · Tailwind v4 · Vercel-ready.

---

## 1. Prereqs

- Node 20+
- Accounts on: [OpenRouter](https://openrouter.ai), [Supabase](https://supabase.com)

---

## 2. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see sections below).

---

## 3. Password gate

The entire app is gated behind a single shared password. Set two env vars:

```
APP_PASSWORD=pick-something-strong
APP_AUTH_SECRET=any-long-random-string-32-chars-plus
```

- `APP_PASSWORD` is what you'll type on the `/login` page.
- `APP_AUTH_SECRET` signs the login cookie (HMAC-SHA256). If you omit it, the
  password itself is used as the secret — fine for local dev, but in production
  set it explicitly so rotating the password doesn't invalidate all cookies.

That's the whole auth system: a login form → POST `/api/auth/login` → signed
cookie → `middleware.js` checks the cookie on every other route. No users table.

---

## 4. OpenRouter

1. Sign up at [openrouter.ai](https://openrouter.ai), create an API key at
   [openrouter.ai/keys](https://openrouter.ai/keys).
2. Fund the account — pay-as-you-go, $5 goes a long way.
3. Put the key in `OPENROUTER_API_KEY`.

The key is **server-side only** (used in `app/api/chat/route.js`). It is never
shipped to the browser.

Curated model list: `lib/openrouter.js → CURATED_MODELS`. Add/remove IDs there.
Model IDs follow the OpenRouter schema: `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`, etc.
Full catalog: [openrouter.ai/models](https://openrouter.ai/models).

---

## 5. Supabase

1. Create a new Supabase project.
2. Copy the URL and **service-role key** into `.env.local`
   (we only use the service-role key — it stays server-side).
3. Run the migration: paste `supabase/migrations/0001_init.sql` into the
   Supabase SQL Editor, or via CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

No RLS is needed — the password gate protects access at the app layer, and
Supabase is only reached from server-side code with the service role key.

---

## 6. Run

```bash
npm run dev
```

1. Open http://localhost:3000 → click **Open playground**.
2. You'll be redirected to `/login`. Enter your `APP_PASSWORD`.
3. Click **New session** (left panel) — three default windows appear.
4. Click **+ Add model** to add more windows.
5. Type a prompt, hit ⏎ — it streams to every window in parallel.
6. Toggle **Multi-turn / One-shot** per session.
7. Click past sessions in the sidebar to revisit them.
8. Rate responses (★) and add notes. Use **JSON** / **CSV** to export.

---

## 7. Deploy to Vercel

```bash
vercel
```

Then set the **same env vars** in Vercel (Settings → Environment Variables).
Important:

- Set `OPENROUTER_SITE_URL` to your production URL (e.g. `https://llmanalyzer.vercel.app`)
  so OpenRouter attributes usage correctly.
- Keep `NODE_ENV` at `production` (Vercel does this automatically). In production
  the login cookie is `secure`.

---

## Data model

```
folders (id, name, created_at)
sessions (id, folder_id, name, multi_turn, system_prompt, temperature, max_tokens)
chat_windows (id, session_id, model, label, position)
prompts (id, session_id, content, turn_index)        -- one row per user submit
responses (id, prompt_id, chat_window_id, model,     -- one per (prompt × window)
           content, finish_reason, latency_ms,
           tokens_in, tokens_out, cost_usd,
           rating, notes, error)
```

`(prompt_id, chat_window_id)` is unique — re-running a cell upserts.

---

## Research notes (brutal take)

This is a **playground**, not an eval harness. Natural next steps if you want to
turn this into a research tool — the schema already supports all of them:

- **Seeded determinism:** pass `seed` to OpenRouter where supported (OpenAI + some
  others) and store it on the prompt.
- **Blind ratings:** hide the model name in the window header until a rating is
  submitted — reduces brand bias.
- **Pairwise preference:** add a `comparisons` table (A vs B, winner). That's how
  Chatbot Arena actually computes Elo.
- **Rubric scoring:** replace the one 1–5 star with fixed dimensions (correctness,
  reasoning, style, safety) in a JSON column. CSV export becomes far more useful
  for statistical analysis.
- **Automated judging:** a route that sends responses to a strong judge model
  with a rubric, records the rating in the existing fields.
- **Cost tracking:** OpenRouter returns usage; wire it into `cost_usd` using
  per-model pricing.

---

## File map

```
app/
  api/
    auth/{login,logout}/   password cookie endpoints
    chat/                  streaming OpenRouter proxy (SSE)
    models/                curated model catalog
    folders/               CRUD
    sessions/              CRUD + /windows + /prompts + /export
    windows/[id]/          patch model / delete
    responses/             upsert + rating/notes patch
  login/                   single-password sign-in page
  playground/              main app UI
components/playground/
  PlaygroundShell.jsx      top-level state + fan-out streaming
  Sidebar.jsx              folders + sessions
  ChatWindow.jsx           one model column
  Markdown.jsx             response renderer
lib/
  auth.js                  password check + HMAC cookie
  openrouter.js            request helper + CURATED_MODELS
  supabase/server.js       service-role Supabase client
supabase/migrations/
  0001_init.sql            schema (no RLS)
middleware.js              password-gate
```
