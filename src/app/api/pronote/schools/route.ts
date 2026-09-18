import { NextRequest, NextResponse } from "next/server";
import { nearbyInstances, searchSchools } from "@/lib/services/pronote-schools";
import { withLog } from "@/lib/logger";

// Public: used on the login screen, before any session exists.
// ?q=<name, town or UAI>  → directory matches (URL resolved on pick)
// ?lat=<n>&lon=<n>        → Pronote instances around that position
async function handler(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;

  try {
    const q = params.get("q")?.trim();
    if (q) {
      if (q.length > 100) return NextResponse.json({ error: "Recherche trop longue" }, { status: 400 });
      return NextResponse.json(await searchSchools(q));
    }

    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    if (params.has("lat") && params.has("lon") && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return NextResponse.json(await nearbyInstances(lat, lon));
    }

    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recherche impossible";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = withLog(handler);
