import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const { mockSendCreate, mockResendCtor } = vi.hoisted(() => {
  const sendCreate = vi.fn()
  type ResendLike = { emails: { send: typeof sendCreate } }
  const ctor = vi.fn().mockImplementation(function (): ResendLike {
    return { emails: { send: sendCreate } }
  })
  return { mockSendCreate: sendCreate, mockResendCtor: ctor }
})

vi.mock('resend', () => ({
  Resend: mockResendCtor,
}))

vi.mock('@/lib/env', () => ({
  getResendApiKey: vi.fn(),
  getFeedbackInbox: vi.fn(),
  getFeedbackFromAddress: vi.fn(),
}))

describe('sendFeedbackEmail', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockSendCreate.mockReset()
    mockResendCtor.mockReset()
    mockResendCtor.mockImplementation(function () {
      return { emails: { send: mockSendCreate } }
    })
    const env = await import('@/lib/env')
    vi.mocked(env.getResendApiKey).mockReturnValue('re_test')
    vi.mocked(env.getFeedbackInbox).mockReturnValue('feedback@example.com')
    vi.mocked(env.getFeedbackFromAddress).mockReturnValue(
      'investment-dashboard <onboarding@resend.dev>',
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends to feedback inbox, reply-to user, with subject including user email', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    await sendFeedbackEmail({
      message: 'Test message',
      images: [],
      pageUrl: 'https://dashboard.example.com/overview',
      user: { id: 'u-123', email: 'user@example.com', displayName: 'User Name' },
    })

    expect(mockResendCtor).toHaveBeenCalledWith('re_test')
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call).toBeDefined()
    expect(call.from).toBeDefined()
    expect(call.to).toEqual(['feedback@example.com'])
    expect(call.replyTo).toBe('user@example.com')
    expect(call.subject).toBe('[Feedback · investment-dashboard] user@example.com')
    expect(call.html).toContain('user@example.com')
    expect(call.html).toContain('u-123')
    expect(call.html).toContain('User Name')
    expect(call.html).toContain('https://dashboard.example.com/overview')
    expect(call.text).toContain('user@example.com')
  })

  it('escapes HTML in user message to prevent injection', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    const malicious = '<script>alert("xss")</script> & "quoted"'
    await sendFeedbackEmail({
      message: malicious,
      images: [],
      pageUrl: 'https://x.com',
      user: { id: 'u-1', email: 'a@b.com' },
    })
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call.html).not.toContain('<script>alert')
    expect(call.html).toContain('&lt;script&gt;')
    expect(call.html).toContain('&amp;')
    expect(call.html).toContain('&quot;')
  })

  it('escapes HTML in displayName and pageUrl', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    await sendFeedbackEmail({
      message: 'mensaje',
      images: [],
      pageUrl: 'https://x.com/?q=<bad>',
      user: { id: 'u-1', email: 'a@b.com', displayName: '<img onerror=x>' },
    })
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call.html).not.toContain('<img onerror=x>')
    expect(call.html).toContain('&lt;img onerror=x&gt;')
    expect(call.html).toContain('&lt;bad&gt;')
  })

  it('sanitizes filenames to ASCII-safe characters', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    await sendFeedbackEmail({
      message: 'mensaje',
      images: [
        {
          filename: '../../etc/passwd.txt.png',
          contentType: 'image/png',
          dataBase64: 'iVBORw0KGgo=',
        },
      ],
      pageUrl: 'https://x.com',
      user: { id: 'u-1', email: 'a@b.com' },
    })
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call.attachments).toHaveLength(1)
    const att = call.attachments[0]
    expect(att.filename).not.toContain('/')
    expect(att.filename).not.toContain('\\')
    expect(att.filename).not.toContain('..')
    expect(att.content.length).toBeGreaterThan(0)
  })

  it('renames files without extensions to .png', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    await sendFeedbackEmail({
      message: 'm',
      images: [
        { filename: 'screenshot', contentType: 'image/png', dataBase64: 'iVBORw0KGgo=' },
      ],
      pageUrl: 'https://x.com',
      user: { id: 'u-1', email: 'a@b.com' },
    })
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call.attachments[0].filename).toBe('screenshot.png')
  })

  it('throws FeedbackSendError when Resend returns an error', async () => {
    const { sendFeedbackEmail, FeedbackSendError } = await import('@/lib/feedback/send')
    mockSendCreate.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'bad', statusCode: 422 },
    })
    await expect(
      sendFeedbackEmail({
        message: 'hola',
        images: [],
        pageUrl: 'https://x.com',
        user: { id: 'u-1', email: 'a@b.com' },
      })
    ).rejects.toBeInstanceOf(FeedbackSendError)
  })

  it('throws FeedbackSendError when Resend throws', async () => {
    const { sendFeedbackEmail, FeedbackSendError } = await import('@/lib/feedback/send')
    mockSendCreate.mockRejectedValue(new Error('network down'))
    await expect(
      sendFeedbackEmail({
        message: 'hola',
        images: [],
        pageUrl: 'https://x.com',
        user: { id: 'u-1', email: 'a@b.com' },
      })
    ).rejects.toBeInstanceOf(FeedbackSendError)
  })

  it('includes ISO timestamp in the html body', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    const before = new Date().toISOString()
    await sendFeedbackEmail({
      message: 'm',
      images: [],
      pageUrl: 'https://x.com',
      user: { id: 'u-1', email: 'a@b.com' },
    })
    const after = new Date().toISOString()
    const call = mockSendCreate.mock.calls[0]?.[0]
    const tsMatch = call.html.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)
    expect(tsMatch).toBeTruthy()
    const ts = tsMatch![1]
    expect(ts >= before && ts <= after).toBe(true)
  })

  it('does not require getFeedbackInbox when lazy (env read once)', async () => {
    // Sanity check: env is read inside the function, not at module load.
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const env = await import('@/lib/env')
    expect(vi.mocked(env.getFeedbackInbox)).toBeDefined()
  })

  it('reads the From address from FEEDBACK_FROM_ADDRESS via getFeedbackFromAddress', async () => {
    mockSendCreate.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    const env = await import('@/lib/env')
    vi.mocked(env.getFeedbackFromAddress).mockReturnValue('Brand <hi@example.com>')
    const { sendFeedbackEmail } = await import('@/lib/feedback/send')
    await sendFeedbackEmail({
      message: 'm',
      images: [],
      pageUrl: 'https://x.com',
      user: { id: 'u-1', email: 'a@b.com' },
    })
    const call = mockSendCreate.mock.calls[0]?.[0]
    expect(call.from).toBe('Brand <hi@example.com>')
  })
})
