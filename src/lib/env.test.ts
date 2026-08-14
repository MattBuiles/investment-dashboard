import { describe, expect, it, afterEach, vi } from 'vitest'

describe('env getters', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns Resend API key when set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_123')
    const { getResendApiKey } = await import('@/lib/env')
    expect(getResendApiKey()).toBe('re_test_123')
  })

  it('throws when Resend API key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const { getResendApiKey } = await import('@/lib/env')
    expect(() => getResendApiKey()).toThrow(/RESEND_API_KEY/)
  })

  it('returns feedback inbox when set', async () => {
    vi.stubEnv('FEEDBACK_INBOX', 'feedback@example.com')
    const { getFeedbackInbox } = await import('@/lib/env')
    expect(getFeedbackInbox()).toBe('feedback@example.com')
  })

  it('throws when feedback inbox is missing', async () => {
    vi.stubEnv('FEEDBACK_INBOX', '')
    const { getFeedbackInbox } = await import('@/lib/env')
    expect(() => getFeedbackInbox()).toThrow(/FEEDBACK_INBOX/)
  })

  it('returns Upstash Redis URL when set', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
    const { getUpstashRedisUrl } = await import('@/lib/env')
    expect(getUpstashRedisUrl()).toBe('https://example.upstash.io')
  })

  it('throws when Upstash Redis URL is missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    const { getUpstashRedisUrl } = await import('@/lib/env')
    expect(() => getUpstashRedisUrl()).toThrow(/UPSTASH_REDIS_REST_URL/)
  })

  it('returns Upstash Redis token when set', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token123')
    const { getUpstashRedisToken } = await import('@/lib/env')
    expect(getUpstashRedisToken()).toBe('token123')
  })

  it('throws when Upstash Redis token is missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { getUpstashRedisToken } = await import('@/lib/env')
    expect(() => getUpstashRedisToken()).toThrow(/UPSTASH_REDIS_REST_TOKEN/)
  })

  it('returns the FEEDBACK_FROM_ADDRESS when set', async () => {
    vi.stubEnv('FEEDBACK_FROM_ADDRESS', 'Brand <hi@example.com>')
    const { getFeedbackFromAddress } = await import('@/lib/env')
    expect(getFeedbackFromAddress()).toBe('Brand <hi@example.com>')
  })

  it('returns the default From address when FEEDBACK_FROM_ADDRESS is not set', async () => {
    vi.stubEnv('FEEDBACK_FROM_ADDRESS', '')
    const { getFeedbackFromAddress } = await import('@/lib/env')
    expect(getFeedbackFromAddress()).toBe(
      'investment-dashboard <onboarding@resend.dev>',
    )
  })
})
