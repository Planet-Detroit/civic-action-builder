import { API_BASE, API_KEY } from './constants.js'

// Extract slug from a Planet Detroit URL
// Handles both YYYY/MM/slug and YYYY/MM/DD/slug formats
export function extractSlug(url) {
  const match = url.match(/planetdetroit\.org\/\d{4}\/\d{2}\/(?:\d{2}\/)?([^\/]+)/)
  if (!match) return null
  return match[1].replace(/\/$/, '')
}

export async function fetchArticleFromWordPress(url) {
  const slug = extractSlug(url)
  if (!slug) throw new Error('Invalid Planet Detroit URL format. Expected: planetdetroit.org/YYYY/MM/article-slug/')

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

export async function analyzeArticle(articleText) {
  const headers = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`
  const response = await fetch(`${API_BASE}/api/analyze-article`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ article_text: articleText })
  })
  if (!response.ok) throw new Error('Analysis failed')
  return response.json()
}

export async function fetchAllMeetings() {
  const response = await fetch(`${API_BASE}/api/meetings?status=upcoming&limit=100`)
  if (!response.ok) return { meetings: [] }
  return response.json()
}

export async function fetchAllCommentPeriods() {
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

export async function fetchAllOrganizations() {
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

export async function fetchAllOfficials() {
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
        party: o.party === 'Democratic' ? 'D' : o.party === 'Republican' ? 'R' : o.party?.charAt(0) || '',
        committees: o.committees || [],
      }))
    }
  } catch (e) {
    console.log('Officials endpoint not available')
  }
  return []
}
