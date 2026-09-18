// Unified types for all school services (Pronote, École Directe)

export type ServiceType = "pronote" | "ecoledirecte";

export interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  school: string;
  avatarUrl?: string;
}

export interface TimetableEntry {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  start: string; // ISO datetime
  end: string;
  color: string;
  status: "normal" | "cancelled" | "modified";
}

export interface Grade {
  id: string;
  subject: string;
  title: string;
  value: number;
  outOf: number;
  coefficient: number;
  date: string;
  classAverage?: number;
  classMin?: number;
  classMax?: number;
  isNew?: boolean;
}

export interface SubjectAverage {
  subject: string;
  average: number;
  classAverage?: number;
  maxAverage?: number;
  minAverage?: number;
  gradeCount: number;
  color: string;
}

export interface HomeworkDocument {
  id: number;
  name: string;
}

export interface HomeworkEntry {
  id: string;
  subject: string;
  title: string;
  description: string;
  descriptionHtml?: string; // sanitized HTML with img srcs replaced by proxy URLs
  dueDate: string;
  done: boolean;
  documents?: HomeworkDocument[];
}

export interface NewsEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  category: "info" | "event" | "urgent" | "menu";
}

export interface AttendanceEntry {
  id: string;
  type: "absence" | "late" | "departure" | "punishment";
  date: string;
  startTime: string;
  endTime?: string;
  reason?: string;
  justified: boolean;
  subject?: string;
}

/**
 * Which kind of account is signed in.
 *
 * École Directe reports this as `typeCompte` on the login response: "E" for a
 * student, "1" for a family (parent) account, "P" for a teacher. The role
 * decides both the API host and the URL segment used for every later call.
 */
export type AccountRole = "student" | "parent" | "teacher";

/** One child attached to a parent account (from `profile.eleves`). */
export interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  school: string;
}

export interface MessageFolder {
  id: number;
  name: string;
}

export interface MessageEntry {
  id: string;
  subject: string;
  /** Plain-text preview; the full body is fetched on demand. */
  preview: string;
  /** Sanitized HTML body, only present once the message has been opened. */
  bodyHtml?: string;
  from: string;
  to?: string;
  date: string;
  read: boolean;
  hasAttachments: boolean;
  files?: HomeworkDocument[];
}

export interface InvoiceEntry {
  id: string;
  label: string;
  date: string;
  /** In euros. */
  amount: number;
  paid: boolean;
  /** Document id for downloading the PDF, when the school provides one. */
  documentId?: number;
}

export interface SessionData {
  id: string;
  service: ServiceType;
  student: StudentInfo;
  token?: string;
  role?: AccountRole;
  /** Parent accounts only: the children this account can switch between. */
  children?: ChildInfo[];
  /** Parent accounts only: which child's data is currently being shown. */
  activeChildId?: string;
}

// Colors assigned to subjects
const SUBJECT_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#22c55e",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
  "#a855f7", "#10b981", "#e11d48", "#0ea5e9", "#84cc16",
];

const subjectColorMap = new Map<string, string>();
let colorIndex = 0;

export function getSubjectColor(subject: string): string {
  if (!subjectColorMap.has(subject)) {
    subjectColorMap.set(subject, SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length]);
    colorIndex++;
  }
  return subjectColorMap.get(subject)!;
}

export function computeGeneralAverage(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  let sum = 0;
  let coefSum = 0;
  for (const g of grades) {
    const norm = (g.value / g.outOf) * 20;
    sum += norm * g.coefficient;
    coefSum += g.coefficient;
  }
  return coefSum > 0 ? sum / coefSum : 0;
}

export function computeSubjectAverages(grades: Grade[]): SubjectAverage[] {
  const map = new Map<string, { sum: number; coef: number; classSum: number; count: number }>();
  for (const g of grades) {
    const entry = map.get(g.subject) || { sum: 0, coef: 0, classSum: 0, count: 0 };
    const norm = (g.value / g.outOf) * 20;
    entry.sum += norm * g.coefficient;
    entry.coef += g.coefficient;
    entry.classSum += (g.classAverage ?? norm);
    entry.count += 1;
    map.set(g.subject, entry);
  }
  return Array.from(map.entries()).map(([subject, data]) => ({
    subject,
    average: data.coef > 0 ? data.sum / data.coef : 0,
    classAverage: data.count > 0 ? data.classSum / data.count : undefined,
    gradeCount: data.count,
    color: getSubjectColor(subject),
  }));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
