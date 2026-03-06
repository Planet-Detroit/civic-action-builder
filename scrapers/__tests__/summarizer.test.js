import { describe, it, expect } from 'vitest'
import { summarizeAgenda, summarizeAll, buildAgendaContent, SUMMARY_PROMPT } from '../summarizer.js'

// Mock Claude API response
function mockClaudeFetch(responseText, status = 200) {
  return async (url, options) => {
    // Verify request structure
    if (url === 'https://api.anthropic.com/v1/messages') {
      const body = JSON.parse(options.body)
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify({ error: 'test error' }),
        json: async () => ({
          content: [{ text: responseText }],
        }),
      }
    }
    return { ok: false, status: 404, text: async () => 'not found' }
  }
}

const sampleMeeting = {
  agency: 'EGLE',
  title: 'Air Quality Permit Hearing',
  date: 'March 15, 2026',
  agendaUrl: 'https://michigan.gov/egle/agenda.pdf',
  agendaItems: [
    'Review of Marathon Petroleum air permit application',
    'Public comment period on proposed emission limits',
    'Discussion of environmental justice screening results',
  ],
  rawText: 'The Department will hold a public hearing on the air quality permit application from Marathon Petroleum for their Detroit refinery. The proposed permit includes limits on sulfur dioxide and particulate matter emissions.',
  sourceUrl: 'https://michigan.gov/egle/public-comment',
}

const sampleSummaryJson = JSON.stringify({
  headline: 'EGLE hearing on Marathon Petroleum Detroit refinery air permit',
  keyTopics: [
    'Marathon Petroleum air permit application',
    'Sulfur dioxide emission limits',
    'Environmental justice screening',
  ],
  publicImpact: 'This hearing determines pollution limits for a major Detroit refinery, directly affecting air quality for nearby residents.',
  publicComment: true,
  actionItems: [
    'Attend the hearing on March 15 and speak during public comment',
    'Submit written comments to EGLE before the hearing deadline',
  ],
})

describe('buildAgendaContent', () => {
  it('includes agenda items and raw text', () => {
    const content = buildAgendaContent(sampleMeeting)
    expect(content).toContain('Marathon Petroleum air permit')
    expect(content).toContain('Agenda items:')
    expect(content).toContain('Full text:')
  })

  it('returns null for meetings with no content', () => {
    const empty = { agency: 'Test', title: 'Test', rawText: '', agendaItems: [] }
    expect(buildAgendaContent(empty)).toBeNull()
  })

  it('truncates very long text', () => {
    const long = { ...sampleMeeting, rawText: 'x'.repeat(5000) }
    const content = buildAgendaContent(long)
    expect(content.length).toBeLessThan(5000)
  })
})

describe('summarizeAgenda', () => {
  it('returns parsed summary from Claude API', async () => {
    const summary = await summarizeAgenda(sampleMeeting, {
      apiKey: 'test-key',
      fetchFn: mockClaudeFetch(sampleSummaryJson),
    })

    expect(summary.headline).toContain('Marathon Petroleum')
    expect(summary.keyTopics).toHaveLength(3)
    expect(summary.publicComment).toBe(true)
    expect(summary.actionItems).toHaveLength(2)
    expect(summary.raw).toBe(true)
  })

  it('returns fallback for meetings with no agenda content', async () => {
    const empty = { agency: 'MPSC', title: 'Test', rawText: '', agendaItems: [] }
    const summary = await summarizeAgenda(empty, { apiKey: 'test-key' })

    expect(summary.headline).toContain('MPSC meeting')
    expect(summary.raw).toBe(false)
  })

  it('throws without API key', async () => {
    const original = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    await expect(summarizeAgenda(sampleMeeting, {})).rejects.toThrow('ANTHROPIC_API_KEY')
    if (original) process.env.ANTHROPIC_API_KEY = original
  })

  it('handles non-JSON Claude response gracefully', async () => {
    const summary = await summarizeAgenda(sampleMeeting, {
      apiKey: 'test-key',
      fetchFn: mockClaudeFetch('This is a plain text summary of the meeting.'),
    })

    expect(summary.headline).toBe('This is a plain text summary of the meeting.')
    expect(summary.raw).toBe(true)
  })

  it('sends correct headers to Claude API', async () => {
    let capturedHeaders
    const captureFetch = async (url, options) => {
      capturedHeaders = options.headers
      return {
        ok: true,
        json: async () => ({ content: [{ text: sampleSummaryJson }] }),
      }
    }

    await summarizeAgenda(sampleMeeting, { apiKey: 'sk-test-123', fetchFn: captureFetch })

    expect(capturedHeaders['x-api-key']).toBe('sk-test-123')
    expect(capturedHeaders['anthropic-version']).toBe('2023-06-01')
    expect(capturedHeaders['Content-Type']).toBe('application/json')
  })

  it('handles API errors', async () => {
    const errorFetch = async () => ({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    })
    await expect(
      summarizeAgenda(sampleMeeting, { apiKey: 'test', fetchFn: errorFetch })
    ).rejects.toThrow('Claude API error (429)')
  })
})

describe('summarizeAll', () => {
  it('processes multiple meetings with concurrency control', async () => {
    const meetings = [
      { ...sampleMeeting, title: 'Meeting 1' },
      { ...sampleMeeting, title: 'Meeting 2' },
      { ...sampleMeeting, title: 'Meeting 3' },
    ]

    const results = await summarizeAll(meetings, {
      apiKey: 'test-key',
      concurrency: 2,
      fetchFn: mockClaudeFetch(sampleSummaryJson),
    })

    expect(results).toHaveLength(3)
    expect(results.every(r => r.summary !== null)).toBe(true)
    expect(results.every(r => r.error === null)).toBe(true)
  })

  it('captures errors per meeting without failing the batch', async () => {
    let callCount = 0
    const flakeyFetch = async () => {
      callCount++
      if (callCount === 2) {
        return { ok: false, status: 500, text: async () => 'server error' }
      }
      return {
        ok: true,
        json: async () => ({ content: [{ text: sampleSummaryJson }] }),
      }
    }

    const meetings = [
      { ...sampleMeeting, title: 'Meeting 1' },
      { ...sampleMeeting, title: 'Meeting 2' },
    ]

    const results = await summarizeAll(meetings, {
      apiKey: 'test-key',
      concurrency: 1,
      fetchFn: flakeyFetch,
    })

    expect(results).toHaveLength(2)
    expect(results[0].summary).not.toBeNull()
    expect(results[1].error).toContain('Claude API error')
  })
})

describe('SUMMARY_PROMPT', () => {
  it('instructs for JSON output', () => {
    expect(SUMMARY_PROMPT).toContain('JSON')
  })

  it('mentions Michigan context', () => {
    expect(SUMMARY_PROMPT).toContain('Michigan')
  })

  it('asks about public comment', () => {
    expect(SUMMARY_PROMPT).toContain('publicComment')
  })
})
