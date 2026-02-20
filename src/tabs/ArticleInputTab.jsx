import { useState } from 'react'
import { fetchArticleFromWordPress, analyzeArticle } from '../lib/api.js'

export default function ArticleInputTab({ articleData, setArticleData, analysis, setAnalysis, onAnalyze }) {
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
