"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const cdtSchema = z.object({
  name: z.string().min(1).max(120),
  institution: z.string().min(1).max(120),
  currency: z.string().length(3).default("USD"),
  principal: z.coerce.number().positive(),
  interest_rate: z.coerce.number().min(0).max(1),
  term_months: z.coerce.number().int().positive(),
  start_date: z.string().min(1),
  maturity_date: z.string().min(1),
});

export type CdtFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function createCdt(
  _prev: CdtFormState,
  formData: FormData
): Promise<CdtFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = cdtSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    kind: "cdt",
    name: d.name,
    institution: d.institution,
    currency: d.currency.toUpperCase(),
    principal: d.principal,
    interest_rate: d.interest_rate,
    term_months: d.term_months,
    start_date: d.start_date,
    maturity_date: d.maturity_date,
    metadata: {},
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/cdts");
  revalidatePath("/overview");
  return { ok: true };
}

export async function updateCdt(
  id: string,
  _prev: CdtFormState,
  formData: FormData
): Promise<CdtFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = cdtSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("accounts")
    .update({
      name: d.name,
      institution: d.institution,
      currency: d.currency.toUpperCase(),
      principal: d.principal,
      interest_rate: d.interest_rate,
      term_months: d.term_months,
      start_date: d.start_date,
      maturity_date: d.maturity_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("kind", "cdt");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/cdts");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteCdt(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("kind", "cdt");
  if (error) throw new Error(error.message);
  revalidatePath("/cdts");
  revalidatePath("/overview");
}
