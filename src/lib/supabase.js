import { createBrowserClient } from '@supabase/ssr'

let _supabase = null

export function getSupabase() {
  if (!_supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    }
    _supabase = createBrowserClient(url, key)
  }
  return _supabase
}
