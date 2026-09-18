import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/sessions";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (sessionId) deleteSession(sessionId);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("session_id");
  return response;
}

export const POST = withLog(handler);
