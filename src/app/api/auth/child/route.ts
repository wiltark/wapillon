import { NextRequest, NextResponse } from "next/server";
import { getSession, setActiveChild } from "@/lib/sessions";
import { renewEDToken } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

/** Switches which child a parent account is viewing. */
async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  if (session.role !== "parent") {
    return NextResponse.json({ error: "Réservé aux comptes parents" }, { status: 403 });
  }

  const { childId } = await req.json();
  if (!childId) return NextResponse.json({ error: "Enfant manquant" }, { status: 400 });

  const updated = setActiveChild(sessionId, String(childId));
  if (!updated) return NextResponse.json({ error: "Enfant introuvable" }, { status: 404 });

  // ED scopes the token to one child at a time, so the context has to be
  // renewed before the next data call or it returns the previous child's data.
  if (session.edToken) {
    try {
      const { newToken } = await renewEDToken(session.edToken, Number(childId));
      session.edToken = newToken;
    } catch {
      // Some schools accept the child id without a renewal; keep the old token
      // rather than failing the switch outright.
    }
  }

  return NextResponse.json({
    id: updated.id,
    service: updated.service,
    student: updated.student,
    role: updated.role,
    children: updated.children ?? [],
    modules: updated.modules ?? [],
    activeChildId: updated.activeChildId,
  });
}

export const POST = withLog(handler);
