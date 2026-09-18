import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { getEDInvoices } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  // Billing is attached to the family, so this only exists for parent accounts.
  if (session.role !== "parent") {
    return NextResponse.json({ error: "Réservé aux comptes parents" }, { status: 403 });
  }

  if (session.service !== "ecoledirecte" || !session.edToken || !session.edAccountId) {
    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  }

  try {
    const { invoices, newToken } = await getEDInvoices(session.edToken, session.edAccountId);
    session.edToken = newToken;
    return NextResponse.json(invoices);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);
