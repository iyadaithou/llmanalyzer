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

**Stack:** Next.js 16 App Router (JSX) · Clerk (auth) · Supabase (Postgres + RLS) ·
OpenRouter (LLM gateway) · Tailwind v4 · Vercel-ready.

---

## 1. Prereqs

- Node 20+
- Accounts on: [OpenRouter](https://openrouter.ai), [Clerk](https://clerk.com),
  [Supabase](https://supabase.com)

---

## 2. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` — see sections below for each provider.

---

## 3. OpenRouter

1. Sign up at [openrouter.ai](https://openrouter.ai), create an API key.
2. Fund the account (pay-as-you-go). Credits are shared across every supported model.
3. Put the key in `OPENROUTER_API_KEY`.

The key lives **server-side only** (used inside `/app/api/chat/route.js`). It is never
shipped to the browser.

The curated model list is in `lib/openrouter.js → CURATED_MODELS`. Add/remove ids there.
Model ids follow the OpenRouter schema, e.g. `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`.
Full catalog: https://openrouter.ai/models

---

## 4. Clerk

1. Create a Clerk application. Copy the publishable + secret keys into `.env.local`.
2. Create a **JWT template** named exactly `supabase`:
   - In the Clerk dashboard: **Configure → JWT Templates → New template → Supabase**.
   - Signing algorithm: `HS256`.
   - Signing key: paste your **Supabase JWT Secret** (Supabase Dashboard →
     Project Settings → API → JWT Settings → `JWT Secret`).
   - Leave the default claim template — the important part is the `sub` claim, which
     will contain the Clerk user id. Our RLS policies use `sub` to match `user_id`.

Routes are protected by `middleware.js` (every path except `/`, `/sign-in`,
`/sign-up`, `/api/health`).

---

## 5. Supabase

1. Create a new Supabase project.
2. Copy the URL, anon key, and service-role key into `.env.local`.
3. Run the migration — either paste `supabase/migrations/0001_init.sql` into the
   SQL Editor, or via CLI:

```bash
# with Supabase CLI
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates:

- `folders`, `sessions`, `chat_windows`, `prompts`, `responses`
- A `clerk_user_id()` helper that reads `sub` from the JWT
- Row-Level Security policies so each user only sees their own rows

> **Important:** the server calls Supabase with the user's Clerk JWT (see
> `lib/supabase/server.js`). That works **only if** the `supabase` JWT template in
> Clerk is signed with your Supabase JWT secret. If you get empty lists and no
> errors, the template is the first thing to check.

---

## 6. Run

```bash
npm run dev
```

Open http://localhost:3000, sign in, then hit **Open playground**.

- Click **New session** (left panel) — three windows appear with default models.
- Click **+ Add model** (top right) to add more windows.
- Type a prompt at the bottom and hit ⏎ — it streams to every window in parallel.
- Toggle **Multi-turn / One-shot** depending on what you're testing.
- Click a session in the sidebar to revisit any past run.
- Rate responses (★) and add notes; everything is persisted.
- **JSON** / **CSV** buttons export the full session.

---

## 7. Deploy to Vercel

```bash
vercel
```

Then add the same env vars to the Vercel project (Settings → Environment Variables).
Set `OPENROUTER_SITE_URL` to your production URL so OpenRouter attributes usage
to your app.

---

## Data model (quick reference)

```
folders (id, user_id, name)
sessions (id, user_id, folder_id, name, multi_turn, system_prompt, temperature, max_tokens)
chat_windows (id, session_id, user_id, model, label, position)
prompts (id, session_id, content, turn_index)         -- one row per user submit
responses (id, prompt_id, chat_window_id, model,      -- one row per (prompt × window)
           content, finish_reason, latency_ms,
           tokens_in, tokens_out, cost_usd,
           rating, notes, error)
```

The `(prompt_id, chat_window_id)` pair is unique — re-running a cell upserts.

---

## Research notes (honest take)

This is a **playground**, not an eval harness. If you want to turn it into one, these
are the natural next steps — the schema already supports all of them:

- **Seeded determinism:** pass `seed` to OpenRouter where supported (OpenAI + some
  others) and store it on the prompt.
- **Blind ratings:** hide the model name in the window header until a rating is
  submitted — reduces brand bias when you rate.
- **Pairwise preference:** add a `comparisons` table (A vs B, winner) and a dedicated
  comparison view. That's how Chatbot Arena actually works.
- **Rubric scoring:** instead of one 1–5 star, add JSON columns on `responses` for
  fixed dimensions (correctness, reasoning, style…). CSV export becomes far more
  useful for statistical analysis.
- **Automated judging:** a route that sends the responses to a strong judge model
  with a rubric, records the rating in the existing `rating`/`notes` fields.
- **Cost tracking:** OpenRouter returns usage; wire it into `cost_usd` using the
  per-model pricing at `https://openrouter.ai/models`.

---

## File map

```
app/
  api/
    chat/            streaming OpenRouter proxy (SSE)
    models/          curated model catalog
    folders/         CRUD
    sessions/        CRUD + /windows + /prompts + /export
    windows/[id]/    patch model / delete
    responses/       upsert + rating/notes patch
  playground/        main app UI
  sign-in/, sign-up/ Clerk hosted
components/playground/
  PlaygroundShell.jsx  top-level client state + fan-out streaming
  Sidebar.jsx          folders + sessions
  ChatWindow.jsx       one model column
  Markdown.jsx         response renderer
lib/
  openrouter.js        request helper + CURATED_MODELS
  supabase/server.js   Supabase client authed with Clerk JWT
supabase/migrations/
  0001_init.sql        schema + RLS + clerk_user_id()
middleware.js          Clerk route protection
```
