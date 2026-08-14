// @vitest-environment happy-dom

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))

const mockToast = vi.hoisted(() => vi.fn())

vi.mock('strata', async () => {
  const actual = await vi.importActual<typeof import('strata')>('strata')
  return {
    ...actual,
    useToast: () => mockToast,
  }
})

vi.mock('@/lib/feedback/compress', () => ({
  compressImages: vi.fn(async () => []),
  MAX_INPUT_FILES: 4,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import { FeedbackButton } from '../feedback-button'

describe('<FeedbackButton variant="sidebar" />', () => {
  beforeEach(() => {
    cleanup()
    mockGetUser.mockReset()
    mockToast.mockReset()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'jp@ejemplo.com' } },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a button labeled "Feedback"', () => {
    render(<FeedbackButton variant="sidebar" />)
    expect(screen.getByRole('button', { name: /Feedback/ })).toBeTruthy()
  })

  it('opens the feedback modal when clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackButton variant="sidebar" />)
    const trigger = screen.getByRole('button', { name: /Feedback/ })
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: /Enviar feedback/ })).toBeTruthy()
    expect(screen.getByPlaceholderText(/Cuéntanos/)).toBeTruthy()
  })
})

describe('<FeedbackButton variant="mobile" />', () => {
  beforeEach(() => {
    cleanup()
    mockGetUser.mockReset()
    mockToast.mockReset()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'jp@ejemplo.com' } },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a menu item that opens the modal when clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackButton variant="mobile" />)
    const trigger = screen.getByRole('button', { name: /Feedback/ })
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: /Enviar feedback/ })).toBeTruthy()
  })
})