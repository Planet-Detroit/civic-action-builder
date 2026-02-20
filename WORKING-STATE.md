# Working State - Civic Action Builder

**Last Updated:** February 19, 2026
**Last Verified Working:** February 19, 2026 (all tests pass, build succeeds)

---

## What's Working (VERIFIED)

### Civic Action Builder Frontend
- **URL:** https://civic-action-builder.vercel.app/
- **Git Commit:** `d5d74c8` (Feb 19 — "Update docs with new file structure and checkbox feature")
- **Features:**
  - Three-tab workflow (Input → Builder → Output)
  - Article URL input — fetches from WordPress API
  - Article text paste — direct text input
  - AI analysis via backend API (detected issues, meetings, orgs, officials, actions)
  - Organization, meeting, comment period, and official search/filter/add
  - Editable civic actions with manual entry
  - Freeform notes (appear at top of output)
  - HTML preview and copy-to-clipboard
  - localStorage auto-save with 7-day expiry
  - "New Article" button clears all state
  - **NEW:** Interactive checkboxes toggle (GA4 tracking + email capture)
  - **NEW:** Modular codebase (11 files, 57 automated tests)

### Backend API
- **URL:** https://ask-planet-detroit-production.up.railway.app/
- **Git Commit:** `602af62` (Feb 19 — "Add POST /api/civic-responses endpoint")
- **Endpoints:**
  - `/api/search` — RAG search with Claude answer synthesis
  - `/api/organizations` — List/search organizations (605 orgs)
  - `/api/meetings` — List upcoming meetings
  - `/api/comment-periods` — List open comment periods
  - `/api/officials` — List elected officials
  - `/api/analyze-article` — Analyze article for civic actions
  - **NEW:** `/api/civic-responses` — Record reader civic action engagement
  - Meeting scrapers (MPSC, GLWA, Detroit, EGLE) via GitHub Actions

### Data in Supabase
- 1,955 articles → 12,041 searchable chunks
- 605 organizations (517 geocoded)
- Meetings database (daily scrapers)
- Comment periods (EGLE scraper)
- **NEW:** `civic_responses` table (requires running migration)

### Test Coverage
- **Frontend:** 57 tests (API slug extraction, calendar links, HTML generation/XSS/UTM/checkboxes, localStorage)
- **Backend:** 48 tests (endpoints, validation, CORS, auth, civic responses)

---

## Known Issues

- The `civic_responses` Supabase table must be created manually — run `api/migrations/civic_responses.sql` in Supabase SQL editor before the checkbox feature will work
- Backend needs redeploy on Railway to pick up the new `/api/civic-responses` endpoint
- Frontend needs push to trigger Vercel redeploy

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
d5d74c8 - Feb 19, 2026 - "Update docs with new file structure and checkbox feature"
```

### Backend (ask-planet-detroit)
```
602af62 - Feb 19, 2026 - "Add POST /api/civic-responses endpoint for reader engagement tracking"
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

## Deployment Checklist (for this release)

1. [ ] Run `api/migrations/civic_responses.sql` in Supabase SQL editor
2. [ ] Push `ask-planet-detroit` to trigger Railway redeploy
3. [ ] Push `civic-action-builder` to trigger Vercel redeploy
4. [ ] Verify login works at https://civic-action-builder.vercel.app/
5. [ ] Verify article analysis works
6. [ ] Verify checkbox toggle generates checkboxes in HTML output
7. [ ] Test checkbox HTML in a WordPress Custom HTML block

---

## Next Steps / TODO

### High Priority
- [ ] Deploy this release (run migration, push both repos)
- [ ] Test interactive checkboxes end-to-end in WordPress

### Medium Priority
- [ ] Add more meeting scrapers
- [ ] WordPress plugin integration for civic action boxes
- [ ] Engagement dashboard for civic response data

### Low Priority / Future
- [ ] Case docket alerts
- [ ] Meeting agenda AI summaries
- [ ] Convert to TypeScript

---

**Last verified by:** Claude (automated tests)
**Next verification due:** After deployment
