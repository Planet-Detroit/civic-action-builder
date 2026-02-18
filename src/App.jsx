import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Issue to agency mapping for meeting suggestions
const ISSUE_TO_AGENCY = {
  'energy': ['MPSC'],
  'dte_energy': ['MPSC'],
  'consumers_energy': ['MPSC'],
  'utilities': ['MPSC'],
  'rates': ['MPSC'],
  'data_centers': ['MPSC', 'EGLE'],
  'air_quality': ['EGLE', 'EPA'],
  'drinking_water': ['EGLE', 'EPA', 'GLWA'],
  'water_quality': ['EGLE', 'GLWA'],
  'infrastructure': ['GLWA', 'Detroit City Council'],
  'climate': ['EGLE', 'MPSC'],
  'environmental_justice': ['EGLE', 'EPA', 'Detroit City Council'],
  'detroit': ['Detroit City Council'],
  'local_government': ['Detroit City Council'],
  'housing': ['Detroit City Council'],
  'development': ['Detroit City Council'],
  'public_health': ['Detroit City Council'],
  'public_safety': ['Detroit City Council'],
  'community': ['Detroit City Council'],
  'pfas': ['EGLE', 'EPA'],
  'permitting': ['EGLE'],
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchArticleFromWordPress(url) {
  // Extract slug from URL - handles both YYYY/MM/slug and YYYY/MM/DD/slug formats
  const match = url.match(/planetdetroit\.org\/\d{4}\/\d{2}\/(?:\d{2}\/)?([^\/]+)/)
  if (!match) throw new Error('Invalid Planet Detroit URL format. Expected: planetdetroit.org/YYYY/MM/article-slug/')
  
  const slug = match[1].replace(/\/$/, '')
  const apiUrl = `https://planetdetroit.org/wp-json/wp/v2/posts?slug=${slug}`
  
  const response = await fetch(apiUrl)
  if (!response.ok) throw new Error('Failed to fetch article')
  
  const posts = await response.json()
  if (!posts.length) throw new Error('Article not found')
  
  const post = posts[0]
  // Strip HTML tags for plain text
  const plainText = post.content.rendered.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  
  return {
    title: post.title.rendered,
    content: plainText,
    url: post.link,
    date: post.date
  }
}

async function analyzeArticle(articleText) {
  const response = await fetch(`${API_BASE}/api/analyze-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_text: articleText })
  })
  if (!response.ok) throw new Error('Analysis failed')
  return response.json()
}

function buildCalendarLinks(meeting) {
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

async function fetchAllMeetings() {
  const response = await fetch(`${API_BASE}/api/meetings?status=upcoming&limit=100`)
  if (!response.ok) return { meetings: [] }
  return response.json()
}

async function fetchAllCommentPeriods() {
  try {
    const response = await fetch(`${API_BASE}/api/comment-periods?status=open&limit=50`)
    if (response.ok) {
      const data = await response.json()
      return data.comment_periods || []
    }
  } catch (e) {
    console.log('Comment periods endpoint not available')
  }
  return []
}

async function fetchAllOrganizations() {
  try {
    const response = await fetch(`${API_BASE}/api/organizations?limit=700`)
    if (response.ok) {
      const data = await response.json()
      return data.organizations || data || []
    }
  } catch (e) {
    console.log('Organizations endpoint not available, using analysis results')
  }
  return []
}

async function fetchAllOfficials() {
  try {
    const response = await fetch(`${API_BASE}/api/officials?limit=200`)
    if (response.ok) {
      const data = await response.json()
      const officials = data.officials || []
      // Normalize field names for frontend use
      return officials.map(o => ({
        ...o,
        district: `District ${o.current_district}`,
        phone: o.capitol_voice || null,
        // Use first letter for party display
        party: o.party === 'Democratic' ? 'D' : o.party === 'Republican' ? 'R' : o.party?.charAt(0) || '',
        // Keep committees as array
        committees: o.committees || [],
      }))
    }
  } catch (e) {
    console.log('Officials endpoint not available')
  }
  return []
}

// =============================================================================
// Components
// =============================================================================

function ToolNav({ onSignOut }) {
  return (
    <nav style={{ background: "#1e293b", padding: "0 16px", display: "flex", alignItems: "center", gap: "4px", height: "32px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <span style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.5px", marginRight: "12px", textTransform: "uppercase", fontWeight: "bold" }}>
        PD Tools
      </span>
      <a
        href="https://brief.tools.planetdetroit.org/"
        style={{ fontSize: "12px", color: "#94a3b8", textDecoration: "none", padding: "4px 10px", borderRadius: "4px", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        Brief Generator
      </a>
      <span style={{ color: "#475569", fontSize: "10px" }}>/</span>
      <a
        href="https://newsletter.tools.planetdetroit.org/"
        style={{ fontSize: "12px", color: "#94a3b8", textDecoration: "none", padding: "4px 10px", borderRadius: "4px", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        Newsletter Builder
      </a>
      <span style={{ color: "#475569", fontSize: "10px" }}>/</span>
      <span
        style={{ fontSize: "12px", color: "#ffffff", padding: "4px 10px", borderRadius: "4px", fontWeight: "600" }}
      >
        Civic Action
      </span>
      {onSignOut && (
        <button
          onClick={onSignOut}
          style={{ fontSize: "11px", color: "#64748b", background: "none", border: "none", cursor: "pointer", marginLeft: "auto", padding: "4px 8px", transition: "color 0.15s", fontFamily: "inherit" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          Sign out
        </button>
      )}
    </nav>
  )
}

function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('')
  const [userName, setUserName] = useState('')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const effectiveName = userName === '__custom' ? customName.trim() : userName

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!effectiveName) { setError('Please select your name'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, userId: effectiveName }),
      })
      if (res.ok) {
        onLogin(effectiveName)
      } else {
        setError('Invalid password')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Planet Detroit</h1>
          <p className="text-sm text-gray-500 mt-1">Civic Action Builder</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
            Who's working today?
          </label>
          <select
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select your name</option>
            <option value="Nina">Nina</option>
            <option value="Dustin">Dustin</option>
            <option value="__custom">Other...</option>
          </select>
          {userName === '__custom' && (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter your name"
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 mt-4">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter newsroom password"
            autoFocus
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password || !effectiveName}
            className="mt-4 w-full py-2 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pd-orange rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">🛠️</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-pd-text">Civic Action Box Builder</h1>
            <p className="text-sm text-pd-text-light">Editorial Tool — Planet Detroit</p>
          </div>
        </div>
      </div>
    </header>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-heading font-semibold text-sm border-b-2 transition-colors ${
        active 
          ? 'border-pd-blue text-pd-blue' 
          : 'border-transparent text-pd-text-light hover:text-pd-text'
      }`}
    >
      {children}
    </button>
  )
}

// =============================================================================
// Tab 1: Article Input
// =============================================================================

function ArticleInputTab({ articleData, setArticleData, analysis, setAnalysis, onAnalyze }) {
  const [inputMode, setInputMode] = useState('url')
  const [url, setUrl] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFetchFromUrl = async () => {
    if (!url.trim()) return
    setIsLoading(true)
    setError(null)
    
    try {
      const article = await fetchArticleFromWordPress(url)
      setArticleData(article)
      setPastedText(article.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    const text = inputMode === 'url' ? articleData?.content : pastedText
    if (!text?.trim()) {
      setError('No article content to analyze')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await analyzeArticle(text)
      setAnalysis(result)
      if (onAnalyze) onAnalyze(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={inputMode === 'url'}
              onChange={() => setInputMode('url')}
              className="text-pd-blue"
            />
            <span className="font-heading font-semibold text-sm">Fetch from URL</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={inputMode === 'paste'}
              onChange={() => setInputMode('paste')}
              className="text-pd-blue"
            />
            <span className="font-heading font-semibold text-sm">Paste Article Text</span>
          </label>
        </div>

        {inputMode === 'url' ? (
          <div>
            <label className="block text-sm font-semibold text-pd-text-light mb-1">
              Planet Detroit Article URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://planetdetroit.org/2025/01/article-slug/"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pd-blue text-sm"
              />
              <button
                onClick={handleFetchFromUrl}
                disabled={isLoading || !url.trim()}
                className="px-4 py-2 bg-pd-blue text-white font-heading font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            
            {articleData && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-heading font-bold text-pd-text">{articleData.title}</h3>
                <p className="text-xs text-pd-text-light mt-1">{articleData.date}</p>
                <p className="text-sm text-pd-text-light mt-2 line-clamp-3">{articleData.content?.slice(0, 300)}...</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-pd-text-light mb-1">
              Article Text
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste the full article text here..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pd-blue text-sm"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={isLoading || (!articleData?.content && !pastedText.trim())}
          className="mt-4 w-full px-6 py-3 bg-pd-orange text-white font-heading font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '🔄 Analyzing...' : '🔍 Analyze Article'}
        </button>
      </div>

      {analysis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-heading font-bold text-lg mb-4 text-pd-text">📊 Analysis Results</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-pd-text-light mb-2">Detected Issues</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.detected_issues?.map((issue, i) => (
                  <span key={i} className="px-3 py-1 bg-pd-blue text-white text-sm rounded-full">
                    {issue.replace(/_/g, ' ')}
                  </span>
                ))}
                {(!analysis.detected_issues || analysis.detected_issues.length === 0) && (
                  <span className="text-sm text-pd-text-light">No specific issues detected</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-pd-text-light mb-2">Key Entities</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.entities?.slice(0, 6).map((entity, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-200 text-pd-text text-sm rounded-full">
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-pd-text-light mb-2">Summary</h3>
            <p className="text-sm text-pd-text">{analysis.summary}</p>
          </div>

          {/* Related Meetings */}
          {analysis.related_meetings?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-pd-text-light mb-2">
                📅 Related Meetings ({analysis.related_meetings.length})
              </h3>
              <div className="space-y-1">
                {analysis.related_meetings.map((m, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-pd-blue rounded-full flex-shrink-0" />
                    <span className="font-medium">{m.title}</span>
                    <span className="text-pd-text-light text-xs">
                      {m.agency && `${m.agency} · `}{new Date(m.start_datetime).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Comment Periods */}
          {analysis.related_comment_periods?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-pd-text-light mb-2">
                💬 Related Comment Periods ({analysis.related_comment_periods.length})
              </h3>
              <div className="space-y-1">
                {analysis.related_comment_periods.map((p, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                    <span className="font-medium">{p.title}</span>
                    <span className="text-pd-text-light text-xs">
                      {p.agency && `${p.agency} · `}
                      {p.end_date && `Deadline: ${new Date(p.end_date).toLocaleDateString()}`}
                      {p.days_remaining != null && (
                        <span className={p.days_remaining <= 7 ? ' text-red-600 font-semibold' : ''}>
                          {' '}({p.days_remaining}d left)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Tab 2: Civic Action Builder
// =============================================================================

function BuilderTab({
  organizations, setOrganizations,
  meetings, setMeetings,
  commentPeriods, setCommentPeriods,
  officials, setOfficials,
  actions, setActions,
  allMeetings, allCommentPeriods, allOrgs, allOfficials,
  detectedIssues,
  customNotes, setCustomNotes
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
    // Boost if agency matches detected issues
    if (uniqueSuggestedAgencies.includes(meeting.agency)) {
      score += 10
    }
    // Boost if meeting's issue_tags overlap with detected issues
    const meetingTags = meeting.issue_tags || meeting.issues || []
    detectedIssues?.forEach(issue => {
      if (meetingTags.includes(issue)) {
        score += 8
      }
      // Also check title text as fallback
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
    
    // Date filter
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

        {/* Freeform Notes - NEW */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="font-heading font-bold text-base text-pd-text mb-3">📝 Additional Notes</h2>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Add any custom context, background info, or notes for readers..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <p className="text-xs text-pd-text-light mt-2 italic">
            This text will appear at the top of the civic action box.
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Tab 3: Output
// =============================================================================

function OutputTab({ organizations, meetings, commentPeriods, officials, actions, customNotes }) {
  const [copied, setCopied] = useState(false)

  // Build a slug for utm_content: lowercase, spaces → underscores, truncate
  const utmSlug = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50)

  // Append UTM params to a URL (skip mailto: and anchor-only links)
  const trackLink = (url, contentLabel) => {
    if (!url || url.startsWith('mailto:') || url === '#') return url
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}utm_source=planet_detroit&utm_medium=civic_action_box&utm_campaign=civic_action&utm_content=${utmSlug(contentLabel)}`
  }

  const generateHTML = () => {
    let html = `<div class="civic-action-box" style="background: #f0f5f8; border: 1px solid #d0d8e0; border-radius: 8px; padding: 20px; font-family: -apple-system, sans-serif; max-width: 350px;">
  <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #2f80c3;">🗳️ Civic Action Toolbox</h3>\n`

    // Add custom notes at the top if present
    if (customNotes?.trim()) {
      html += `  <div style="margin-bottom: 16px; font-size: 14px; color: #333; line-height: 1.5;">
    ${customNotes.replace(/\n/g, '<br>')}
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
        html += `      <li style="margin-bottom: 8px;"><strong>${meeting.title}</strong>${agency} — ${date}${trackedLink ? ` · <a href="${trackedLink}" style="color: #2f80c3;">Details</a>` : ''}<br><span style="font-size: 12px;">📅 <a href="${trackedGoogle}" style="color: #2f80c3;">Google</a> · <a href="${trackedOutlook}" style="color: #2f80c3;">Outlook</a></span></li>\n`
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
          html += `<a href="${trackLink(period.comment_url, `comment_${period.agency || period.title}`)}" style="color: #2f80c3; text-decoration: none; font-weight: 600;">${period.title}</a>`
        } else {
          html += `<strong>${period.title}</strong>`
        }
        html += `${agency}`
        if (deadline) {
          html += `<br><span style="color: #666; font-size: 12px;">Deadline: ${deadline}${daysLeft}</span>`
        }
        if (period.description) {
          html += `<br><span style="color: #666; font-size: 13px;">${period.description.slice(0, 150)}</span>`
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
        if (official.email) contactParts.push(`<a href="mailto:${official.email}" style="color: #2f80c3; font-size: 12px;">${official.email}</a>`)
        if (official.phone) contactParts.push(`<span style="color: #666; font-size: 12px;">${official.phone}</span>`)
        html += `      <li style="margin-bottom: 8px;"><strong>${official.name}</strong> (${official.party})<br><span style="color: #666; font-size: 12px;">${official.office}, ${official.district}</span><br>${contactParts.join(' · ')}</li>\n`
      })
      html += `    </ul>
  </div>\n`
    }

    if (actions.length > 0) {
      html += `  <div style="margin-bottom: 16px;">
    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">Civic Actions: What You Can Do</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px;">\n`
      actions.forEach(action => {
        if (action.url) {
          html += `      <li style="margin-bottom: 8px;"><a href="${trackLink(action.url, `action_${action.title}`)}" style="color: #2f80c3; text-decoration: none; font-weight: 600;">${action.title}</a>`
        } else {
          html += `      <li style="margin-bottom: 8px;"><strong>${action.title}</strong>`
        }
        if (action.description) {
          html += `<br><span style="color: #666; font-size: 13px;">${action.description}</span>`
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
        html += `      <li style="margin-bottom: 4px;"><a href="${trackLink(org.url || '#', `org_${org.name}`)}" style="color: #2f80c3; text-decoration: none;">${org.name}</a></li>\n`
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

  const handleCopy = () => {
    navigator.clipboard.writeText(generateHTML())
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
            {/* Updated preview with light blue-gray background */}
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
        
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
          {isEmpty ? '<!-- Add items in Builder tab -->' : generateHTML()}
        </pre>
        
        <p className="mt-4 text-xs text-pd-text-light">
          Paste this HTML into your WordPress post using the "Custom HTML" block.
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// Main App
// =============================================================================

export default function App() {
  // Auth state
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Skip auth in local dev
    if (import.meta.env.DEV) {
      setIsAuthenticated(true)
      setAuthChecked(true)
      return
    }
    fetch('/api/auth/check')
      .then(res => {
        setIsAuthenticated(res.ok)
        setAuthChecked(true)
      })
      .catch(() => {
        setIsAuthenticated(false)
        setAuthChecked(true)
      })
  }, [])

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />
  }

  return <AuthenticatedApp onSignOut={handleSignOut} />
}

// =============================================================================
// localStorage Persistence
// =============================================================================

const STORAGE_KEY = 'civic-action-builder-state'
const STORAGE_EXPIRY_DAYS = 7

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    // Check 7-day expiry
    if (saved.timestamp) {
      const age = Date.now() - saved.timestamp
      if (age > STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
    }
    return saved
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY)
}

function AuthenticatedApp({ onSignOut }) {
  // Load saved state from localStorage
  const saved = useState(() => loadSavedState())[0]

  const [activeTab, setActiveTab] = useState(saved?.activeTab || 'input')

  // Article data
  const [articleData, setArticleData] = useState(saved?.articleData || null)
  const [analysis, setAnalysis] = useState(saved?.analysis || null)

  // Builder selections
  const [organizations, setOrganizations] = useState(saved?.organizations || [])
  const [meetings, setMeetings] = useState(saved?.meetings || [])
  const [commentPeriods, setCommentPeriods] = useState(saved?.commentPeriods || [])
  const [officials, setOfficials] = useState(saved?.officials || [])
  const [actions, setActions] = useState(saved?.actions || [])
  const [customNotes, setCustomNotes] = useState(saved?.customNotes || '')

  // Available options from database
  const [allMeetings, setAllMeetings] = useState([])
  const [allCommentPeriods, setAllCommentPeriods] = useState([])
  const [allOrgs, setAllOrgs] = useState([])
  const [allOfficials, setAllOfficials] = useState([])

  // Load data on mount
  useEffect(() => {
    fetchAllMeetings().then(data => setAllMeetings(data.meetings || []))
    fetchAllCommentPeriods().then(data => setAllCommentPeriods(Array.isArray(data) ? data : []))
    fetchAllOrganizations().then(data => setAllOrgs(Array.isArray(data) ? data : []))
    fetchAllOfficials().then(data => setAllOfficials(Array.isArray(data) ? data : []))
  }, [])

  // Auto-save builder state to localStorage
  useEffect(() => {
    // Don't save if everything is empty
    const hasContent = articleData || analysis || organizations.length || meetings.length ||
      commentPeriods.length || officials.length || actions.length || customNotes.trim()
    if (!hasContent) return
    saveState({
      activeTab, articleData, analysis,
      organizations, meetings, commentPeriods, officials, actions, customNotes
    })
  }, [activeTab, articleData, analysis, organizations, meetings, commentPeriods, officials, actions, customNotes])

  const handleNewArticle = () => {
    clearSavedState()
    setActiveTab('input')
    setArticleData(null)
    setAnalysis(null)
    setOrganizations([])
    setMeetings([])
    setCommentPeriods([])
    setOfficials([])
    setActions([])
    setCustomNotes('')
  }

  const hasSavedState = !!(articleData || analysis || organizations.length || meetings.length ||
    commentPeriods.length || officials.length || actions.length || customNotes.trim())

  // When analysis completes, pre-populate builder with suggestions
  const handleAnalysisComplete = (result) => {
    // Pre-select suggested organizations
    if (result.related_organizations) {
      setOrganizations(result.related_organizations.slice(0, 5))
      // Merge with existing orgs for searchability
      setAllOrgs(prev => {
        const existing = new Set(prev.map(o => o.name))
        const newOrgs = result.related_organizations.filter(o => !existing.has(o.name))
        return [...prev, ...newOrgs]
      })
    }
    
    // Pre-select AI-ranked meetings
    if (result.related_meetings && result.related_meetings.length > 0) {
      setMeetings(result.related_meetings.slice(0, 5))
      // Merge AI-ranked meetings into allMeetings for searchability
      setAllMeetings(prev => {
        const existing = new Set(prev.map(m => m.source_id))
        const newMeetings = result.related_meetings.filter(m => !existing.has(m.source_id))
        return [...prev, ...newMeetings]
      })
    }

    // Pre-select AI-ranked comment periods
    if (result.related_comment_periods && result.related_comment_periods.length > 0) {
      setCommentPeriods(result.related_comment_periods.slice(0, 3))
      // Merge into allCommentPeriods for searchability
      setAllCommentPeriods(prev => {
        const existing = new Set(prev.map(p => p.source_id))
        const newPeriods = result.related_comment_periods.filter(p => !existing.has(p.source_id))
        return [...prev, ...newPeriods]
      })
    }

    // Pre-select AI-ranked officials
    if (result.related_officials && result.related_officials.length > 0) {
      // Normalize the same way fetchAllOfficials does
      const normalized = result.related_officials.map(o => ({
        ...o,
        district: `District ${o.current_district}`,
        phone: o.capitol_voice || null,
        party: o.party === 'Democratic' ? 'D' : o.party === 'Republican' ? 'R' : o.party?.charAt(0) || '',
        committees: o.committees || [],
      }))
      setOfficials(normalized.slice(0, 3))
    }

    // Pre-select suggested civic actions
    if (result.civic_actions) {
      setActions(result.civic_actions.slice(0, 4))
    }

    // Auto-switch to builder tab
    setActiveTab('builder')
  }

  return (
    <div className="min-h-screen flex flex-col bg-pd-bg">
      <ToolNav onSignOut={onSignOut} />
      <Header />
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center">
            <TabButton active={activeTab === 'input'} onClick={() => setActiveTab('input')}>
              1. Article Input
            </TabButton>
            <TabButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')}>
              2. Builder
            </TabButton>
            <TabButton active={activeTab === 'output'} onClick={() => setActiveTab('output')}>
              3. Output
            </TabButton>
            {hasSavedState && (
              <button
                onClick={handleNewArticle}
                className="ml-auto px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
              >
                New Article
              </button>
            )}
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {activeTab === 'input' && (
          <ArticleInputTab
            articleData={articleData}
            setArticleData={setArticleData}
            analysis={analysis}
            setAnalysis={setAnalysis}
            onAnalyze={handleAnalysisComplete}
          />
        )}
        
        {activeTab === 'builder' && (
          <BuilderTab
            organizations={organizations}
            setOrganizations={setOrganizations}
            meetings={meetings}
            setMeetings={setMeetings}
            commentPeriods={commentPeriods}
            setCommentPeriods={setCommentPeriods}
            officials={officials}
            setOfficials={setOfficials}
            actions={actions}
            setActions={setActions}
            allMeetings={allMeetings}
            allCommentPeriods={allCommentPeriods}
            allOrgs={allOrgs}
            allOfficials={allOfficials}
            detectedIssues={analysis?.detected_issues}
            customNotes={customNotes}
            setCustomNotes={setCustomNotes}
          />
        )}
        
        {activeTab === 'output' && (
          <OutputTab
            organizations={organizations}
            meetings={meetings}
            commentPeriods={commentPeriods}
            officials={officials}
            actions={actions}
            customNotes={customNotes}
          />
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-pd-text-light">
            Civic Action Box Builder — Internal editorial tool for{' '}
            <a href="https://planetdetroit.org" className="text-pd-blue hover:underline">Planet Detroit</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
