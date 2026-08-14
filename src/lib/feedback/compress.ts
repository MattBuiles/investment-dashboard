export const MAX_INPUT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT_FILES = 4;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: "TOO_MANY_FILES" | "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" };

export function validateInputFiles(files: File[]): ValidationResult {
  if (files.length > MAX_INPUT_FILES) {
    return { ok: false, error: "TOO_MANY_FILES" };
  }
  for (const f of files) {
    if (f.size > MAX_INPUT_FILE_BYTES) {
      return { ok: false, error: "FILE_TOO_LARGE" };
    }
    if (!ALLOWED_TYPES.has(f.type)) {
      return { ok: false, error: "UNSUPPORTED_TYPE" };
    }
  }
  return { ok: true };
}

/**
 * Devuelve el factor de escala necesario para encajar la dimensión mayor dentro
 * de `maxDim`. Si la imagen ya cabe, devuelve 1 (no escalar).
 */
export function computeScale(
  width: number,
  height: number,
  maxDim: number
): number {
  const largest = Math.max(width, height);
  if (largest <= maxDim) return 1;
  return maxDim / largest;
}

export type QualityAttempt = { quality: number; maxDim: number };

const QUALITY_LADDER: QualityAttempt[] = [
  { quality: 0.7, maxDim: 1600 },
  { quality: 0.55, maxDim: 1600 },
  { quality: 0.4, maxDim: 1600 },
  { quality: 0.4, maxDim: 1200 },
];

/**
 * Devuelve el siguiente intento de (calidad, maxDim) si el blob todavía excede
 * 1 MB. Devuelve null si el blob ya está dentro del límite O si se agotaron
 * los intentos (el caller debe entonces lanzar IMAGE_TOO_LARGE).
 */
export function pickNextQualityAttempt(
  blobSize: number,
  attempt: number,
  maxBytes: number = 1024 * 1024
): QualityAttempt | null {
  if (blobSize <= maxBytes) return null;
  return QUALITY_LADDER[attempt] ?? null;
}

export type CompressedImage = {
  blob: Blob;
  dataBase64: string;
  width: number;
  height: number;
};

/**
 * Compresión real (canvas). Diseñada para correr en el browser; aquí vive
 * para que Wave 2 la conecte. Mantenemos la lógica DOM aislada y testeable
 * por las funciones puras de arriba.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  const validation = validateInputFiles([file]);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const bitmap = await decodeImage(file);
  const { width, height } = bitmap;
  const initialScale = computeScale(width, height, QUALITY_LADDER[0].maxDim);
  const targetWidth = Math.max(1, Math.round(width * initialScale));
  const targetHeight = Math.max(1, Math.round(height * initialScale));

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();

  let attempt = 0;
  let blob: Blob | null = await canvasToBlob(canvas, "image/jpeg", QUALITY_LADDER[0].quality);
  while (blob && pickNextQualityAttempt(blob.size, attempt) !== null) {
    const next = QUALITY_LADDER[attempt + 1];
    blob = await canvasToBlob(canvas, "image/jpeg", next.quality);
    if (next.maxDim !== QUALITY_LADDER[attempt].maxDim) {
      const newW = Math.max(1, Math.round(width * (next.maxDim / Math.max(width, height))));
      const newH = Math.max(1, Math.round(height * (next.maxDim / Math.max(width, height))));
      const c2 = createCanvas(newW, newH);
      const ctx2 = c2.getContext("2d");
      if (!ctx2) throw new Error("Canvas 2D context unavailable");
      ctx2.drawImage(canvas, 0, 0, newW, newH);
      blob = await canvasToBlob(c2, "image/jpeg", next.quality);
    }
    attempt++;
  }

  if (!blob || blob.size > 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const dataBase64 = await blobToBase64(blob);
  return { blob, dataBase64, width: targetWidth, height: targetHeight };
}

export async function compressImages(files: File[]): Promise<CompressedImage[]> {
  const validation = validateInputFiles(files);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return Promise.all(files.map((f) => compressImage(f)));
}

// --- DOM helpers (kept thin so the pure functions above stay testable in node) ---

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected reader result"));
        return;
      }
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Fallback using <img> if createImageBitmap is unavailable
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = url;
    });
    return img as unknown as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}
