import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { getEDNews } from "@/lib/services/ecoledirecte";
import { getPronoteNews } from "@/lib/services/pronote";
import { withLog } from "@/lib/logger";
import type { SessionHandle } from "pawnote";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  try {
    if (session.service === "ecoledirecte" && session.edToken && session.edAccountId) {
      const { news, newToken } = await getEDNews(session.edToken, session.edAccountId);
      session.edToken = newToken;
      return NextResponse.json(news);
    }

    if (session.service === "pronote" && session.pronoteHandle) {
      const newsItems = await getPronoteNews(session.pronoteHandle as SessionHandle);
      return NextResponse.json(newsItems);
    }

    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);
