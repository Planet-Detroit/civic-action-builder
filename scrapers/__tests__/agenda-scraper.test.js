import { describe, it, expect } from 'vitest'
import {
  stripHtml, parseTable, extractLinks, extractAgendaItems,
  scrapeEGLE, scrapeMPSC, scrapeGLWA, scrapeDetroit,
  fetchAgendaContent, scrapeAll,
} from '../agenda-scraper.js'

// --- Unit tests for helpers ---

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello  <b>world</b></p>')).toBe('Hello world')
  })

  it('handles &nbsp; and HTML entities', () => {
    expect(stripHtml('A&nbsp;B&amp;C&lt;D&gt;E')).toBe('A B&C<D>E')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})

describe('parseTable', () => {
  it('extracts rows and cells from an HTML table', () => {
    const html = '<table><tr><td>Date</td><td>Title</td></tr><tr><td>3/1/2026</td><td>Board Meeting</td></tr></table>'
    const rows = parseTable(html)
    expect(rows).toEqual([
      ['Date', 'Title'],
      ['3/1/2026', 'Board Meeting'],
    ])
  })

  it('handles th elements', () => {
    const html = '<table><tr><th>Col A</th><th>Col B</th></tr></table>'
    expect(parseTable(html)).toEqual([['Col A', 'Col B']])
  })

  it('returns empty array for no table', () => {
    expect(parseTable('<div>no table</div>')).toEqual([])
  })
})

describe('extractLinks', () => {
  it('extracts href and link text', () => {
    const html = '<a href="https://example.com/agenda.pdf">View Agenda</a>'
    expect(extractLinks(html)).toEqual([
      { url: 'https://example.com/agenda.pdf', text: 'View Agenda' }
    ])
  })

  it('handles multiple links', () => {
    const html = '<a href="/a">A</a> text <a href="/b">B</a>'
    expect(extractLinks(html)).toHaveLength(2)
  })
})

describe('extractAgendaItems', () => {
  it('extracts numbered items', () => {
    const text = '1. Call to order\n2. Approval of minutes\n3. Public comment period'
    const items = extractAgendaItems(text)
    expect(items).toEqual([
      'Call to order',
      'Approval of minutes',
      'Public comment period',
    ])
  })

  it('extracts bullet items', () => {
    const text = '• Discussion of water rates\n• Infrastructure update\n• Vote on budget'
    const items = extractAgendaItems(text)
    expect(items).toHaveLength(3)
    expect(items[0]).toBe('Discussion of water rates')
  })

  it('ignores short lines', () => {
    const text = '1. OK\n2. This is a real agenda item with detail'
    const items = extractAgendaItems(text)
    expect(items).toHaveLength(1)
  })
})

// --- Integration tests with mock fetch ---

function mockFetch(html, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => html,
  })
}

describe('scrapeEGLE', () => {
  it('extracts meetings from card-style layout', async () => {
    const html = `
      <div class="card-item">
        <div class="card-body">
          <h3>Air Quality Public Hearing</h3>
          <p>March 15, 2026 at 10:00 AM</p>
          <a href="/agenda.pdf">Agenda</a>
        </div>
      </div>
    `
    const meetings = await scrapeEGLE(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].agency).toBe('EGLE')
    expect(meetings[0].title).toBe('Air Quality Public Hearing')
    expect(meetings[0].date).toBe('March 15, 2026')
  })

  it('falls back to list items', async () => {
    const html = `
      <ul>
        <li>Public hearing on PFAS contamination - April 1, 2026
          <a href="/pfas-agenda.html">View details</a>
        </li>
      </ul>
    `
    const meetings = await scrapeEGLE(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].title).toContain('Public hearing on PFAS')
  })

  it('handles fetch errors', async () => {
    await expect(scrapeEGLE(mockFetch('', 500))).rejects.toThrow('EGLE fetch failed')
  })
})

describe('scrapeMPSC', () => {
  it('extracts meetings from table rows', async () => {
    const html = `
      <table>
        <tr><th>Date</th><th>Event</th></tr>
        <tr><td>3/20/2026</td><td>Commission Meeting on Rate Case U-21000</td></tr>
      </table>
    `
    const meetings = await scrapeMPSC(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].agency).toBe('MPSC')
    expect(meetings[0].date).toBe('3/20/2026')
  })

  it('extracts meetings from agenda links', async () => {
    const html = `
      <p><a href="/docs/agenda-march.pdf">Agenda for March 25, 2026 Meeting</a></p>
    `
    const meetings = await scrapeMPSC(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].agendaUrl).toBe('/docs/agenda-march.pdf')
  })
})

describe('scrapeGLWA', () => {
  it('extracts meetings from entry-style markup', async () => {
    const html = `
      <article class="meeting-entry">
        <h3>Board of Directors Meeting</h3>
        <span>March 12, 2026</span>
        <a href="/agendas/march-2026.pdf">Agenda</a>
      </article>
    `
    const meetings = await scrapeGLWA(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].agency).toBe('GLWA')
    expect(meetings[0].title).toBe('Board of Directors Meeting')
  })

  it('falls back to table layout', async () => {
    const html = `
      <table>
        <tr><td>3/5/2026</td><td>CEO Committee Meeting</td></tr>
      </table>
    `
    const meetings = await scrapeGLWA(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].title).toContain('Committee Meeting')
  })
})

describe('scrapeDetroit', () => {
  it('extracts meetings from views-row markup', async () => {
    const html = `
      <div class="views-row views-row-1">
        <h4>Formal Session</h4>
        <span>March 18, 2026</span>
        <a href="/agenda/2026-03-18.pdf">Agenda</a>
      </div>
    `
    const meetings = await scrapeDetroit(mockFetch(html))
    expect(meetings).toHaveLength(1)
    expect(meetings[0].agency).toBe('Detroit City Council')
    expect(meetings[0].title).toBe('Formal Session')
  })

  it('falls back to agenda links', async () => {
    const html = `
      <a href="/agendas/march-session.pdf">March 18 Session Agenda</a>
    `
    const meetings = await scrapeDetroit(mockFetch(html))
    expect(meetings).toHaveLength(1)
  })
})

describe('fetchAgendaContent', () => {
  it('returns null for null URL', async () => {
    expect(await fetchAgendaContent(null)).toBeNull()
  })

  it('returns pdf marker for PDF URLs', async () => {
    const result = await fetchAgendaContent('https://example.com/agenda.pdf')
    expect(result).toEqual({ type: 'pdf', url: 'https://example.com/agenda.pdf', text: null })
  })

  it('extracts text from HTML agenda page', async () => {
    const html = `
      <html><body>
        <main>
          <h1>Meeting Agenda</h1>
          <p>1. Call to order</p>
          <p>2. Approval of minutes</p>
          <p>3. Public comment</p>
        </main>
      </body></html>
    `
    const result = await fetchAgendaContent('https://example.com/agenda', mockFetch(html))
    expect(result.type).toBe('html')
    expect(result.text).toContain('Call to order')
    expect(result.items).toHaveLength(3)
  })
})

describe('scrapeAll', () => {
  it('collects results from all scrapers and handles failures', async () => {
    // This fetch will fail for all scrapers since it returns non-meeting HTML
    const failFetch = mockFetch('', 500)
    const { meetings, errors } = await scrapeAll(failFetch)
    expect(meetings).toEqual([])
    expect(errors).toHaveLength(4)
  })

  it('returns combined meetings when all succeed', async () => {
    const html = `
      <div class="card-item"><div class="card-body"><h3>Test meeting</h3><p>March 1, 2026</p></div></div>
      <table><tr><td>3/1/2026</td><td>Commission Meeting</td></tr></table>
      <article class="meeting-entry"><h3>Board Meeting</h3></article>
      <div class="views-row"><h4>Council Session</h4></div>
    `
    const { meetings } = await scrapeAll(mockFetch(html))
    expect(meetings.length).toBeGreaterThan(0)
  })
})
