import { describe, expect, it } from 'vitest'
import {
  computeScale,
  pickNextQualityAttempt,
  validateInputFiles,
  MAX_INPUT_FILE_BYTES,
  MAX_INPUT_FILES,
} from '@/lib/feedback/compress'

interface FakeFile {
  name: string
  size: number
  type: string
}

function fakeFile(name: string, size: number, type: string): FakeFile {
  return { name, size, type }
}

function asFile(f: FakeFile): File {
  return f as unknown as File
}

describe('computeScale', () => {
  it('returns 1 when both dimensions fit', () => {
    expect(computeScale(800, 600, 1600)).toBe(1)
  })
  it('scales down to fit the largest dimension', () => {
    expect(computeScale(3200, 1200, 1600)).toBe(0.5)
    expect(computeScale(1200, 3200, 1600)).toBe(0.5)
  })
  it('returns scale < 1 for oversized images', () => {
    expect(computeScale(2000, 1500, 1600)).toBeCloseTo(0.8, 5)
  })
})

describe('pickNextQualityAttempt', () => {
  it('returns the first attempt when blob exceeds 1 MB', () => {
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 0)).toEqual({
      quality: 0.7,
      maxDim: 1600,
    })
  })
  it('walks down the 4-step ladder', () => {
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 0)).toEqual({
      quality: 0.7,
      maxDim: 1600,
    })
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 1)).toEqual({
      quality: 0.55,
      maxDim: 1600,
    })
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 2)).toEqual({
      quality: 0.4,
      maxDim: 1600,
    })
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 3)).toEqual({
      quality: 0.4,
      maxDim: 1200,
    })
  })
  it('returns null when blob is already ≤ 1 MB', () => {
    expect(pickNextQualityAttempt(500 * 1024, 0)).toBeNull()
  })
  it('returns null when all attempts exhausted', () => {
    expect(pickNextQualityAttempt(2 * 1024 * 1024, 4)).toBeNull()
  })

  it('exports MAX_INPUT_FILE_BYTES = 5MB and MAX_INPUT_FILES = 4', () => {
    expect(MAX_INPUT_FILE_BYTES).toBe(5 * 1024 * 1024)
    expect(MAX_INPUT_FILES).toBe(4)
  })
})

describe('validateInputFiles', () => {
  it('accepts an empty list', () => {
    expect(validateInputFiles([])).toEqual({ ok: true })
  })
  it('accepts a few normal files', () => {
    const f = asFile(fakeFile('a.png', 1024, 'image/png'))
    expect(validateInputFiles([f])).toEqual({ ok: true })
  })
  it('rejects more than 4 files', () => {
    const files = [
      fakeFile('a.png', 1024, 'image/png'),
      fakeFile('b.png', 1024, 'image/png'),
      fakeFile('c.png', 1024, 'image/png'),
      fakeFile('d.png', 1024, 'image/png'),
      fakeFile('e.png', 1024, 'image/png'),
    ]
    const r = validateInputFiles(files.map(asFile))
    expect(r).toEqual({ ok: false, error: 'TOO_MANY_FILES' })
  })
  it('rejects file > 5 MB', () => {
    const f = asFile(fakeFile('a.png', MAX_INPUT_FILE_BYTES + 1, 'image/png'))
    const r = validateInputFiles([f])
    expect(r).toEqual({ ok: false, error: 'FILE_TOO_LARGE' })
  })
  it('rejects HEIC even though it is an image', () => {
    const f = asFile(fakeFile('a.heic', 1024, 'image/heic'))
    const r = validateInputFiles([f])
    expect(r).toEqual({ ok: false, error: 'UNSUPPORTED_TYPE' })
  })
  it('rejects application/octet-stream', () => {
    const f = asFile(fakeFile('a.bin', 1024, 'application/octet-stream'))
    const r = validateInputFiles([f])
    expect(r).toEqual({ ok: false, error: 'UNSUPPORTED_TYPE' })
  })
  it('accepts JPEG, PNG, WEBP', () => {
    const a = asFile(fakeFile('a.jpg', 1000, 'image/jpeg'))
    const b = asFile(fakeFile('b.png', 1000, 'image/png'))
    const c = asFile(fakeFile('c.webp', 1000, 'image/webp'))
    expect(validateInputFiles([a, b, c])).toEqual({ ok: true })
  })
})
