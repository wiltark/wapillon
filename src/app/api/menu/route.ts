import { NextRequest, NextResponse } from "next/server";
import { getSession, targetAccountId } from "@/lib/sessions";
import { getEDMenus } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  if (session.service !== "ecoledirecte" || !session.edToken || !session.edAccountId) {
    return NextResponse.json([]);
  }

  try {
    const { menus, newToken } = await getEDMenus(session.edToken, targetAccountId(session));
    session.edToken = newToken;
    return NextResponse.json(menus);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);
