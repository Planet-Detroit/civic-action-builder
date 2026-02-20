import { describe, it, expect, beforeEach } from 'vitest'
import { loadSavedState, saveState, clearSavedState } from '../storage.js'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Round-trip: save then load should return the same data
  it('round-trips state through localStorage', () => {
    const state = { activeTab: 'builder', organizations: [{ name: 'Test' }] }
    saveState(state)
    const loaded = loadSavedState()
    expect(loaded.activeTab).toBe('builder')
    expect(loaded.organizations).toEqual([{ name: 'Test' }])
    // Should have added a timestamp
    expect(loaded.timestamp).toBeDefined()
  })

  // Should return null when nothing is saved
  it('returns null when empty', () => {
    expect(loadSavedState()).toBeNull()
  })

  // Should expire data after 7 days
  it('returns null for expired data', () => {
    const state = { activeTab: 'input', timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 }
    localStorage.setItem('civic-action-builder-state', JSON.stringify(state))
    expect(loadSavedState()).toBeNull()
    // Should also have removed it from localStorage
    expect(localStorage.getItem('civic-action-builder-state')).toBeNull()
  })

  // Should NOT expire data within 7 days
  it('returns data within expiry window', () => {
    const state = { activeTab: 'builder', timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 }
    localStorage.setItem('civic-action-builder-state', JSON.stringify(state))
    const loaded = loadSavedState()
    expect(loaded.activeTab).toBe('builder')
  })

  // clearSavedState should remove from localStorage
  it('clears saved state', () => {
    saveState({ activeTab: 'output' })
    clearSavedState()
    expect(loadSavedState()).toBeNull()
  })

  // Should handle invalid JSON gracefully
  it('returns null for invalid JSON', () => {
    localStorage.setItem('civic-action-builder-state', 'not-valid-json{{{')
    expect(loadSavedState()).toBeNull()
  })

  // New context fields round-trip through localStorage
  it('round-trips whyItMatters, whosDeciding, whatToWatch', () => {
    const state = {
      whyItMatters: 'This matters because...',
      whosDeciding: 'EGLE regulators are...',
      whatToWatch: 'Watch for the final rule.',
    }
    saveState(state)
    const loaded = loadSavedState()
    expect(loaded.whyItMatters).toBe('This matters because...')
    expect(loaded.whosDeciding).toBe('EGLE regulators are...')
    expect(loaded.whatToWatch).toBe('Watch for the final rule.')
  })

  // Fields restored after page refresh (simulated by save+load)
  it('restores all three new fields from localStorage', () => {
    const state = {
      activeTab: 'builder',
      whyItMatters: 'Context A',
      whosDeciding: 'Context B',
      whatToWatch: 'Context C',
      organizations: [{ name: 'Test Org' }],
    }
    saveState(state)
    const loaded = loadSavedState()
    expect(loaded.whyItMatters).toBe('Context A')
    expect(loaded.whosDeciding).toBe('Context B')
    expect(loaded.whatToWatch).toBe('Context C')
    expect(loaded.organizations).toEqual([{ name: 'Test Org' }])
  })
})
