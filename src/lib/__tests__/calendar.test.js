import { describe, it, expect } from 'vitest'
import { buildCalendarLinks } from '../calendar.js'

describe('buildCalendarLinks', () => {
  const baseMeeting = {
    title: 'MPSC Public Hearing',
    start_datetime: '2025-03-15T10:00:00',
    agency: 'MPSC',
  }

  // Should return both google and outlook URLs
  it('returns google and outlook links', () => {
    const links = buildCalendarLinks(baseMeeting)
    expect(links).toHaveProperty('google')
    expect(links).toHaveProperty('outlook')
  })

  // Google URL should use calendar.google.com with TEMPLATE action
  it('builds valid Google Calendar URL', () => {
    const { google } = buildCalendarLinks(baseMeeting)
    expect(google).toContain('calendar.google.com/calendar/render')
    expect(google).toContain('action=TEMPLATE')
    expect(google).toContain(encodeURIComponent('MPSC Public Hearing'))
    expect(google).toContain('ctz=America/Detroit')
  })

  // Outlook URL should use outlook.live.com
  it('builds valid Outlook URL', () => {
    const { outlook } = buildCalendarLinks(baseMeeting)
    expect(outlook).toContain('outlook.live.com/calendar')
    expect(outlook).toContain(encodeURIComponent('MPSC Public Hearing'))
  })

  // Location should combine name, address, city
  it('includes location from name, address, city', () => {
    const meeting = {
      ...baseMeeting,
      location_name: 'MPSC Offices',
      location_address: '7109 W Saginaw',
      location_city: 'Lansing',
    }
    const { google } = buildCalendarLinks(meeting)
    expect(google).toContain(encodeURIComponent('MPSC Offices, 7109 W Saginaw, Lansing'))
  })

  // Should include virtual_url in details when present
  it('includes virtual_url in details', () => {
    const meeting = {
      ...baseMeeting,
      virtual_url: 'https://teams.microsoft.com/meeting123',
    }
    const { google } = buildCalendarLinks(meeting)
    expect(google).toContain(encodeURIComponent('Join online: https://teams.microsoft.com/meeting123'))
  })

  // Should handle meeting with no optional fields
  it('handles minimal meeting data', () => {
    const links = buildCalendarLinks({ title: 'Test', start_datetime: '2025-01-01T12:00:00' })
    expect(links.google).toContain('calendar.google.com')
    expect(links.outlook).toContain('outlook.live.com')
  })
})
