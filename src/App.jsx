import { useState, useEffect } from 'react'
import { fetchAllMeetings, fetchAllCommentPeriods, fetchAllOrganizations, fetchAllOfficials } from './lib/api.js'
import { loadSavedState, saveState, clearSavedState } from './lib/storage.js'
import LoginPage from './LoginPage.jsx'
import ToolNav from './ToolNav.jsx'
import ArticleInputTab from './tabs/ArticleInputTab.jsx'
import BuilderTab from './tabs/BuilderTab.jsx'
import OutputTab from './tabs/OutputTab.jsx'

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
  const [whyItMatters, setWhyItMatters] = useState(saved?.whyItMatters || '')
  const [whosDeciding, setWhosDeciding] = useState(saved?.whosDeciding || '')
  const [whatToWatch, setWhatToWatch] = useState(saved?.whatToWatch || '')

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
    const hasContent = articleData || analysis || organizations.length || meetings.length ||
      commentPeriods.length || officials.length || actions.length ||
      whyItMatters.trim() || whosDeciding.trim() || whatToWatch.trim()
    if (!hasContent) return
    saveState({
      activeTab, articleData, analysis,
      organizations, meetings, commentPeriods, officials, actions,
      whyItMatters, whosDeciding, whatToWatch
    })
  }, [activeTab, articleData, analysis, organizations, meetings, commentPeriods, officials, actions, whyItMatters, whosDeciding, whatToWatch])

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
    setWhyItMatters('')
    setWhosDeciding('')
    setWhatToWatch('')
  }

  const hasSavedState = !!(articleData || analysis || organizations.length || meetings.length ||
    commentPeriods.length || officials.length || actions.length ||
    whyItMatters.trim() || whosDeciding.trim() || whatToWatch.trim())

  // When analysis completes, pre-populate builder with suggestions
  const handleAnalysisComplete = (result) => {
    if (result.related_organizations) {
      setOrganizations(result.related_organizations.slice(0, 5))
      setAllOrgs(prev => {
        const existing = new Set(prev.map(o => o.name))
        const newOrgs = result.related_organizations.filter(o => !existing.has(o.name))
        return [...prev, ...newOrgs]
      })
    }

    if (result.related_meetings && result.related_meetings.length > 0) {
      setMeetings(result.related_meetings.slice(0, 5))
      setAllMeetings(prev => {
        const existing = new Set(prev.map(m => m.source_id))
        const newMeetings = result.related_meetings.filter(m => !existing.has(m.source_id))
        return [...prev, ...newMeetings]
      })
    }

    if (result.related_comment_periods && result.related_comment_periods.length > 0) {
      setCommentPeriods(result.related_comment_periods.slice(0, 3))
      setAllCommentPeriods(prev => {
        const existing = new Set(prev.map(p => p.source_id))
        const newPeriods = result.related_comment_periods.filter(p => !existing.has(p.source_id))
        return [...prev, ...newPeriods]
      })
    }

    if (result.related_officials && result.related_officials.length > 0) {
      const normalized = result.related_officials.map(o => ({
        ...o,
        district: `District ${o.current_district}`,
        phone: o.capitol_voice || null,
        party: o.party === 'Democratic' ? 'D' : o.party === 'Republican' ? 'R' : o.party?.charAt(0) || '',
        committees: o.committees || [],
      }))
      setOfficials(normalized.slice(0, 3))
    }

    // Combine AI-suggested actions with evergreen defaults
    const defaultActions = [
      {
        title: 'Write a letter to the editor or op-ed',
        description: 'Share your perspective with a broader audience by submitting a letter to the editor or opinion piece to your local paper.',
        url: '',
        action_type: 'write_oped',
      },
      {
        title: 'Register to vote',
        description: 'Make sure you\'re registered and ready to vote on the issues and candidates that affect your community.',
        url: 'https://mvic.sos.state.mi.us/RegisterVoter',
        action_type: 'register_vote',
      },
    ]
    const aiActions = result.civic_actions ? result.civic_actions.slice(0, 4) : []
    setActions([...aiActions, ...defaultActions])

    // Pre-populate the new context sections from AI analysis
    if (result.why_it_matters) setWhyItMatters(result.why_it_matters)
    if (result.whos_deciding) setWhosDeciding(result.whos_deciding)
    if (result.what_to_watch) setWhatToWatch(result.what_to_watch)

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
            whyItMatters={whyItMatters}
            setWhyItMatters={setWhyItMatters}
            whosDeciding={whosDeciding}
            setWhosDeciding={setWhosDeciding}
            whatToWatch={whatToWatch}
            setWhatToWatch={setWhatToWatch}
          />
        )}

        {activeTab === 'output' && (
          <OutputTab
            organizations={organizations}
            meetings={meetings}
            commentPeriods={commentPeriods}
            officials={officials}
            actions={actions}
            whyItMatters={whyItMatters}
            whosDeciding={whosDeciding}
            whatToWatch={whatToWatch}
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

export default function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
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
