// @vitest-environment happy-dom

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockCompressImages, mockGetUser } = vi.hoisted(() => {
  return {
    mockCompressImages: vi.fn(),
    mockGetUser: vi.fn(),
  }
})

const mockToast = vi.hoisted(() => vi.fn())

vi.mock('strata', async () => {
  const actual = await vi.importActual<typeof import('strata')>('strata')
  return {
    ...actual,
    useToast: () => mockToast,
  }
})

vi.mock('@/lib/feedback/compress', () => ({
  compressImages: mockCompressImages,
  MAX_INPUT_FILES: 4,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

function fakeFile(name: string, sizeBytes: number, type: string): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type })
  return file
}

function compressed(): { blob: Blob; dataBase64: string; width: number; height: number } {
  return { blob: new Blob([new Uint8Array(8)]), dataBase64: 'AAAA', width: 1, height: 1 }
}

function renderModal(overrides: { pageUrl?: string } = {}) {
  const onClose = vi.fn()
  const utils = render(
    <FeedbackModal open onClose={onClose} pageUrl={overrides.pageUrl ?? '/profile'} />,
  )
  return { onClose, ...utils }
}

async function setFiles(input: HTMLInputElement, files: File[]) {
  await userEvent.upload(input, files)
}

import { FeedbackModal } from '../feedback-modal'

describe('<FeedbackModal />', () => {
  beforeEach(() => {
    cleanup()
    mockCompressImages.mockReset()
    mockGetUser.mockReset()
    mockToast.mockReset()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'jp@ejemplo.com' } },
    })
    mockCompressImages.mockImplementation(async (files: File[]) =>
      files.map(() => compressed())
    )
    if (typeof window !== 'undefined' && !window.crypto) {
      // happy-dom provides crypto.randomUUID via global
    }
    vi.spyOn(window, 'fetch').mockReset()
  })

  it('shows identity chip with the auth email', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/jp@ejemplo\.com/)).toBeTruthy()
    })
    expect(screen.getByText(/Enviando como:/)).toBeTruthy()
  })

  it('updates character counter when typing in the textarea', async () => {
    const user = userEvent.setup()
    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')
    expect(screen.getByText('4/2000')).toBeTruthy()
    await user.type(textarea, ' mundo')
    expect(screen.getByText('10/2000')).toBeTruthy()
  })

  it('keeps submit disabled when message is empty', async () => {
    renderModal()
    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })

  it('removes a file from the list when clicking trash button', async () => {
    const user = userEvent.setup()
    renderModal()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await setFiles(fileInput, [
      fakeFile('a.png', 1024, 'image/png'),
      fakeFile('b.png', 2048, 'image/png'),
    ])
    await waitFor(() => {
      expect(screen.getByText('a.png')).toBeTruthy()
      expect(screen.getByText('b.png')).toBeTruthy()
    })
    const removeButtons = screen.getAllByRole('button', { name: /eliminar/i })
    await user.click(removeButtons[0])
    expect(screen.queryByText('a.png')).toBeNull()
    expect(screen.getByText('b.png')).toBeTruthy()
  })

  it('happy path: posts feedback, shows success toast, closes and resets form', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 })
    )
    vi.spyOn(window, 'fetch').mockImplementation(fetchSpy as unknown as typeof fetch)

    const { onClose } = renderModal({ pageUrl: '/profile' })

    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await setFiles(fileInput, [fakeFile('shot.png', 4096, 'image/png')])

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/feedback')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['Idempotency-Key']).toEqual(expect.any(String))
    expect(init.headers['Idempotency-Key'].length).toBeGreaterThan(0)

    const body = JSON.parse(init.body)
    expect(body.message).toBe('hola')
    expect(body.pageUrl).toBe('/profile')
    expect(body.images).toEqual([
      { filename: 'shot.png', contentType: 'image/jpeg', dataBase64: 'AAAA' },
    ])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'success', message: expect.stringMatching(/Gracias/) })
      )
    })
    expect(onClose).toHaveBeenCalled()

    expect(screen.queryByText(/hola/)).toBeNull()
  })

  it('shows toast.error and does NOT redirect when API returns 429', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(null, { status: 429 }) as unknown as Response
    )

    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: '', assign: assignSpy },
      writable: true,
    })

    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'error', message: expect.stringMatching(/Demasiados envíos/) })
      )
    })
    expect(assignSpy).not.toHaveBeenCalled()
    expect(window.location.href).not.toBe('/login')
  })

  it('shows toast.error and redirects to /login when API returns 401', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }) as unknown as Response
    )

    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'error', message: expect.stringMatching(/sesión expiró/) })
      )
    })
    expect(window.location.href).toBe('/login')
  })

  it('shows toast.error with retry message when API returns 502', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(null, { status: 502 }) as unknown as Response
    )

    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'error', message: expect.stringMatching(/Reintentá/) })
      )
    })
  })

  it('shows UNSUPPORTED_TYPE toast.error when compressImages rejects', async () => {
    const user = userEvent.setup()
    mockCompressImages.mockRejectedValueOnce(new Error('UNSUPPORTED_TYPE'))
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }) as unknown as Response
    )

    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await setFiles(fileInput, [fakeFile('shot.png', 1024, 'image/png')])

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'error',
          message: expect.stringMatching(/Formato no soportado/),
        })
      )
    })
    expect(window.fetch).not.toHaveBeenCalled()
  })

  it('keeps submit disabled while the request is in-flight', async () => {
    const user = userEvent.setup()
    let resolveFetch!: (v: Response) => void
    vi.spyOn(window, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    const { onClose } = renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => expect(submit.disabled).toBe(true))
    resolveFetch(new Response(null, { status: 200 }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('sends an Idempotency-Key header', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 })
    )
    vi.spyOn(window, 'fetch').mockImplementation(fetchSpy as unknown as typeof fetch)

    renderModal()
    const textarea = await screen.findByPlaceholderText(/Cuéntanos/)
    await user.type(textarea, 'hola')

    const submit = (await screen.findByRole('button', { name: /enviar feedback/i })) as HTMLButtonElement
    await waitFor(() => expect(submit.disabled).toBe(false))
    await user.click(submit)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const [, init] = fetchSpy.mock.calls[0]
    expect(init.headers['Idempotency-Key']).toMatch(/.+/)
  })
})