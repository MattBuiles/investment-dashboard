import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364606060f8cf80020003000100679d8df50000000049454e44ae426082',
  'hex',
)

function b64(buf: Buffer): string {
  return buf.toString('base64')
}

function postJson(body: unknown): Request {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function mockAuthAs(
  user: { id: string; email: string } | { id: string } | null,
): { getUser: ReturnType<typeof vi.fn> } {
  const getUser = vi.fn().mockResolvedValue({ data: { user } })
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue({ auth: { getUser } }),
  }))
  return { getUser }
}

function mockRateLimit(result: {
  success: boolean
  limit?: number
  remaining?: number
  reset?: number
}): void {
  const full = {
    success: result.success,
    limit: result.limit ?? 5,
    remaining: result.remaining ?? 0,
    reset: result.reset ?? 0,
  }
  vi.doMock('@/lib/rate-limit', () => ({
    getFeedbackRateLimiter: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(full)),
  }))
}

function mockSend(
  impl: () => Promise<{ id: string }>,
): { sendFeedbackEmail: ReturnType<typeof vi.fn> } {
  const sendFeedbackEmail = vi.fn(impl)
  vi.doMock('@/lib/feedback/send', () => ({
    sendFeedbackEmail,
  }))
  return { sendFeedbackEmail }
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('FEEDBACK_INBOX', 'feedback@example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@/lib/supabase/server')
    vi.doUnmock('@/lib/rate-limit')
    vi.doUnmock('@/lib/feedback/send')
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('returns 401 when no user is signed in', async () => {
    mockAuthAs(null)
    mockRateLimit({ success: true })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(postJson({ message: 'hola', pageUrl: 'https://x.com' }))

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ ok: false, error: 'Not signed in.' })
  })

  it('returns 401 when the user has no email (phone-only account)', async () => {
    mockAuthAs({ id: 'u-phone-1' })
    mockRateLimit({ success: true })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(postJson({ message: 'hola', pageUrl: 'https://x.com' }))

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ ok: false, error: 'Not signed in.' })
  })

  it('returns 429 when rate limit fails', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: false, limit: 5, remaining: 0, reset: 0 })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(postJson({ message: 'hola', pageUrl: 'https://x.com' }))

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json).toEqual({
      ok: false,
      error: 'Demasiados envíos. Probá más tarde.',
    })
  })

  it('returns 400 with schema details when message is empty', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(postJson({ message: '', pageUrl: 'https://x.com' }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toBe('Datos inválidos')
    expect(json.details).toBeDefined()
  })

  it('returns 400 when more than 4 images are sent', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })

    const fiveImages = Array.from({ length: 5 }, (_, i) => ({
      filename: `a${i}.png`,
      contentType: 'image/png',
      dataBase64: b64(PNG_1x1),
    }))

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({ message: 'm', pageUrl: 'https://x.com', images: fiveImages }),
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toBe('Datos inválidos')
  })

  it('returns 400 when an image contentType is not allowed', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [{ filename: 'a.gif', contentType: 'image/gif', dataBase64: b64(PNG_1x1) }],
      }),
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toBe('Datos inválidos')
  })

  it('returns 400 when a decoded image exceeds 1MB', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })

    const huge = Buffer.alloc(1024 * 1024 + 1024, 0)
    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [{ filename: 'a.png', contentType: 'image/png', dataBase64: b64(huge) }],
      }),
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toBe('Datos inválidos')
  })

  it('returns 400 when magic bytes do not match the declared contentType', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [
          {
            filename: 'photo.jpg',
            contentType: 'image/jpeg',
            dataBase64: b64(PNG_1x1),
          },
        ],
      }),
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toMatch(/imagen\s*1/i)
  })

  it('returns 200 happy path and calls sendFeedbackEmail with correct args', async () => {
    mockAuthAs({ id: 'u-123', email: 'user@example.com' })
    mockRateLimit({ success: true })
    const { sendFeedbackEmail } = mockSend(async () => ({ id: 'msg-xyz' }))

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'Hola, hay un bug.',
        pageUrl: 'https://dashboard.example.com/overview',
        images: [
          {
            filename: 'shot.png',
            contentType: 'image/png',
            dataBase64: b64(PNG_1x1),
          },
        ],
      }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })

    expect(sendFeedbackEmail).toHaveBeenCalledTimes(1)
    const args = sendFeedbackEmail.mock.calls[0]?.[0]
    expect(args).toBeDefined()
    expect(args.message).toBe('Hola, hay un bug.')
    expect(args.pageUrl).toBe('https://dashboard.example.com/overview')
    expect(args.user).toEqual({
      id: 'u-123',
      email: 'user@example.com',
      displayName: undefined,
    })
    expect(args.images).toHaveLength(1)
    expect(args.images[0].filename).toBe('shot.png')
    expect(args.images[0].contentType).toBe('image/png')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('returns 502 and logs when sendFeedbackEmail throws FeedbackSendError', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })
    mockSend(async () => {
      throw new Error('Resend error: validation')
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [
          { filename: 'a.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
        ],
      }),
    )

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json).toEqual({ ok: false, error: 'No se pudo enviar el feedback.' })

    expect(errorSpy).toHaveBeenCalled()
    const lastCall = errorSpy.mock.calls[errorSpy.mock.calls.length - 1]
    const args = lastCall ?? []
    const messageText = args.map((a) => String(a ?? '')).join(' ')
    expect(messageText).toContain('Resend error: validation')
    expect(messageText).toContain('u-1')
  })

  it('returns 502 and logs when sendFeedbackEmail throws a generic error', async () => {
    mockAuthAs({ id: 'u-1', email: 'u@example.com' })
    mockRateLimit({ success: true })
    mockSend(async () => {
      throw new Error('boom')
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [],
      }),
    )

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json).toEqual({ ok: false, error: 'No se pudo enviar el feedback.' })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('uses user.id (not any value from the body) as the rate-limit key', async () => {
    const { getUser } = mockAuthAs({ id: 'real-user-id', email: 'u@example.com' })
    const rlFn = vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })
    vi.doMock('@/lib/rate-limit', () => ({
      getFeedbackRateLimiter: vi.fn().mockReturnValue(rlFn),
    }))
    mockSend(async () => ({ id: 'msg-1' }))

    const { POST } = await import('@/app/api/feedback/route')
    await POST(
      postJson({
        message: 'm',
        pageUrl: 'https://x.com',
        images: [],
      }),
    )

    expect(getUser).toHaveBeenCalled()
    expect(rlFn).toHaveBeenCalledWith('real-user-id')
  })
})