# Civic Action Builder — Next Steps

**Updated:** March 7, 2026

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

## Priority: Meeting Intelligence Pipeline

The biggest opportunity is turning Detroit's public meetings from a list of dates into a full intelligence layer — what's coming up, what happened, and why it matters.

### 1. Detroit Agenda Summaries (In Progress)
**Status:** Scraper built, API endpoints live, standalone HTML page working.

Scrapes agenda items from Detroit eSCRIBE, generates AI summaries with Claude Haiku, stores in `agenda_summaries` table. Shows upcoming meetings with plain-language summaries of what's on the agenda.

**How Detroit agenda scraping works:** The Detroit scraper (`scrapers/detroit_scraper.py`) uses Playwright to hit the eSCRIBE platform at `pub-detroitmi.escribemeetings.com`. It calls eSCRIBE's internal calendar API (`/MeetingsCalendarView.aspx/GetCalendarMeetings`) which returns meeting GUIDs and a `HasAgenda` flag. Agenda URLs are constructed as `Meeting.aspx?Id={guid}&Agenda=Agenda&lang=English`. The scraper also generates fallback schedules for regular meetings (e.g., Tuesday Formal Session 10 AM, Wednesday Internal Operations 10 AM + Budget/Finance 1 PM, Thursday Planning 10 AM + Neighborhood Services 1 PM). Agenda pages are HTML with structured sections — relatively easy to parse for summarization.

**Remaining:**
- Run SQL migration on Supabase (`api/migrations/agenda_summaries.sql`)
- Deploy updated API to Railway
- Surface agenda summaries in the civic action builder (when analyzing articles, show relevant agenda context alongside meetings)
- Add to daily GitHub Actions cron

### 1b. Extend Agenda Summaries to GLWA and EGLE
Both scrapers already capture `agenda_url` — they just need the same summarization pipeline Detroit is getting.

**GLWA** (`scrapers/glwa_scraper.py`): Scrapes Legistar at `glwater.legistar.com/Calendar.aspx` using Playwright to render the Telerik RadGrid table. Agenda links come from Cell 7 of the grid. These typically point to **PDFs** — will need PDF text extraction (e.g., `pdfplumber` or similar) before summarization. Captures 50-70 meetings per scrape across Board of Directors, Audit Committee, Operations, etc.

**EGLE** (`scrapers/egle_scraper.py`): Fetches the Trumba RSS feed at `trumba.com/calendars/deq-events.rss` — no browser needed, just XML parsing. Agenda URLs come from the Trumba `weblink` field. Content varies: sometimes inline HTML on michigan.gov event pages, sometimes PDF attachments. This scraper also populates the `comment_periods` table with deadlines, permit SRNs, facility names, and comment emails.

**MPSC** (`scrapers/mpsc_scraper.py`): Currently does **not** capture agendas. Scrapes `michigan.gov/mpsc/commission/events` using Playwright and parses schema.org LD+JSON from event pages. Gets titles, dates, Teams URLs, and dial-in info, but `agenda_url` is always null. MPSC does post agendas on their event pages — the scraper needs to be updated to extract those links. Only 1-2 meetings per scrape (Commission meets 1st & 3rd Thursdays).

**MiEnviro scraper** (`scrapers/egle_mienviro_scraper.py`): Targets `mienviro.michigan.gov/ncore/external/publicnotice/search` for EGLE public notices. Currently **non-functional** — the site is a JavaScript SPA that resists scraping. The script is in debug mode (taking screenshots, saving HTML, intercepting network requests). Needs proper API discovery or a different approach.

### 2. Post-Meeting Summaries (Next — Needs Spec)
After meetings happen, automatically generate "what happened" summaries from available sources:

**Potential data sources (in order of reliability):**
- **Detroit Documenters notes** — Community members attend meetings and take structured notes. Check if there's an API or feed from [documenters.org](https://www.documenters.org/)
- **eSCRIBE meeting minutes** — Detroit publishes approved minutes back on eSCRIBE. Could scrape these once posted (usually days/weeks after meeting)
- **Meeting recordings** — City Council streams meetings on YouTube and cable. Could transcribe recordings with Whisper or similar, then summarize
- **News coverage** — Planet Detroit and other outlets cover major meetings. Could use existing article search to find post-meeting coverage
- **Vote results** — eSCRIBE sometimes includes vote tallies. Legistar had structured vote data but stopped being updated in 2017

**Key questions to answer:**
- Which sources are most consistently available?
- What's the turnaround time? (Same day? Next week?)
- Should pre-meeting and post-meeting summaries live in the same table or separate?
- How do we connect "what was on the agenda" to "what actually happened"?

### 3. Expand Meeting Scrapers to Other Bodies
Detroit City Council is just the start. See the full reference section below for detailed research on potential scraper targets at the local, state, and federal levels.

---

## Reference: Scraper Technical Details

### Currently Active Scrapers

All scrapers live in `ask-planet-detroit/scrapers/` and run daily via GitHub Actions (`daily-meetings-sync.yml`, 6 AM EST / 11:00 UTC). Can also be triggered manually with option to run individual scrapers. Meetings are stored in the `meetings` table with a unique constraint on `(source, source_id)` to prevent duplicates.

| Scraper | Source URL | Method | Agendas? | Agenda Format | Issue Tags |
|---------|-----------|--------|----------|---------------|------------|
| MPSC | `michigan.gov/mpsc/commission/events` | Playwright + LD+JSON | No (fixable) | Would be PDF | energy, utilities, dte_energy, consumers_energy, rates |
| GLWA | `glwater.legistar.com/Calendar.aspx` | Playwright + Telerik RadGrid | Yes (Cell 7) | PDF | drinking_water, water_quality, infrastructure |
| Detroit | `pub-detroitmi.escribemeetings.com` | Playwright + eSCRIBE API | Yes (HasAgenda flag) | HTML | local_government + per-committee |
| EGLE | `trumba.com/calendars/deq-events.rss` | RSS/XML (no browser) | Yes (weblink) | HTML or PDF | air_quality, water_quality, pfas, climate, etc. |
| MiEnviro | `mienviro.michigan.gov` | Playwright (broken) | No | N/A | permitting |

### Potential Future Scrapers — Local (Metro Detroit)

Research completed March 2026. These are the most relevant local bodies not yet scraped.

**Tier 1 — High scrapability, high editorial value:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Why It Matters |
|------|-----------|----------|---------------|-------------|----------------|
| Wayne County Commission | `waynecountymi.gov/.../Full-Commission` | Custom site | PDF (predictable URLs) | High | County-level budget, jail, infrastructure decisions affecting 1.7M residents |
| Detroit Planning Commission | `detroitmi.gov/.../cpc-agendas` | City CMS (Drupal) | PDF | High | Zoning, development, land use — posted 3 days before meetings |
| Detroit Board of Police Commissioners | `detroitmi.gov/.../bopc-meeting-information` | City CMS (Drupal) | PDF | High | Police oversight, weekly meetings (Thursdays 3 PM) + monthly community meetings |
| Detroit Land Bank Authority | `buildingdetroit.org/events/meetings` | Custom site | PDF | High | Blight, demolition, side lots — monthly board meetings |

**Tier 2 — Medium scrapability, high editorial value:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Why It Matters |
|------|-----------|----------|---------------|-------------|----------------|
| Oakland County Board | `oaklandcomi.portal.civicclerk.com` | CivicClerk | HTML + PDF | Medium-High | Suburban county decisions, budget, environmental issues |
| Macomb County Board | `macombcomi.portal.civicclerk.com` | CivicClerk | HTML + PDF | Medium-High | Same CivicClerk platform as Oakland — build one scraper, get both |
| Detroit Board of Education (DPSCD) | `go.boarddocs.com/mi/detroit/Board.nsf/Public` | BoardDocs Plus | HTML + PDF | Low-Medium | School board decisions, facility closures, environmental conditions in schools. BoardDocs may restrict scraping |
| SEMCOG | `semcog.org/.../Agendas-Minutes` | Custom site | PDF | High | Regional planning, transportation, air/water quality coordination for 7 counties |
| Detroit Board of Zoning Appeals | `detroitmi.gov/.../board-zoning-appeals-meetings` | City CMS (Drupal) | PDF | High | Zoning variances, development approvals — agendas posted 1 week before meetings |

**Tier 3 — Lower scrapability or niche coverage:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Notes |
|------|-----------|----------|---------------|-------------|-------|
| Detroit/Wayne County Port Authority | `portdetroit.com` | Custom site | Not clearly published | Very Low | Agendas not prominent online. Documenters.org tracks some meetings |

**Platform notes:** Wayne County, Detroit Planning, Police Commission, Zoning Appeals, and Land Bank all publish PDFs on relatively simple sites — a single Playwright + PDF-link-extraction pattern could cover most of them. Oakland and Macomb both use CivicClerk, so one scraper covers two counties.

### Potential Future Scrapers — State (Michigan)

**Tier 1 — High scrapability, directly relevant to PD coverage:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Why It Matters |
|------|-----------|----------|---------------|-------------|----------------|
| MI Natural Resources Commission (DNR) | `michigan.gov/dnr/about/boards/nrc` | DNR site | PDF (predictable URL pattern: `/NRC/[YEAR]/[Month]-[YEAR]/Agenda_[Month]_Draft.pdf`) | High | Hunting, fishing, land management, PFAS in waterways — monthly meetings |
| MI Council on Climate Solutions | `michigan.gov/egle/about/groups/council-on-climate-solutions` | EGLE site | PDF (pattern: `/CCS/Agendas/Agenda-[YYYY-MM-DD].pdf`) | High | State climate policy, emissions targets, energy transition |
| MI Transportation Commission (MDOT) | `michigan.gov/mdot/.../transportation-commission/agendas` | MDOT site | PDF | High | Highway, transit, infrastructure spending — published 7+ days before meetings |
| MI Utility Consumer Participation Board | `michigan.gov/lara/about/ucpb` | LARA site | PDF (pattern: `/ucpb/[YEAR]/UCPB-Agenda-[MMDDYY].pdf`) | High | Utility rate advocacy, consumer representation grants — bimonthly meetings |
| MI Legislature Committee Hearings | `legislature.mi.gov/Committees/Meetings` | Custom | HTML + .ics calendar files | High | Environmental, energy, natural resources committee hearings. Agendas posted 7 working days before |

**Tier 2 — Moderate scrapability, relevant to PD coverage:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Why It Matters |
|------|-----------|----------|---------------|-------------|----------------|
| EGLE Advisory Councils (beyond main calendar) | `michigan.gov/egle/public/engage/public-meetings` | EGLE interactive calendar | PDF | Moderate | Water Use Advisory Council, Water Asset Management Council — PDFs at predictable paths but require calendar navigation to discover |
| MI Air Quality Division (permit hearings) | Integrated into EGLE calendar | EGLE calendar | Mixed | Moderate | Permit hearings for major polluters — filtered from same EGLE calendar already scraped |
| MI Water Resources Division | Integrated into EGLE site | EGLE system | PDF + calendar | Moderate | Water Use Advisory Council (WUAC) materials at `/egle/Documents/Groups/WUAC/` |

**Tier 3 — Lower scrapability or less frequent meetings:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Notes |
|------|-----------|----------|---------------|-------------|-------|
| MI Advisory Council on Environmental Justice | `michigan.gov/egle/about/groups/macej` | EGLE site | Calendar-based | Low | More conference-oriented than regular meetings. Annual EJ conference in September |
| MI Public Health Advisory Council | `michigan.gov/mdhhs/.../public-health-advisory-council` | MDHHS site | Unclear | Low-Moderate | Limited agenda publication; rotating meeting dates |

**Platform notes:** Most michigan.gov agencies use a consistent PDF URL pattern (`/[dept]/-/media/Project/Websites/[dept]/Documents/...`). A generic michigan.gov PDF scraper with per-agency path templates could scale across DNR, MDOT, LARA, and EGLE advisory councils relatively quickly.

### Potential Future Scrapers — Federal and Great Lakes Regional

**Tier 1 — API-based, highest value for environmental newsroom:**

| Body | Source URL | Platform | Format | Scrapability | Why It Matters |
|------|-----------|----------|--------|-------------|----------------|
| Federal Register | `federalregister.gov` | Public REST API (no auth required) | JSON, CSV | Very High | Track all Michigan-relevant federal comment periods for EPA rules, FERC energy orders, NRC nuclear decisions. Filter by agency + keyword |
| Regulations.gov | `regulations.gov` | Public API v4 (API key required, free) | JSON | Very High | Track and download comments on Michigan-relevant dockets. 50 req/min, 500 req/hr. Endpoints: `/v4/documents`, `/v4/comments`, `/v4/dockets` |

**Tier 2 — Scrapable, directly relevant:**

| Body | Source URL | Platform | Agenda Format | Scrapability | Why It Matters |
|------|-----------|----------|---------------|-------------|----------------|
| International Joint Commission (IJC) | `ijc.org/en/elk/meeting-minutes-agendas` | Custom site | PDF (consistent naming) | High | US-Canada Great Lakes water quality, levels, pollution — semi-annual meetings |
| Great Lakes Commission | `glc.org/about/meetings` | Custom site | PDF | Moderate | Regional 8-state/2-province coordination on Great Lakes issues — semi-annual + annual meetings |
| Great Lakes Fishery Commission | `glfc.org/future-meetings.php` | Custom site | HTML + PDF | Moderate-High | Invasive species, fishery management — annual lake committee meetings (March in MI) |
| FERC (Federal Energy Regulatory Commission) | `ferc.gov/news-events/media/commission-meetings` | Interactive calendar | HTML | Moderate | Energy regulation, pipeline approvals, utility rate cases. Monthly meetings (3rd Thursday). Sunshine Notices posted 7 days before. Track Michigan dockets via eLibrary |

**Tier 3 — Useful but harder to scrape or less frequent:**

| Body | Source URL | Platform | Format | Scrapability | Notes |
|------|-----------|----------|--------|-------------|-------|
| NRC (Nuclear Regulatory Commission) | `nrc.gov/info-finder/region-state/michigan` | Project-specific notices | Scattered | Low-Moderate | Palisades restart, Fermi 2, D.C. Cook — meetings posted per-project, no central calendar. Region III (Chicago) oversees MI |
| EPA Region 5 | `epa.gov/aboutepa/epa-region-5` | General website calendar | HTML | Low | No dedicated public meetings page; meetings scattered across program pages |
| EPA Great Lakes National Program Office | `epa.gov/greatlakes` | Website | HTML + PDF | Low | Great Lakes Advisory Board meets ~2x/year. Agendas approved by DFO but not prominently published |
| Army Corps Detroit District | `lre.usace.army.mil` | Project pages | Scattered | Low | Public meetings on specific projects (flood mitigation, etc.) — no central calendar |
| EPA ECHO | `echo.epa.gov` | Web database | HTML (queryable) | Moderate | Not meetings — facility compliance/enforcement data. Useful as a supplemental data source for stories |

**API notes:** Federal Register and Regulations.gov are the biggest wins here. Both have real APIs, both can filter for Michigan + environmental topics, and both would plug directly into the existing comment periods pipeline alongside EGLE. The Federal Register API requires no authentication at all.

---

## Other To-Dos

### 3b. Configure Slack Notifications for Meeting Scrapers
The GitHub Actions workflow (`daily-meetings-sync.yml`) supports Slack notifications but requires `SLACK_WEBHOOK_URL` to be set as a GitHub Actions secret. Currently not configured — no Slack messages are being sent.

**Steps:**
1. Create a Slack Incoming Webhook at https://api.slack.com/messaging/webhooks — pick the channel you want scraper results posted to
2. Go to the `ask-planet-detroit` GitHub repo > Settings > Secrets and variables > Actions
3. Add a new secret: `SLACK_WEBHOOK_URL` = the webhook URL from step 1
4. Next daily run (6 AM EST) will post results. Or trigger manually: Actions > Daily Meeting Scraper > Run workflow

### 4. Verify Railway deployment (ask-planet-detroit)
The one-sentence context constraint was pushed to `ask-planet-detroit` main branch. If Railway auto-deploys on push, it's already live. Check Railway dashboard to confirm.

### 5. Remove WPCode debug snippet
A debug snippet was added to WPCode during auto-updater troubleshooting. Deactivate/delete it — it's no longer needed.

### 6. "Ask Planet Detroit" Reader Question Form (New Project)

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
