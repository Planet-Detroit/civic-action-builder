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

    if (error) {
      console.error('Draft update failed:', error.message, error.details)
      throw error
    }
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

  if (error) {
    console.error('Draft insert failed:', error.message, error.details)
    throw error
  }
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

  // Simple query without joins — get drafts, then look up author names separately
  const { data, error } = await supabase
    .from('civic_action_drafts')
    .select('id, article_title, article_url, status, created_at, updated_at, user_id')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('List drafts failed:', error.message)
    throw error
  }

  if (!data || data.length === 0) return []

  // Look up author names from user_roles
  const userIds = [...new Set(data.map(d => d.user_id))]
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, display_name')
    .in('user_id', userIds)

  const nameMap = {}
  if (roles) {
    for (const r of roles) nameMap[r.user_id] = r.display_name
  }

  return data.map(d => ({
    ...d,
    author_name: nameMap[d.user_id] || 'Unknown',
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
