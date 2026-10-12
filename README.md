# 📓 Journal

A personal journal with a Bloomberg Terminal–style amber-on-black theme and a
GitHub-style **contribution graph**. It's a static Next.js site (hosted on GitHub Pages);
entries are stored in **Supabase**, so writing, editing and deleting happen right in the app —
no commits or rebuilds.

## Features

- 🟧 Contribution graph (last year + per-year view). Shade = words written that day. Click a square to filter.
- 🔥 Current & longest writing streaks
- ✍️ Markdown editor with Write / Preview tabs and an autosaved draft
- 📄 Entry view with Preview / Markdown toggle, **Download .md**, **Edit** and **Delete**
- 🔍 Search by title, text or tag

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

> ⚠️ **There is no sign-in.** The anon key is built into the public site, and the database policy
> lets that key read, edit and delete every entry. Anyone who finds your site URL can do the same.
> Don't write anything you wouldn't want public. Never put the `service_role` key in this project.

### 2. GitHub Pages

1. Repo **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or **Actions → Deploy journal to GitHub Pages → Run workflow**).

### Local development

```bash
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm install
npm run dev                  # http://localhost:3000
```
