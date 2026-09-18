import { NextRequest, NextResponse } from "next/server";
import { getSession, targetAccountId } from "@/lib/sessions";
import { getEDGrades } from "@/lib/services/ecoledirecte";
import { getPronoteGrades } from "@/lib/services/pronote";
import { withLog } from "@/lib/logger";
import type { SessionHandle } from "pawnote";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  try {
    if (session.service === "ecoledirecte" && session.edToken && session.edAccountId) {
      const { grades, newToken } = await getEDGrades(session.edToken, targetAccountId(session));
      session.edToken = newToken;
      return NextResponse.json(grades);
    }

    if (session.service === "pronote" && session.pronoteHandle) {
      const grades = await getPronoteGrades(session.pronoteHandle as SessionHandle);
      return NextResponse.json(grades);
    }

    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);
