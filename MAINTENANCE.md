# Civic Action Builder — Maintenance Guide

**Last Updated:** February 25, 2026

---

## What This Tool Does

The Civic Action Builder helps Planet Detroit editors create "civic action blocks" for articles. These blocks tell readers what they can do — attend a public meeting, submit a public comment, contact an elected official, or connect with a local organization.

**How editors use it:**
1. Paste an article URL or text
2. Claude AI analyzes the article and suggests relevant civic actions
3. Editor reviews and customizes the suggestions
4. Copy the formatted HTML and paste it into WordPress using the Civic Action Block plugin

**Deployment:** Vercel (https://civic-action-builder.vercel.app/)
**Backend:** Ask Planet Detroit API (Railway)

---

## How to Tell If It's Working

1. Visit https://civic-action-builder.vercel.app/
2. You should see a login screen — log in with the team password
3. Paste a Planet Detroit article URL and click Analyze
4. You should see detected issues, suggested meetings, organizations, and officials
5. The "Output" tab should generate clean HTML (no `<script>` tags — JavaScript is handled separately)

If the analysis fails, the backend API might be down — check https://ask-planet-detroit-production.up.railway.app/

---

## Running Locally

```bash
cd civic-action-builder

# Install dependencies
npm install

# Create .env.local with:
# VITE_API_URL=http://localhost:8000    (for local backend)
# VITE_API_KEY=                         (optional, only needed if backend has API_KEYS set)

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

### Environment Variables

| Variable | What It Is | Required |
|----------|-----------|----------|
| `VITE_API_URL` | Backend API URL | Yes (defaults to `http://localhost:8000`) |
| `VITE_API_KEY` | API key for backend auth | Only if backend has `API_KEYS` set |

---

## Common Problems

### "Analysis fails / spinner never stops"
- Check if the backend API is running (visit the Railway URL)
- Check browser console for CORS errors — the backend must have this Vercel domain in its allowed origins
- If you see a 401 error, the API key might be wrong or missing

### "Generated HTML looks wrong in WordPress"
- Use the **Civic Action Block** plugin (not a plain Custom HTML block) — search for "Civic Action" when adding a block
- If styles look off, WordPress theme CSS might be overriding — check with the theme

### "Raw JavaScript text showing below the civic action box on WordPress"
- WordPress strips `<script>` tags from post content for security
- The JavaScript must be added **separately** to WordPress via WPCode (see WordPress Setup below)
- If you already have old content with scripts baked in, click **Replace Content** in the block sidebar and re-paste the HTML from the builder tool (current output no longer includes scripts)

### "Old meetings showing up"
- Meeting data comes from the backend scrapers, which run daily
- If scrapers are broken, the tool will show stale data
- Check the backend's `/api/meetings` endpoint directly

---

## File Structure

```
src/
  App.jsx              (~275 lines)  Auth, state management, tab routing
  LoginPage.jsx        (~90 lines)   Login form
  ToolNav.jsx          (~40 lines)   PD Tools navigation bar
  main.jsx             (unchanged)   React entry point
  index.css            (unchanged)   Tailwind CSS entry
  tabs/
    ArticleInputTab.jsx  (~215 lines)  Article fetch + AI analysis
    BuilderTab.jsx       (~775 lines)  Search/filter/add civic items
    OutputTab.jsx        (~290 lines)  Preview + HTML output + JS output + copy
  lib/
    constants.js       (~25 lines)   API config, issue-to-agency mapping
    api.js             (~100 lines)  All backend API fetch functions
    calendar.js        (~20 lines)   Google/Outlook calendar link builder
    html.js            (~250 lines)  HTML generation + JS generation (separate functions)
    storage.js         (~35 lines)   localStorage save/load/clear
    __tests__/
      api.test.js      Slug extraction tests
      calendar.test.js Calendar link format tests
      html.test.js     HTML generation, XSS, UTM, checkbox, script tests
      storage.test.js  localStorage round-trip, expiry tests
```

Run tests: `npm run test`
Run dev server: `npm run dev`

---

## WordPress Setup (Required for Interactive Features)

The civic action box has two interactive features that require JavaScript:
1. **Checkboxes** — readers can mark actions they've taken (GA4 tracking)
2. **"Did you take action?" form** — readers can submit a message about what they did

WordPress strips `<script>` tags from post content, so this JavaScript is loaded separately via **WPCode** (a free WordPress plugin). This is a **one-time setup** — once added, it works on all posts with a civic action box.

### How to set it up:
1. Install the **WPCode** plugin (Plugins → Add New → search "WPCode")
2. Go to **Code Snippets → Add Snippet → Add Your Custom Code → Use Snippet**
3. Set **Title** to "Civic Action Box Script" and **Code Type** to "JavaScript Snippet"
4. Copy the script from the **"JavaScript (add once to WordPress)"** section of the builder's Output tab
5. Under **Insertion**, set location to **Site Wide Footer**
6. Toggle **Active** and click **Save Snippet**

### Troubleshooting WPCode:
- **Script must be Active** — toggle it on in the WPCode snippet editor
- **Location must be "Site Wide Footer"** — if placed in the header, it may run before the DOM is ready (the script handles both cases, but footer is safer)
- **Verify it's loading:** Open browser console and run: `document.querySelectorAll('script').forEach(function(s) { if (s.textContent.includes('civicActionInit')) console.log('FOUND'); }); console.log('done');`
- **Watch for line breaks when pasting** — if long lines wrap during copy-paste, they can create syntax errors. The current script uses `document.createElement` to avoid this.

### What happens without it:
- The civic action box still displays correctly (all HTML works)
- Checkboxes will appear but won't track in GA4
- The reader response form will appear but submissions won't be sent

### Requirements:
- The Civic Action Block WordPress plugin must be installed
- GA4 must be set up on planetdetroit.org (for checkbox event tracking)
- The `civic_responses` Supabase table must exist (run `api/migrations/civic_responses.sql`)

## Deploying to Another WordPress Site

If you want to add civic action boxes to a different WordPress site:

1. **Install the Civic Action Block plugin** — build the plugin zip (`npm run plugin-zip` in `civic-action-block/`) and upload it via Plugins → Add New → Upload Plugin
2. **Install WPCode** and add the JavaScript snippet (see WordPress Setup above)
3. **Use the builder tool** at https://civic-action-builder.vercel.app/ to generate HTML
4. **Paste the HTML** into a Civic Action Block in the WordPress editor

**Note:** The reader response form submits to Planet Detroit's backend API. If you're deploying to a non-Planet Detroit site, the form will still work but responses go to Planet Detroit's database. To change this, you'd need to update the API URL in the JavaScript snippet.

---

## Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Frontend hosting | Free tier |
| **Ask Planet Detroit API** | Backend for AI analysis, meetings, orgs, officials | See ask-planet-detroit |
| **DOMPurify** | HTML sanitization for generated output | npm package (free) |
| **Vitest** | Test runner (82 tests) | npm dev dependency (free) |
| **Supabase** | `civic_responses` table for reader response data | See ask-planet-detroit |
| **WPCode** | Loads civic action box JavaScript on WordPress | Free WordPress plugin |
| **Civic Action Block** | WordPress plugin for embedding civic action boxes | Custom plugin (see civic-action-block repo) |
