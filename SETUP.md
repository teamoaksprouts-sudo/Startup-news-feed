# Setup

1. **Sheet tabs** — in your existing Google Sheet add tabs named Settings, Nav, Pages, Team, Highlights.
   Import each file in `sheet-templates/` (File > Import > Insert new sheet).
2. **Publish each tab** — File > Share > Publish to web > pick the tab > CSV. Copy the `gid=` number from each link.
3. **Paste gids** into `GIDS` at the top of `public/site.js`. Until you do, built-in defaults show.
4. **Ledger page** — copy your Active Ledger file to `public/ledger.html`, then make two edits:
   - add `<script src="site.js" defer></script>` just before `</body>`
   - in the `.controls` CSS rule change `top: 0;` to `top: var(--ul-nav-h, 0px);`
5. **Contact form (optional)** — deploy `contact-form.gs`, paste its URL as `contact_form_url` in Settings.
   Without it the form opens the visitor's email app.
6. Commit and push; Netlify redeploys. Change `app.js`'s share link from the Google Sites URL to your new domain.

Sheet text supports: blank line = new paragraph, **bold**, [text](url), "- " bullets, "## " subheading.
Set Visible to `no` on any row to hide it. Order controls sorting.
