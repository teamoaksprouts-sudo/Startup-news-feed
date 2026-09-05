# The Runway — Startup News Feed

A self-updating startup/business news feed with likes, comments, and share
buttons, built to embed inside a Google Sites page.

**Stack:** Supabase (free database) + Netlify (free hosting + scheduled
function). Neither requires a credit card on the free tier.

---

## 1. Create your Supabase project

1. Go to https://supabase.com and sign up (free).
2. Click **New project**. Pick any name and a database password (save it
   somewhere).
3. Once it's ready, open the **SQL Editor** (left sidebar) → **New query**.
4. Open `supabase-setup.sql` from this project, copy all of it, paste it in,
   and click **Run**. This creates your `articles`, `likes`, and `comments`
   tables.
5. Go to **Project Settings → API**. You'll need two values from this page
   later:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this one secret — never put it in the
     browser code)

## 2. Add your keys to the frontend

Open `public/config.js` and replace the placeholders:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

## 3. Push this project to GitHub

Netlify deploys from a GitHub repo.

1. Create a new repository on GitHub (e.g. `startup-news-feed`).
2. From inside this project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/startup-news-feed.git
   git push -u origin main
   ```

## 4. Deploy to Netlify

1. Go to https://netlify.com and sign up (free), connect your GitHub account.
2. Click **Add new site → Import an existing project**, pick your repo.
3. Build settings: leave the defaults (this project's `netlify.toml` already
   tells Netlify where the site and functions live).
4. Before deploying, go to **Site configuration → Environment variables**
   and add:
   - `SUPABASE_URL` → your Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → your service_role key
5. Click **Deploy site**. You'll get a live URL like
   `https://your-site-name.netlify.app`.

## 5. Test the news fetcher

The `fetch-news` function runs automatically every hour once deployed, but
you can trigger it manually to test:

- Go to **Netlify dashboard → Functions → fetch-news → Trigger function**,
  or visit `https://your-site-name.netlify.app/.netlify/functions/fetch-news`
  in your browser.
- Then reload your site — articles should appear.

## 6. Embed it into Google Sites

1. Open your Google Sites page in edit mode.
2. Click **Insert → Embed → By URL**.
3. Paste your Netlify URL (`https://your-site-name.netlify.app`).
4. Resize the embed box to however tall you want the feed to appear.
5. Publish your site.

---

### Customizing

- **Change news sources:** edit the `FEEDS` array in
  `netlify/functions/fetch-news.js`. Any site with an RSS feed works — add
  the feed URL and a display name.
- **Change fetch frequency:** edit the `schedule` value in `netlify.toml`
  (uses cron syntax, e.g. `"0 */6 * * *"` for every 6 hours).
- **Moderate comments:** right now anyone can comment. For a public site,
  consider adding a Supabase Edge Function or a manual review step before
  comments go live — happy to help you add that later.
