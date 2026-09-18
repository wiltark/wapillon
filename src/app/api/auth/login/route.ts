import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/sessions";
import { loginEcoleDirecte, type ED2FAChallenge } from "@/lib/services/ecoledirecte";
import { loginPronote } from "@/lib/services/pronote";
import { withLog } from "@/lib/logger";

function is2FA(result: unknown): result is ED2FAChallenge {
  return typeof result === "object" && result !== null && (result as ED2FAChallenge).twoFactor === true;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { service, username, password, pronoteUrl } = body;

    if (!service || !username || !password) {
      return NextResponse.json(
        { error: "Identifiants manquants" },
        { status: 400 }
      );
    }

    if (service === "ecoledirecte") {
      const result = await loginEcoleDirecte(username, password);

      // 2FA challenge — return question + propositions to the client
      if (is2FA(result)) {
        return NextResponse.json({
          twoFactor: true,
          question: result.question,
          propositions: result.propositions,
          rawPropositions: result.rawPropositions,
          twoFAToken: result.twoFAToken,
        });
      }

      const session = createSession({
        service: "ecoledirecte",
        student: result.student,
        edToken: result.token,
        edAccountId: result.accountId,
        edAccountType: result.accountType,
      });

      const response = NextResponse.json({
        id: session.id,
        service: session.service,
        student: session.student,
      });
      response.cookies.set("session_id", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60,
      });
      return response;
    }

    if (service === "pronote") {
      if (!pronoteUrl) {
        return NextResponse.json(
          { error: "URL Pronote manquante" },
          { status: 400 }
        );
      }
      const result = await loginPronote(pronoteUrl, username, password);
      const session = createSession({
        service: "pronote",
        student: result.student,
        pronoteHandle: result.handle,
      });

      const response = NextResponse.json({
        id: session.id,
        service: session.service,
        student: session.student,
      });
      response.cookies.set("session_id", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60,
      });
      return response;
    }

    return NextResponse.json(
      { error: "Service non supporté" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de connexion";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const POST = withLog(handler);
