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
// When interactiveCheckboxes is true, adds checkboxes + inline JS for GA4 tracking and email capture
export function generateHTML({ meetings = [], commentPeriods = [], officials = [], actions = [], organizations = [], whyItMatters = '', whosDeciding = '', whatToWatch = '', interactiveCheckboxes = true } = {}) {
  let html = `<div class="civic-action-box" style="background: #f0f5f8; border: 1px solid #d0d8e0; border-radius: 8px; padding: 20px; font-family: -apple-system, sans-serif; max-width: 350px;">
  <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #2f80c3;">🗳️ Civic Action Toolbox</h3>\n`

  // "Why it matters" — renders first, after the title
  if (whyItMatters?.trim()) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Why it matters</h4>
    <div style="font-size: 14px; color: #333; line-height: 1.5;">
      ${DOMPurify.sanitize(esc(whyItMatters).replace(/\n/g, '<br>'), { ALLOWED_TAGS: ['br'] })}
    </div>
  </div>\n`
  }

  // "Who's making public decisions" — renders after "Why it matters"
  if (whosDeciding?.trim()) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">${esc("Who's making public decisions")}</h4>
    <div style="font-size: 14px; color: #333; line-height: 1.5;">
      ${DOMPurify.sanitize(esc(whosDeciding).replace(/\n/g, '<br>'), { ALLOWED_TAGS: ['br'] })}
    </div>
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
      const checkbox = interactiveCheckboxes ? `<label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;"><input type="checkbox" class="civic-checkbox" data-action="attend_meeting" data-label="${esc(meeting.title)}" style="margin-top: 3px; cursor: pointer;"> <span>` : ''
      const checkboxEnd = interactiveCheckboxes ? `</span></label>` : ''
      html += `      <li style="margin-bottom: 8px; ${interactiveCheckboxes ? 'list-style: none;' : ''}">${checkbox}<strong>${esc(meeting.title)}</strong>${esc(agency)} — ${date}${trackedLink ? ` · <a href="${esc(trackedLink)}" style="color: #2f80c3;">Details</a>` : ''}<br><span style="font-size: 12px;">📅 <a href="${esc(trackedGoogle)}" style="color: #2f80c3;">Google</a> · <a href="${esc(trackedOutlook)}" style="color: #2f80c3;">Outlook</a></span>${checkboxEnd}</li>\n`
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
      const checkbox = interactiveCheckboxes ? `<label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;"><input type="checkbox" class="civic-checkbox" data-action="submit_comment" data-label="${esc(period.title)}" style="margin-top: 3px; cursor: pointer;"> <span>` : ''
      const checkboxEnd = interactiveCheckboxes ? `</span></label>` : ''
      html += `      <li style="margin-bottom: 8px; ${interactiveCheckboxes ? 'list-style: none;' : ''}">${checkbox}`
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
      html += `${checkboxEnd}</li>\n`
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
      const checkbox = interactiveCheckboxes ? `<label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;"><input type="checkbox" class="civic-checkbox" data-action="contact_official" data-label="${esc(official.name)}" style="margin-top: 3px; cursor: pointer;"> <span>` : ''
      const checkboxEnd = interactiveCheckboxes ? `</span></label>` : ''
      html += `      <li style="margin-bottom: 8px; ${interactiveCheckboxes ? 'list-style: none;' : ''}">${checkbox}<strong>${esc(official.name)}</strong> (${esc(official.party)})<br><span style="color: #666; font-size: 12px;">${esc(official.office)}, ${esc(official.district)}</span><br>${contactParts.join(' · ')}${checkboxEnd}</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (actions.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Civic Actions: What You Can Do</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    actions.forEach(action => {
      const actionSlug = utmSlug(action.title)
      const checkbox = interactiveCheckboxes ? `<label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;"><input type="checkbox" class="civic-checkbox" data-action="${esc(actionSlug)}" data-label="${esc(action.title)}" style="margin-top: 3px; cursor: pointer;"> <span>` : ''
      const checkboxEnd = interactiveCheckboxes ? `</span></label>` : ''
      html += `      <li style="margin-bottom: 8px; ${interactiveCheckboxes ? 'list-style: none;' : ''}">${checkbox}`
      if (action.url && safeUrl(action.url)) {
        html += `<a href="${esc(trackLink(action.url, `action_${action.title}`))}" style="color: #2f80c3; text-decoration: none; font-weight: 600;">${esc(action.title)}</a>`
      } else {
        html += `<strong>${esc(action.title)}</strong>`
      }
      if (action.description) {
        html += `<br><span style="color: #666; font-size: 13px;">${esc(action.description)}</span>`
      }
      html += `${checkboxEnd}</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  if (organizations.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Organizations to Follow</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
    organizations.forEach(org => {
      const checkbox = interactiveCheckboxes ? `<label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;"><input type="checkbox" class="civic-checkbox" data-action="explore_organization" data-label="${esc(org.name)}" style="margin-top: 3px; cursor: pointer;"> <span>` : ''
      const checkboxEnd = interactiveCheckboxes ? `</span></label>` : ''
      html += `      <li style="margin-bottom: 4px; ${interactiveCheckboxes ? 'list-style: none;' : ''}">${checkbox}<a href="${esc(trackLink(org.url || '#', `org_${org.name}`))}" style="color: #2f80c3; text-decoration: none;">${esc(org.name)}</a>${checkboxEnd}</li>\n`
    })
    html += `    </ul>
  </div>\n`
  }

  // "What to watch for next" — renders after organizations, before email CTA
  if (whatToWatch?.trim()) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">What to watch for next</h4>
    <p style="font-size: 14px; color: #333; line-height: 1.5;">${esc(whatToWatch)}</p>
  </div>\n`
  }

  html += `  <div id="civic-response-form" style="margin: 16px 0 12px 0; padding: 12px; background: #e8f0fe; border-radius: 6px;">
    <p style="font-size: 13px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Did you take action? Let us know.</p>
    <form id="civic-response-submit">
      <textarea id="civic-response-message" placeholder="I attended a meeting, contacted my rep, submitted a comment..." required style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 50px; margin-bottom: 6px;"></textarea>
      <div style="display: flex; gap: 8px;">
        <input type="email" id="civic-response-email" placeholder="Email (optional)" style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <button type="submit" style="padding: 6px 14px; background: #2f80c3; color: white; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: 600;">Submit</button>
      </div>
    </form>
    <p id="civic-response-thanks" style="display: none; font-size: 13px; color: #2f80c3; margin: 8px 0 0 0; font-weight: 600;">Thank you! Your response has been recorded.</p>
  </div>
  <p style="font-size: 11px; color: #888; margin: 0; padding-top: 12px; border-top: 1px solid #d0d8e0;">
    Civic resources compiled by <a href="https://planetdetroit.org" style="color: #2f80c3;">Planet Detroit</a>
  </p>
</div>`

  // Inline script for checkbox interaction (GA4 event tracking)
  if (interactiveCheckboxes) {
    html += `\n<script>
(function() {
  var box = document.querySelector('.civic-action-box');
  if (!box) return;
  var checks = box.querySelectorAll('.civic-checkbox');

  checks.forEach(function(cb) {
    cb.addEventListener('change', function() {
      var action = cb.getAttribute('data-action');
      var label = cb.getAttribute('data-label');
      if (typeof gtag !== 'undefined') {
        gtag('event', cb.checked ? 'civic_action_taken' : 'civic_action_untaken', {
          action_label: action,
          action_detail: label,
          article_url: window.location.href
        });
      }
    });
  });
})();
</script>`
  }

  // Inline script for reader response form submission
  html += `\n<script>
(function() {
  var form = document.getElementById('civic-response-submit');
  var thanks = document.getElementById('civic-response-thanks');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var msg = document.getElementById('civic-response-message').value.trim();
    var email = document.getElementById('civic-response-email').value.trim();
    if (!msg) return;
    var payload = {
      message: msg,
      article_url: window.location.href,
      article_title: document.title
    };
    if (email) payload.email = email;
    fetch('https://ask-planet-detroit-production.up.railway.app/api/civic-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function() {
      form.style.display = 'none';
      if (thanks) thanks.style.display = 'block';
    }).catch(function() {
      form.style.display = 'none';
      if (thanks) thanks.style.display = 'block';
    });
  });
})();
</script>`

  return html
}
