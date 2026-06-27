"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const brokerSchema = z.object({
  name: z.string().min(1).max(120),
  institution: z.string().min(1).max(120),
  currency: z.string().length(3).default("USD"),
});

const holdingSchema = z.object({
  account_id: z.string().uuid(),
  symbol: z.string().min(1).max(32),
  quantity: z.coerce.number().positive(),
  avg_cost: z.coerce.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
});

export type BrokerFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export type HoldingFormState = BrokerFormState;

export async function createBroker(
  _prev: BrokerFormState,
  formData: FormData
): Promise<BrokerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = brokerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    kind: "brokerage",
    name: d.name,
    institution: d.institution,
    currency: d.currency.toUpperCase(),
    metadata: {},
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/stocks");
  revalidatePath("/overview");
  return { ok: true };
}

export async function createHolding(
  _prev: HoldingFormState,
  formData: FormData
): Promise<HoldingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = holdingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase.from("holdings").insert({
    user_id: user.id,
    account_id: d.account_id,
    symbol: d.symbol.toUpperCase(),
    quantity: d.quantity,
    avg_cost: d.avg_cost,
    currency: d.currency.toUpperCase(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/stocks");
  revalidatePath("/overview");
  return { ok: true };
}

export async function updateBroker(
  id: string,
  _prev: BrokerFormState,
  formData: FormData
): Promise<BrokerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = brokerSchema.safeParse(Object.fromEntries(formData.entries()));
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("kind", "brokerage");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/stocks");
  revalidatePath("/overview");
  return { ok: true };
}

export async function updateHolding(
  id: string,
  _prev: HoldingFormState,
  formData: FormData
): Promise<HoldingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = holdingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("holdings")
    .update({
      account_id: d.account_id,
      symbol: d.symbol.toUpperCase(),
      quantity: d.quantity,
      avg_cost: d.avg_cost,
      currency: d.currency.toUpperCase(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/stocks");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteHolding(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("holdings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/stocks");
  revalidatePath("/overview");
}

export async function deleteBroker(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("kind", "brokerage");
  if (error) throw new Error(error.message);
  revalidatePath("/stocks");
  revalidatePath("/overview");
}
