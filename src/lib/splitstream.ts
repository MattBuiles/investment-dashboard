// splitstream (app de presupuesto) es personal: sus enlaces y su tarjeta solo
// se muestran al dueño. El resto de usuarios del dashboard no ve nada de esto.

export const SPLITSTREAM_URL =
  process.env.NEXT_PUBLIC_SPLITSTREAM_URL ?? "https://splitstream-gules.vercel.app";

/** Solo en el servidor: OWNER_EMAIL no se expone al cliente. Sin la variable, nadie es dueño. */
export function isBudgetOwner(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.toLowerCase() === owner);
}
