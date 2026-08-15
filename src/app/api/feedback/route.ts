import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFeedbackRateLimiter } from "@/lib/rate-limit";
import {
  feedbackBodySchema,
  validateImageBytes,
} from "@/lib/feedback/schema";
import { sendFeedbackEmail } from "@/lib/feedback/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/feedback — in-app feedback from an authenticated user.
 *
 * Pipeline: auth → rate limit → JSON parse → schema validation →
 * magic-byte validation per image → send email.
 *
 * Spanish error messages match server-action style. We deliberately never
 * log message bodies or image bytes — only error messages, user id, and
 * image count — so logs can't accidentally leak user content.
 *
 * v1 TODO: join the `profiles` table to populate `displayName` from
 * `profiles.display_name` once the dashboard layout fetches the profile.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not signed in." },
      { status: 401 },
    );
  }

  if (!user.email) {
    return NextResponse.json(
      { ok: false, error: "Not signed in." },
      { status: 401 },
    );
  }

  const rl = getFeedbackRateLimiter();
  const r = await rl(user.id);
  if (!r.success) {
    return NextResponse.json(
      { ok: false, error: "Demasiados envíos. Probá más tarde." },
      { status: 429 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = feedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Datos inválidos",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { message, images, pageUrl } = parsed.data;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const bytes = Buffer.from(img.dataBase64, "base64");
    const ok = validateImageBytes(img.contentType, new Uint8Array(bytes));
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: `Imagen ${i + 1} inválida` },
        { status: 400 },
      );
    }
  }

  try {
    await sendFeedbackEmail({
      message,
      images,
      pageUrl,
      user: {
        id: user.id,
        email: user.email ?? "",
        displayName: undefined,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(
      `[feedback] send failed for "${user.id}" (images=${images.length}):`,
      msg,
    );
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el feedback." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}