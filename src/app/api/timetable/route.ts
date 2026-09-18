import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { getEDTimetable } from "@/lib/services/ecoledirecte";
import { getPronoteTimetable } from "@/lib/services/pronote";
import { withLog } from "@/lib/logger";
import type { SessionHandle } from "pawnote";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  const url       = new URL(req.url);
  const dateStart = url.searchParams.get("start") || getMonday();
  const dateEnd   = url.searchParams.get("end")   || getFriday();

  try {
    if (session.service === "ecoledirecte" && session.edToken && session.edAccountId) {
      const { entries, newToken } = await getEDTimetable(session.edToken, session.edAccountId, dateStart, dateEnd);
      session.edToken = newToken;
      return NextResponse.json(entries);
    }

    if (session.service === "pronote" && session.pronoteHandle) {
      const entries = await getPronoteTimetable(session.pronoteHandle as SessionHandle);
      return NextResponse.json(entries);
    }

    return NextResponse.json({ error: "Service non configuré" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);

function getMonday(): string {
  const d = new Date();
  const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function getFriday(): string {
  const d = new Date();
  const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -2 : 5);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}
