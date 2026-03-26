import { useState, useEffect } from 'react'
import { fetchCivicResponseStats } from '../lib/api.js'

export default function AnalyticsTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchCivicResponseStats()
      .then(data => { setStats(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-pd-text-light">Loading analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-red-600">Failed to load analytics: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-pd-blue">{stats.total}</p>
          <p className="text-sm text-pd-text-light mt-1">Total Responses</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-pd-blue">{stats.last_30_days}</p>
          <p className="text-sm text-pd-text-light mt-1">Last 30 Days</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-pd-blue">{stats.last_7_days}</p>
          <p className="text-sm text-pd-text-light mt-1">Last 7 Days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top articles by responses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-heading font-bold text-lg text-pd-text mb-4">Top Articles by Civic Responses</h2>
          {stats.by_article.length === 0 ? (
            <p className="text-pd-text-light text-sm">No responses yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.by_article.map((article, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="bg-pd-blue text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">{article.count}</span>
                  <div className="min-w-0">
                    <a
                      href={article.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-pd-blue hover:underline font-medium truncate block"
                    >
                      {article.article_title || article.article_url}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent responses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-heading font-bold text-lg text-pd-text mb-4">Recent Reader Responses</h2>
          {stats.recent_responses.length === 0 ? (
            <p className="text-pd-text-light text-sm">No responses yet.</p>
          ) : (
            <ul className="space-y-4">
              {stats.recent_responses.map((resp, i) => (
                <li key={i} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="text-sm text-pd-text">&ldquo;{resp.message}&rdquo;</p>
                  <p className="text-xs text-pd-text-light mt-1">
                    {resp.article_title && <span>{resp.article_title} &middot; </span>}
                    {new Date(resp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* GA4 setup guidance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="font-heading font-bold text-lg text-pd-text mb-3">GA4 Event Tracking Setup</h2>
        <p className="text-sm text-pd-text mb-4">
          The civic action box fires GA4 events when readers interact with checkboxes and the thumbs-up button.
          To see event parameter breakdowns in GA4, you need to register custom dimensions.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Required: Register Custom Dimensions in GA4</p>
          <p className="text-xs text-amber-700 mb-3">
            Go to <strong>GA4 Admin &rarr; Custom definitions &rarr; Custom dimensions</strong> and create these three:
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-amber-800">
                <th className="pb-1 font-semibold">Dimension name</th>
                <th className="pb-1 font-semibold">Event parameter</th>
                <th className="pb-1 font-semibold">Scope</th>
              </tr>
            </thead>
            <tbody className="text-amber-700">
              <tr><td className="py-0.5">Action Label</td><td><code>action_label</code></td><td>Event</td></tr>
              <tr><td className="py-0.5">Action Detail</td><td><code>action_detail</code></td><td>Event</td></tr>
              <tr><td className="py-0.5">Article URL</td><td><code>article_url</code></td><td>Event</td></tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-pd-text mb-2">Checkbox Events</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 text-pd-text-light">Check:</td><td><code className="text-pd-blue">civic_action_taken</code></td></tr>
                <tr><td className="py-0.5 text-pd-text-light">Uncheck:</td><td><code className="text-pd-blue">civic_action_untaken</code></td></tr>
              </tbody>
            </table>
            <p className="text-xs text-pd-text-light mt-2">Parameters: <code>action_label</code>, <code>action_detail</code>, <code>article_url</code></p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-pd-text mb-2">Thumbs-Up Events</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 text-pd-text-light">Click:</td><td><code className="text-pd-blue">civic_action_thumbsup</code></td></tr>
                <tr><td className="py-0.5 text-pd-text-light">Remove:</td><td><code className="text-pd-blue">civic_action_thumbsup_removed</code></td></tr>
              </tbody>
            </table>
            <p className="text-xs text-pd-text-light mt-2">Parameters: <code>article_url</code></p>
          </div>
        </div>

        <p className="text-xs text-pd-text-light mt-4">
          View these events in <strong>GA4 &rarr; Reports &rarr; Engagement &rarr; Events</strong>. Click an event name to see breakdowns by action_label and action_detail.
        </p>
      </div>
    </div>
  )
}
