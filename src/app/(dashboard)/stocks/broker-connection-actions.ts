"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchFlexPositions, FlexError } from "@/lib/ibkr-flex";

const connectSchema = z.object({
  label: z.string().min(1).max(120),
  flex_query_id: z.string().min(1).max(64),
  flex_token: z.string().min(8).max(256),
  currency: z.string().length(3).default("USD"),
  token_expires_at: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
});

const rotateSchema = z.object({
  connection_id: z.string().uuid(),
  flex_token: z.string().min(8).max(256),
  flex_query_id: z.string().min(1).max(64).optional().or(z.literal("")).transform((v) => v || undefined),
  token_expires_at: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
});

export type ConnectFormState =
  | { ok: true; connectionId: string }
  | { ok: false; error: string }
  | undefined;

export type RotateFormState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function connectIbkrFlex(
  _prev: ConnectFormState,
  formData: FormData
): Promise<ConnectFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = connectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      kind: "brokerage",
      name: d.label,
      institution: "Interactive Brokers",
      currency: d.currency.toUpperCase(),
      metadata: { source: "ibkr_flex" },
    })
    .select("id")
    .single();
  if (accErr || !account) return { ok: false, error: accErr?.message ?? "Could not create account." };

  const { data: connectionId, error: rpcErr } = await supabase.rpc(
    "save_broker_connection",
    {
      p_broker_kind: "ibkr_flex",
      p_label: d.label,
      p_secret_text: d.flex_token,
      p_flex_query_id: d.flex_query_id,
      p_token_expires_at: d.token_expires_at,
    }
  );
  if (rpcErr || !connectionId) {
    await supabase.from("accounts").delete().eq("id", account.id);
    return { ok: false, error: rpcErr?.message ?? "Could not save credentials." };
  }

  await supabase
    .from("broker_connections")
    .update({ account_id: account.id })
    .eq("id", connectionId);

  revalidatePath("/stocks");
  revalidatePath("/overview");
  return { ok: true, connectionId };
}

export async function rotateIbkrFlexToken(
  _prev: RotateFormState,
  formData: FormData
): Promise<RotateFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = rotateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const { error } = await supabase.rpc("update_broker_connection_secret", {
    p_connection_id: d.connection_id,
    p_secret_text: d.flex_token,
    p_flex_query_id: d.flex_query_id ?? "",
    p_token_expires_at: d.token_expires_at,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/stocks");
  return { ok: true };
}

export async function disconnectIbkrFlex(connectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: conn } = await supabase
    .from("broker_connections")
    .select("account_id")
    .eq("id", connectionId)
    .single();

  const { error } = await supabase.rpc("delete_broker_connection", {
    p_connection_id: connectionId,
  });
  if (error) throw new Error(error.message);

  if (conn?.account_id) {
    await supabase.from("accounts").delete().eq("id", conn.account_id);
  }

  revalidatePath("/stocks");
  revalidatePath("/overview");
}

export async function syncIbkrFlex(connectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: conn, error: connErr } = await supabase
    .from("broker_connections")
    .select("id, account_id, flex_query_id, label")
    .eq("id", connectionId)
    .single();
  if (connErr || !conn) throw new Error(connErr?.message ?? "Connection not found.");
  if (!conn.account_id) throw new Error("Connection missing brokerage account.");
  if (!conn.flex_query_id) throw new Error("Missing Flex Query ID.");

  const { data: token, error: secretErr } = await supabase.rpc("get_broker_secret", {
    p_connection_id: connectionId,
  });
  if (secretErr || !token) throw new Error(secretErr?.message ?? "Could not read token.");

  try {
    const positions = await fetchFlexPositions(token, conn.flex_query_id);

    await supabase.from("holdings").delete().eq("account_id", conn.account_id);

    if (positions.length > 0) {
      const rows = positions.map((p) => ({
        user_id: user.id,
        account_id: conn.account_id!,
        symbol: p.symbol,
        quantity: p.quantity,
        avg_cost: p.avg_cost,
        currency: p.currency,
        last_price: p.last_price,
        last_price_at: p.last_price != null ? new Date().toISOString() : null,
        asset_class: p.asset_class,
        ibkr_contract_id: p.ibkr_contract_id,
      }));
      const { error: insErr } = await supabase.from("holdings").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await supabase.rpc("mark_broker_sync", {
      p_connection_id: connectionId,
      p_status: "success",
      p_error: "",
    });

    revalidatePath("/stocks");
    revalidatePath("/overview");
    return { ok: true as const, count: positions.length };
  } catch (e) {
    const msg =
      e instanceof FlexError
        ? `${e.code}: ${e.message}`
        : e instanceof Error
          ? e.message
          : "Unknown error";
    await supabase.rpc("mark_broker_sync", {
      p_connection_id: connectionId,
      p_status: "error",
      p_error: msg,
    });
    revalidatePath("/stocks");
    return { ok: false as const, error: msg };
  }
}
