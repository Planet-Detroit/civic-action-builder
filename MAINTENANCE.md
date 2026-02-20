# Civic Action Builder — Maintenance Guide

**Last Updated:** February 19, 2026

---

## What This Tool Does

The Civic Action Builder helps Planet Detroit editors create "civic action blocks" for articles. These blocks tell readers what they can do — attend a public meeting, submit a public comment, contact an elected official, or connect with a local organization.

**How editors use it:**
1. Paste an article URL or text
2. Claude AI analyzes the article and suggests relevant civic actions
3. Editor reviews and customizes the suggestions
4. Copy the formatted HTML and paste it into WordPress

**Deployment:** Vercel (https://civic-action-builder.vercel.app/)
**Backend:** Ask Planet Detroit API (Railway)

---

## How to Tell If It's Working

1. Visit https://civic-action-builder.vercel.app/
2. You should see a login screen — log in with the team password
3. Paste a Planet Detroit article URL and click Analyze
4. You should see detected issues, suggested meetings, organizations, and officials
5. The "Output" tab should generate clean HTML

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
- The HTML is designed for WordPress's block editor (Gutenberg)
- Paste into a "Custom HTML" block, not a regular paragraph block
- If styles look off, WordPress theme CSS might be overriding — check with the theme

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
    OutputTab.jsx        (~195 lines)  Preview + HTML output + copy
  lib/
    constants.js       (~25 lines)   API config, issue-to-agency mapping
    api.js             (~100 lines)  All backend API fetch functions
    calendar.js        (~20 lines)   Google/Outlook calendar link builder
    html.js            (~200 lines)  HTML generation (with optional checkboxes)
    storage.js         (~35 lines)   localStorage save/load/clear
    __tests__/
      api.test.js      Slug extraction tests
      calendar.test.js Calendar link format tests
      html.test.js     HTML generation, XSS, UTM, checkbox tests
      storage.test.js  localStorage round-trip, expiry tests
```

Run tests: `npm run test`
Run dev server: `npm run dev`

---

## Interactive Checkboxes (Optional Feature)

When generating HTML, editors can enable "Include interactive checkboxes" in the Output tab. This adds:

- **Checkboxes** next to each action item (meetings, comment periods, officials, actions)
- **GA4 event tracking** — fires `civic_action_taken` / `civic_action_untaken` events
- **Email capture form** — appears after a reader checks their first box
- **Backend submission** — reader's actions are recorded via `POST /api/civic-responses`

Checkboxes are **off by default** for backwards compatibility. The feature requires:
- The civic action box to be pasted into a WordPress "Custom HTML" block
- GA4 to be set up on planetdetroit.org (for event tracking)
- The `civic_responses` Supabase table to exist (run `api/migrations/civic_responses.sql`)

---

## Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Frontend hosting | Free tier |
| **Ask Planet Detroit API** | Backend for AI analysis, meetings, orgs, officials | See ask-planet-detroit |
| **DOMPurify** | HTML sanitization for generated output | npm package (free) |
