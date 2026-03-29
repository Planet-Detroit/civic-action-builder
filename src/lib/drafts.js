import { getSupabase } from './supabase.js'

// Save or update a draft in Supabase
// Returns the draft id (existing or newly created)
export async function saveDraft({ draftId, userId, articleTitle, articleUrl, status, draftData }) {
  const supabase = getSupabase()

  if (draftId) {
    // Update existing draft
    const { error } = await supabase
      .from('civic_action_drafts')
      .update({
        article_title: articleTitle || null,
        article_url: articleUrl || null,
        status: status || 'in-progress',
        draft_data: draftData,
      })
      .eq('id', draftId)

    if (error) throw error
    return draftId
  }

  // Create new draft
  const { data, error } = await supabase
    .from('civic_action_drafts')
    .insert({
      user_id: userId,
      article_title: articleTitle || null,
      article_url: articleUrl || null,
      status: status || 'in-progress',
      draft_data: draftData,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// Load a single draft by id
export async function loadDraft(draftId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('civic_action_drafts')
    .select('*')
    .eq('id', draftId)
    .single()

  if (error) throw error
  return data
}

// List drafts for the dashboard
// Editors/admins see all drafts; reporters see only their own (enforced by RLS)
export async function listDrafts() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('civic_action_drafts')
    .select(`
      id,
      article_title,
      article_url,
      status,
      created_at,
      updated_at,
      user_id,
      user_roles!inner(display_name)
    `)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) {
    // If the join fails (e.g., no user_roles entry), try without join
    const { data: fallback, error: fallbackError } = await supabase
      .from('civic_action_drafts')
      .select('id, article_title, article_url, status, created_at, updated_at, user_id')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

    if (fallbackError) throw fallbackError
    return fallback.map(d => ({ ...d, author_name: 'Unknown' }))
  }

  return data.map(d => ({
    ...d,
    author_name: d.user_roles?.display_name || 'Unknown',
    user_roles: undefined,
  }))
}

// Update draft status (e.g., mark as complete or archived)
export async function updateDraftStatus(draftId, status) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('civic_action_drafts')
    .update({ status })
    .eq('id', draftId)

  if (error) throw error
}
