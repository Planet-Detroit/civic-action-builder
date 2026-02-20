import { useState } from 'react'
import { ISSUE_TO_AGENCY } from '../lib/constants.js'

export default function BuilderTab({
  organizations, setOrganizations,
  meetings, setMeetings,
  commentPeriods, setCommentPeriods,
  officials, setOfficials,
  actions, setActions,
  allMeetings, allCommentPeriods, allOrgs, allOfficials,
  detectedIssues,
  whyItMatters, setWhyItMatters,
  whosDeciding, setWhosDeciding,
  whatToWatch, setWhatToWatch
}) {
  const [orgSearch, setOrgSearch] = useState('')
  const [officialSearch, setOfficialSearch] = useState('')
  const [meetingSearch, setMeetingSearch] = useState('')
  const [meetingAgencyFilter, setMeetingAgencyFilter] = useState('')
  const [meetingDateFilter, setMeetingDateFilter] = useState('')
  const [commentPeriodSearch, setCommentPeriodSearch] = useState('')
  const [editingActionIndex, setEditingActionIndex] = useState(null)
  const [showManualMeeting, setShowManualMeeting] = useState(false)
  const [manualMeeting, setManualMeeting] = useState({ title: '', agency: '', date: '', time: '', link: '' })
  const [showManualCommentPeriod, setShowManualCommentPeriod] = useState(false)
  const [manualCommentPeriod, setManualCommentPeriod] = useState({ title: '', agency: '', deadline: '', link: '', description: '' })

  // Filter organizations by search
  const filteredOrgs = allOrgs.filter(org =>
    org.name?.toLowerCase().includes(orgSearch.toLowerCase()) ||
    org.focus?.some(f => f.toLowerCase().includes(orgSearch.toLowerCase()))
  )

  // Get suggested agencies based on detected issues
  const suggestedAgencies = detectedIssues?.flatMap(issue => ISSUE_TO_AGENCY[issue] || []) || []
  const uniqueSuggestedAgencies = [...new Set(suggestedAgencies)]

  // Filter meetings with relevance scoring
  const scoredMeetings = allMeetings.map(meeting => {
    let score = 0
    if (uniqueSuggestedAgencies.includes(meeting.agency)) {
      score += 10
    }
    const meetingTags = meeting.issue_tags || meeting.issues || []
    detectedIssues?.forEach(issue => {
      if (meetingTags.includes(issue)) {
        score += 8
      }
      if (meeting.title?.toLowerCase().includes(issue.replace(/_/g, ' '))) {
        score += 3
      }
    })
    return { ...meeting, relevanceScore: score }
  }).sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Apply filters to meetings
  const filteredMeetings = scoredMeetings.filter(meeting => {
    const matchesSearch = !meetingSearch ||
      meeting.title?.toLowerCase().includes(meetingSearch.toLowerCase()) ||
      meeting.agency?.toLowerCase().includes(meetingSearch.toLowerCase())

    const matchesAgency = !meetingAgencyFilter ||
      meeting.agency?.toLowerCase().includes(meetingAgencyFilter.toLowerCase())

    let matchesDate = true
    if (meetingDateFilter && meeting.start_datetime) {
      const meetingDate = new Date(meeting.start_datetime)
      const now = new Date()
      const daysDiff = (meetingDate - now) / (1000 * 60 * 60 * 24)

      if (meetingDateFilter === '7') matchesDate = daysDiff <= 7
      else if (meetingDateFilter === '30') matchesDate = daysDiff <= 30
      else if (meetingDateFilter === '90') matchesDate = daysDiff <= 90
    }

    return matchesSearch && matchesAgency && matchesDate
  })

  // Filter officials by search
  const filteredOfficials = allOfficials.filter(official =>
    !officialSearch ||
    official.name?.toLowerCase().includes(officialSearch.toLowerCase()) ||
    official.committees?.some(c => c.toLowerCase().includes(officialSearch.toLowerCase())) ||
    official.district?.toLowerCase().includes(officialSearch.toLowerCase())
  )

  const addOrganization = (org) => {
    if (!organizations.find(o => o.name === org.name)) {
      setOrganizations([...organizations, org])
    }
  }

  const removeOrganization = (index) => {
    setOrganizations(organizations.filter((_, i) => i !== index))
  }

  const addMeeting = (meeting) => {
    if (!meetings.find(m => m.id === meeting.id)) {
      setMeetings([...meetings, meeting])
    }
  }

  const removeMeeting = (index) => {
    setMeetings(meetings.filter((_, i) => i !== index))
  }

  const addManualMeeting = () => {
    if (!manualMeeting.title.trim()) return
    const dateStr = manualMeeting.date && manualMeeting.time
      ? `${manualMeeting.date}T${manualMeeting.time}`
      : manualMeeting.date ? `${manualMeeting.date}T00:00` : new Date().toISOString()
    setMeetings([...meetings, {
      id: `manual-${Date.now()}`,
      title: manualMeeting.title.trim(),
      agency: manualMeeting.agency.trim() || null,
      start_datetime: dateStr,
      details_url: manualMeeting.link.trim() || null,
      _manual: true,
    }])
    setManualMeeting({ title: '', agency: '', date: '', time: '', link: '' })
    setShowManualMeeting(false)
  }

  const addCommentPeriod = (period) => {
    if (!commentPeriods.find(p => p.id === period.id)) {
      setCommentPeriods([...commentPeriods, period])
    }
  }

  const removeCommentPeriod = (index) => {
    setCommentPeriods(commentPeriods.filter((_, i) => i !== index))
  }

  const addManualCommentPeriod = () => {
    if (!manualCommentPeriod.title.trim()) return
    const daysRemaining = manualCommentPeriod.deadline
      ? Math.max(0, Math.floor((new Date(manualCommentPeriod.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
      : null
    setCommentPeriods([...commentPeriods, {
      id: `manual-${Date.now()}`,
      title: manualCommentPeriod.title.trim(),
      agency: manualCommentPeriod.agency.trim() || null,
      end_date: manualCommentPeriod.deadline || null,
      days_remaining: daysRemaining,
      comment_url: manualCommentPeriod.link.trim() || null,
      description: manualCommentPeriod.description.trim() || null,
      _manual: true,
    }])
    setManualCommentPeriod({ title: '', agency: '', deadline: '', link: '', description: '' })
    setShowManualCommentPeriod(false)
  }

  // Filter comment periods by search
  const filteredCommentPeriods = allCommentPeriods.filter(period =>
    !commentPeriodSearch ||
    period.title?.toLowerCase().includes(commentPeriodSearch.toLowerCase()) ||
    period.agency?.toLowerCase().includes(commentPeriodSearch.toLowerCase()) ||
    period.description?.toLowerCase().includes(commentPeriodSearch.toLowerCase())
  )

  const addOfficial = (official) => {
    const key = official.openstates_id || official.id
    if (!officials.find(o => (o.openstates_id || o.id) === key)) {
      setOfficials([...officials, official])
    }
  }

  const removeOfficial = (index) => {
    setOfficials(officials.filter((_, i) => i !== index))
  }

  const updateAction = (index, field, value) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], [field]: value }
    setActions(newActions)
  }

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index))
    setEditingActionIndex(null)
  }

  const addNewAction = () => {
    setActions([...actions, { title: 'New Action', description: '', url: '', action_type: 'follow' }])
    setEditingActionIndex(actions.length)
  }

  return (
    <div className="space-y-6">
      {/* Why it matters — AI-prepopulated, editable */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <h2 className="font-heading font-bold text-base text-pd-text mb-2">💡 Why It Matters</h2>
        <p className="text-xs text-pd-text-light mb-2">1-2 paragraphs explaining why this story matters to Metro Detroit residents. Pre-filled by AI — review and edit.</p>
        <textarea
          value={whyItMatters}
          onChange={(e) => setWhyItMatters(e.target.value)}
          placeholder="Why does this story matter to readers? Focus on direct impacts to health, wallets, or community..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>

      {/* Who's making public decisions — AI-prepopulated, editable */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <h2 className="font-heading font-bold text-base text-pd-text mb-2">🏛️ Who's Making Public Decisions</h2>
        <p className="text-xs text-pd-text-light mb-2">1-2 paragraphs identifying decision-makers: agencies, boards, commissions, or officials. Pre-filled by AI — review and edit.</p>
        <textarea
          value={whosDeciding}
          onChange={(e) => setWhosDeciding(e.target.value)}
          placeholder="Which agencies, boards, or officials are making the key decisions? Include upcoming decision points..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>

      {/* Related to this article - AI suggestions */}
      {detectedIssues?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-heading font-bold text-base text-pd-text mb-2">
            🎯 Related to This Article
          </h2>
          <p className="text-sm text-pd-text-light mb-3">
            Based on detected issues: {detectedIssues.map(i => i.replace(/_/g, ' ')).join(', ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueSuggestedAgencies.length > 0 && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                📅 Suggested agencies: {uniqueSuggestedAgencies.join(', ')}
              </span>
            )}
            {officials.length > 0 && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                🏛️ {officials.length} officials pre-selected
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-base text-pd-text">🏢 Organizations</h2>
            <a
              href="https://orgs.planetdetroit.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pd-blue hover:underline"
            >
              Browse full directory →
            </a>
          </div>

          {/* Selected */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">Selected ({organizations.length})</h3>
            {organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <span className="text-sm font-semibold text-pd-text">{org.name}</span>
                      {org.url && (
                        <a href={org.url} target="_blank" rel="noopener noreferrer" className="text-xs text-pd-blue ml-2">↗</a>
                      )}
                    </div>
                    <button onClick={() => removeOrganization(i)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-pd-text-light">None selected</p>
            )}
          </div>

          {/* Search & Add */}
          <div>
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">Search All {allOrgs.length} Organizations</h3>
            <input
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search by name or focus area..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {orgSearch && filteredOrgs.slice(0, 15).map((org, i) => (
                <button
                  key={i}
                  onClick={() => addOrganization(org)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                >
                  <div className="font-semibold">{org.name}</div>
                  {org.focus && (
                    <div className="text-xs text-pd-text-light">{org.focus.slice(0, 3).join(', ')}</div>
                  )}
                </button>
              ))}
              {orgSearch && filteredOrgs.length === 0 && (
                <p className="text-sm text-pd-text-light p-2">No organizations found</p>
              )}
              {!orgSearch && (
                <p className="text-sm text-pd-text-light p-2">Type to search...</p>
              )}
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-3">📅 Meetings</h2>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
            <strong>Note:</strong> Meetings are suggested based on agency, topic, and timing — not agenda content. Check agendas for specific items relevant to the article and add details manually.
          </p>

          {/* Selected */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">Selected ({meetings.length})</h3>
            {meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((meeting, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-pd-text">{meeting.title}</span>
                      <div className="text-xs text-pd-text-light">
                        {new Date(meeting.start_datetime).toLocaleDateString()} • {meeting.agency || 'TBD'}
                        {(meeting.agenda_url || meeting.details_url || meeting.virtual_url) && (
                          <a href={meeting.agenda_url || meeting.details_url || meeting.virtual_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>↗ Link</a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeMeeting(i)} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-pd-text-light">None selected</p>
            )}
          </div>

          {/* Filters */}
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={meetingSearch}
              onChange={(e) => setMeetingSearch(e.target.value)}
              placeholder="Search meetings..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <div className="flex gap-2">
              <select
                value={meetingAgencyFilter}
                onChange={(e) => setMeetingAgencyFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">All agencies</option>
                <option value="MPSC">MPSC</option>
                <option value="EGLE">EGLE</option>
                <option value="GLWA">GLWA</option>
                <option value="Detroit City Council">Detroit City Council</option>
              </select>
              <select
                value={meetingDateFilter}
                onChange={(e) => setMeetingDateFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Any date</option>
                <option value="7">Next 7 days</option>
                <option value="30">Next 30 days</option>
                <option value="90">Next 90 days</option>
              </select>
            </div>
          </div>

          {/* Available Meetings - sorted by relevance */}
          <div>
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">
              {uniqueSuggestedAgencies.length > 0 ? 'Sorted by relevance' : 'Upcoming Meetings'} ({filteredMeetings.length})
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredMeetings.slice(0, 10).map((meeting, i) => (
                <div key={meeting.id || i} className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded text-sm">
                  <button
                    onClick={() => addMeeting(meeting)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{meeting.title}</span>
                      {meeting.relevanceScore > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded flex-shrink-0">Related</span>
                      )}
                    </div>
                    <div className="text-xs text-pd-text-light">
                      {new Date(meeting.start_datetime).toLocaleDateString()} • {meeting.agency || 'TBD'}
                    </div>
                  </button>
                  {(meeting.agenda_url || meeting.details_url || meeting.virtual_url) && (
                    <a href={meeting.agenda_url || meeting.details_url || meeting.virtual_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0 px-1" title="Open meeting page">↗</a>
                  )}
                </div>
              ))}
              {filteredMeetings.length === 0 && (
                <p className="text-sm text-pd-text-light">No meetings match your filters</p>
              )}
              {filteredMeetings.length > 10 && (
                <p className="text-xs text-pd-text-light text-center py-2">
                  +{filteredMeetings.length - 10} more (refine search)
                </p>
              )}
            </div>
          </div>

          {/* Manual Meeting Entry */}
          {showManualMeeting ? (
            <div className="mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg space-y-2">
              <h3 className="text-xs font-semibold text-pd-text-light">Add meeting manually</h3>
              <input
                type="text"
                value={manualMeeting.title}
                onChange={(e) => setManualMeeting({ ...manualMeeting, title: e.target.value })}
                placeholder="Meeting title *"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={manualMeeting.agency}
                onChange={(e) => setManualMeeting({ ...manualMeeting, agency: e.target.value })}
                placeholder="Agency (e.g. EGLE, EPA, City Council)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={manualMeeting.date}
                  onChange={(e) => setManualMeeting({ ...manualMeeting, date: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="time"
                  value={manualMeeting.time}
                  onChange={(e) => setManualMeeting({ ...manualMeeting, time: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <input
                type="url"
                value={manualMeeting.link}
                onChange={(e) => setManualMeeting({ ...manualMeeting, link: e.target.value })}
                placeholder="Link (agenda, details, or virtual URL)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={addManualMeeting}
                  disabled={!manualMeeting.title.trim()}
                  className="flex-1 px-3 py-1.5 bg-pd-blue text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Meeting
                </button>
                <button
                  onClick={() => { setShowManualMeeting(false); setManualMeeting({ title: '', agency: '', date: '', time: '', link: '' }) }}
                  className="px-3 py-1.5 text-pd-text-light text-sm rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowManualMeeting(true)}
              className="mt-3 w-full px-4 py-2 border-2 border-dashed border-gray-300 text-pd-text-light text-sm rounded-lg hover:border-pd-blue hover:text-pd-blue transition-colors"
            >
              + Add meeting manually
            </button>
          )}
        </div>

        {/* Comment Periods */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-3">💬 Comment Periods</h2>

          {/* Selected */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">Selected ({commentPeriods.length})</h3>
            {commentPeriods.length > 0 ? (
              <div className="space-y-2">
                {commentPeriods.map((period, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-pd-text">{period.title}</span>
                      <div className="text-xs text-pd-text-light">
                        {period.agency || 'Unknown agency'}
                        {period.end_date && (
                          <span> · Deadline: {new Date(period.end_date).toLocaleDateString()}</span>
                        )}
                        {period.days_remaining != null && (
                          <span className={`ml-1 font-semibold ${period.days_remaining <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                            ({period.days_remaining} days left)
                          </span>
                        )}
                        {period.comment_url && (
                          <a href={period.comment_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>↗ Comment</a>
                        )}
                      </div>
                      {period.description && (
                        <p className="text-xs text-pd-text-light mt-1 line-clamp-2">{period.description.slice(0, 120)}</p>
                      )}
                    </div>
                    <button onClick={() => removeCommentPeriod(i)} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-pd-text-light">None selected</p>
            )}
          </div>

          {/* Search & Add */}
          <div>
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">
              Available Comment Periods ({allCommentPeriods.length})
            </h3>
            <input
              type="text"
              value={commentPeriodSearch}
              onChange={(e) => setCommentPeriodSearch(e.target.value)}
              placeholder="Search comment periods..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCommentPeriods.slice(0, 10).map((period, i) => (
                <button
                  key={period.id || i}
                  onClick={() => addCommentPeriod(period)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                >
                  <div className="font-semibold">{period.title}</div>
                  <div className="text-xs text-pd-text-light">
                    {period.agency || 'Unknown'}
                    {period.end_date && ` · Deadline: ${new Date(period.end_date).toLocaleDateString()}`}
                    {period.days_remaining != null && (
                      <span className={`ml-1 ${period.days_remaining <= 7 ? 'text-red-600 font-semibold' : ''}`}>
                        ({period.days_remaining}d left)
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filteredCommentPeriods.length === 0 && (
                <p className="text-sm text-pd-text-light p-2">No comment periods found</p>
              )}
              {filteredCommentPeriods.length > 10 && (
                <p className="text-xs text-pd-text-light text-center py-2">
                  +{filteredCommentPeriods.length - 10} more (refine search)
                </p>
              )}
            </div>
          </div>

          {/* Manual Comment Period Entry */}
          {showManualCommentPeriod ? (
            <div className="mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg space-y-2">
              <h3 className="text-xs font-semibold text-pd-text-light">Add comment period manually</h3>
              <input
                type="text"
                value={manualCommentPeriod.title}
                onChange={(e) => setManualCommentPeriod({ ...manualCommentPeriod, title: e.target.value })}
                placeholder="Comment period title *"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={manualCommentPeriod.agency}
                onChange={(e) => setManualCommentPeriod({ ...manualCommentPeriod, agency: e.target.value })}
                placeholder="Agency (e.g. EGLE, EPA, Army Corps)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <div>
                <label className="text-xs text-pd-text-light">Comment deadline</label>
                <input
                  type="date"
                  value={manualCommentPeriod.deadline}
                  onChange={(e) => setManualCommentPeriod({ ...manualCommentPeriod, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <input
                type="url"
                value={manualCommentPeriod.link}
                onChange={(e) => setManualCommentPeriod({ ...manualCommentPeriod, link: e.target.value })}
                placeholder="Link to submit comments"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <textarea
                value={manualCommentPeriod.description}
                onChange={(e) => setManualCommentPeriod({ ...manualCommentPeriod, description: e.target.value })}
                placeholder="Brief description (what's being decided, why it matters)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={addManualCommentPeriod}
                  disabled={!manualCommentPeriod.title.trim()}
                  className="flex-1 px-3 py-1.5 bg-pd-blue text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Comment Period
                </button>
                <button
                  onClick={() => { setShowManualCommentPeriod(false); setManualCommentPeriod({ title: '', agency: '', deadline: '', link: '', description: '' }) }}
                  className="px-3 py-1.5 text-pd-text-light text-sm rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowManualCommentPeriod(true)}
              className="mt-3 w-full px-4 py-2 border-2 border-dashed border-gray-300 text-pd-text-light text-sm rounded-lg hover:border-pd-blue hover:text-pd-blue transition-colors"
            >
              + Add comment period manually
            </button>
          )}
        </div>

        {/* Elected Officials */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-3">🏛️ Elected Officials</h2>

          {/* Selected */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">Selected ({officials.length})</h3>
            {officials.length > 0 ? (
              <div className="space-y-2">
                {officials.map((official, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <span className="text-sm font-semibold text-pd-text">{official.name}</span>
                      <span className="text-xs text-pd-text-light ml-2">({official.party})</span>
                      <div className="text-xs text-pd-text-light">
                        {official.office} · {official.district}
                        {official.committees?.length > 0 && ` · ${official.committees[0]}`}
                      </div>
                    </div>
                    <button onClick={() => removeOfficial(i)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-pd-text-light">None selected</p>
            )}
          </div>

          {/* Search & Add */}
          <div>
            <h3 className="text-xs font-semibold text-pd-text-light mb-2">
              Search All {allOfficials.length} Officials
            </h3>
            <input
              type="text"
              value={officialSearch}
              onChange={(e) => setOfficialSearch(e.target.value)}
              placeholder="Search by name, committee, or district..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {officialSearch && filteredOfficials.slice(0, 15).map((official) => (
                <button
                  key={official.openstates_id || official.id}
                  onClick={() => addOfficial(official)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                >
                  <div className="font-semibold">{official.name} ({official.party})</div>
                  <div className="text-xs text-pd-text-light">
                    {official.office} · {official.district}
                    {official.committees?.length > 0 && ` · ${official.committees.slice(0, 2).join(', ')}`}
                  </div>
                </button>
              ))}
              {officialSearch && filteredOfficials.length === 0 && (
                <p className="text-sm text-pd-text-light p-2">No officials found</p>
              )}
              {officialSearch && filteredOfficials.length > 15 && (
                <p className="text-xs text-pd-text-light text-center py-2">
                  +{filteredOfficials.length - 15} more (refine search)
                </p>
              )}
              {!officialSearch && (
                <p className="text-sm text-pd-text-light p-2">Type to search...</p>
              )}
            </div>
          </div>
        </div>

        {/* Civic Actions - EDITABLE */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-3">✊ Civic Actions</h2>

          {/* Actions List - Editable */}
          <div className="space-y-3 mb-4">
            {actions.map((action, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {editingActionIndex === i ? (
                  // Edit mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={action.title}
                      onChange={(e) => updateAction(i, 'title', e.target.value)}
                      placeholder="Action title"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-semibold"
                    />
                    <textarea
                      value={action.description}
                      onChange={(e) => updateAction(i, 'description', e.target.value)}
                      placeholder="Description - Be specific! Tell readers exactly how to take this action."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="url"
                      value={action.url || ''}
                      onChange={(e) => updateAction(i, 'url', e.target.value)}
                      placeholder="URL (where to take action)"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingActionIndex(null)}
                        className="flex-1 px-3 py-1 bg-pd-blue text-white text-sm rounded hover:bg-blue-700"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => removeAction(i)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-pd-text">{action.title}</div>
                      {action.description && (
                        <p className="text-xs text-pd-text-light mt-1">{action.description}</p>
                      )}
                      {action.url && (
                        <a href={action.url} target="_blank" rel="noopener noreferrer" className="text-xs text-pd-blue mt-1 block">
                          {action.url.slice(0, 40)}...
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingActionIndex(i)}
                      className="text-pd-blue hover:text-blue-700 text-sm ml-2"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>
            ))}

            {actions.length === 0 && (
              <p className="text-sm text-pd-text-light">No actions added yet</p>
            )}
          </div>

          {/* Add New Action */}
          <button
            onClick={addNewAction}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-pd-text-light rounded-lg hover:border-pd-blue hover:text-pd-blue transition-colors"
          >
            + Add Custom Action
          </button>

          <p className="text-xs text-pd-text-light mt-3 italic">
            💡 Tip: For actions like "Submit comments", edit to include specific instructions (deadline, where to submit, what to include).
          </p>
        </div>

        {/* What to watch for next — AI-prepopulated, editable */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-2">👀 What to Watch for Next</h2>
          <p className="text-xs text-pd-text-light mb-2">1-2 sentences about upcoming votes, rulings, or deadlines. Pre-filled by AI — review and edit.</p>
          <textarea
            value={whatToWatch}
            onChange={(e) => setWhatToWatch(e.target.value)}
            placeholder="What should readers watch for next? Upcoming votes, rulings, deadlines..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>
    </div>
  )
}
