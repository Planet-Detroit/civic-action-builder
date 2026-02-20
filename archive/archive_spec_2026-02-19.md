# Feature Spec: Civic Action Builder Refactor

**Date**: February 19, 2026
**Status**: Draft

---

## 1. Purpose

The entire Civic Action Builder lives in a single 1,945-line file (`src/App.jsx`). This makes it risky for AI to modify — any change to one section (say, the HTML output) can accidentally break another (say, the meeting search). It also makes testing impossible because there's nothing to test in isolation. This refactor splits the file into focused modules without changing any user-facing behavior.

**This is a code-only change. Editors will not see any difference.** The tool will look and work exactly the same before and after.

---

## 2. Users

- **Primary user**: Dustin (managing editor) and Nina — they build civic action blocks for articles
- **How they'll access it**: Same URL, same login, same workflow
- **How often they'll use it**: Several times per week when publishing articles

## 3. User Workflow

No change. The workflow stays exactly the same:

1. Editor goes to civic-action-builder.vercel.app and logs in
2. Pastes an article URL or text on the Input tab
3. Clicks "Analyze" — AI detects issues and suggests actions
4. Switches to Builder tab — reviews/edits suggested meetings, orgs, officials, actions
5. Switches to Output tab — copies the generated HTML
6. Pastes HTML into a WordPress Custom HTML block

**After refactoring, every step above must work identically.**

---

## 4. Requirements

1. Split `App.jsx` into separate files, each responsible for one thing
2. No behavior changes — every button, search, filter, and output must work exactly as before
3. All existing localStorage persistence must continue working (saved state from before the refactor should still load after)
4. All API calls must continue working
5. The generated HTML output must be byte-identical for the same inputs
6. Write tests for the extracted modules (especially HTML generation and API helpers)

---

## 5. Proposed File Structure

```
src/
  App.jsx              (~100 lines)  Auth check, tab routing, layout
  LoginPage.jsx        (~90 lines)   Login form
  ToolNav.jsx          (~50 lines)   Top navigation bar

  tabs/
    ArticleInputTab.jsx  (~220 lines)  Article URL/paste input + analysis display
    BuilderTab.jsx       (~780 lines)  Search/select orgs, meetings, officials, actions
    OutputTab.jsx        (~340 lines)  HTML preview + copy button

  lib/
    api.js             (~120 lines)  All fetch functions (analyzeArticle, fetchMeetings, etc.)
    html.js            (~120 lines)  generateHTML(), esc(), safeUrl(), trackLink()
    storage.js         (~40 lines)   localStorage save/load/clear + 7-day expiry
    constants.js       (~30 lines)   ISSUE_TO_AGENCY mapping, API_BASE, API_KEY
    calendar.js        (~25 lines)   buildCalendarLinks()
```

### What goes where:

| Current Location | New File | Why |
|-----------------|----------|-----|
| Lines 3-29 (constants) | `lib/constants.js` | Shared config used by multiple files |
| Lines 35-148 (fetch functions) | `lib/api.js` | Testable in isolation, no React dependency |
| Lines 73-93 (calendar links) | `lib/calendar.js` | Pure function, easy to test |
| Lines 154-195 (ToolNav) | `ToolNav.jsx` | Standalone UI component |
| Lines 197-286 (LoginPage) | `LoginPage.jsx` | Standalone UI component |
| Lines 321-537 (input tab) | `tabs/ArticleInputTab.jsx` | Self-contained tab |
| Lines 539-1320 (builder tab) | `tabs/BuilderTab.jsx` | Self-contained tab (largest piece) |
| Lines 1322-1655 (output tab) | `tabs/OutputTab.jsx` | Self-contained tab |
| Lines 1330-1474 (HTML gen) | `lib/html.js` | **Most important to extract** — pure functions, highly testable |
| Lines 1705-1740 (localStorage) | `lib/storage.js` | Pure functions, testable |
| Lines 1661-1944 (App + AuthenticatedApp) | `App.jsx` | Slimmed down to routing + state |

---

## 6. Acceptance Criteria

These will become automated tests:

### HTML Generation (`lib/html.js`)
- [ ] When given a meeting with a title containing `<script>`, the output HTML does not contain unescaped script tags
- [ ] When given a meeting with a `virtual_url`, the output includes a "Join Online" link
- [ ] When given a meeting with an `agenda_url`, the output includes an "Agenda" link
- [ ] When given an official with name and phone, the output includes both
- [ ] When given organizations, each org links to its website with UTM parameters
- [ ] When given no meetings, no orgs, no officials, the output is a valid HTML snippet (not empty/broken)
- [ ] When given custom notes, they appear at the top of the output
- [ ] URLs with `javascript:` or `data:` schemes are rejected by `safeUrl()`

### API Helpers (`lib/api.js`)
- [ ] When given a valid Planet Detroit URL, `fetchArticleFromWordPress` extracts the correct slug
- [ ] When given an invalid URL (not planetdetroit.org), it throws a clear error
- [ ] When the backend returns an error, `analyzeArticle` throws (not silent fail)
- [ ] When `API_KEY` is set, requests include the `Authorization: Bearer` header

### Storage (`lib/storage.js`)
- [ ] When saving state, `loadSavedState()` returns the same data
- [ ] When saved state is older than 7 days, `loadSavedState()` returns null
- [ ] When `clearSavedState()` is called, `loadSavedState()` returns null

### Calendar Links (`lib/calendar.js`)
- [ ] When given a meeting with a start time, generates valid Google Calendar URL
- [ ] When given a meeting with a location, the location appears in the calendar URL
- [ ] When given a meeting with a virtual_url, the join link appears in calendar details

### Integration (manual verification)
- [ ] Login still works
- [ ] Article fetch from URL still works
- [ ] AI analysis still returns and pre-populates the builder
- [ ] Meeting search and filters work
- [ ] Organization search works
- [ ] Official search works
- [ ] Manual meeting/comment period entry works
- [ ] localStorage auto-save and restore works across page refreshes
- [ ] "New Article" button clears all state
- [ ] Generated HTML is visually identical to pre-refactor output
- [ ] Copy button works
- [ ] All navigation links in ToolNav work

---

## 7. Out of Scope

- This refactor does NOT add new features
- This refactor does NOT change the visual design
- This refactor does NOT change the API endpoints or backend
- This refactor does NOT change authentication
- This refactor does NOT split BuilderTab further (it's 780 lines, which is large but manageable for now)
- This refactor does NOT convert to TypeScript (that could be a future step)

---

## 8. Connects To

- **Ask Planet Detroit API** (Railway) — all data fetching
- **WordPress REST API** — article fetching by slug
- **Vercel** — deployment (no config changes needed)
- **Browser localStorage** — state persistence

---

## 9. Known Risks

- **If the refactor introduces a bug**: Editors might get broken HTML output or lose their in-progress work. Mitigated by: keeping localStorage format identical, writing tests for HTML generation, and testing manually before deploying.
- **If imports break on deployment**: Vite handles imports differently than plain script tags. Mitigated by: running `npm run build` locally before pushing.
- **localStorage compatibility**: Old saved state (from before refactor) must still load. The data format is not changing, only where the code lives, so this should be fine. But test explicitly.

---

## 10. Implementation Order

Do this in order. Commit after each step. Run tests after each step.

1. **Extract `lib/constants.js`** — move ISSUE_TO_AGENCY, API_BASE, API_KEY. Update imports in App.jsx. Verify build works.
2. **Extract `lib/api.js`** — move all fetch functions. Write tests. Verify build.
3. **Extract `lib/html.js`** — move generateHTML, esc, safeUrl, trackLink, utmSlug. Write tests. This is the highest-value extraction.
4. **Extract `lib/storage.js`** — move localStorage functions. Write tests.
5. **Extract `lib/calendar.js`** — move buildCalendarLinks. Write tests.
6. **Extract `LoginPage.jsx` and `ToolNav.jsx`** — straightforward component extraction.
7. **Extract `tabs/ArticleInputTab.jsx`** — already a self-contained component in App.jsx.
8. **Extract `tabs/OutputTab.jsx`** — already a self-contained component.
9. **Extract `tabs/BuilderTab.jsx`** — the largest piece, but already self-contained.
10. **Slim down `App.jsx`** — should now be ~100 lines of auth + tab routing + state.
11. **Delete `App_backup.jsx`** — the 1,100-line dead code backup file.
12. **Final verification** — run all tests, build, test manually.

---

## 11. Success Metrics

- `App.jsx` goes from 1,945 lines to ~100 lines
- No individual file exceeds ~800 lines
- HTML generation has automated tests
- `npm run build` succeeds
- All acceptance criteria pass
- No user-visible changes

---

_After completing this spec, hand it to Claude Code and say: "Read this spec. Write automated tests for each acceptance criterion first, then implement the feature."_
