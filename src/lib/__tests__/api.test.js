import { describe, it, expect } from 'vitest'
import { extractSlug } from '../api.js'

describe('extractSlug', () => {
  // Should extract slug from standard YYYY/MM/slug format
  it('extracts slug from YYYY/MM/slug URL', () => {
    expect(extractSlug('https://planetdetroit.org/2025/01/water-crisis-update/')).toBe('water-crisis-update')
  })

  // Should handle YYYY/MM/DD/slug format (some older URLs)
  it('extracts slug from YYYY/MM/DD/slug URL', () => {
    expect(extractSlug('https://planetdetroit.org/2024/03/15/dte-rate-increase/')).toBe('dte-rate-increase')
  })

  // Should strip trailing slashes from the slug
  it('strips trailing slash', () => {
    expect(extractSlug('https://planetdetroit.org/2025/02/pfas-contamination/')).toBe('pfas-contamination')
  })

  // Should return null for non-PD URLs
  it('returns null for invalid URLs', () => {
    expect(extractSlug('https://example.com/article')).toBeNull()
  })

  // Should return null for PD URLs without proper date path
  it('returns null for PD URLs without date path', () => {
    expect(extractSlug('https://planetdetroit.org/about/')).toBeNull()
  })

  // Should handle URL without trailing slash
  it('handles URL without trailing slash', () => {
    expect(extractSlug('https://planetdetroit.org/2025/06/some-article')).toBe('some-article')
  })
})
