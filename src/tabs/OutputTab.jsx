import { useState } from 'react'
import { generateHTML } from '../lib/html.js'
import { buildCalendarLinks } from '../lib/calendar.js'

export default function OutputTab({ organizations, meetings, commentPeriods, officials, actions, customNotes }) {
  const [copied, setCopied] = useState(false)
  const [interactiveCheckboxes, setInteractiveCheckboxes] = useState(false)

  const html = generateHTML({ meetings, commentPeriods, officials, actions, organizations, customNotes, interactiveCheckboxes })

  const handleCopy = () => {
    navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isEmpty = organizations.length === 0 && meetings.length === 0 && commentPeriods.length === 0 && officials.length === 0 && actions.length === 0 && !customNotes?.trim()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="font-heading font-bold text-lg text-pd-text mb-4">👁️ Preview</h2>

        {isEmpty ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-pd-text-light">Add items in the Builder tab to see preview</p>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="bg-[#f0f5f8] border border-[#d0d8e0] rounded-lg p-5 max-w-sm shadow-sm">
              <h3 className="font-heading font-bold text-lg text-pd-text mb-3 pb-2 border-b-2 border-pd-blue">
                🗳️ Civic Action Toolbox
              </h3>

              {/* Custom notes at the top */}
              {customNotes?.trim() && (
                <div className="mb-4 text-sm text-pd-text leading-relaxed">
                  {customNotes.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                  ))}
                </div>
              )}

              {meetings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-heading font-semibold text-sm text-pd-text mb-2">Upcoming Meetings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {meetings.map((meeting, i) => {
                      const cal = buildCalendarLinks(meeting)
                      return (
                        <li key={i} className="text-sm">
                          <strong>{meeting.title}</strong>
                          <span className="text-pd-text-light"> — {new Date(meeting.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          {meeting.agency && <span className="text-pd-text-light"> ({meeting.agency})</span>}
                          {(meeting.agenda_url || meeting.details_url || meeting.virtual_url) && (
                            <a href={meeting.agenda_url || meeting.details_url || meeting.virtual_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 text-xs">Details</a>
                          )}
                          <br />
                          <span className="text-xs text-pd-text-light">
                            <a href={cal.google} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cal</a>
                            {' · '}
                            <a href={cal.outlook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Outlook</a>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {commentPeriods.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-heading font-semibold text-sm text-pd-text mb-2">Open Comment Periods</h4>
                  <ul className="list-disc list-inside space-y-2">
                    {commentPeriods.map((period, i) => (
                      <li key={i} className="text-sm">
                        {period.comment_url ? (
                          <a href={period.comment_url} target="_blank" rel="noopener noreferrer" className="text-pd-blue hover:underline font-semibold">{period.title}</a>
                        ) : (
                          <strong>{period.title}</strong>
                        )}
                        {period.agency && <span className="text-pd-text-light"> ({period.agency})</span>}
                        {period.end_date && (
                          <>
                            <br />
                            <span className="text-xs text-pd-text-light">
                              Deadline: {new Date(period.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {period.days_remaining != null && (
                                <span className={period.days_remaining <= 7 ? 'text-red-600 font-semibold ml-1' : 'ml-1'}>
                                  — {period.days_remaining} days left
                                </span>
                              )}
                            </span>
                          </>
                        )}
                        {period.description && (
                          <p className="text-xs text-pd-text-light mt-0.5">{period.description.slice(0, 150)}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {officials.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-heading font-semibold text-sm text-pd-text mb-2">Contact Your Representatives</h4>
                  <ul className="space-y-2">
                    {officials.map((official, i) => (
                      <li key={i} className="text-sm">
                        <strong>{official.name}</strong> ({official.party})<br />
                        <span className="text-xs text-pd-text-light">{official.office}</span><br />
                        <a href={`mailto:${official.email}`} className="text-xs text-pd-blue">{official.email}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {actions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-heading font-semibold text-sm text-pd-text mb-2">Civic Actions: What You Can Do</h4>
                  <ul className="space-y-2">
                    {actions.map((action, i) => (
                      <li key={i} className="text-sm">
                        {action.url ? (
                          <a href={action.url} className="text-pd-blue hover:underline font-semibold">{action.title}</a>
                        ) : (
                          <span className="font-semibold">{action.title}</span>
                        )}
                        {action.description && (
                          <p className="text-xs text-pd-text-light mt-0.5">{action.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {organizations.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-heading font-semibold text-sm text-pd-text mb-2">Organizations to Follow</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {organizations.map((org, i) => (
                      <li key={i} className="text-sm">
                        <a href={org.url} className="text-pd-blue hover:underline">{org.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-pd-text italic mt-4">
                If you take civic action please let us know — email us at{' '}
                <a href="mailto:connect@planetdetroit.org" className="text-pd-blue">connect@planetdetroit.org</a>.
              </p>
              <p className="text-xs text-pd-text-light mt-3 pt-3 border-t border-[#d0d8e0]">
                Civic resources compiled by <a href="https://planetdetroit.org" className="text-pd-blue">Planet Detroit</a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HTML Output */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-pd-text">📋 HTML Code</h2>
          <button
            onClick={handleCopy}
            disabled={isEmpty}
            className="px-4 py-2 bg-pd-orange text-white font-semibold rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {copied ? '✓ Copied!' : 'Copy HTML'}
          </button>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={interactiveCheckboxes}
            onChange={(e) => setInteractiveCheckboxes(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-pd-text">Include interactive checkboxes (WordPress only)</span>
          <span className="text-xs text-pd-text-light">— readers can mark actions they've taken</span>
        </label>

        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
          {isEmpty ? '<!-- Add items in Builder tab -->' : html}
        </pre>

        <p className="mt-4 text-xs text-pd-text-light">
          Paste this HTML into your WordPress post using the "Custom HTML" block.
        </p>
      </div>
    </div>
  )
}
