"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const customSchema = z.object({
  name: z.string().min(1).max(120),
  institution: z.string().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
  currency: z.string().length(3).default("USD"),
  principal: z.coerce.number().nonnegative(),
  notes: z.string().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});

export type CustomFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function createCustom(
  _prev: CustomFormState,
  formData: FormData
): Promise<CustomFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = customSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    kind: "custom",
    name: d.name,
    institution: d.institution ?? null,
    currency: d.currency.toUpperCase(),
    principal: d.principal,
    metadata: d.notes ? { notes: d.notes } : {},
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/custom");
  revalidatePath("/overview");
  return { ok: true };
}

export async function updateCustom(
  id: string,
  _prev: CustomFormState,
  formData: FormData
): Promise<CustomFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = customSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("accounts")
    .update({
      name: d.name,
      institution: d.institution ?? null,
      currency: d.currency.toUpperCase(),
      principal: d.principal,
      metadata: d.notes ? { notes: d.notes } : {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("kind", "custom");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/custom");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteCustom(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("kind", "custom");
  if (error) throw new Error(error.message);
  revalidatePath("/custom");
  revalidatePath("/overview");
}
