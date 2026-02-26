# Civic Action Builder — Next Steps

**Updated:** February 26, 2026

---

## Completed (Feb 26, 2026)

### Checkbox formatting fix
Fixed the "double marker" (bullet + checkbox) issue. When interactive checkboxes are enabled, `<ul>` elements now get `list-style: none; padding-left: 0` so only the checkbox shows — no bullet alongside it. Tests added.

### Block retains HTML after Apply
After pasting HTML and clicking Apply, the block now shows both the live preview AND an editable "HTML Code" textarea below it. Editors can see and tweak the raw HTML without using "Replace Content". Changes save on blur. Tests added.

### Block plugin rebuilt
Plugin rebuilt with both fixes above (`npm run build && npm run plugin-zip`). The zip file is at `civic-action-block/civic-action-block.zip`, ready to upload to WordPress. This also includes the earlier `render.php` fix (allowing `id` on `<p>` tags).

### Context fields constrained to one sentence
AI prompt updated in `ask-planet-detroit/api/main.py` — "Why it matters", "Who's deciding", and "What to watch" now each return a single sentence. Builder UI hints and placeholders updated to match.

### Default civic actions added
After AI analysis, two evergreen actions are automatically appended: "Write a letter to the editor or op-ed" and "Register to vote" (with Michigan voter registration link). Editors can remove them if not relevant.

### "What to watch" text box enlarged
Increased from 2 rows to 4 rows (now a WYSIWYG editor).

### WYSIWYG editing for context fields
Replaced plain textareas with TipTap rich text editors for "Why it matters", "Who's deciding", and "What to watch". Supports **bold**, *italic*, and links. HTML generation updated with `sanitizeContext()` that preserves safe formatting while stripping scripts and event handlers. Tests added.

---

## Still To Do

### 1. Upload plugin zip to WordPress
The rebuilt `civic-action-block.zip` is ready at `civic-action-block/civic-action-block.zip`. Upload it via WordPress admin > Plugins > Add New > Upload Plugin. Alternatively, push to GitHub and create a v1.2.0 release so the auto-updater delivers it.

### 2. Deploy ask-planet-detroit prompt change
The one-sentence context constraint was committed to `ask-planet-detroit/api/main.py` but needs to be deployed to Railway for the change to take effect.

### 3. "Ask Planet Detroit" Reader Question Form (New Project)

A separate form where readers can submit questions directly to reporters. This is a bigger project — likely separate from the civic action box.

**Scope to define:**
- Where does it live? (Standalone page? Embedded in articles? Both?)
- What fields? (Question text, name, email, topic/beat?)
- Where do submissions go? (Supabase table? Email to editors? Both?)
- How do reporters see/manage incoming questions?
- Does it connect to the existing Ask Planet Detroit search, or is it purely a submission form?

**Recommendation:** Write a spec first (per CLAUDE.md workflow). This is big enough to be its own project or at minimum its own feature branch.

---

## How Checkbox Tracking Works

For reference — the interactive checkbox system spans three pieces:

1. **HTML (in each post)** — `generateHTML()` adds `<input type="checkbox" class="civic-checkbox" data-action="attend_meeting" data-label="Meeting Title">` to each list item. The `data-action` identifies the type (attend_meeting, submit_comment, contact_official, explore_organization). No JavaScript lives in the post HTML.

2. **JavaScript (site-wide, via WPCode)** — `generateScript()` generates a script added once to the site footer. It listens for checkbox `change` events and fires GA4 events:
   - Checked → `civic_action_taken`
   - Unchecked → `civic_action_untaken`
   - Payload: `action_label`, `action_detail`, `article_url`

3. **GA4 (Google Analytics)** — Events appear under Events > `civic_action_taken` in GA4. Depends on `gtag` being loaded on the site. If GA4 isn't present, checkboxes still work visually but don't track.

**Note:** Checkbox state does not persist across page loads — by design, it's a "did you do this?" prompt, not a saved to-do list.
