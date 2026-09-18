// Server-side session store
// In production, use Redis or a database

import type {
  AccountRole,
  ChildInfo,
  SessionData,
  ServiceType,
  StudentInfo,
} from "./services/types";

interface InternalSession extends SessionData {
  createdAt: number;
  // Pronote session handle (opaque object)
  pronoteHandle?: unknown;
  // ED token
  edToken?: string;
  edAccountId?: number;
  edAccountType?: string;
}

/**
 * Which account id student-scoped calls should use.
 *
 * On a family account the parent's own id returns nothing useful — grades,
 * homework and attendance all belong to a child, so those calls must carry the
 * selected child's id instead.
 */
export function targetAccountId(session: InternalSession): number {
  if (session.role === "parent" && session.activeChildId) {
    return Number(session.activeChildId);
  }
  return session.edAccountId ?? 0;
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
  role?: AccountRole;
  children?: ChildInfo[];
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
    role: data.role ?? "student",
    children: data.children ?? [],
    // Default to the first child so a parent lands on real data, not an
    // empty page waiting for a selection.
    activeChildId: data.children?.[0]?.id,
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

/** Switches which child a parent session is looking at. */
export function setActiveChild(sessionId: string, childId: string): InternalSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const child = session.children?.find((c) => c.id === childId);
  if (!child) return null;

  session.activeChildId = childId;
  // The header reads from `student`, so keep it in step with the selection.
  session.student = {
    id: child.id,
    firstName: child.firstName,
    lastName: child.lastName,
    className: child.className,
    school: child.school,
  };
  return session;
}

/** Stores a refreshed ED token after a call rotates it. */
export function updateEDToken(sessionId: string, token: string): void {
  const session = sessions.get(sessionId);
  if (session) session.edToken = token;
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
