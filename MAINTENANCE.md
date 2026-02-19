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

## Architecture Notes

The entire frontend is in `src/App.jsx` (1,914 lines). This is a known technical debt item from the audit. When doing significant new development, consider splitting into:
- `App.jsx` — layout and routing
- `ArticleInput.jsx` — article URL/text input tab
- `Builder.jsx` — AI analysis and action builder tab
- `Output.jsx` — HTML output tab
- `api.js` — backend API calls
- `html.js` — HTML generation logic

---

## Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Frontend hosting | Free tier |
| **Ask Planet Detroit API** | Backend for AI analysis, meetings, orgs, officials | See ask-planet-detroit |
| **DOMPurify** | HTML sanitization for generated output | npm package (free) |
