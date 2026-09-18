import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";

const USER_AGENT = "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v7.8.2";
const ALLOWED_HOST = "ecoledirecte.com";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return new NextResponse("Non connecté", { status: 401 });

  const session = getSession(sessionId);
  if (!session) return new NextResponse("Session expirée", { status: 401 });

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("URL manquante", { status: 400 });

  // Resolve relative URLs against ED API base
  const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://api.ecoledirecte.com${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  // Only proxy ecoledirecte.com URLs
  let parsed: URL;
  try {
    parsed = new URL(fullUrl);
  } catch {
    return new NextResponse("URL invalide", { status: 400 });
  }
  if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
    console.log("[hw image] blocked host:", parsed.hostname, "full url:", fullUrl.slice(0, 300));
    return new NextResponse("Hôte non autorisé", { status: 403 });
  }

  const token = session.edToken;

  try {
    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        ...(token ? { "X-Token": token } : {}),
      },
    });

    if (!res.ok) return new NextResponse("Image introuvable", { status: 404 });

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return new NextResponse(message, { status: 500 });
  }
}
