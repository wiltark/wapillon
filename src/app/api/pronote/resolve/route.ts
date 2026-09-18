import { NextRequest, NextResponse } from "next/server";
import { resolvePronoteUrl } from "@/lib/services/pronote-schools";
import { withLog } from "@/lib/logger";

// Public: turns a directory UAI into the school's Pronote URL.
async function handler(req: NextRequest): Promise<NextResponse> {
  const uai = req.nextUrl.searchParams.get("uai");
  if (!uai) return NextResponse.json({ error: "UAI manquant" }, { status: 400 });

  try {
    const url = await resolvePronoteUrl(uai);
    if (!url) {
      return NextResponse.json(
        { error: "Cet établissement n'est pas référencé par Pronote." },
        { status: 404 }
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recherche impossible";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = withLog(handler);
