# 杯測會 · Cupping Session

A mobile-first COE (Cup of Excellence) style cupping-score app for a coffee
club: create a room, add today's beans, cup blind or open, score on the full
8-category COE scale (or a quick single-number score), guess which sample is
which bean in blind mode, and compare results across sessions.

Implemented from a Claude Design handoff (`../project/杯測原型.dc.html` and the
chat transcript in `../chats/chat1.md`) as a real React app with a real
multi-device backend, per the handoff's brief to recreate the design
pixel-faithfully in whatever stack fits the target codebase rather than
copying the prototype's internal structure.

## Stack

- **React + TypeScript + Vite** — single-page app, mobile-first (430px shell).
- **Supabase** (Postgres + Realtime) for real multi-phone sync — see
  `../supabase/schema.sql` for the schema. Falls back to a `localStorage` +
  Web Locks based mock backend when no Supabase project is configured, so the
  app runs immediately with `npm run dev` with no setup.
- No login: people identify by a typed display name, matching the original
  design. Identity (`clientId`) lives in `sessionStorage` — one tab = one
  cupper, so opening a second tab on the same device correctly acts as a
  second participant instead of colliding with the first.

## Running locally (no backend setup required)

```bash
npm install
npm run dev
```

This uses the built-in local backend (`src/lib/localBackend.ts`): data lives
in this browser's `localStorage`, synced across tabs of the *same* browser via
the Web Locks API + the native `storage` event. It's genuinely real-time
across tabs on one device (handy for testing solo — open a second tab as a
"guest"), but it does **not** sync across different devices/phones. For that
you need Supabase (below).

## Connecting a real Supabase project (for real multi-phone sessions)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the entire contents of `../supabase/schema.sql`
   once. It creates all tables, permissive RLS policies (there's no login, so
   policies allow the anon key to read/write — see the note at the top of
   that file), and enables Realtime on every table the app needs.
3. In the Supabase dashboard, go to Project Settings → API and copy the
   **Project URL** and **anon public key**.
4. Copy `.env.example` to `.env.local` and fill in those two values:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev` (or rebuild/redeploy). The app automatically switches
   to `src/lib/supabaseBackend.ts` whenever both env vars are set — no code
   changes needed.
6. Deploy the built app (`npm run build`, then host `dist/` anywhere — e.g.
   Vercel, Netlify, Cloudflare Pages) and set the same two env vars there.

## Project structure

```
src/
  lib/
    types.ts             domain types (Room, Participant, ScoreEntry, ...)
    coe.ts                COE categories, dropdown option lists, demo bean db
    backend.ts            the Backend interface + local/Supabase selection
    localBackend.ts        localStorage + Web Locks implementation
    supabaseBackend.ts      real Postgres + Realtime implementation
    selectors.ts             pure functions deriving UI data from a room snapshot
    identity.ts               per-tab client id + persisted display name
  screens/               one component per full-screen view from the design
  components/             shared building blocks (sheets/modals, chips, etc.)
  RoomContainer.tsx       in-room routing: waiting → scoring → locked → reveal
  App.tsx                 top-level routing: home / setup / archive / room
```

## Known intentional deviations from the prototype

The prototype was a single-device demo (a host/participant role-switcher
faked multiplayer, and other cuppers' scores were pseudo-random). Since this
build has a real backend, some things work differently on purpose:

- **No role switcher.** Role is fixed by whether you created the room (host)
  or joined it (participant) — there's nothing to simulate anymore.
- **Averages, leaderboards, and archives are computed from real submitted
  data** from everyone in the room, not simulated.
- **Blind mode's answer key** (which sample number is which bean) is left
  unassigned until the host explicitly sets it before revealing, instead of
  defaulting to a random guess — there's no way for the app to know the
  physical pour order automatically.
- **Score mode (pro/easy) is chosen per person per sample**, not globally,
  since real cuppers on real phones may want different levels of detail.
- **Every participant leaving after reveal** — both host and guest — has a
  "back to home" button; the prototype only gave the host one.
