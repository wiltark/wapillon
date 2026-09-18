// Server-side session store
// In production, use Redis or a database

import type { SessionData, ServiceType, StudentInfo } from "./services/types";

interface InternalSession extends SessionData {
  createdAt: number;
  // Pronote session handle (opaque object)
  pronoteHandle?: unknown;
  // ED token
  edToken?: string;
  edAccountId?: number;
  edAccountType?: string;
}

// Persist across hot reloads in dev
const globalSessions = globalThis as unknown as { __sessions?: Map<string, InternalSession> };
if (!globalSessions.__sessions) {
  globalSessions.__sessions = new Map();
}
const sessions = globalSessions.__sessions;

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24h

export function createSession(data: {
  service: ServiceType;
  student: StudentInfo;
  pronoteHandle?: unknown;
  edToken?: string;
  edAccountId?: number;
  edAccountType?: string;
}): InternalSession {
  const id = crypto.randomUUID();
  const session: InternalSession = {
    id,
    service: data.service,
    student: data.student,
    createdAt: Date.now(),
    pronoteHandle: data.pronoteHandle,
    edToken: data.edToken,
    edAccountId: data.edAccountId,
    edAccountType: data.edAccountType,
  };
  sessions.set(id, session);
  console.log("[session] Created session:", id, "- total sessions:", sessions.size);
  return session;
}

export function getSession(id: string): InternalSession | null {
  const session = sessions.get(id);
  console.log("[session] Lookup:", id, "- found:", !!session, "- total sessions:", sessions.size);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

// Clean up expired sessions periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.createdAt > SESSION_TTL) {
        sessions.delete(id);
      }
    }
  }, 60 * 60 * 1000); // Every hour
}
