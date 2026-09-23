import { NextRequest, NextResponse } from "next/server";
import { getSession, targetAccountId } from "@/lib/sessions";
import { uploadEDCloudFile } from "@/lib/services/ecoledirecte";
import { withLog } from "@/lib/logger";

async function handler(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  if (session.service !== "ecoledirecte" || !session.edToken || !session.edAccountId) {
    return NextResponse.json({ error: "Fonctionnalité indisponible" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folderId = form.get("folderId");
  if (!(file instanceof File) || typeof folderId !== "string" || !folderId) {
    return NextResponse.json({ error: "Fichier ou dossier manquant" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const { newToken } = await uploadEDCloudFile(session.edToken, targetAccountId(session), folderId, {
      name: file.name,
      type: file.type || "application/octet-stream",
      buffer,
    });
    session.edToken = newToken;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withLog(handler);
