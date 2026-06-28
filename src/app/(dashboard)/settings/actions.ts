"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  base_currency: z.string().length(3).transform((v) => v.toUpperCase()),
  display_name: z.string().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
});

export type ProfileFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        base_currency: d.base_currency,
        display_name: d.display_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/overview");
  return { ok: true };
}
