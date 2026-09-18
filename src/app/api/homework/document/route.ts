import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";

const BASE_URL = "https://api.ecoledirecte.com/v3";
const USER_AGENT = "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v7.8.2";

const FILE_TYPES = ["DEVOIRS", "FICHIER", "CLOUD"];

async function fetchFromED(fileId: string, token: string): Promise<Response | null> {
  for (const type of FILE_TYPES) {
    const res = await fetch(
      `${BASE_URL}/telechargement.awp?verbe=get&fichierId=${fileId}&leTypeDeFichier=${type}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          "X-Token": token,
        },
        body: new URLSearchParams({ data: "{}" }).toString(),
      }
    );
    const ct = res.headers.get("content-type") || "";
    // ED returns JSON with error code when type is wrong; accept any non-JSON binary response
    if (res.ok && !ct.includes("application/json") && !ct.includes("text/")) {
      return res;
    }
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("id");
  if (!fileId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const fileName = req.nextUrl.searchParams.get("name") || `document-${fileId}`;
  const token = session.edToken;
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 401 });

  try {
    const edRes = await fetchFromED(fileId, token);
    if (!edRes) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });

    const contentType = edRes.headers.get("content-type") || "application/octet-stream";
    const isVideo = contentType.startsWith("video/");
    const isMedia = contentType.startsWith("image/") || isVideo;
    const edDisposition = edRes.headers.get("content-disposition") || "";
    const disposition = edDisposition ||
      (isMedia ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`);

    const fullBuffer = await edRes.arrayBuffer();
    const total = fullBuffer.byteLength;

    // Support Range requests for video seeking
    const rangeHeader = req.headers.get("range");
    if (isVideo && rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : total - 1;
        const chunk = fullBuffer.slice(start, end + 1);
        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.byteLength),
            "Content-Disposition": disposition,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }

    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Content-Length": String(total),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
