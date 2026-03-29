import { useState } from 'react'
import { getSupabase } from './lib/supabase.js'

export default function LoginPage({ onLogin, onGuestLogin }) {
  const [mode, setMode] = useState(null) // null = choose, 'email' = magic link, 'password' = guest
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Magic link login for team members
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

  // Guest password login (existing flow for grant reviewers)
  const handleGuestLogin = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, userId: 'Guest' }),
      })
      if (res.ok) {
        onGuestLogin()
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Mode selector — shown when no mode chosen */}
          {mode === null && (
            <>
              <p className="text-sm text-gray-600 mb-4 text-center">How would you like to sign in?</p>
              <button
                onClick={() => setMode('email')}
                className="w-full py-2 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Sign in with email
              </button>
              <button
                onClick={() => setMode('password')}
                className="mt-3 w-full py-2 px-4 bg-white text-slate-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Sign in with password
              </button>
              <p className="mt-4 text-xs text-gray-400 text-center">
                Team members use email. Grant reviewers use password.
              </p>
            </>
          )}

          {/* Magic link form */}
          {mode === 'email' && !emailSent && (
            <form onSubmit={handleMagicLink}>
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
              <button
                type="button"
                onClick={() => { setMode(null); setError('') }}
                className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600"
              >
                Back
              </button>
            </form>
          )}

          {/* Magic link sent confirmation */}
          {mode === 'email' && emailSent && (
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

          {/* Guest password form */}
          {mode === 'password' && (
            <form onSubmit={handleGuestLogin}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter shared password"
                autoFocus
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password}
                className="mt-4 w-full py-2 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setMode(null); setError('') }}
                className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
