import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { prisma } from "@/lib/prisma";
import { withLog } from "@/lib/logger";

/** Hex colour, 3 or 6 digits. Anything else is rejected rather than stored. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function accountKey(req: NextRequest): string | null {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  // Preferences belong to the person signed in, not the child being viewed —
  // a parent keeps one set of colours across all their children.
  return String(session.edAccountId ?? session.student.id);
}

async function get(req: NextRequest): Promise<NextResponse> {
  const accountId = accountKey(req);
  if (!accountId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const rows = await prisma.subjectPref.findMany({ where: { accountId } });

  const prefs: Record<string, { color?: string; image?: string; alias?: string }> = {};
  for (const row of rows) {
    prefs[row.subject] = {
      ...(row.color ? { color: row.color } : {}),
      ...(row.image ? { image: row.image } : {}),
      ...(row.alias ? { alias: row.alias } : {}),
    };
  }
  return NextResponse.json(prefs);
}

async function put(req: NextRequest): Promise<NextResponse> {
  const accountId = accountKey(req);
  if (!accountId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.subject !== "string" || !body.subject.trim()) {
    return NextResponse.json({ error: "Matière manquante" }, { status: 400 });
  }

  const subject = String(body.subject).slice(0, 200);
  const color = typeof body.color === "string" && HEX.test(body.color) ? body.color : null;
  const alias =
    typeof body.alias === "string" && body.alias.trim()
      ? body.alias.trim().slice(0, 60)
      : null;

  // Images are rendered as a CSS background, so only plain http(s) URLs are
  // accepted — this is what keeps `javascript:` and `data:` out of the page.
  let image: string | null = null;
  if (typeof body.image === "string" && body.image.trim()) {
    try {
      const parsed = new URL(body.image.trim());
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        image = parsed.toString().slice(0, 2000);
      }
    } catch {
      image = null;
    }
  }

  // Everything cleared means the subject goes back to its defaults.
  if (!color && !image && !alias) {
    await prisma.subjectPref.deleteMany({ where: { accountId, subject } });
    return NextResponse.json({ subject, cleared: true });
  }

  await prisma.subjectPref.upsert({
    where: { accountId_subject: { accountId, subject } },
    create: { accountId, subject, color, image, alias },
    update: { color, image, alias },
  });

  return NextResponse.json({ subject, color, image, alias });
}

async function del(req: NextRequest): Promise<NextResponse> {
  const accountId = accountKey(req);
  if (!accountId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const subject = req.nextUrl.searchParams.get("subject");
  if (subject) {
    await prisma.subjectPref.deleteMany({ where: { accountId, subject } });
  } else {
    await prisma.subjectPref.deleteMany({ where: { accountId } });
  }
  return NextResponse.json({ ok: true });
}

export const GET = withLog(get);
export const PUT = withLog(put);
export const DELETE = withLog(del);
