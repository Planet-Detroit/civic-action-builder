/**
 * Meeting agenda scrapers for Michigan public bodies.
 *
 * Each scraper fetches upcoming meeting pages, extracts agenda items,
 * and returns structured data ready for summarization.
 */

/**
 * Strip HTML tags and collapse whitespace.
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}

/**
 * Parse an HTML table into rows of cell text.
 */
function parseTable(html) {
  const rows = []
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const cells = []
    const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      cells.push(stripHtml(cellMatch[1]))
    }
    if (cells.length > 0) rows.push(cells)
  }
  return rows
}

/**
 * Extract links from HTML content.
 */
function extractLinks(html) {
  const links = []
  const pattern = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = pattern.exec(html)) !== null) {
    links.push({ url: match[1], text: stripHtml(match[2]) })
  }
  return links
}

/**
 * Extract agenda items from a block of text.
 * Looks for numbered items, lettered items, or bullet-style lines.
 */
function extractAgendaItems(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  const itemPattern = /^(?:\d+[.)]\s*|[a-zA-Z][.)]\s*|[-•*]\s*|(?:Item|Section)\s+\d+[.:]\s*)/i

  for (const line of lines) {
    if (itemPattern.test(line) && line.length > 5) {
      items.push(line.replace(/^(?:\d+[.)]\s*|[a-zA-Z][.)]\s*|[-•*]\s*)/, '').trim())
    }
  }
  return items
}

/**
 * EGLE (Michigan Dept of Environment, Great Lakes, and Energy)
 * Scrapes the public notices / calendar page for meeting agendas.
 */
export async function scrapeEGLE(fetchFn = fetch) {
  const url = 'https://www.michigan.gov/egle/public-comment'
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`EGLE fetch failed: ${response.status}`)
  const html = await response.text()

  const meetings = []

  // EGLE lists meetings in card/list format with links to agenda PDFs
  const sectionPattern = /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
  let sectionMatch
  while ((sectionMatch = sectionPattern.exec(html)) !== null) {
    const block = sectionMatch[1]
    const titleMatch = block.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)
    const dateMatch = block.match(/(\w+ \d{1,2},?\s*\d{4})/i)
    const links = extractLinks(block)
    const agendaLink = links.find(l => /agenda/i.test(l.text) || /agenda/i.test(l.url))

    if (titleMatch) {
      meetings.push({
        agency: 'EGLE',
        title: stripHtml(titleMatch[1]),
        date: dateMatch ? dateMatch[1] : null,
        agendaUrl: agendaLink?.url || null,
        agendaItems: [],
        rawText: stripHtml(block),
        sourceUrl: url,
      })
    }
  }

  // Fallback: look for list items with meeting info
  if (meetings.length === 0) {
    const listPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let listMatch
    while ((listMatch = listPattern.exec(html)) !== null) {
      const text = stripHtml(listMatch[1])
      if (/meeting|hearing|comment/i.test(text) && text.length > 20) {
        const dateMatch = text.match(/(\w+ \d{1,2},?\s*\d{4})/i)
        const links = extractLinks(listMatch[1])
        meetings.push({
          agency: 'EGLE',
          title: text.substring(0, 120),
          date: dateMatch ? dateMatch[1] : null,
          agendaUrl: links[0]?.url || null,
          agendaItems: extractAgendaItems(text),
          rawText: text,
          sourceUrl: url,
        })
      }
    }
  }

  return meetings
}

/**
 * MPSC (Michigan Public Service Commission)
 * Scrapes the calendar/meetings page for upcoming hearings and agendas.
 */
export async function scrapeMPSC(fetchFn = fetch) {
  const url = 'https://www.michigan.gov/mpsc/commission/meetings'
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`MPSC fetch failed: ${response.status}`)
  const html = await response.text()

  const meetings = []

  // MPSC uses a table or structured list for meeting schedules
  const tableRows = parseTable(html)
  for (const row of tableRows) {
    const dateCell = row.find(c => /\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},?\s*\d{4}/i.test(c))
    const titleCell = row.find(c => /meeting|hearing|session|commission/i.test(c))
    if (dateCell || titleCell) {
      meetings.push({
        agency: 'MPSC',
        title: titleCell || row.join(' — '),
        date: dateCell || null,
        agendaUrl: null,
        agendaItems: [],
        rawText: row.join(' | '),
        sourceUrl: url,
      })
    }
  }

  // Also look for agenda links in the page
  const links = extractLinks(html)
  const agendaLinks = links.filter(l => /agenda/i.test(l.text))
  for (const link of agendaLinks) {
    const existing = meetings.find(m =>
      m.title && link.text && m.title.toLowerCase().includes(link.text.toLowerCase().substring(0, 20))
    )
    if (existing) {
      existing.agendaUrl = link.url
    } else {
      const dateMatch = link.text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},?\s*\d{4})/i)
      meetings.push({
        agency: 'MPSC',
        title: link.text,
        date: dateMatch ? dateMatch[1] : null,
        agendaUrl: link.url,
        agendaItems: [],
        rawText: link.text,
        sourceUrl: url,
      })
    }
  }

  return meetings
}

/**
 * GLWA (Great Lakes Water Authority)
 * Scrapes the board meetings / calendar page.
 */
export async function scrapeGLWA(fetchFn = fetch) {
  const url = 'https://www.glwater.org/board-meetings/'
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`GLWA fetch failed: ${response.status}`)
  const html = await response.text()

  const meetings = []

  // GLWA typically lists meetings with agenda PDF links
  const entryPattern = /<(?:article|div|li)[^>]*class="[^"]*(?:meeting|event|entry)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi
  let entryMatch
  while ((entryMatch = entryPattern.exec(html)) !== null) {
    const block = entryMatch[1]
    const titleMatch = block.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i)
    const dateMatch = block.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    const links = extractLinks(block)
    const agendaLink = links.find(l => /agenda/i.test(l.text) || /agenda/i.test(l.url))

    meetings.push({
      agency: 'GLWA',
      title: titleMatch ? stripHtml(titleMatch[1]) : 'GLWA Board Meeting',
      date: dateMatch ? dateMatch[1] : null,
      agendaUrl: agendaLink?.url || null,
      agendaItems: [],
      rawText: stripHtml(block),
      sourceUrl: url,
    })
  }

  // Fallback: table-based layout
  if (meetings.length === 0) {
    const tableRows = parseTable(html)
    for (const row of tableRows) {
      if (row.some(c => /board|committee|meeting/i.test(c))) {
        const dateCell = row.find(c => /\d{1,2}\/\d{1,2}|\w+ \d{1,2}/i.test(c))
        meetings.push({
          agency: 'GLWA',
          title: row.filter(c => !/^\d/.test(c)).join(' — ') || 'GLWA Meeting',
          date: dateCell || null,
          agendaUrl: null,
          agendaItems: [],
          rawText: row.join(' | '),
          sourceUrl: url,
        })
      }
    }
  }

  return meetings
}

/**
 * Detroit City Council
 * Scrapes the city council meeting calendar / agendas page.
 */
export async function scrapeDetroit(fetchFn = fetch) {
  const url = 'https://detroitmi.gov/government/city-council/city-council-sessions'
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`Detroit fetch failed: ${response.status}`)
  const html = await response.text()

  const meetings = []

  // Detroit uses Drupal — look for views-row entries
  const rowPattern = /<div[^>]*class="[^"]*views-row[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*views-row|$)/gi
  let rowMatch
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const block = rowMatch[1]
    const titleMatch = block.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i) ||
                       block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
    const dateMatch = block.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    const links = extractLinks(block)
    const agendaLink = links.find(l => /agenda/i.test(l.text) || /agenda/i.test(l.url))

    if (titleMatch) {
      meetings.push({
        agency: 'Detroit City Council',
        title: stripHtml(titleMatch[1]),
        date: dateMatch ? dateMatch[1] : null,
        agendaUrl: agendaLink?.url || null,
        agendaItems: [],
        rawText: stripHtml(block),
        sourceUrl: url,
      })
    }
  }

  // Fallback: any links with "agenda" in them
  if (meetings.length === 0) {
    const links = extractLinks(html)
    for (const link of links) {
      if (/agenda|session|meeting/i.test(link.text) && link.text.length > 5) {
        const dateMatch = link.text.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
        meetings.push({
          agency: 'Detroit City Council',
          title: link.text,
          date: dateMatch ? dateMatch[1] : null,
          agendaUrl: link.url,
          agendaItems: [],
          rawText: link.text,
          sourceUrl: url,
        })
      }
    }
  }

  return meetings
}

/**
 * Fetch an agenda page/document and extract text content.
 * Handles HTML pages; PDF support would need a separate library.
 */
export async function fetchAgendaContent(agendaUrl, fetchFn = fetch) {
  if (!agendaUrl) return null
  if (agendaUrl.toLowerCase().endsWith('.pdf')) {
    return { type: 'pdf', url: agendaUrl, text: null }
  }

  const response = await fetchFn(agendaUrl)
  if (!response.ok) return null
  const html = await response.text()

  // Try to extract the main content area
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                    html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

  const contentHtml = mainMatch ? mainMatch[1] : html
  // Replace block-level closing tags with newlines so agenda items stay separated
  const withBreaks = contentHtml.replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
  // Strip remaining tags but preserve newlines
  const text = withBreaks
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim()
  const items = extractAgendaItems(text)

  return { type: 'html', url: agendaUrl, text, items }
}

/**
 * Run all scrapers and return combined results.
 */
export async function scrapeAll(fetchFn = fetch) {
  const results = await Promise.allSettled([
    scrapeEGLE(fetchFn),
    scrapeMPSC(fetchFn),
    scrapeGLWA(fetchFn),
    scrapeDetroit(fetchFn),
  ])

  const meetings = []
  const errors = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      meetings.push(...result.value)
    } else {
      errors.push(result.reason.message)
    }
  }

  return { meetings, errors }
}

// Exported for testing
export { stripHtml, parseTable, extractLinks, extractAgendaItems }
