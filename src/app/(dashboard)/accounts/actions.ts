"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const cdtSchema = z.object({
  kind: z.literal("cdt"),
  name: z.string().min(1).max(120),
  institution: z.string().min(1).max(120),
  currency: z.string().length(3).default("USD"),
  principal: z.coerce.number().positive(),
  interest_rate: z.coerce.number().min(0).max(1),
  term_months: z.coerce.number().int().positive(),
  start_date: z.string().min(1),
  maturity_date: z.string().min(1),
});

const customSchema = z.object({
  kind: z.literal("custom"),
  name: z.string().min(1).max(120),
  institution: z.string().max(120).optional(),
  currency: z.string().length(3).default("USD"),
  principal: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

const accountSchema = z.discriminatedUnion("kind", [cdtSchema, customSchema]);

export type AccountFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function createAccount(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const metadata =
    data.kind === "custom" && data.notes ? { notes: data.notes } : {};

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    kind: data.kind,
    name: data.name,
    currency: data.currency,
    institution: "institution" in data ? data.institution ?? null : null,
    principal: data.principal ?? null,
    interest_rate: data.kind === "cdt" ? data.interest_rate : null,
    term_months: data.kind === "cdt" ? data.term_months : null,
    start_date: data.kind === "cdt" ? data.start_date : null,
    maturity_date: data.kind === "cdt" ? data.maturity_date : null,
    metadata,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/overview");
}
