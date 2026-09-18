import { NextRequest, NextResponse } from "next/server";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse> | NextResponse;

const ICONS: Record<number, string> = {};
function icon(status: number) {
  if (status >= 500) return "❌";
  if (status >= 400) return "⚠️";
  return "✅";
}

export function withLog(handler: Handler): Handler {
  return async (req, ctx) => {
    const start  = Date.now();
    const method = req.method;
    const path   = req.nextUrl.pathname + req.nextUrl.search;

    let body = "";
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const clone = req.clone();
        const text  = await clone.text();
        // Redact passwords from logs
        body = text.replace(/"password"\s*:\s*"[^"]*"/g, '"password":"***"');
      } catch { /* ignore */ }
    }

    let res: NextResponse;
    try {
      res = await handler(req, ctx) as NextResponse;
    } catch (err) {
      const ms = Date.now() - start;
      console.error(`❌ [api] ${method} ${path} → 500 (${ms}ms)`, err);
      throw err;
    }

    const ms     = Date.now() - start;
    const status = res.status;
    const prefix = `${icon(status)} [api] ${method} ${path} → ${status} (${ms}ms)`;

    if (status >= 400) {
      // Log body detail on errors
      try {
        const clone   = res.clone();
        const payload = await clone.json();
        console.error(prefix, body ? `| body: ${body}` : "", "| res:", JSON.stringify(payload));
      } catch {
        console.error(prefix, body ? `| body: ${body}` : "");
      }
    } else {
      console.log(prefix, body ? `| body: ${body}` : "");
    }

    return res;
  };
}
