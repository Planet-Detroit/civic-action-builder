# Working State - Civic Action Builder

**Last Updated:** February 25, 2026
**Last Verified Working:** February 25, 2026 (all tests pass, build succeeds, form submission verified in production)

---

## What's Working (VERIFIED)

### Civic Action Builder Frontend
- **URL:** https://civic-action-builder.vercel.app/
- **Git Commit:** Latest on main (Feb 25 — reader response form fix: DOMContentLoaded timing, wrapper innerHTML replacement)
- **Features:**
  - Three-tab workflow (Input → Builder → Output)
  - Article URL input — fetches from WordPress API
  - Article text paste — direct text input
  - AI analysis via backend API (detected issues, meetings, orgs, officials, actions)
  - Organization, meeting, comment period, and official search/filter/add
  - Editable civic actions with manual entry
  - Context sections: Why it matters, Who's deciding, What to watch
  - "Did you take action?" reader response form (consolidated from two forms)
  - HTML preview and copy-to-clipboard
  - Separate JavaScript output section (for WPCode — not pasted into posts)
  - localStorage auto-save with 7-day expiry
  - "New Article" button clears all state
  - Interactive checkboxes toggle (GA4 tracking)
  - Modular codebase (11 files, 82 automated tests)

### Backend API
- **URL:** https://ask-planet-detroit-production.up.railway.app/
- **Git Commit:** `3f2153c` (Feb 25 — "Add weather bar reference file and update docs")
- **Endpoints:**
  - `/api/search` — RAG search with Claude answer synthesis
  - `/api/organizations` — List/search organizations (605 orgs)
  - `/api/meetings` — List upcoming meetings
  - `/api/comment-periods` — List open comment periods
  - `/api/officials` — List elected officials
  - `/api/analyze-article` — Analyze article for civic actions
  - `/api/civic-responses` — Record reader responses (message + optional email)
  - Meeting scrapers (MPSC, GLWA, Detroit, EGLE) via GitHub Actions

### Data in Supabase
- 1,955 articles → 12,041 searchable chunks
- 605 organizations (517 geocoded)
- Meetings database (daily scrapers)
- Comment periods (EGLE scraper)
- `civic_responses` table (schema: message, email, article_url, article_title, user_agent)

### Test Coverage
- **Frontend:** 82 tests (API slug extraction, calendar links, HTML generation/XSS/UTM/checkboxes/script separation, localStorage)
- **Backend:** 86 tests (endpoints, validation, CORS, auth, civic responses)

---

## Known Issues

- None currently blocking

---

## Important URLs

### Production
- Civic Action Builder: https://civic-action-builder.vercel.app/
- Backend API: https://ask-planet-detroit-production.up.railway.app/
- API Docs: https://ask-planet-detroit-production.up.railway.app/docs
- Org Directory: https://orgs.planetdetroit.org

### Development
- Supabase: https://app.supabase.com
- Railway: https://railway.app
- Vercel: https://vercel.com

### GitHub Repos
- Backend API: https://github.com/Planet-Detroit/ask-planet-detroit
- Civic Action Builder: https://github.com/Planet-Detroit/civic-action-builder
- Org Directory: https://github.com/Planet-Detroit/michigan-environmental-orgs

---

## Last Known Good Commits

### Frontend (civic-action-builder)
```
Latest on main - Feb 25, 2026 - Reader response form fix (DOMContentLoaded timing + wrapper replacement)
```

### Backend (ask-planet-detroit)
```
3f2153c - Feb 25, 2026 - "Add weather bar reference file and update docs"
```

---

## Environment Variables

### Backend (Railway)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Frontend (Vercel)
- `VITE_API_URL` = https://ask-planet-detroit-production.up.railway.app

---

## Deployment Checklist

### Initial WordPress Setup (one-time)
1. [x] Run `api/migrations/civic_responses.sql` in Supabase SQL editor
2. [x] Fix Supabase schema: `ALTER TABLE civic_responses ADD COLUMN message text; ALTER TABLE civic_responses ALTER COLUMN email DROP NOT NULL; ALTER TABLE civic_responses DROP COLUMN IF EXISTS actions_taken;`
3. [x] Install Civic Action Block plugin on WordPress
4. [x] Install WPCode plugin on WordPress and add the civic action box JavaScript snippet (see MAINTENANCE.md)

### Per-release
1. [ ] Push `ask-planet-detroit` to trigger Railway redeploy
2. [ ] Push `civic-action-builder` to trigger Vercel redeploy
3. [ ] Verify login works at https://civic-action-builder.vercel.app/
4. [ ] Verify article analysis works
5. [ ] Verify Output tab shows HTML (Copy HTML button) and JavaScript section separately
6. [ ] Test civic action box end-to-end in WordPress (paste HTML into block, verify no raw JS text shows)

### Deploying to a new WordPress site
1. [ ] Build and install Civic Action Block plugin (`npm run plugin-zip` in civic-action-block/)
2. [ ] Install WPCode and add the JavaScript snippet
3. [ ] Test: insert a Civic Action Block, paste HTML, verify display and interactivity

---

## Next Steps / TODO

### Medium Priority
- [ ] Add more meeting scrapers
- [ ] Engagement dashboard for civic response data

### Low Priority / Future
- [ ] Case docket alerts
- [ ] Meeting agenda AI summaries
- [ ] Convert to TypeScript

---

**Last verified by:** Claude (automated tests)
**Next verification due:** After deployment
