# Civic Action Builder — Next Steps

**Updated:** February 26, 2026

---

## Completed (Feb 26, 2026)

### Checkbox formatting fix
Fixed the "double marker" (bullet + checkbox) issue two ways:
1. **Builder** (`civic-action-builder/src/lib/html.js`): `<ul>` elements get `list-style: none; padding-left: 0` when checkboxes are on.
2. **Block plugin** (`civic-action-block/src/style.scss`): Added `:has(.civic-checkbox)` CSS rule so existing posts with old HTML also render without bullets.

### Block: HTML editor moved to sidebar
After pasting HTML and clicking Apply, the editable HTML textarea now lives in the block's sidebar panel ("HTML Code", collapsed by default) instead of below the preview. Keeps the editor view clean.

### Block plugin v1.2.0 installed on WordPress (Kinsta)
Plugin manually uploaded. v1.2.1 (identical code, version bump only) is on GitHub and will auto-update within 12 hours via the PUC auto-updater. Auto-updater is confirmed working — it just caches results for 12 hours.

### Context fields constrained to one sentence
AI prompt updated in `ask-planet-detroit/api/main.py` — "Why it matters", "Who's deciding", and "What to watch" now each return a single sentence. Builder UI hints and placeholders updated to match.

### Default civic actions added
After AI analysis, two evergreen actions are automatically appended: "Write a letter to the editor or op-ed" and "Register to vote" (with Michigan voter registration link). Editors can remove them.

### WYSIWYG editing for context fields
Replaced plain textareas with TipTap rich text editors for "Why it matters", "Who's deciding", and "What to watch". Supports **bold**, *italic*, and links. HTML generation updated with `sanitizeContext()` that preserves safe formatting while stripping scripts and event handlers. Tests added.

---

## Still To Do

### 1. Verify Railway deployment (ask-planet-detroit)
The one-sentence context constraint was pushed to `ask-planet-detroit` main branch. If Railway auto-deploys on push, it's already live. Check Railway dashboard to confirm.

### 2. Remove WPCode debug snippet
A debug snippet was added to WPCode during auto-updater troubleshooting. Deactivate/delete it — it's no longer needed.

### 3. "Ask Planet Detroit" Reader Question Form (New Project)

A separate form where readers can submit questions directly to reporters. Needs a spec first.

**Scope to define:**
- Where does it live? (Standalone page? Embedded in articles? Both?)
- What fields? (Question text, name, email, topic/beat?)
- Where do submissions go? (Supabase table? Email to editors? Both?)
- How do reporters see/manage incoming questions?
- Does it connect to the existing Ask Planet Detroit search, or is it purely a submission form?

---

## Reference: How Checkbox Tracking Works

Three pieces, three places:

1. **HTML (in each post)** — `generateHTML()` adds `<input type="checkbox" class="civic-checkbox" data-action="attend_meeting" data-label="Meeting Title">` to each list item. No JavaScript in post HTML.

2. **JavaScript (site-wide, via WPCode)** — `generateScript()` generates a script added once to the site footer. Fires GA4 events on checkbox change:
   - Checked → `civic_action_taken`
   - Unchecked → `civic_action_untaken`
   - Payload: `action_label`, `action_detail`, `article_url`

3. **GA4 (Google Analytics)** — Events appear under Events > `civic_action_taken`. Depends on `gtag` being loaded. Checkbox state does not persist across page loads (by design).

## Reference: Auto-Updater (civic-action-block)

The plugin uses `plugin-update-checker` (PUC) v5 to auto-update from GitHub releases.
- **Config:** `civic-action-block.php` — `PucFactory::buildUpdateChecker()` + `enableReleaseAssets()`
- **How it works:** PUC checks the GitHub API for the latest release every 12 hours, compares the tag version to the installed `Version` header, and shows an update in WordPress if newer.
- **Release process:** Bump `Version` in `civic-action-block.php`, run `npm run build && npm run plugin-zip`, commit, push, then `gh release create vX.Y.Z civic-action-block.zip --title "vX.Y.Z" --notes "..."`
- **Cache:** PUC stores state in `external_updates-civic-action-block` site option. To force a recheck, delete that option and the `update_plugins` site transient.
- **Current versions:** v1.2.0 installed on WordPress, v1.2.1 on GitHub (will auto-update).
