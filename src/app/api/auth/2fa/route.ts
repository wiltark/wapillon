import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/sessions";
import { validateED2FA } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { twoFAToken, answer, username, password } = body;

    if (!twoFAToken || !answer || !username || !password) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const result = await validateED2FA(twoFAToken, answer, username, password);

    const session = createSession({
      service: "ecoledirecte",
      student: result.student,
      edToken: result.token,
      edAccountId: result.accountId,
      edAccountType: result.accountType,
      role: result.role,
      children: result.children,
    });

    const response = NextResponse.json({
      id: session.id,
      service: session.service,
      student: session.student,
      role: session.role ?? "student",
      children: session.children ?? [],
      activeChildId: session.activeChildId,
    });
    response.cookies.set("session_id", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de vérification";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const POST = withLog(handler);
