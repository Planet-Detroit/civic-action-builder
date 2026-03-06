#!/usr/bin/env node
/**
 * CLI entry point for the meeting agenda scraper.
 *
 * Usage:
 *   node scrapers/index.js                    # Scrape all agencies
 *   node scrapers/index.js --agency egle      # Scrape EGLE only
 *   node scrapers/index.js --summarize        # Scrape + summarize with Claude
 *   node scrapers/index.js --json             # Output as JSON
 */

import { scrapeAll, scrapeEGLE, scrapeMPSC, scrapeGLWA, scrapeDetroit } from './agenda-scraper.js'
import { summarizeAll } from './summarizer.js'

const SCRAPERS = {
  egle: scrapeEGLE,
  mpsc: scrapeMPSC,
  glwa: scrapeGLWA,
  detroit: scrapeDetroit,
}

async function main() {
  const args = process.argv.slice(2)
  const flags = {
    agency: null,
    summarize: args.includes('--summarize'),
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
  }

  const agencyIdx = args.indexOf('--agency')
  if (agencyIdx !== -1 && args[agencyIdx + 1]) {
    flags.agency = args[agencyIdx + 1].toLowerCase()
  }

  if (flags.help) {
    console.log(`
Meeting Agenda Scraper — Planet Detroit

Usage:
  node scrapers/index.js [options]

Options:
  --agency <name>   Scrape a specific agency (egle, mpsc, glwa, detroit)
  --summarize       Summarize agendas using Claude API (requires ANTHROPIC_API_KEY)
  --json            Output results as JSON
  --help, -h        Show this help message

Examples:
  node scrapers/index.js --agency egle --json
  ANTHROPIC_API_KEY=sk-... node scrapers/index.js --summarize
`)
    process.exit(0)
  }

  // Scrape
  let meetings, errors
  if (flags.agency) {
    const scraper = SCRAPERS[flags.agency]
    if (!scraper) {
      console.error(`Unknown agency: ${flags.agency}. Options: ${Object.keys(SCRAPERS).join(', ')}`)
      process.exit(1)
    }
    try {
      meetings = await scraper()
      errors = []
    } catch (e) {
      meetings = []
      errors = [e.message]
    }
  } else {
    const result = await scrapeAll()
    meetings = result.meetings
    errors = result.errors
  }

  if (!flags.json) {
    console.log(`\nScraped ${meetings.length} meetings`)
    if (errors.length > 0) {
      console.log(`Errors: ${errors.join(', ')}`)
    }
  }

  // Summarize if requested
  let summaries = null
  if (flags.summarize && meetings.length > 0) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Error: ANTHROPIC_API_KEY environment variable is required for --summarize')
      process.exit(1)
    }
    if (!flags.json) console.log('\nSummarizing agendas...\n')
    summaries = await summarizeAll(meetings)
  }

  // Output
  if (flags.json) {
    const output = summaries
      ? summaries.map(s => ({ ...s.meeting, summary: s.summary, summaryError: s.error }))
      : meetings
    console.log(JSON.stringify(output, null, 2))
  } else if (summaries) {
    for (const { meeting, summary, error } of summaries) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`${meeting.agency} — ${meeting.title}`)
      console.log(`Date: ${meeting.date || 'TBD'}`)
      if (error) {
        console.log(`  Summary error: ${error}`)
      } else if (summary) {
        console.log(`  ${summary.headline}`)
        if (summary.keyTopics?.length) {
          console.log(`  Key topics:`)
          for (const topic of summary.keyTopics) console.log(`    • ${topic}`)
        }
        if (summary.publicImpact) console.log(`  Impact: ${summary.publicImpact}`)
        if (summary.actionItems?.length) {
          console.log(`  What you can do:`)
          for (const action of summary.actionItems) console.log(`    → ${action}`)
        }
      }
    }
  } else {
    for (const m of meetings) {
      console.log(`\n  [${m.agency}] ${m.title}`)
      console.log(`  Date: ${m.date || 'TBD'}`)
      if (m.agendaUrl) console.log(`  Agenda: ${m.agendaUrl}`)
      if (m.agendaItems?.length) {
        for (const item of m.agendaItems) console.log(`    • ${item}`)
      }
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
