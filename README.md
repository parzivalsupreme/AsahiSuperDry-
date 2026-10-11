# 📓 Commit Journal

A simple personal journal with a GitHub look — including the green **contribution graph**.
Built with Next.js and exported as a **fully static website**. Every entry is a plain Markdown file.

## Features

- 🟩 GitHub-style contribution graph (last year + per-year view). Shade = words written that day. Click a square to filter entries.
- 🔥 Current & longest writing streaks
- 📝 Entries are `.md` files in [`entries/`](entries/) with optional frontmatter
- 🔍 Search by title, text or tag
- 📄 GitHub-style file view with Preview / Code toggle
- ✍️ Editor with Write / Preview tabs, autosaved draft, and **Download .md** / **Commit to GitHub**
- 🌗 Light & dark theme (follows your system)

## Entry format

Create `entries/YYYY-MM-DD-some-title.md`:

```md
---
title: "My day"
date: 2026-10-11
time: "21:30"        # optional
tags: ["life", "work"] # optional
mood: "😊 good"      # optional
---

Write anything in **Markdown**.
```

All frontmatter is optional: the date falls back to the filename prefix, and the title to the first `# heading` (or the filename).

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in ./out
npm start       # serve ./out locally
```

Personalize your name, bio and repo in [`journal.config.js`](journal.config.js).

## Writing new entries

The site is static, so new entries are added as files and the site is rebuilt:

- **Commit to GitHub** on the *New entry* page opens GitHub's "new file" page pre-filled with your entry — commit it and the Pages workflow rebuilds the site.
- Or **Download .md**, drop the file into `entries/`, and run `npm run build`.

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`. In your repo go to
**Settings → Pages → Source: GitHub Actions**, then push to `main`.
It builds with the correct base path (`/<repo-name>`) automatically.
