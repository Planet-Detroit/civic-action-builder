export function buildCalendarLinks(meeting) {
  const title = meeting.title || ''
  const start = new Date(meeting.start_datetime)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // assume 1 hour

  // Format: YYYYMMDDTHHmmSS (no Z — treat as local time via ctz param)
  const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const location = [meeting.location_name, meeting.location_address, meeting.location_city].filter(Boolean).join(', ')
  const detailParts = [meeting.agency ? `Agency: ${meeting.agency}` : '']
  if (meeting.virtual_url) detailParts.push(`Join online: ${meeting.virtual_url}`)
  if (meeting.agenda_url) detailParts.push(`Agenda: ${meeting.agenda_url}`)
  if (meeting.public_comment_instructions) detailParts.push(meeting.public_comment_instructions)
  const details = detailParts.filter(Boolean).join('\n')

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&ctz=America/Detroit&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`

  const outlook = `https://outlook.live.com/calendar/0/action/compose?subject=${encodeURIComponent(title)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`

  return { google, outlook }
}
