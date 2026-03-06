#!/usr/bin/env node
/**
 * Demo: runs all scrapers against realistic mock HTML
 * that mirrors actual michigan.gov, glwater.org, and detroitmi.gov markup.
 *
 * Run: node scrapers/demo.js
 */

import { scrapeEGLE, scrapeMPSC, scrapeGLWA, scrapeDetroit, fetchAgendaContent } from './agenda-scraper.js'

// --- Realistic mock HTML for each agency ---

const EGLE_HTML = `
<html><body>
<div class="container">
  <h1>Public Comment Opportunities</h1>

  <ul class="list-group">
    <li class="list-group-item">
      Public hearing on proposed air quality permit for Marathon Petroleum Company,
      Detroit Heavy Oil Upgrade Project — March 20, 2026 at 6:00 PM.
      <a href="https://www.michigan.gov/egle/-/media/Project/Websites/egle/Documents/Permits/AQD/Marathon-Detroit-Agenda.pdf">View Agenda</a>
    </li>
    <li class="list-group-item">
      Public comment period: Draft PFAS cleanup criteria for Huron River,
      comment deadline April 15, 2026.
      <a href="https://www.michigan.gov/egle/pfas-huron-hearing">Hearing Details</a>
    </li>
    <li class="list-group-item">
      Public meeting on proposed stormwater discharge permit for
      Wayne County — March 27, 2026 at 2:00 PM.
      <a href="https://www.michigan.gov/egle/-/media/wayne-county-stormwater-agenda.pdf">Agenda</a>
    </li>
  </ul>
</div>
</body></html>
`

const MPSC_HTML = `
<html><body>
<div class="content-area">
  <h1>Commission Meetings</h1>
  <table class="table">
    <thead>
      <tr><th>Date</th><th>Event</th><th>Location</th><th>Documents</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>3/11/2026</td>
        <td>Commission Meeting — DTE Electric Rate Case U-21534</td>
        <td>Cadillac Place, Detroit</td>
        <td><a href="/mpsc/docs/agenda-2026-03-11.pdf">Agenda</a></td>
      </tr>
      <tr>
        <td>3/18/2026</td>
        <td>Commission Meeting — Consumers Energy IRP Review</td>
        <td>Virtual / Cadillac Place</td>
        <td><a href="/mpsc/docs/agenda-2026-03-18.pdf">Agenda</a></td>
      </tr>
      <tr>
        <td>3/25/2026</td>
        <td>Public hearing on data center electricity demand forecast</td>
        <td>Cadillac Place, Detroit</td>
        <td><a href="/mpsc/docs/agenda-2026-03-25.pdf">Agenda</a></td>
      </tr>
    </tbody>
  </table>
</div>
</body></html>
`

const GLWA_HTML = `
<html><body>
<div class="board-meetings">
  <h1>Board Meetings & Agendas</h1>

  <article class="meeting-entry">
    <h3>Board of Directors Regular Meeting</h3>
    <span class="date">March 12, 2026 — 10:00 AM</span>
    <p>Agenda includes: FY2027 capital improvement budget, Lake Huron water
    treatment plant upgrade contract, lead service line replacement program update,
    PFAS monitoring results Q4 2025.</p>
    <a href="https://glwater.org/agendas/2026-03-12-board-agenda.pdf">Agenda</a>
    <a href="https://glwater.org/agendas/2026-03-12-board-packet.pdf">Board Packet</a>
  </article>

  <article class="meeting-entry">
    <h3>CEO Committee Meeting</h3>
    <span class="date">March 19, 2026 — 9:00 AM</span>
    <p>Review of regional water rate methodology, infrastructure investment
    forecast, and community engagement report.</p>
    <a href="https://glwater.org/agendas/2026-03-19-ceo-agenda.pdf">Agenda</a>
  </article>

  <article class="meeting-entry">
    <h3>Finance Committee Meeting</h3>
    <span class="date">March 26, 2026 — 1:00 PM</span>
    <p>Discussion of proposed rate increases for member communities,
    bond issuance timeline, and deferred maintenance backlog.</p>
    <a href="https://glwater.org/agendas/2026-03-26-finance-agenda.pdf">Agenda</a>
  </article>
</div>
</body></html>
`

const DETROIT_HTML = `
<html><body>
<div class="view-content">
  <div class="views-row views-row-1">
    <h4><a href="/council/2026-03-11-formal">Formal Session</a></h4>
    <span class="date-display-single">March 11, 2026</span>
    <div class="field-agenda">
      <a href="/sites/default/files/council/2026-03-11-agenda.pdf">Agenda</a>
    </div>
  </div>
  <div class="views-row views-row-2">
    <h4><a href="/council/2026-03-18-formal">Formal Session</a></h4>
    <span class="date-display-single">March 18, 2026</span>
    <div class="field-agenda">
      <a href="/sites/default/files/council/2026-03-18-agenda.pdf">Agenda</a>
    </div>
  </div>
  <div class="views-row views-row-3">
    <h4><a href="/council/2026-03-13-phed">Planning & Housing Committee Hearing</a></h4>
    <span class="date-display-single">March 13, 2026</span>
    <div class="field-agenda">
      <a href="/sites/default/files/council/2026-03-13-phed-agenda.pdf">Agenda</a>
    </div>
  </div>
</div>
</body></html>
`

const EGLE_AGENDA_PAGE = `
<html><body>
<main>
  <h1>Public Hearing: Marathon Petroleum Detroit Heavy Oil Upgrade Project</h1>
  <h2>Agenda</h2>
  <p>1. Welcome and introductions by EGLE Air Quality Division</p>
  <p>2. Overview of Marathon Petroleum permit application and proposed emission limits</p>
  <p>3. Presentation of Environmental Justice screening results for 48217 zip code</p>
  <p>4. Public comment period — each speaker limited to 3 minutes</p>
  <p>5. Written comment submission instructions (deadline: April 3, 2026)</p>
  <p>6. Next steps and timeline for permit decision</p>
  <p><strong>Location:</strong> Kemeny Recreation Center, 2260 S Fort St, Detroit, MI 48217</p>
  <p><strong>Virtual option:</strong> Zoom link available at michigan.gov/egle</p>
</main>
</body></html>
`

// --- Mock fetch that routes URLs to mock HTML ---

function createMockFetch(overrideHtml) {
  return async (url) => ({
    ok: true,
    status: 200,
    text: async () => overrideHtml,
  })
}

// --- Run demo ---

async function main() {
  console.log('='.repeat(70))
  console.log('  MEETING AGENDA SCRAPER — DEMO WITH REALISTIC MOCK DATA')
  console.log('='.repeat(70))

  // EGLE
  console.log('\n\n--- EGLE (Environment, Great Lakes, and Energy) ---\n')
  const egle = await scrapeEGLE(createMockFetch(EGLE_HTML))
  for (const m of egle) {
    console.log(`  [${m.agency}] ${m.title}`)
    console.log(`  Date: ${m.date || 'TBD'}`)
    if (m.agendaUrl) console.log(`  Agenda: ${m.agendaUrl}`)
    console.log()
  }

  // MPSC
  console.log('\n--- MPSC (Public Service Commission) ---\n')
  const mpsc = await scrapeMPSC(createMockFetch(MPSC_HTML))
  for (const m of mpsc) {
    console.log(`  [${m.agency}] ${m.title}`)
    console.log(`  Date: ${m.date || 'TBD'}`)
    if (m.agendaUrl) console.log(`  Agenda: ${m.agendaUrl}`)
    console.log()
  }

  // GLWA
  console.log('\n--- GLWA (Great Lakes Water Authority) ---\n')
  const glwa = await scrapeGLWA(createMockFetch(GLWA_HTML))
  for (const m of glwa) {
    console.log(`  [${m.agency}] ${m.title}`)
    console.log(`  Date: ${m.date || 'TBD'}`)
    if (m.agendaUrl) console.log(`  Agenda: ${m.agendaUrl}`)
    console.log()
  }

  // Detroit
  console.log('\n--- Detroit City Council ---\n')
  const detroit = await scrapeDetroit(createMockFetch(DETROIT_HTML))
  for (const m of detroit) {
    console.log(`  [${m.agency}] ${m.title}`)
    console.log(`  Date: ${m.date || 'TBD'}`)
    if (m.agendaUrl) console.log(`  Agenda: ${m.agendaUrl}`)
    console.log()
  }

  // Agenda content extraction demo
  console.log('\n' + '='.repeat(70))
  console.log('  AGENDA CONTENT EXTRACTION DEMO')
  console.log('='.repeat(70))
  console.log('\n--- Fetching EGLE Marathon Petroleum hearing agenda ---\n')
  const agenda = await fetchAgendaContent('https://michigan.gov/egle/marathon-hearing', createMockFetch(EGLE_AGENDA_PAGE))
  console.log(`  Type: ${agenda.type}`)
  console.log(`  Extracted ${agenda.items.length} agenda items:\n`)
  for (const item of agenda.items) {
    console.log(`    • ${item}`)
  }
  console.log(`\n  Full text preview (first 300 chars):`)
  console.log(`    ${agenda.text.substring(0, 300).replace(/\n/g, '\n    ')}`)

  // Summary
  const total = egle.length + mpsc.length + glwa.length + detroit.length
  console.log('\n' + '='.repeat(70))
  console.log(`  TOTAL: ${total} meetings scraped across 4 agencies`)
  console.log('='.repeat(70))
  console.log('\n  To summarize with AI, run:')
  console.log('  ANTHROPIC_API_KEY=sk-... node scrapers/index.js --summarize\n')
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
