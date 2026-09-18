// Pronote API service via pawnote
import type {
  StudentInfo,
  TimetableEntry,
  Grade,
  HomeworkEntry,
  NewsEntry,
  AttendanceEntry,
} from "./types";

import * as pawnote from "pawnote";

export async function loginPronote(
  url: string,
  username: string,
  password: string
): Promise<{
  student: StudentInfo;
  handle: pawnote.SessionHandle;
}> {
  const session = pawnote.createSessionHandle();
  const cleaned = pawnote.cleanURL(url);

  await pawnote.loginCredentials(session, {
    url: cleaned,
    kind: pawnote.AccountKind.STUDENT,
    username,
    password,
    deviceUUID: "wapillon-web",
  });

  // After login, the student's details live on the handle's resource.
  // Pronote exposes a single full name, so split it into first/last.
  const resource = session.userResource;
  const [firstName = "", ...rest] = (resource.name ?? "").trim().split(/\s+/);

  return {
    student: {
      id: resource.id ?? "",
      firstName,
      lastName: rest.join(" "),
      className: resource.className ?? "",
      school: resource.establishmentName ?? "",
    },
    handle: session,
  };
}

export async function getPronoteGrades(
  handle: pawnote.SessionHandle
): Promise<Grade[]> {
  const overview = await pawnote.gradesOverview(handle);
  const grades: Grade[] = [];

  if (overview.grades) {
    for (const g of overview.grades) {
      const value = g.student?.value;
      const outOf = g.outOf?.value ?? 20;
      if (value == null || isNaN(value)) continue;

      grades.push({
        id: g.id ?? String(Math.random()),
        subject: g.subject?.name ?? "Inconnu",
        title: g.comment ?? "Évaluation",
        value,
        outOf,
        coefficient: g.coefficient ?? 1,
        date: g.date?.toISOString() ?? "",
        classAverage: g.average?.value,
        classMin: g.min?.value,
        classMax: g.max?.value,
      });
    }
  }

  return grades;
}

export async function getPronoteTimetable(
  handle: pawnote.SessionHandle,
  weekNumber?: number
): Promise<TimetableEntry[]> {
  const raw = weekNumber != null
    ? await pawnote.timetableFromWeek(handle, weekNumber)
    : await pawnote.timetableFromWeek(
        handle,
        pawnote.translateToWeekNumber(handle, new Date())
      );

  const lessons = pawnote.parseTimetable(handle, raw);
  const entries: TimetableEntry[] = [];

  for (const lesson of lessons) {
    entries.push({
      id: lesson.id ?? String(Math.random()),
      subject: lesson.subject?.name ?? "Cours",
      teacher: lesson.teacher?.name ?? "",
      room: lesson.room ?? "",
      start: lesson.start?.toISOString() ?? "",
      end: lesson.end?.toISOString() ?? "",
      color: lesson.subject?.color ?? "#3b82f6",
      status: lesson.canceled ? "cancelled" : lesson.modified ? "modified" : "normal",
    });
  }

  return entries;
}

export async function getPronoteHomework(
  handle: pawnote.SessionHandle,
  weekNumber?: number
): Promise<HomeworkEntry[]> {
  const wk = weekNumber ?? pawnote.translateToWeekNumber(handle, new Date());
  const raw = await pawnote.assignmentsFromWeek(handle, wk);
  const homework: HomeworkEntry[] = [];

  for (const a of raw) {
    homework.push({
      id: a.id ?? String(Math.random()),
      subject: a.subject?.name ?? "Inconnu",
      title: a.description ?? "",
      description: a.description ?? "",
      dueDate: a.deadline?.toISOString() ?? "",
      done: a.done ?? false,
    });
  }

  return homework;
}

export async function getPronoteNews(
  handle: pawnote.SessionHandle
): Promise<NewsEntry[]> {
  const raw = await pawnote.news(handle);
  const items: NewsEntry[] = [];

  for (const n of raw) {
    items.push({
      id: n.id ?? String(Math.random()),
      title: n.title ?? "Sans titre",
      content: n.content ?? "",
      date: n.creationDate?.toISOString() ?? "",
      author: n.author ?? "Établissement",
      category: "info",
    });
  }

  return items;
}

export async function getPronoteAttendance(
  handle: pawnote.SessionHandle
): Promise<AttendanceEntry[]> {
  const raw = await pawnote.presence(handle);
  const records: AttendanceEntry[] = [];

  if (raw.absences) {
    for (const a of raw.absences) {
      records.push({
        id: a.id ?? String(Math.random()),
        type: "absence",
        date: a.from?.toISOString() ?? "",
        startTime: a.from?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) ?? "",
        endTime: a.to?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        reason: a.reason ?? undefined,
        justified: a.justified ?? false,
      });
    }
  }

  if (raw.delays) {
    for (const d of raw.delays) {
      records.push({
        id: d.id ?? String(Math.random()),
        type: "late",
        date: d.date?.toISOString() ?? "",
        startTime: d.date?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) ?? "",
        reason: d.reason ?? undefined,
        justified: d.justified ?? false,
      });
    }
  }

  if (raw.punishments) {
    for (const p of raw.punishments) {
      records.push({
        id: p.id ?? String(Math.random()),
        type: "punishment",
        date: p.date?.toISOString() ?? "",
        startTime: "",
        reason: p.reason ?? "",
        justified: true,
      });
    }
  }

  return records;
}
