/**
 * AI-powered agenda summarizer using the Claude API.
 *
 * Takes raw meeting agenda text and produces plain-language summaries
 * tailored for civic engagement — what's being decided, why it matters
 * to residents, and how the public can participate.
 */

const SUMMARY_PROMPT = `You are a local journalist summarizing a government meeting agenda for engaged residents in Michigan. Your audience cares about environmental issues, utility rates, water quality, housing, and public health.

Given the meeting details and agenda text below, produce a JSON object with these fields:

- "headline": A 1-sentence plain-language summary of the most important topic (max 120 chars)
- "keyTopics": An array of 3-5 key agenda items, each as a short phrase (max 80 chars each)
- "publicImpact": 1-2 sentences explaining why this meeting matters to residents
- "publicComment": Whether public comment appears to be available (true/false/null if unknown)
- "actionItems": An array of 1-3 concrete things a resident could do (e.g., "Attend and speak during public comment", "Submit written comments by March 15")

Be specific. Reference actual topics from the agenda. If the agenda is vague or procedural, say so honestly. Do not fabricate details.

Respond with ONLY the JSON object, no markdown fences.`

/**
 * Summarize a meeting agenda using the Claude API.
 *
 * @param {object} meeting - Meeting object from the scraper
 * @param {string} meeting.agency - Agency name
 * @param {string} meeting.title - Meeting title
 * @param {string} meeting.date - Meeting date
 * @param {string} meeting.rawText - Raw agenda text
 * @param {string[]} meeting.agendaItems - Extracted agenda items
 * @param {object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.model - Model to use (default: claude-sonnet-4-6)
 * @param {function} options.fetchFn - Custom fetch function for testing
 * @returns {object} Summary object
 */
export async function summarizeAgenda(meeting, options = {}) {
  const {
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = 'claude-sonnet-4-6',
    fetchFn = fetch,
  } = options

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it as an environment variable or pass it in options.')
  }

  const agendaContent = buildAgendaContent(meeting)
  if (!agendaContent) {
    return {
      headline: `${meeting.agency} meeting scheduled`,
      keyTopics: [],
      publicImpact: 'Agenda details not yet available.',
      publicComment: null,
      actionItems: ['Check back closer to the meeting date for agenda details.'],
      raw: false,
    }
  }

  const response = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `${SUMMARY_PROMPT}\n\n---\n\nAgency: ${meeting.agency}\nMeeting: ${meeting.title}\nDate: ${meeting.date || 'TBD'}\n\nAgenda content:\n${agendaContent}`,
      }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Empty response from Claude API')

  try {
    const summary = JSON.parse(text)
    return { ...summary, raw: true }
  } catch {
    // If the model returned prose instead of JSON, wrap it
    return {
      headline: text.substring(0, 120),
      keyTopics: [],
      publicImpact: text,
      publicComment: null,
      actionItems: [],
      raw: true,
    }
  }
}

/**
 * Build a text block from meeting data for the summarizer prompt.
 */
function buildAgendaContent(meeting) {
  const parts = []

  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    parts.push('Agenda items:')
    for (const item of meeting.agendaItems) {
      parts.push(`- ${item}`)
    }
  }

  if (meeting.rawText && meeting.rawText.length > 30) {
    parts.push('\nFull text:')
    // Truncate to avoid blowing up the context
    parts.push(meeting.rawText.substring(0, 4000))
  }

  return parts.length > 0 ? parts.join('\n') : null
}

/**
 * Summarize multiple meetings in parallel with rate limiting.
 *
 * @param {object[]} meetings - Array of meeting objects
 * @param {object} options - Same as summarizeAgenda options
 * @param {number} options.concurrency - Max parallel requests (default: 3)
 * @returns {object[]} Array of { meeting, summary, error }
 */
export async function summarizeAll(meetings, options = {}) {
  const { concurrency = 3, ...summaryOptions } = options
  const results = []

  // Process in batches to respect rate limits
  for (let i = 0; i < meetings.length; i += concurrency) {
    const batch = meetings.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(meeting => summarizeAgenda(meeting, summaryOptions))
    )

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j]
      results.push({
        meeting: batch[j],
        summary: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null,
      })
    }
  }

  return results
}

export { buildAgendaContent, SUMMARY_PROMPT }
