# Feature Spec: Enhanced Civic Action Box

**Date**: 2026-02-19
**Status**: Draft

---

## 1. Purpose

The civic action box embedded in Planet Detroit articles needs to match what editors actually produce manually — with structured context sections ("Why it matters," "Who's making public decisions," "What to watch for next") and a reader response form. Currently, editors write this content by hand for each article. This update makes those sections part of the builder workflow: Claude pre-populates them from article analysis, editors refine them, and the output HTML includes all sections plus a sleek response form.

## 2. Users

- **Primary user**: Dustin (managing editor) — builds civic action boxes when publishing articles
- **How they'll access it**: Same civic-action-builder tool (civic-action-builder.vercel.app)
- **How often they'll use it**: 2-5 times per week, per article published

- **Secondary user**: Planet Detroit readers — interact with the response form on published articles
- **How they'll access it**: Embedded in WordPress articles on planetdetroit.org

## 3. User Workflow

### Editor workflow (Builder tab):
1. Editor pastes article URL and clicks "Analyze Article" (unchanged)
2. Claude returns analysis — now including pre-populated text for "Why it matters," "Who's making public decisions," and "What to watch for next"
3. Editor sees three new editable text sections in the Builder tab, above the existing sections:
   - **Why it matters** — 1-2 paragraph textarea, pre-filled by Claude
   - **Who's making public decisions** — 1-2 paragraph textarea, pre-filled by Claude
4. Below the existing sections (meetings, comment periods, officials, actions, orgs):
   - **What to watch for next** — 1-2 sentence textarea, pre-filled by Claude
5. Editor reviews and edits all text, adjusts selections as usual
6. Editor goes to Output tab — preview and HTML now include the new sections and the response form

### Reader workflow (on WordPress):
1. Reader sees the civic action box in an article
2. At the bottom, a compact form says "Tell us what action you took"
3. Reader can type a short message, optionally add their email, and submit
4. Submission is stored via the ask-planet-detroit API

## 4. Requirements

### New Builder sections
1. Add "Why it matters" editable textarea in Builder tab, positioned first (above meetings)
2. Add "Who's making public decisions" editable textarea, positioned second
3. Add "What to watch for next" editable textarea, positioned after organizations (last content section)
4. All three fields persist in App.jsx state and localStorage (like `customNotes`)
5. All three fields are pre-populated by Claude when article analysis completes

### API changes (ask-planet-detroit)
6. Update the `/api/analyze-article` Claude prompt to also return `why_it_matters`, `whos_deciding`, and `what_to_watch` text fields in the response
7. Add `POST /api/civic-responses` endpoint that accepts: `{ message, email (optional), article_url, article_title }`
8. Store civic responses in a new Supabase table `civic_responses` with columns: `id`, `message`, `email`, `article_url`, `article_title`, `created_at`

### Output HTML
9. "Why it matters" renders at the top of the box (after the title, replacing current `customNotes` position)
10. "Who's making public decisions" renders after "Why it matters"
11. Existing sections (meetings, comment periods, officials, actions, orgs) render in their current order
12. "What to watch for next" renders after organizations
13. Reader response form renders at the very bottom, below the email CTA
14. Response form must be compact — single textarea + optional email input + submit button, all in one row or stacked tightly
15. The `customNotes` field should be removed or repurposed (its role is now covered by "Why it matters")

### Preview
16. Preview panel in Output tab must reflect all new sections
17. Preview must show the response form visually

## 5. Acceptance Criteria

- [ ] When article analysis completes, then "Why it matters," "Who's making public decisions," and "What to watch for next" fields are pre-populated with Claude-generated text
- [ ] When editor edits any of the three new fields, then changes are reflected in the Output tab preview and HTML
- [ ] When editor clears a field, then that section is omitted from the output HTML (not rendered empty)
- [ ] When the page is refreshed, then all three fields are restored from localStorage
- [ ] When "Copy HTML" is clicked, then the output includes all new sections in the correct order
- [ ] When a reader submits the response form on WordPress, then the data is stored in Supabase `civic_responses` table
- [ ] When a reader submits without an email, then the submission still succeeds (email is optional)
- [ ] When a reader submits an empty message, then the form shows a validation error (message is required)
- [ ] When the response form is submitted, then a thank-you confirmation replaces the form

## 6. Out of Scope

- This spec does NOT add a notification system for incoming reader responses (check Supabase directly for now)
- This spec does NOT change the newsletter builder (separate spec)
- This spec does NOT add rich text editing (plain text with line breaks is fine for now)
- This spec does NOT add emoji pickers for section headers (use fixed emojis in HTML output)

## 7. Connects To

- **ask-planet-detroit API** — `/api/analyze-article` (updated prompt), new `/api/civic-responses` endpoint
- **Supabase** — new `civic_responses` table
- **WordPress** — output HTML is pasted into Custom HTML blocks
- **civic-action-builder** — `App.jsx`, `BuilderTab.jsx`, `OutputTab.jsx`, `lib/html.js`

## 8. Known Risks

- **If AI-generated text is wrong**: Editor can (and should) review and edit all pre-populated fields. The sections are suggestions, not final copy. This is a journalism organization — editors must review before publishing.
- **If response form is abused**: Rate-limit the `/api/civic-responses` endpoint. Consider adding a simple honeypot field for bot protection. No sensitive data is collected.
- **Security considerations**: Sanitize all reader-submitted text (message, email). The response form posts to the Railway backend, which needs CORS for planetdetroit.org (already allowed).

## 9. Success Metrics

- Editors spend less time manually writing civic action box context
- Reader response form submissions indicate engagement (any submissions = success)
- Time to build a civic action box decreases from ~15 minutes to ~5 minutes

---

## Section Order in Final Output

```
🗳️ Civic Action Toolbox
├── Why it matters (new)
├── Who's making public decisions (new)
├── Upcoming Meetings (existing)
├── Open Comment Periods (existing)
├── Contact Your Representatives (existing)
├── Civic Actions: What You Can Do (existing)
├── Organizations to Follow (existing)
├── What to watch for next (new)
├── Email CTA (existing)
├── Reader response form (new)
└── Footer credit (existing)
```

---

_After completing this spec, hand it to Claude Code and say: "Read this spec. Write automated tests for each acceptance criterion first, then implement the feature."_
