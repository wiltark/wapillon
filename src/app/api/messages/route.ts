import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { getEDMessage, getEDMessages } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  if (session.service !== "ecoledirecte" || !session.edToken || !session.edAccountId) {
    return NextResponse.json({ error: "Messagerie indisponible pour ce service" }, { status: 400 });
  }

  const role = session.role ?? "student";
  // Mailboxes belong to the account that signed in — a parent reads the family
  // inbox, not the selected child's — so this uses edAccountId, not the child.
  const accountId = session.edAccountId;

  try {
    const messageId = req.nextUrl.searchParams.get("id");
    if (messageId) {
      const { message, newToken } = await getEDMessage(
        session.edToken,
        accountId,
        messageId,
        role
      );
      session.edToken = newToken;
      return NextResponse.json(message);
    }

    const folderParam = req.nextUrl.searchParams.get("folder");
    const yearParam = req.nextUrl.searchParams.get("year") ?? "";
    const { messages, folders, newToken } = await getEDMessages(
      session.edToken,
      accountId,
      role,
      folderParam ? Number(folderParam) : undefined,
      yearParam
    );
    session.edToken = newToken;
    return NextResponse.json({ messages, folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withLog(handler);
