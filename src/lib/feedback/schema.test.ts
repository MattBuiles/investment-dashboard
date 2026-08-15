import { describe, expect, it } from 'vitest'
import {
  feedbackBodySchema,
  sniffImageType,
  validateImageBytes,
  MAX_DECODED_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_MESSAGE_CHARS,
  MAX_FILENAME_CHARS,
  MAX_PAGE_URL_CHARS,
} from '@/lib/feedback/schema'

// 1x1 transparent PNG (67 bytes)
const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364606060f8cf80020003000100679d8df50000000049454e44ae426082',
  'hex'
)
// 1x1 white JPEG (125 bytes)
const JPEG_1x1 = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b08000100010101110000ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000801010000003f00fb000ffd9',
  'hex'
)
// 1x1 white WEBP (RIFF....WEBP) — minimal valid: RIFF<size>WEBPVP8L + lossy chunk
const WEBP_1x1 = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.from('VP8L', 'ascii'),
  Buffer.from([0x0d, 0x00, 0x00, 0x00]),
  Buffer.from([0x2f, 0x00, 0x00, 0x00, 0x00]),
  Buffer.from([0x00, 0x00, 0x00]),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]),
])

function b64(buf: Buffer): string {
  return buf.toString('base64')
}

describe('feedbackBodySchema', () => {
  const valid = {
    message: 'Hola, hay un bug en la página de CDTs.',
    images: [],
    pageUrl: 'https://dashboard.example.com/cdts',
  }

  it('accepts a valid minimal body', () => {
    const r = feedbackBodySchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it('trims message and rejects empty after trim', () => {
    expect(feedbackBodySchema.safeParse({ ...valid, message: '   ' }).success).toBe(false)
    expect(feedbackBodySchema.safeParse({ ...valid, message: '' }).success).toBe(false)
  })

  it('rejects messages longer than 2000 chars', () => {
    const r = feedbackBodySchema.safeParse({ ...valid, message: 'a'.repeat(2001) })
    expect(r.success).toBe(false)
  })

  it('accepts messages at exactly 2000 chars (after trim)', () => {
    const r = feedbackBodySchema.safeParse({ ...valid, message: 'a'.repeat(2000) })
    expect(r.success).toBe(true)
  })

  it('trims whitespace from message before length check', () => {
    const r = feedbackBodySchema.safeParse({ ...valid, message: '  ab  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.message).toBe('ab')
  })

  it('rejects more than 4 images', () => {
    const r = feedbackBodySchema.safeParse({
      ...valid,
      images: [
        { filename: 'a.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
        { filename: 'b.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
        { filename: 'c.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
        { filename: 'd.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
        { filename: 'e.png', contentType: 'image/png', dataBase64: b64(PNG_1x1) },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects bad contentType', () => {
    const r = feedbackBodySchema.safeParse({
      ...valid,
      images: [{ filename: 'a.gif', contentType: 'image/gif', dataBase64: b64(PNG_1x1) }],
    })
    expect(r.success).toBe(false)
  })

  it('rejects invalid base64', () => {
    const r = feedbackBodySchema.safeParse({
      ...valid,
      images: [
        { filename: 'a.png', contentType: 'image/png', dataBase64: 'not!!base64!!' },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects decoded image over 1MB', () => {
    const big = Buffer.alloc(MAX_DECODED_IMAGE_BYTES * 2, 0)
    const r = feedbackBodySchema.safeParse({
      ...valid,
      images: [
        { filename: 'a.png', contentType: 'image/png', dataBase64: b64(big) },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects filename longer than 120 chars', () => {
    const r = feedbackBodySchema.safeParse({
      ...valid,
      images: [
        {
          filename: 'a'.repeat(MAX_FILENAME_CHARS + 1) + '.png',
          contentType: 'image/png',
          dataBase64: b64(PNG_1x1),
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects pageUrl longer than 500 chars', () => {
    const r = feedbackBodySchema.safeParse({
      ...valid,
      pageUrl: 'https://x.com/' + 'a'.repeat(MAX_PAGE_URL_CHARS),
    })
    expect(r.success).toBe(false)
  })

  it('exports expected constants', () => {
    expect(MAX_DECODED_IMAGE_BYTES).toBe(1024 * 1024)
    expect(MAX_IMAGES).toBe(4)
    expect(MAX_MESSAGE_CHARS).toBe(2000)
  })
})

describe('sniffImageType', () => {
  it('detects JPEG', () => {
    expect(sniffImageType(new Uint8Array(JPEG_1x1))).toBe('image/jpeg')
  })
  it('detects PNG', () => {
    expect(sniffImageType(new Uint8Array(PNG_1x1))).toBe('image/png')
  })
  it('detects WEBP', () => {
    expect(sniffImageType(new Uint8Array(WEBP_1x1))).toBe('image/webp')
  })
  it('returns null for unknown', () => {
    expect(sniffImageType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(null)
  })
  it('returns null for too-short input', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBe(null)
  })
  it('returns null for WEBP without WEBP signature at offset 8', () => {
    const riffNoWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x41, 0x41, 0x41])
    expect(sniffImageType(new Uint8Array(riffNoWebp))).toBe(null)
  })
})

describe('validateImageBytes', () => {
  it('accepts declared type matching bytes', () => {
    expect(validateImageBytes('image/png', new Uint8Array(PNG_1x1))).toBe(true)
    expect(validateImageBytes('image/jpeg', new Uint8Array(JPEG_1x1))).toBe(true)
    expect(validateImageBytes('image/webp', new Uint8Array(WEBP_1x1))).toBe(true)
  })

  it('rejects declared type mismatch', () => {
    expect(validateImageBytes('image/jpeg', new Uint8Array(PNG_1x1))).toBe(false)
    expect(validateImageBytes('image/png', new Uint8Array(JPEG_1x1))).toBe(false)
    expect(validateImageBytes('image/webp', new Uint8Array(JPEG_1x1))).toBe(false)
  })
})
