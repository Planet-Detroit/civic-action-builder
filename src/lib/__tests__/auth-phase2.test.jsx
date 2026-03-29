import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import LoginPage from '../../LoginPage.jsx'

// ============================================================
// Phase 2 Tests — Civic Action Builder Dual Auth
// ============================================================

const mockSignInWithOtp = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({
    auth: {
      signInWithOtp: (...args) => mockSignInWithOtp(...args),
    },
  }),
}))

// Mock fetch for guest password login
const originalFetch = global.fetch
beforeEach(() => {
  vi.clearAllMocks()
  cleanup()
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url === '/api/auth/login') return Promise.resolve({ ok: true })
    return Promise.resolve({ ok: false })
  })
})

describe('LoginPage — dual auth options', () => {
  it('shows both magic link and password login options', () => {
    render(<LoginPage onGuestLogin={() => {}} />)
    expect(screen.getByText(/sign in with email/i)).toBeInTheDocument()
    expect(screen.getByText(/sign in with password/i)).toBeInTheDocument()
  })

  it('magic link form appears when email option clicked', () => {
    render(<LoginPage onGuestLogin={() => {}} />)
    fireEvent.click(screen.getByText(/sign in with email/i))
    expect(screen.getByPlaceholderText(/planetdetroit\.org/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument()
  })

  it('password form appears when password option clicked', () => {
    render(<LoginPage onGuestLogin={() => {}} />)
    fireEvent.click(screen.getByText(/sign in with password/i))
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
  })

  it('sends magic link OTP for valid email', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage onGuestLogin={() => {}} />)

    fireEvent.click(screen.getByText(/sign in with email/i))
    fireEvent.change(screen.getByPlaceholderText(/planetdetroit\.org/i), {
      target: { value: 'dustin@planetdetroit.org' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'dustin@planetdetroit.org' })
      )
    })
  })

  it('shows check your email after sending magic link', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage onGuestLogin={() => {}} />)

    fireEvent.click(screen.getByText(/sign in with email/i))
    fireEvent.change(screen.getByPlaceholderText(/planetdetroit\.org/i), {
      target: { value: 'dustin@planetdetroit.org' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('guest password login calls api/auth/login', async () => {
    const onGuestLogin = vi.fn()
    render(<LoginPage onGuestLogin={onGuestLogin} />)

    fireEvent.click(screen.getByText(/sign in with password/i))
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
      }))
      expect(onGuestLogin).toHaveBeenCalled()
    })
  })

  it('shows error for unregistered email', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: 'Signups not allowed for otp' },
    })
    render(<LoginPage onGuestLogin={() => {}} />)

    fireEvent.click(screen.getByText(/sign in with email/i))
    fireEvent.change(screen.getByPlaceholderText(/planetdetroit\.org/i), {
      target: { value: 'stranger@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText(/email not recognized/i)).toBeInTheDocument()
    })
  })
})
