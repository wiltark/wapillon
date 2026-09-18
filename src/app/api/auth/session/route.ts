import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  return NextResponse.json({
    id: session.id,
    service: session.service,
    student: session.student,
  });
}

export const GET = withLog(handler);
