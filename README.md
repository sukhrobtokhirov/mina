# Notes

Private notes with login, a per-user Supabase database, and automatic sync. The editor still writes locally first (IndexedDB), then pushes to your account.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Settings → API).
3. In the SQL editor, run `supabase/migrations/001_notes.sql`. That creates the `notes` table, row-level security (only you can read your rows), and realtime.
4. Authentication → URL configuration: set Site URL to `http://localhost:3000` (and your Vercel URL in production). Add `/auth/callback` under Redirect URLs.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

## Deploy on Vercel

Import the repo. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Add the Vercel URL to Supabase redirect URLs.

## Sync

- Edits save on this device immediately, then sync when you are online.
- Other devices arrive through realtime plus a periodic pull.
- If the same note changed in two places since the last sync, both copies are kept. The other version is titled `(other copy)`.
- Deletes are private tombstones, so they sync instead of resurrecting on another device.

## Import / export

The download icon writes `notes.json`. The upload icon merges a file into your account. An older array-only backup still imports. If a note already exists and is newer locally, the file is kept as `(imported copy)`.
