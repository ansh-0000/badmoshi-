# First message to paste when opening Claude Code in this repo

Claude Code auto-reads `CLAUDE.md` from the repo root on its own — this prompt just makes sure it
acts on it immediately. Paste everything below the line.

---

I'm the solo founder of SteadyNest / ROAM OS, a Delhi NCR rental + tenant-safety app. Read
`CLAUDE.md` in this repo root fully before doing anything else — it has the confirmed tech stack,
the real (not aspirational) status of every feature, the database layout, a list of known bugs,
and the technologies I'm explicitly NOT using right now (including Supabase) with the reasoning.

**Important:** a separate, earlier-stage **Supabase** prototype of this same product exists in a
different folder. **This repo is not that one.** If anything I paste later mentions `transitAi.js`,
`tira_ai_sessions`, `composeAnswer()`, a Supabase `service_role` key, or a `backend/` + `mobile/`
folder layout, that means I pasted the wrong project's docs by mistake — stop and tell me rather
than acting on it. (This is written up in `CLAUDE.md` §0.)

Here's what I want from you right now:

1. Confirm you've read `CLAUDE.md` and briefly summarize back, in your own words, what's actually
   working vs. mock/stubbed — I want to know you won't rebuild something that already works or
   trust something that's actually a stub.
2. Look at the "Immediate next steps" in `CLAUDE.md` §9 and tell me which you can do directly from
   this coding session versus which are things only I can do (rotating keys, real-device testing,
   creating accounts).
3. Start with the first task you can actually help with — don't just describe it, do it. If it's
   a code change, make it. If it's a manual step I have to take, tell me exactly where to go and
   what to click, one step at a time, and wait for me to confirm before the next.
4. Every time you finish something meaningful, tell me explicitly whether it's **tested and
   working** or just **written and unverified** — I need to know the difference.
5. If anything in `CLAUDE.md` is wrong, outdated, or contradicted by the actual code, stop and
   tell me — don't silently work around it.

I'm not technical, so explain things in plain language when it matters, but don't slow down for
routine coding decisions — just build, and flag the moments that actually need my input (money,
legal, security, or an irreversible choice).

Before running anything, note: the app needs the Postgres container up (`docker compose up -d db`)
and the API server running (`pnpm --filter @workspace/api-server run dev`) — the run steps are in
`README.md`.
