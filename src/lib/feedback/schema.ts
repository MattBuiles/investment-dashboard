import { z } from "zod";

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_IMAGES = 4;
export const MAX_DECODED_IMAGE_BYTES = 1024 * 1024; // 1 MB
export const MAX_FILENAME_CHARS = 120;
export const MAX_PAGE_URL_CHARS = 500;

const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

// Validar base64 ANTES de decodificar (límite por longitud de string) y
// verificar tamaño real (decoded) ≤ 1 MB. Esto evita asignar buffers grandes
// en memoria de un payload enorme.
const base64MaxLen = Math.ceil(MAX_DECODED_IMAGE_BYTES / 3) * 4;

const imageSchema = z.object({
  filename: z.string().min(1).max(MAX_FILENAME_CHARS),
  contentType: z.enum(IMAGE_CONTENT_TYPES),
  dataBase64: z
    .string()
    .min(1)
    .max(base64MaxLen)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Invalid base64"),
});

export const feedbackBodySchema = z.object({
  message: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(MAX_MESSAGE_CHARS)),
  images: z.array(imageSchema).max(MAX_IMAGES).default([]),
  pageUrl: z.string().min(1).max(MAX_PAGE_URL_CHARS),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

/**
 * Detecta el tipo real de imagen por magic bytes. Devuelve el enum o null.
 * - JPEG: empieza con FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WEBP: "RIFF" .... "WEBP" (bytes 0-3 y 8-11)
 */
export function sniffImageType(
  bytes: Uint8Array
): ImageContentType | null {
  if (bytes.length < 12) return null;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBytes(
  declaredType: ImageContentType,
  bytes: Uint8Array
): boolean {
  return sniffImageType(bytes) === declaredType;
}
