import DOMPurify from 'dompurify'
import { buildCalendarLinks } from './calendar.js'

// Escape HTML entities to prevent XSS in generated output
export function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Validate URL is safe (only http/https/mailto allowed)
export function safeUrl(url) {
  if (!url) return null
  try {
    if (url === '#') return '#'
    if (url.startsWith('mailto:')) return `mailto:${esc(url.slice(7).split('?')[0])}`
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return url
  } catch {
    return null
  }
}

// Build a slug for utm_content: lowercase, spaces -> underscores, truncate
export function utmSlug(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50)
}

// Append UTM params to a URL (skip mailto: and anchor-only links)
export function trackLink(url, contentLabel) {
  const safe = safeUrl(url)
  if (!safe || safe.startsWith('mailto:') || safe === '#') return safe
  const sep = safe.includes('?') ? '&' : '?'
  return `${safe}${sep}utm_source=planet_detroit&utm_medium=civic_action_box&utm_campaign=civic_action&utm_content=${utmSlug(contentLabel)}`
}

// Generate the civic action box HTML from the provided data
export function generateHTML({ meetings = [], commentPeriods = [], officials = [], actions = [], organizations = [], customNotes = '' } = {}) {
  let html = `<div class="civic-action-box" style="background: #f0f5f8; border: 1px solid #d0d8e0; border-radius: 8px; padding: 20px; font-family: -apple-system, sans-serif; max-width: 350px;">
  <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #2f80c3;">🗳️ Civic Action Toolbox</h3>\n`

  // Add custom notes at the top if present (sanitized)
  if (customNotes?.trim()) {
    html += `  <div style="margin-bottom: 16px; font-size: 14px; color: #333; line-height: 1.5;">
    ${DOMPurify.sanitize(customNotes.replace(/\n/g, '<br>'), { ALLOWED_TAGS: ['br', 'b', 'i', 'em', 'strong', 'a'], ALLOWED_ATTR: ['href'] })}
  </div>\n`
  }

  if (meetings.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Upcoming Meetings</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    meetings.forEach(meeting => {
      const date = new Date(meeting.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      const agency = meeting.agency ? ` (${meeting.agency})` : ''
      const link = meeting.agenda_url || meeting.details_url || meeting.virtual_url
      const cal = buildCalendarLinks(meeting)
      const trackedLink = link ? trackLink(link, `meeting_${meeting.agency || meeting.title}`) : null
      const trackedGoogle = trackLink(cal.google, 'calendar_google')
      const trackedOutlook = trackLink(cal.outlook, 'calendar_outlook')
      html += `      <li style="margin-bottom: 8px;"><strong>${esc(meeting.title)}</strong>${esc(agency)} — ${date}${trackedLink ? ` · <a href="${esc(trackedLink)}" style="color: #2f80c3;">Details</a>` : ''}<br><span style="font-size: 12px;">📅 <a href="${esc(trackedGoogle)}" style="color: #2f80c3;">Google</a> · <a href="${esc(trackedOutlook)}" style="color: #2f80c3;">Outlook</a></span></li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (commentPeriods.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Open Comment Periods</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    commentPeriods.forEach(period => {
      const deadline = period.end_date ? new Date(period.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
      const agency = period.agency ? ` (${period.agency})` : ''
      const daysLeft = period.days_remaining != null ? ` — ${period.days_remaining} days left` : ''
      html += `      <li style="margin-bottom: 8px;">`
      if (period.comment_url) {
        html += `<a href="${esc(trackLink(period.comment_url, `comment_${period.agency || period.title}`))}" style="color: #2f80c3; text-decoration: none; font-weight: 600;">${esc(period.title)}</a>`
      } else {
        html += `<strong>${esc(period.title)}</strong>`
      }
      html += `${esc(agency)}`
      if (deadline) {
        html += `<br><span style="color: #666; font-size: 12px;">Deadline: ${deadline}${daysLeft}</span>`
      }
      if (period.description) {
        html += `<br><span style="color: #666; font-size: 13px;">${esc(period.description.slice(0, 150))}</span>`
      }
      html += `</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (officials.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Contact Your Representatives</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    officials.forEach(official => {
      const contactParts = []
      if (official.email) contactParts.push(`<a href="${safeUrl(`mailto:${official.email}`)}" style="color: #2f80c3; font-size: 12px;">${esc(official.email)}</a>`)
      if (official.phone) contactParts.push(`<span style="color: #666; font-size: 12px;">${esc(official.phone)}</span>`)
      html += `      <li style="margin-bottom: 8px;"><strong>${esc(official.name)}</strong> (${esc(official.party)})<br><span style="color: #666; font-size: 12px;">${esc(official.office)}, ${esc(official.district)}</span><br>${contactParts.join(' · ')}</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (actions.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Civic Actions: What You Can Do</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    actions.forEach(action => {
      if (action.url && safeUrl(action.url)) {
        html += `      <li style="margin-bottom: 8px;"><a href="${esc(trackLink(action.url, `action_${action.title}`))}" style="color: #2f80c3; text-decoration: none; font-weight: 600;">${esc(action.title)}</a>`
      } else {
        html += `      <li style="margin-bottom: 8px;"><strong>${esc(action.title)}</strong>`
      }
      if (action.description) {
        html += `<br><span style="color: #666; font-size: 13px;">${esc(action.description)}</span>`
      }
      html += `</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (organizations.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Organizations to Follow</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    organizations.forEach(org => {
      html += `      <li style="margin-bottom: 4px;"><a href="${esc(trackLink(org.url || '#', `org_${org.name}`))}" style="color: #2f80c3; text-decoration: none;">${esc(org.name)}</a></li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  html += `  <p style="font-size: 13px; color: #333; margin: 16px 0 12px 0; font-style: italic;">
    If you take civic action please let us know — email us at <a href="mailto:connect@planetdetroit.org" style="color: #2f80c3;">connect@planetdetroit.org</a>.
  </p>
  <p style="font-size: 11px; color: #888; margin: 0; padding-top: 12px; border-top: 1px solid #d0d8e0;">
    Civic resources compiled by <a href="https://planetdetroit.org" style="color: #2f80c3;">Planet Detroit</a>
  </p>
</div>`

  return html
}
