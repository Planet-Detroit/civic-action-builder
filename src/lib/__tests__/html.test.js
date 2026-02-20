import { describe, it, expect } from 'vitest'
import { esc, safeUrl, utmSlug, trackLink, generateHTML } from '../html.js'

describe('esc', () => {
  // Should escape all HTML-special characters to prevent XSS
  it('escapes HTML entities', () => {
    expect(esc('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('escapes ampersands', () => {
    expect(esc('A & B')).toBe('A &amp; B')
  })

  it('escapes single quotes', () => {
    expect(esc("it's")).toBe('it&#39;s')
  })

  // Should return empty string for null/undefined
  it('returns empty string for falsy input', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
    expect(esc('')).toBe('')
  })
})

describe('safeUrl', () => {
  // Only allow http, https, and mailto protocols
  it('allows http URLs', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com')
  })

  it('allows https URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com')
  })

  it('allows mailto links', () => {
    expect(safeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
  })

  it('allows hash anchor', () => {
    expect(safeUrl('#')).toBe('#')
  })

  // Block javascript: and data: protocols
  it('blocks javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
  })

  it('blocks data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(safeUrl(null)).toBeNull()
    expect(safeUrl(undefined)).toBeNull()
  })
})

describe('utmSlug', () => {
  // Should lowercase and replace non-alphanumeric with underscores
  it('creates a slug from text', () => {
    expect(utmSlug('MPSC Public Hearing')).toBe('mpsc_public_hearing')
  })

  // Should strip leading/trailing underscores
  it('strips edge underscores', () => {
    expect(utmSlug('  hello world  ')).toBe('hello_world')
  })

  // Should truncate to 50 characters
  it('truncates long slugs', () => {
    const long = 'a'.repeat(100)
    expect(utmSlug(long).length).toBe(50)
  })

  it('handles empty input', () => {
    expect(utmSlug('')).toBe('')
    expect(utmSlug(null)).toBe('')
  })
})

describe('trackLink', () => {
  // Should append UTM params to http/https URLs
  it('appends UTM params', () => {
    const result = trackLink('https://example.com/page', 'test_label')
    expect(result).toContain('utm_source=planet_detroit')
    expect(result).toContain('utm_medium=civic_action_box')
    expect(result).toContain('utm_campaign=civic_action')
    expect(result).toContain('utm_content=test_label')
  })

  // Should use & if URL already has query params
  it('uses & for URLs with existing query params', () => {
    const result = trackLink('https://example.com?foo=bar', 'test')
    expect(result).toContain('?foo=bar&utm_source')
  })

  // Should NOT add UTM params to mailto links
  it('skips mailto links', () => {
    const result = trackLink('mailto:test@example.com', 'test')
    expect(result).toContain('mailto:')
    expect(result).not.toContain('utm_source')
  })

  // Should NOT add UTM params to anchor-only links
  it('skips hash anchor', () => {
    expect(trackLink('#', 'test')).toBe('#')
  })
})

describe('generateHTML', () => {
  // Should produce valid HTML with civic-action-box wrapper
  it('generates wrapper div with default content', () => {
    const html = generateHTML()
    expect(html).toContain('civic-action-box')
    expect(html).toContain('Civic Action Toolbox')
    expect(html).toContain('Planet Detroit')
  })

  // Should include meetings section when meetings are provided
  it('includes meetings section', () => {
    const html = generateHTML({
      meetings: [{
        title: 'Test Meeting',
        start_datetime: '2025-03-15T10:00:00',
        agency: 'EGLE',
      }],
    })
    expect(html).toContain('Upcoming Meetings')
    expect(html).toContain('Test Meeting')
    expect(html).toContain('EGLE')
    // Should include calendar links
    expect(html).toContain('Google')
    expect(html).toContain('Outlook')
  })

  // Should include comment periods section
  it('includes comment periods', () => {
    const html = generateHTML({
      commentPeriods: [{
        title: 'PFAS Standards Comment',
        agency: 'EGLE',
        end_date: '2025-04-01',
        days_remaining: 15,
        comment_url: 'https://example.com/comment',
      }],
    })
    expect(html).toContain('Open Comment Periods')
    expect(html).toContain('PFAS Standards Comment')
    expect(html).toContain('15 days left')
  })

  // Should include elected officials with contact info
  it('includes officials', () => {
    const html = generateHTML({
      officials: [{
        name: 'Jane Doe',
        party: 'D',
        office: 'State Senate',
        district: 'District 1',
        email: 'jane@senate.gov',
        phone: '517-555-0100',
      }],
    })
    expect(html).toContain('Contact Your Representatives')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('jane@senate.gov')
    expect(html).toContain('517-555-0100')
  })

  // Should include civic actions with links
  it('includes actions with URL', () => {
    const html = generateHTML({
      actions: [{
        title: 'Submit Comments',
        description: 'Tell EGLE what you think',
        url: 'https://example.com/submit',
      }],
    })
    expect(html).toContain('What You Can Do')
    expect(html).toContain('Submit Comments')
    expect(html).toContain('Tell EGLE what you think')
  })

  // Should include organizations
  it('includes organizations', () => {
    const html = generateHTML({
      organizations: [{ name: 'Sierra Club', url: 'https://sierraclub.org' }],
    })
    expect(html).toContain('Organizations to Follow')
    expect(html).toContain('Sierra Club')
  })

  // Should include custom notes at the top
  it('includes custom notes', () => {
    const html = generateHTML({ customNotes: 'Important context here' })
    expect(html).toContain('Important context here')
  })

  // Should omit sections with empty arrays
  it('omits empty sections', () => {
    const html = generateHTML({ meetings: [], officials: [] })
    expect(html).not.toContain('Upcoming Meetings')
    expect(html).not.toContain('Contact Your Representatives')
  })

  // XSS: should escape meeting titles with HTML
  it('escapes XSS in meeting titles', () => {
    const html = generateHTML({
      meetings: [{
        title: '<img src=x onerror=alert(1)>',
        start_datetime: '2025-01-01T00:00:00',
      }],
    })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })

  // Should apply UTM tracking to organization URLs
  it('adds UTM params to org links', () => {
    const html = generateHTML({
      organizations: [{ name: 'Test Org', url: 'https://example.com' }],
    })
    expect(html).toContain('utm_source=planet_detroit')
  })
})
