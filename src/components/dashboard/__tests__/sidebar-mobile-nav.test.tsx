// @vitest-environment happy-dom

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'strata'

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

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

vi.mock('@/app/(auth)/login/actions', () => ({
  signOut: vi.fn(),
}))

import { Sidebar } from '../sidebar'
import { MobileNav } from '../mobile-nav'

function withProviders(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>
}

describe('<Sidebar />', () => {
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

  it('still renders ThemeToggle, SignOutButton, and FeedbackButton', () => {
    render(withProviders(<Sidebar userEmail="jp@ejemplo.com" />))
    expect(screen.getByRole('button', { name: /Feedback/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cambiar a/ })).toBeTruthy()
  })

  it('opens the feedback modal from the sidebar entry', async () => {
    const user = userEvent.setup()
    render(withProviders(<Sidebar userEmail="jp@ejemplo.com" />))
    const trigger = screen.getByRole('button', { name: /Feedback/ })
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: /Enviar feedback/ })).toBeTruthy()
  })
})

describe('<MobileNav />', () => {
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

  it('opens the Más bottom sheet with a Feedback entry', async () => {
    const user = userEvent.setup()
    render(withProviders(<MobileNav />))
    const masTrigger = screen.getByRole('button', { name: /Más/ })
    await user.click(masTrigger)
    await waitFor(() => {
      expect(screen.getByText('Feedback')).toBeTruthy()
    })
  })

  it('opens the feedback modal from the Más sheet Feedback entry', async () => {
    const user = userEvent.setup()
    render(withProviders(<MobileNav />))
    const masTrigger = screen.getByRole('button', { name: /Más/ })
    await user.click(masTrigger)
    const feedbackBtn = await screen.findByText('Feedback')
    await user.click(feedbackBtn)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: /Enviar feedback/ })).toBeTruthy()
  })
})