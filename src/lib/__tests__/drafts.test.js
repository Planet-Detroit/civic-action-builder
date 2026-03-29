import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Phase 3 Tests — Draft Persistence
// ============================================================

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockNeq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockIn = vi.fn()

vi.mock('../supabase.js', () => ({
  getSupabase: () => ({
    from: (table) => ({
      insert: (...args) => {
        mockInsert(...args)
        return { select: () => ({ single: () => mockSingle() }) }
      },
      update: (...args) => {
        mockUpdate(...args)
        return { eq: () => mockEq() }
      },
      select: (...args) => {
        mockSelect(...args)
        return {
          eq: (...eqArgs) => {
            mockEq(...eqArgs)
            return { single: () => mockSingle() }
          },
          neq: (...neqArgs) => {
            mockNeq(...neqArgs)
            return {
              order: (...orderArgs) => {
                mockOrder(...orderArgs)
                return mockOrder()
              }
            }
          },
          in: (...inArgs) => {
            mockIn(...inArgs)
            return mockIn()
          },
        }
      },
    }),
  }),
}))

describe('saveDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { id: 'new-draft-uuid' }, error: null })
    mockEq.mockResolvedValue({ error: null })
  })

  it('creates a new draft when no draftId', async () => {
    const { saveDraft } = await import('../drafts.js')

    const id = await saveDraft({
      userId: 'user-123',
      articleTitle: 'Test Article',
      articleUrl: 'https://example.com',
      draftData: { meetings: [], organizations: [] },
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        article_title: 'Test Article',
        status: 'in-progress',
      })
    )
    expect(id).toBe('new-draft-uuid')
  })

  it('updates existing draft when draftId provided', async () => {
    const { saveDraft } = await import('../drafts.js')

    const id = await saveDraft({
      draftId: 'existing-draft-uuid',
      userId: 'user-123',
      articleTitle: 'Updated Title',
      draftData: { meetings: [{ id: 1 }] },
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ article_title: 'Updated Title' })
    )
    expect(id).toBe('existing-draft-uuid')
  })
})

describe('listDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns drafts with author names', async () => {
    const mockDrafts = [
      { id: '1', article_title: 'Recent', updated_at: '2026-03-29', user_id: 'u1' },
      { id: '2', article_title: 'Older', updated_at: '2026-03-28', user_id: 'u2' },
    ]
    mockOrder.mockResolvedValue({ data: mockDrafts, error: null })
    mockIn.mockResolvedValue({ data: [
      { user_id: 'u1', display_name: 'Dustin' },
      { user_id: 'u2', display_name: 'Brian' },
    ]})

    const { listDrafts } = await import('../drafts.js')
    const drafts = await listDrafts()

    expect(mockNeq).toHaveBeenCalledWith('status', 'archived')
    expect(drafts[0].article_title).toBe('Recent')
    expect(drafts[0].author_name).toBe('Dustin')
    expect(drafts[1].author_name).toBe('Brian')
  })
})

describe('updateDraftStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
  })

  it('updates draft status', async () => {
    const { updateDraftStatus } = await import('../drafts.js')
    await updateDraftStatus('draft-123', 'complete')

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'complete' })
  })
})
