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

// Generate the JavaScript needed for civic action box interactivity.
// This script should be added to WordPress ONCE (via theme or code snippets plugin),
// NOT pasted into individual posts — WordPress strips <script> tags from post content.
export function generateScript({ interactiveCheckboxes = true, includeQuestionForm = false } = {}) {
  let innerScript = ''

  // GA4 checkbox tracking (only when interactive checkboxes are enabled)
  if (interactiveCheckboxes) {
    innerScript += `    var box = document.querySelector('.civic-action-box');
    if (box) {
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
    }\n\n`
  }

  // Thumbs-up quick action toggle + GA4 event
  innerScript += `    var thumbBtn = document.getElementById('civic-thumbsup-btn');
    var thumbIcon = document.getElementById('civic-thumbsup-icon');
    if (thumbBtn) {
      var thumbActive = false;
      thumbBtn.addEventListener('click', function() {
        thumbActive = !thumbActive;
        if (thumbActive) {
          thumbBtn.style.background = '#ea5a39';
          thumbBtn.style.color = '#fff';
          thumbBtn.style.borderColor = '#ea5a39';
          thumbIcon.style.transform = 'scale(1.2)';
        } else {
          thumbBtn.style.background = 'none';
          thumbBtn.style.color = '#333';
          thumbBtn.style.borderColor = '#ea5a39';
          thumbIcon.style.transform = 'scale(1)';
        }
        if (typeof gtag !== 'undefined') {
          gtag('event', thumbActive ? 'civic_action_thumbsup' : 'civic_action_thumbsup_removed', {
            article_url: window.location.href
          });
        }
      });
    }\n\n`

  // Reader response form submission — uses createElement to avoid long innerHTML
  // strings that break when copy-pasted into WPCode
  innerScript += `    var form = document.getElementById('civic-response-submit');
    var wrapper = document.getElementById('civic-response-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var msg = document.getElementById('civic-response-message').value.trim();
        var email = document.getElementById('civic-response-email').value.trim();
        var hp = document.getElementById('civic-response-website').value;
        if (!msg) return;
        var payload = {
          message: msg,
          article_url: window.location.href,
          article_title: document.title
        };
        if (email) payload.email = email;
        if (hp) payload.website = hp;
        function showThanks() {
          if (wrapper) {
            wrapper.innerHTML = '';
            var p = document.createElement('p');
            p.style.fontSize = '13px';
            p.style.color = '#2f80c3';
            p.style.margin = '0';
            p.style.fontWeight = '600';
            p.textContent = 'Thank you! Your response has been recorded.';
            wrapper.appendChild(p);
          }
        }
        fetch('https://ask-planet-detroit-production.up.railway.app/api/civic-responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(showThanks).catch(showThanks);
      });
    }`

  // Reader question form submission (only when includeQuestionForm is enabled)
  if (includeQuestionForm) {
    innerScript += `\n\n    var qForm = document.getElementById('ask-question-submit');
    var qWrapper = document.getElementById('ask-question-form');
    if (qForm) {
      qForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var question = document.getElementById('ask-question-text').value.trim();
        var hp = document.getElementById('ask-question-website').value;
        if (!question) return;
        var payload = {
          question: question,
          article_url: window.location.href,
          article_title: document.title
        };
        var nameEl = document.getElementById('ask-question-name');
        var emailEl = document.getElementById('ask-question-email');
        var zipEl = document.getElementById('ask-question-zip');
        if (nameEl && nameEl.value.trim()) payload.name = nameEl.value.trim();
        if (emailEl && emailEl.value.trim()) payload.email = emailEl.value.trim();
        if (zipEl && zipEl.value.trim()) payload.zip_code = zipEl.value.trim();
        if (hp) payload.website = hp;
        var btn = qForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        fetch('https://ask-planet-detroit-production.up.railway.app/api/reader-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (qWrapper) {
            var html = '<p style="font-size: 14px; color: #2f80c3; font-weight: 600; margin: 0 0 12px 0;">Thank you! A reporter will review your question.</p>';
            if (data.related_articles && data.related_articles.length > 0) {
              html += '<p style="font-size: 13px; font-weight: 600; color: #333; margin: 0 0 6px 0;">Related coverage:</p><ul style="margin: 0; padding-left: 16px; font-size: 13px;">';
              data.related_articles.forEach(function(a) {
                html += '<li style="margin-bottom: 4px;"><a href="' + a.article_url + '" style="color: #2f80c3;">' + a.article_title + '</a></li>';
              });
              html += '</ul>';
            }
            qWrapper.innerHTML = html;
          }
        }).catch(function() {
          if (qWrapper) {
            qWrapper.innerHTML = '<p style="font-size: 14px; color: #2f80c3; font-weight: 600; margin: 0;">Thank you! A reporter will review your question.</p>';
          }
        });
      });
    }`
  }

  // Wrap in IIFE with readyState check so it works whether placed in header or footer.
  // If DOM is still loading, wait for DOMContentLoaded; otherwise run immediately.
  let script = `(function() {
  var thanksMsg = 'Thank you! Your response has been recorded.';

  function civicActionInit() {
${innerScript}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', civicActionInit);
  } else {
    civicActionInit();
  }
})();`

  return script
}

// Sanitize rich text context fields: allow basic formatting (bold, italic, links, line breaks)
// but strip scripts, event handlers, and other dangerous HTML
const CONTEXT_ALLOWED_TAGS = ['strong', 'em', 'b', 'i', 'a', 'br', 'p']
const CONTEXT_ALLOWED_ATTR = ['href', 'target', 'rel']

function sanitizeContext(html) {
  if (!html) return ''
  // If the content looks like plain text (no HTML tags), escape and add line breaks
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return esc(html).replace(/\n/g, '<br>')
  }
  // Rich text: sanitize allowing only safe formatting tags
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: CONTEXT_ALLOWED_TAGS,
    ALLOWED_ATTR: CONTEXT_ALLOWED_ATTR,
  })
}

// Generate the civic action box HTML from the provided data
// When interactiveCheckboxes is true, adds checkboxes for readers to mark actions taken
// NOTE: JavaScript is generated separately via generateScript() — do NOT paste <script> into WordPress posts
export function generateHTML({ meetings = [], commentPeriods = [], officials = [], actions = [], organizations = [], whyItMatters = '', whosDeciding = '', whatToWatch = '', interactiveCheckboxes = true, includeQuestionForm = false } = {}) {
  let html = `<div class="civic-action-box" style="background: #f0f5f8; border: 3px solid #ea5a39; border-radius: 8px; padding: 20px; font-family: -apple-system, sans-serif; max-width: 350px;">
  <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #ea5a39;">🗳️ Civic Action Toolbox</h3>\n`

  // "Why it matters" — renders first, after the title
  if (whyItMatters?.trim()) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Why it matters</h4>
    <div style="font-size: 14px; color: #333; line-height: 1.5;">
      ${sanitizeContext(whyItMatters)}
    </div>
  </div>\n`
  }

  // "Who's making public decisions" — renders after "Why it matters"
  if (whosDeciding?.trim()) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">${esc("Who's making public decisions")}</h4>
    <div style="font-size: 14px; color: #333; line-height: 1.5;">
      ${sanitizeContext(whosDeciding)}
    </div>
  </div>\n`
  }

  // When checkboxes are on, suppress bullet markers and remove left padding
  // so there's no "double marker" (bullet + checkbox)
  const ulStyle = interactiveCheckboxes
    ? 'margin: 0; padding-left: 0; list-style: none; font-size: 14px;'
    : 'margin: 0; padding-left: 20px; font-size: 14px;'

  if (meetings.length > 0) {
    html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Upcoming Meetings</h4>
    <ul style="${ulStyle}">\n`
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
    <ul style="${ulStyle}">\n`
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
    <ul style="${ulStyle}">\n`
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
    <ul style="${ulStyle}">\n`
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
    <ul style="${ulStyle}">\n`
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
    <div style="font-size: 14px; color: #333; line-height: 1.5;">${sanitizeContext(whatToWatch)}</div>
  </div>\n`
  }

  // "Ask Planet Detroit" reader question form (optional)
  if (includeQuestionForm) {
    html += `  <div id="ask-question-form" style="margin: 16px 0 12px 0; padding: 12px; background: #fff8e8; border: 1px solid #f0dca0; border-radius: 6px;">
    <p style="font-size: 14px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Got a question about this?</p>
    <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">Ask our reporters. We'll only use your info to follow up on your question.</p>
    <form id="ask-question-submit">
      <textarea id="ask-question-text" placeholder="What would you like to know?" required maxlength="2000" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 60px; margin-bottom: 6px;"></textarea>
      <input type="text" name="website" id="ask-question-website" style="position: absolute; left: -9999px; opacity: 0; height: 0;" tabindex="-1" autocomplete="off">
      <div style="display: flex; gap: 6px; margin-bottom: 6px;">
        <input type="text" id="ask-question-name" placeholder="Name (optional)" style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <input type="text" id="ask-question-zip" placeholder="Zip (optional)" style="width: 80px; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="email" id="ask-question-email" placeholder="Email (optional)" style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <button type="submit" style="padding: 6px 14px; background: #ea5a39; color: white; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: 600;">Ask</button>
      </div>
    </form>
  </div>\n`
  }

  html += `  <div id="civic-thumbsup" style="margin: 16px 0 8px 0; text-align: center;">
    <button id="civic-thumbsup-btn" style="background: none; border: 2px solid #ea5a39; border-radius: 24px; padding: 8px 18px; cursor: pointer; font-size: 16px; color: #333; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;" aria-label="I took civic action">
      <span id="civic-thumbsup-icon" style="font-size: 22px;">👍</span>
      <span style="font-size: 13px; font-weight: 600;">I took civic action!</span>
    </button>
  </div>
  <div id="civic-response-form" style="margin: 8px 0 12px 0; padding: 12px; background: #e8f0fe; border-radius: 6px;">
    <p style="font-size: 13px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Did you take action? Let us know.</p>
    <form id="civic-response-submit">
      <textarea id="civic-response-message" placeholder="I attended a meeting, contacted my rep, submitted a comment..." required style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 50px; margin-bottom: 6px;"></textarea>
      <input type="text" name="website" id="civic-response-website" style="position: absolute; left: -9999px; opacity: 0; height: 0;" tabindex="-1" autocomplete="off">
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

  return html
}
