import { describe, it, expect } from 'vitest'
import { esc, safeUrl, utmSlug, trackLink, generateHTML, generateScript } from '../html.js'

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

// =========================================================================
// New context sections: Why it matters, Who's deciding, What to watch
// =========================================================================

describe('generateHTML — new context sections', () => {
  // "Why it matters" should render at the top, after the title
  it('includes "Why it matters" section when provided', () => {
    const html = generateHTML({ whyItMatters: 'This affects drinking water for 4 million residents.' })
    expect(html).toContain('Why it matters')
    expect(html).toContain('This affects drinking water for 4 million residents.')
  })

  // "Who's making public decisions" should render after "Why it matters"
  it('includes "Who\'s making public decisions" section when provided', () => {
    const html = generateHTML({ whosDeciding: 'EGLE regulators are setting new PFAS limits.' })
    expect(html).toContain("Who&#39;s making public decisions")
    expect(html).toContain('EGLE regulators are setting new PFAS limits.')
  })

  // "What to watch for next" should render after organizations
  it('includes "What to watch for next" section when provided', () => {
    const html = generateHTML({ whatToWatch: 'Final rule expected in March 2026.' })
    expect(html).toContain('What to watch for next')
    expect(html).toContain('Final rule expected in March 2026.')
  })

  // Empty fields should be omitted from output (not rendered as empty sections)
  it('omits "Why it matters" when empty', () => {
    const html = generateHTML({ whyItMatters: '' })
    expect(html).not.toContain('Why it matters')
  })

  it('omits "Who\'s making public decisions" when empty', () => {
    const html = generateHTML({ whosDeciding: '' })
    expect(html).not.toContain("making public decisions")
  })

  it('omits "What to watch for next" when empty', () => {
    const html = generateHTML({ whatToWatch: '' })
    expect(html).not.toContain('What to watch for next')
  })

  // All sections omitted when fields are undefined
  it('omits all new sections when undefined', () => {
    const html = generateHTML({})
    expect(html).not.toContain('Why it matters')
    expect(html).not.toContain('making public decisions')
    expect(html).not.toContain('What to watch for next')
  })

  // Section ORDER: Why it matters → Who's deciding → meetings → comment periods → officials → actions → orgs → What to watch → email CTA → response form → footer
  it('renders sections in correct order', () => {
    const html = generateHTML({
      whyItMatters: 'WHY_MARKER',
      whosDeciding: 'WHOS_MARKER',
      meetings: [{ title: 'MEETING_MARKER', start_datetime: '2025-03-15T10:00:00' }],
      organizations: [{ name: 'ORG_MARKER', url: 'https://example.com' }],
      whatToWatch: 'WATCH_MARKER',
    })
    const whyPos = html.indexOf('WHY_MARKER')
    const whosPos = html.indexOf('WHOS_MARKER')
    const meetingPos = html.indexOf('MEETING_MARKER')
    const orgPos = html.indexOf('ORG_MARKER')
    const watchPos = html.indexOf('WATCH_MARKER')

    expect(whyPos).toBeLessThan(whosPos)
    expect(whosPos).toBeLessThan(meetingPos)
    expect(meetingPos).toBeLessThan(orgPos)
    expect(orgPos).toBeLessThan(watchPos)
  })

  // XSS: should escape HTML in new text fields
  it('escapes XSS in whyItMatters', () => {
    const html = generateHTML({ whyItMatters: '<script>alert("xss")</script>' })
    expect(html).not.toContain('<script>alert')
  })

  // Multi-line text should render with line breaks
  it('renders line breaks in whyItMatters', () => {
    const html = generateHTML({ whyItMatters: 'Line one\nLine two' })
    expect(html).toContain('Line one')
    expect(html).toContain('Line two')
  })
})

// =========================================================================
// Reader response form in HTML output
// =========================================================================

describe('generateHTML — reader response form', () => {
  // Response form should always be included (it's part of the civic action box)
  it('includes the response form at the bottom', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test', start_datetime: '2025-03-15T10:00:00' }],
    })
    expect(html).toContain('civic-response-form')
    expect(html).toContain('Did you take action? Let us know.')
  })

  // Response form should have a textarea for the message
  it('has a message textarea', () => {
    const html = generateHTML({
      organizations: [{ name: 'Test', url: 'https://test.com' }],
    })
    expect(html).toContain('civic-response-message')
  })

  // Response form should have an optional email input
  it('has an optional email input', () => {
    const html = generateHTML({
      organizations: [{ name: 'Test', url: 'https://test.com' }],
    })
    expect(html).toContain('civic-response-email')
  })

  // Response form should have a submit button
  it('has a submit button', () => {
    const html = generateHTML({
      organizations: [{ name: 'Test', url: 'https://test.com' }],
    })
    expect(html).toContain('type="submit"')
  })

  // Response form should render AFTER the main content sections
  it('renders response form after content sections', () => {
    const html = generateHTML({
      organizations: [{ name: 'Test', url: 'https://test.com' }],
    })
    const orgPos = html.indexOf('Test')
    const formPos = html.indexOf('civic-response-form')
    expect(orgPos).toBeLessThan(formPos)
  })

  // Response form shows thank-you after submission
  it('includes a thank-you confirmation element', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test', start_datetime: '2025-03-15T10:00:00' }],
    })
    expect(html).toContain('civic-response-thanks')
  })
})

describe('generateHTML with interactiveCheckboxes', () => {
  const sampleData = {
    meetings: [{ title: 'Test Meeting', start_datetime: '2025-03-15T10:00:00', agency: 'EGLE' }],
    actions: [{ title: 'Submit Comment', description: 'Tell EGLE', url: 'https://example.com' }],
    officials: [{ name: 'Jane Doe', party: 'D', office: 'Senate', district: 'District 1', email: 'j@gov.gov' }],
    commentPeriods: [{ title: 'Water Rules', agency: 'EGLE', comment_url: 'https://example.com/comment' }],
  }

  // Default = checkboxes ON (interactiveCheckboxes defaults to true)
  it('includes checkboxes by default', () => {
    const html = generateHTML(sampleData)
    expect(html).toContain('civic-checkbox')
    expect(html).toContain('type="checkbox"')
  })

  // Explicit false = no checkboxes
  it('has no checkboxes when interactiveCheckboxes is false', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: false })
    expect(html).not.toContain('civic-checkbox')
  })

  // Checkboxes present when flag is true
  it('adds checkboxes when interactiveCheckboxes is true', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('civic-checkbox')
  })

  // Each action type gets appropriate data-action attribute
  it('uses attend_meeting data-action for meetings', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).toContain('data-action="attend_meeting"')
  })

  it('uses submit_comment data-action for comment periods', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).toContain('data-action="submit_comment"')
  })

  it('uses contact_official data-action for officials', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).toContain('data-action="contact_official"')
  })

  it('uses action slug for civic actions data-action', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).toContain('data-action="submit_comment"')
  })

  // HTML should NOT contain inline scripts (WordPress strips them)
  it('does not include inline scripts in HTML output', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: true })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</script>')
  })

  // Checkbox GA4 script excluded when flag is false
  it('excludes checkbox tracking from HTML when interactiveCheckboxes is false', () => {
    const html = generateHTML({ ...sampleData, interactiveCheckboxes: false })
    expect(html).not.toContain('civic-checkbox')
    // Response form HTML elements should still be present
    expect(html).toContain('civic-response-submit')
  })

  // Organizations should get checkboxes with explore_organization action
  it('adds checkboxes to organizations when interactiveCheckboxes is true', () => {
    const html = generateHTML({
      organizations: [{ name: 'Sierra Club', url: 'https://sierraclub.org' }],
      interactiveCheckboxes: true,
    })
    expect(html).toContain('data-action="explore_organization"')
    expect(html).toContain('data-label="Sierra Club"')
    expect(html).toContain('civic-checkbox')
  })

  // Organizations should NOT have checkboxes when flag is false
  it('no checkboxes on organizations when interactiveCheckboxes is false', () => {
    const html = generateHTML({
      organizations: [{ name: 'Sierra Club', url: 'https://sierraclub.org' }],
      interactiveCheckboxes: false,
    })
    expect(html).not.toContain('data-action="explore_organization"')
    expect(html).not.toContain('civic-checkbox')
  })

  // When checkboxes are ON, <ul> should have list-style: none and no left padding
  // so there's no double marker (bullet + checkbox)
  it('removes bullet markers from <ul> when checkboxes are on', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test Meeting', start_datetime: '2025-03-15T10:00:00', agency: 'EGLE' }],
      interactiveCheckboxes: true,
    })
    // The <ul> should suppress bullet markers
    expect(html).toMatch(/<ul[^>]*list-style:\s*none/)
    // The <ul> should have no left padding (checkbox replaces bullet indent)
    expect(html).toMatch(/<ul[^>]*padding-left:\s*0/)
  })

  // When checkboxes are OFF, <ul> should keep default bullet styling
  it('keeps bullet markers on <ul> when checkboxes are off', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test Meeting', start_datetime: '2025-03-15T10:00:00', agency: 'EGLE' }],
      interactiveCheckboxes: false,
    })
    // The <ul> should have padding for bullets
    expect(html).toMatch(/<ul[^>]*padding-left:\s*20px/)
  })
})

describe('generateHTML — consolidated reader form', () => {
  // The consolidated form should always render with the updated heading
  it('shows "Did you take action?" heading', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test', start_datetime: '2025-03-15T10:00:00' }],
    })
    expect(html).toContain('Did you take action? Let us know.')
  })

  // There should be no separate email capture form
  it('does not include separate email capture form', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test', start_datetime: '2025-03-15T10:00:00' }],
    })
    expect(html).not.toContain('civic-email-section')
    expect(html).not.toContain('civic-email-form')
    expect(html).not.toContain('civic-email-input')
  })

  // Consolidated form should be present regardless of interactiveCheckboxes
  it('includes response form when interactiveCheckboxes is false', () => {
    const html = generateHTML({
      meetings: [{ title: 'Test', start_datetime: '2025-03-15T10:00:00' }],
      interactiveCheckboxes: false,
    })
    expect(html).toContain('civic-response-form')
    expect(html).toContain('civic-response-message')
    expect(html).toContain('civic-response-email')
  })
})

// =========================================================================
// generateScript — JavaScript generated separately from HTML
// =========================================================================

describe('generateScript', () => {
  // Script should include GA4 tracking when interactiveCheckboxes is true
  it('includes GA4 event tracking when interactiveCheckboxes is true', () => {
    const script = generateScript({ interactiveCheckboxes: true })
    expect(script).toContain("gtag('event'")
    expect(script).toContain('civic_action_taken')
    expect(script).toContain('civic_action_untaken')
  })

  // Script should NOT include GA4 tracking when interactiveCheckboxes is false
  it('excludes GA4 tracking when interactiveCheckboxes is false', () => {
    const script = generateScript({ interactiveCheckboxes: false })
    expect(script).not.toContain('civic_action_taken')
    expect(script).not.toContain('gtag')
  })

  // Script should always include response form submission handler
  it('always includes response form submission', () => {
    const script = generateScript({ interactiveCheckboxes: false })
    expect(script).toContain('civic-response-submit')
    expect(script).toContain('/api/civic-responses')
  })

  // Script should post to the correct API endpoint
  it('posts to civic-responses API endpoint', () => {
    const script = generateScript()
    expect(script).toContain('ask-planet-detroit-production.up.railway.app/api/civic-responses')
  })
})
