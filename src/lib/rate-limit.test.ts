import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const { mockLimit, mockRatelimitCtor, mockSlidingWindow, mockRedisCtor } = vi.hoisted(() => {
  const limit = vi.fn()
  const slidingWindow = vi.fn(() => ({ __kind: 'sliding' }))
  const ratelimitCtor = vi.fn().mockImplementation(function () { return { limit } })
  type RatelimitLike = typeof ratelimitCtor & { slidingWindow: typeof slidingWindow }
  const ratelimitMock = ratelimitCtor as unknown as RatelimitLike
  ratelimitMock.slidingWindow = slidingWindow
  return {
    mockLimit: limit,
    mockRatelimitCtor: ratelimitCtor,
    mockSlidingWindow: slidingWindow,
    mockRedisCtor: vi.fn(),
  }
})

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: mockRatelimitCtor,
}))

vi.mock('@upstash/redis', () => ({
  Redis: mockRedisCtor,
}))

vi.mock('@/lib/env', () => ({
  getUpstashRedisUrl: vi.fn(),
  getUpstashRedisToken: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: mockRedisCtor,
}))

vi.mock('@/lib/env', () => ({
  getUpstashRedisUrl: vi.fn(),
  getUpstashRedisToken: vi.fn(),
}))

describe('rate-limit (feedback)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockLimit.mockReset()
    mockRatelimitCtor.mockReset()
    mockSlidingWindow.mockClear()
    mockRedisCtor.mockReset()
    vi.mocked(mockRatelimitCtor).mockImplementation(function () {
      return { limit: mockLimit }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns allow-all when env vars are missing (dev convenience)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockImplementation(() => {
      throw new Error('Missing required env var: UPSTASH_REDIS_REST_URL.')
    })
    vi.mocked(env.getUpstashRedisToken).mockImplementation(() => {
      throw new Error('Missing required env var: UPSTASH_REDIS_REST_TOKEN.')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    for (let i = 0; i < 10; i++) {
      const r = await limiter('user-1')
      expect(r.success).toBe(true)
    }
    expect(warn).toHaveBeenCalled()
  })

  it('does not warn when env vars are missing in NODE_ENV=test', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockImplementation(() => {
      throw new Error('Missing required env var: UPSTASH_REDIS_REST_URL.')
    })
    vi.mocked(env.getUpstashRedisToken).mockImplementation(() => {
      throw new Error('Missing required env var: UPSTASH_REDIS_REST_TOKEN.')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    const r = await limiter('user-1')
    expect(r.success).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns allow-all when env URL is not https://', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockReturnValue('http://not-https.example.com')
    vi.mocked(env.getUpstashRedisToken).mockReturnValue('token')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    const r = await limiter('user-1')
    expect(r.success).toBe(true)
    expect(warn).toHaveBeenCalled()
  })

  it('uses sliding window of 5 per 1 day keyed by user id', async () => {
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockReturnValue('https://example.upstash.io')
    vi.mocked(env.getUpstashRedisToken).mockReturnValue('token')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    await limiter('user-abc')
    expect(mockRedisCtor).toHaveBeenCalledWith({
      url: 'https://example.upstash.io',
      token: 'token',
    })
    expect(mockSlidingWindow).toHaveBeenCalledWith(5, '1 d')
    expect(mockRatelimitCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: 'rl:feedback',
        limiter: { __kind: 'sliding' },
      })
    )
    expect(mockLimit).toHaveBeenCalledWith('user-abc')
  })

  it('fail-closed on Redis error when configured', async () => {
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockReturnValue('https://example.upstash.io')
    vi.mocked(env.getUpstashRedisToken).mockReturnValue('token')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockLimit.mockRejectedValue(new Error('redis down'))
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    const r = await limiter('user-1')
    expect(r.success).toBe(false)
  })

  it('returns success when Redis succeeds and configured', async () => {
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockReturnValue('https://example.upstash.io')
    vi.mocked(env.getUpstashRedisToken).mockReturnValue('token')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    const r = await limiter('user-1')
    expect(r).toEqual({ success: true, limit: 5, remaining: 4, reset: 0 })
  })

  it('returns redis result shape directly when limited', async () => {
    const env = await import('@/lib/env')
    vi.mocked(env.getUpstashRedisUrl).mockReturnValue('https://example.upstash.io')
    vi.mocked(env.getUpstashRedisToken).mockReturnValue('token')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: 1234567890 })
    const rl = await import('@/lib/rate-limit')
    const limiter = rl.getFeedbackRateLimiter()
    const r = await limiter('user-1')
    expect(r).toEqual({ success: false, limit: 5, remaining: 0, reset: 1234567890 })
  })
})
