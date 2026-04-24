import { useState } from 'react'
import { getSupabase } from './lib/supabase.js'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = getSupabase()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    if (err) {
      if (err.message?.includes('Signups not allowed') || err.message?.includes('not allowed')) {
        setError('Email not recognized. Contact your editor for access.')
      } else {
        setError(err.message)
      }
    } else {
      setEmailSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Planet Detroit</h1>
          <p className="text-sm text-gray-500 mt-1">Civic Action Builder</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!emailSent ? (
            <form onSubmit={handleMagicLink}>
              <p className="text-sm text-gray-600 mb-4">Enter your email to receive a sign-in link.</p>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@planetdetroit.org"
                autoFocus
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-4 w-full py-2 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          ) : (
            <div className="text-center py-2">
              <p className="text-base font-medium text-blue-600">Check your email</p>
              <p className="text-sm text-gray-500 mt-2">
                We sent a sign-in link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail('') }}
                className="mt-4 text-sm text-blue-600 underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
