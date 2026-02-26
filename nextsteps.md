# Civic Action Builder — Next Steps

**Created:** February 25, 2026

---

## 1. Civic Action Block Plugin Updates

### 1a. Rebuild and update the plugin on WordPress
The `render.php` fix (allowing `id` on `<p>` tags) and auto-updater code have been pushed to GitHub but need to reach your WordPress site. Either:
- Rebuild locally (`npm run build && npm run plugin-zip` in `civic-action-block/`) and upload the zip
- Or create a new GitHub Release (v1.2.0) so the auto-updater delivers it

### 1b. Make the block retain HTML after Apply
Currently, after pasting HTML and clicking Apply, the HTML disappears behind a preview-only view. The block should keep the HTML visible and editable so editors can modify it after pasting. This is a change to `src/edit.js` in `civic-action-block/`.

---

## 2. Fix Checkbox Formatting

Checkboxes are rendering alongside bullet points, creating a "checkbox + bullet" double marker. Need to pick one: either checkboxes (no bullet) or bullets (no checkbox).

**How checkboxes work currently:**
- When `interactiveCheckboxes` is toggled on in the builder, each action item gets an `<input type="checkbox">` wrapped in a `<label>`
- Items are inside `<li>` elements with `list-style: none` set inline — but this may not be taking effect consistently
- Checking/unchecking fires a GA4 event (`civic_action_taken` / `civic_action_untaken`) via the WPCode script
- Tracking sends: action type (e.g. `attend_meeting`, `submit_comment`, `contact_official`), label, and article URL

**Fix needed:** Review the `generateHTML()` output in `src/lib/html.js` — ensure `list-style: none` is reliably applied when checkboxes are on, so there's no double marker. May also need to adjust padding/margin on the `<ul>` and `<li>` elements.

---

## 3. Civic Action Builder Backend Improvements

### 3a. Constrain "Why it matters" and "Who's making decisions" to one sentence
These context sections should be brief — one sentence max. Update the AI prompt in the article analysis endpoint (`ask-planet-detroit/api/main.py`) to instruct Claude to keep these to a single sentence. Also update the builder UI to indicate the one-sentence expectation (placeholder text or character hint).

### 3b. Add default civic actions: "Write an op-ed" and "Register to vote"
These are evergreen actions that apply to most articles. Options:
- Add them as default suggestions that always appear in the builder (editor can remove)
- Or add quick-add buttons in the Builder tab

### 3c. Make "What to watch for next" text box bigger
The input field is currently small. Increase its height in the Builder tab UI.

### 3d. Add WYSIWYG editing to all text fields in the builder
Currently the context fields (Why it matters, Who's deciding, What to watch) are plain text inputs. Adding basic rich text editing (bold, italic, links) would let editors format these sections without writing HTML. This affects `BuilderTab.jsx`.

---

## 4. "Ask Planet Detroit" Reader Question Form (New Project)

A separate form where readers can submit questions directly to reporters. This is a bigger project — likely separate from the civic action box.

**Scope to define:**
- Where does it live? (Standalone page? Embedded in articles? Both?)
- What fields? (Question text, name, email, topic/beat?)
- Where do submissions go? (Supabase table? Email to editors? Both?)
- How do reporters see/manage incoming questions?
- Does it connect to the existing Ask Planet Detroit search, or is it purely a submission form?

**Recommendation:** Write a spec first (per CLAUDE.md workflow). This is big enough to be its own project or at minimum its own feature branch.

---

## Priority Order

1. **Checkbox formatting fix** — quick fix, improves current live pages
2. **Block retains HTML after Apply** — improves editor workflow
3. **Rebuild + update plugin on WordPress** — delivers render.php fix + block improvements
4. **Builder backend tweaks** (3a-3d) — medium effort, improves content quality
5. **Ask Planet Detroit question form** — needs spec first, larger project
