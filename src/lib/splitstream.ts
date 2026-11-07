// splitstream (the budget app) is personal: its links and its card are shown
// only to the owner. The rest of the dashboard users see nothing of this.

export const SPLITSTREAM_URL =
  process.env.NEXT_PUBLIC_SPLITSTREAM_URL ?? "https://splitstream-gules.vercel.app";

/** Server-only: OWNER_EMAIL is never exposed to the client. Without the var, nobody is the owner. */
export function isBudgetOwner(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.toLowerCase() === owner);
}
