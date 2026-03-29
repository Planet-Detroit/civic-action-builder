import { useState, useEffect } from 'react'
import { listDrafts, updateDraftStatus } from './lib/drafts.js'

export default function DraftsDashboard({ onLoadDraft, onNewArticle, userRole }) {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = async () => {
    setLoading(true)
    try {
      const data = await listDrafts()
      setDrafts(data)
    } catch (err) {
      setError('Failed to load drafts')
      console.error('Failed to load drafts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (draftId) => {
    try {
      await updateDraftStatus(draftId, 'archived')
      setDrafts(prev => prev.filter(d => d.id !== draftId))
    } catch (err) {
      console.error('Failed to archive draft:', err)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const statusLabel = (status) => {
    if (status === 'submitted') return { text: 'Ready for Review', color: 'bg-orange-100 text-orange-700' }
    if (status === 'complete') return { text: 'Complete', color: 'bg-green-100 text-green-700' }
    if (status === 'archived') return { text: 'Archived', color: 'bg-gray-100 text-gray-500' }
    return { text: 'In progress', color: 'bg-blue-100 text-blue-700' }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Your Drafts</h2>
          <p className="text-sm text-gray-500">
            {(userRole === 'editor' || userRole === 'admin') ? 'Showing all team drafts' : 'Showing your drafts'}
          </p>
        </div>
        <button
          onClick={onNewArticle}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          + New Article
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 text-center py-8">Loading drafts...</p>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center py-8">{error}</p>
      )}

      {!loading && !error && drafts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-3">No drafts yet</p>
          <button
            onClick={onNewArticle}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
          >
            Start your first article
          </button>
        </div>
      )}

      {!loading && drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map(draft => {
            const status = statusLabel(draft.status)
            return (
              <div
                key={draft.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onLoadDraft(draft)}
                      className="text-left w-full"
                    >
                      <h3 className="font-semibold text-gray-900 truncate">
                        {draft.article_title || 'Untitled draft'}
                      </h3>
                      {draft.author_name && (userRole === 'editor' || userRole === 'admin') && (
                        <p className="text-xs text-gray-400 mt-0.5">by {draft.author_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Last edited {formatDate(draft.updated_at)}
                      </p>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.text}
                    </span>
                    <button
                      onClick={() => handleArchive(draft.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      title="Archive this draft"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
