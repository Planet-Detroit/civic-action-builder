# Working State - Civic Action Builder

**Last Updated:** January 2, 2026 - 5:45 PM ET  
**Last Verified Working:** January 1, 2026 - 5:32 PM (frontend) / January 2, 2026 - 12:44 PM (backend)

---

## ✅ What's Working (VERIFIED)

### Civic Action Builder Frontend
- **URL:** https://civic-action-builder.vercel.app/
- **Git Commit:** `ebe088f` (Jan 1, 5:32 PM - "Civic Action Builder v2 - ready for deployment")
- **Features:**
  - ✅ Three-tab workflow (Input → Builder → Output)
  - ✅ Article URL input - fetches from WordPress API
  - ✅ Article text paste - direct text input
  - ✅ AI analysis via backend API
  - ✅ Detected issues display
  - ✅ Suggested meetings (when backend returns them)
  - ✅ Organization search
  - ✅ Editable civic actions
  - ✅ Suggested elected officials
  - ✅ HTML preview
  - ✅ Copy HTML for WordPress

### Backend API
- **URL:** https://ask-planet-detroit-production.up.railway.app/
- **Git Commit:** `5a295fd` (Jan 2, 12:44 PM - "Fix GitHub Action secrets check")
- **Features:**
  - ✅ `/api/search` - RAG search with Claude answer synthesis
  - ✅ `/api/organizations` - List/search organizations (605 orgs)
  - ✅ `/api/meetings` - List upcoming meetings
  - ✅ `/api/comment-periods` - List comment periods
  - ✅ `/api/analyze-article` - Analyze article for civic actions
  - ✅ Meeting scrapers (MPSC, GLWA, Detroit) with GitHub Actions

### Data in Supabase
- ✅ 1,955 articles → 12,041 searchable chunks
- ✅ 605 organizations (97 geocoded)
- ✅ Meetings database schema
- ✅ Comment periods schema

---

## 🚫 Known Issues

### Current Problems
- ⚠️ `/api/analyze-article` endpoint may have Claude API errors (check Railway logs)
- ⚠️ Meetings table may be empty (need to run scrapers or add manually)
- ⚠️ Elected officials are hardcoded, not from database

### Recently Fixed
- ✅ WordPress output corruption (reverted to Jan 1 version)
- ✅ Missing civic actions editor (reverted to Jan 1 version)

---

## 🔗 Important URLs

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

## 📝 Last Known Good Commits

### Frontend (civic-action-builder)
```
ebe088f - Jan 1, 5:32 PM - "Civic Action Builder v2 - ready for deployment"
```

### Backend (ask-planet-detroit)
```
5a295fd - Jan 2, 12:44 PM - "Fix GitHub Action secrets check"
```

### To Rollback to These Versions
```bash
# Frontend
cd ~/projects/civic-action-builder
git reset --hard ebe088f
git push --force

# Backend
cd ~/projects/ask-planet-detroit
git reset --hard 5a295fd
git push --force
```

---

## 🔧 Environment Variables

### Backend (Railway)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Frontend (Vercel)
- `VITE_API_URL` = https://ask-planet-detroit-production.up.railway.app

---

## 🎯 Next Steps / TODO

### High Priority
- [ ] Populate meetings table with real data
- [ ] Test `/api/analyze-article` endpoint thoroughly
- [ ] Add sample comment periods
- [ ] Verify Claude API key is working in Railway

### Medium Priority
- [ ] Build elected officials database
- [ ] Add more meeting scrapers (EGLE, Detroit City Council)
- [ ] Improve organization matching algorithm

### Low Priority / Future
- [ ] WordPress plugin integration
- [ ] Case docket alerts
- [ ] Meeting agenda AI summaries

---

## 🆘 Emergency Recovery

If everything breaks again:

1. **Check this file first** for last known good commits
2. **Rollback using commands above**
3. **Check Railway/Vercel deployment logs** for errors
4. **Test locally before pushing** (`npm run dev` / `uvicorn main:app --reload`)

---

## 📋 Update Checklist

**Update this file whenever:**
- ✅ A new feature works in production
- ✅ You deploy a stable version
- ✅ You discover a new issue
- ✅ You fix a bug

**Format:**
```bash
# Update the file
nano WORKING-STATE.md

# Commit the update
git add WORKING-STATE.md
git commit -m "Update working state - [what changed]"
git push
```

---

**Last verified by:** Nina  
**Next verification due:** Before next major change
