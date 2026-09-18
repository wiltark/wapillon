import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { getEDHomework, markEDHomeworkDone } from "@/lib/services/ecoledirecte";
import { getPronoteHomework } from "@/lib/services/pronote";
import { withLog } from "@/lib/logger";
import type { SessionHandle } from "pawnote";

async function getHandler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  try {
    if (session.service === "ecoledirecte" && session.edToken && session.edAccountId) {
      const { homework, newToken } = await getEDHomework(session.edToken, session.edAccountId);
      session.edToken = newToken;
      return NextResponse.json(homework);
    }

    if (session.service === "pronote" && session.pronoteHandle) {
      const homework = await getPronoteHomework(session.pronoteHandle as SessionHandle);
      return NextResponse.json(homework);
    }

    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function putHandler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  try {
    const { id, done } = await req.json() as { id: string; done: boolean };
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    if (session.service === "ecoledirecte" && session.edToken && session.edAccountId) {
      const { newToken } = await markEDHomeworkDone(session.edToken, session.edAccountId, id, done);
      session.edToken = newToken;
      return NextResponse.json({ ok: true });
    }

    // Pronote: pas encore supporté — on acquitte sans erreur
    if (session.service === "pronote") {
      return NextResponse.json({ ok: true, local: true });
    }

    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(getHandler);
export const PUT = withLog(putHandler);
