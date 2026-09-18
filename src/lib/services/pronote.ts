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
    deviceUUID: "scoly-web",
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

/**
 * The period Pronote itself would open a tab on: the tab's default, else the
 * one covering today. Undefined when the school has the tab switched off.
 */
function defaultPeriod(
  handle: pawnote.SessionHandle,
  location: pawnote.TabLocation
): pawnote.Period | undefined {
  const tab = handle.userResource.tabs.get(location);
  if (!tab) return undefined;

  const now = Date.now();
  return (
    tab.defaultPeriod ??
    tab.periods.find((p) => p.startDate.getTime() <= now && now <= p.endDate.getTime()) ??
    tab.periods[0]
  );
}

/** Pronote numbers weeks from the first Monday of the school year. */
function currentWeek(handle: pawnote.SessionHandle): number {
  return pawnote.translateToWeekNumber(new Date(), handle.instance.firstMonday);
}

/** Numeric points of a grade value, or undefined for absent, exempted, etc. */
function points(v: pawnote.GradeValue | undefined): number | undefined {
  switch (v?.kind) {
    case pawnote.GradeKind.Grade:
      return v.points;
    case pawnote.GradeKind.AbsentZero:
    case pawnote.GradeKind.UnreturnedZero:
      return 0;
    default:
      return undefined;
  }
}

export async function getPronoteGrades(
  handle: pawnote.SessionHandle
): Promise<Grade[]> {
  const period = defaultPeriod(handle, pawnote.TabLocation.Grades);
  if (!period) return [];

  const overview = await pawnote.gradesOverview(handle, period);
  const grades: Grade[] = [];

  for (const g of overview.grades) {
    const value = points(g.value);
    if (value == null || isNaN(value)) continue;

    grades.push({
      id: g.id,
      subject: g.subject.name,
      title: g.comment || "Évaluation",
      value,
      outOf: points(g.outOf) ?? 20,
      coefficient: g.coefficient,
      date: g.date.toISOString(),
      classAverage: points(g.average),
      classMin: points(g.min),
      classMax: points(g.max),
    });
  }

  return grades;
}

export async function getPronoteTimetable(
  handle: pawnote.SessionHandle,
  weekNumber?: number
): Promise<TimetableEntry[]> {
  const timetable = await pawnote.timetableFromWeek(
    handle,
    weekNumber ?? currentWeek(handle)
  );

  // Filters and merges `timetable.classes` in place.
  pawnote.parseTimetable(handle, timetable, {
    withSuperposedCanceledClasses: false,
    withCanceledClasses: true,
    withPlannedClasses: true,
  });

  const entries: TimetableEntry[] = [];

  for (const c of timetable.classes) {
    const base = {
      id: c.id,
      start: c.startDate.toISOString(),
      end: c.endDate.toISOString(),
      color: c.backgroundColor ?? "#3b82f6",
    };

    switch (c.is) {
      case "lesson":
        entries.push({
          ...base,
          subject: c.subject?.name ?? "Cours",
          teacher: c.teacherNames.join(", "),
          room: c.classrooms.join(", "),
          // `status` is Pronote's note on a changed lesson, e.g. "Prof. absent".
          status: c.canceled ? "cancelled" : c.status ? "modified" : "normal",
        });
        break;
      case "activity":
        entries.push({
          ...base,
          subject: c.title,
          teacher: c.attendants.join(", "),
          room: "",
          status: "normal",
        });
        break;
      case "detention":
        entries.push({
          ...base,
          subject: c.title ?? "Retenue",
          teacher: c.teacherNames.join(", "),
          room: c.classrooms.join(", "),
          status: "normal",
        });
        break;
    }
  }

  return entries;
}

export async function getPronoteHomework(
  handle: pawnote.SessionHandle,
  weekNumber?: number
): Promise<HomeworkEntry[]> {
  const wk = weekNumber ?? currentWeek(handle);
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

  for (const n of raw.items) {
    items.push({
      id: n.id,
      title: n.title ?? "Sans titre",
      // Surveys are a list of questions rather than a body of text.
      content: n.is === "information" ? n.content : "",
      date: n.creationDate.toISOString(),
      author: n.author || "Établissement",
      category: "info",
    });
  }

  return items;
}

export async function getPronoteAttendance(
  handle: pawnote.SessionHandle
): Promise<AttendanceEntry[]> {
  // Absences, lateness and punishments live in the "vie scolaire" notebook.
  const period = defaultPeriod(handle, pawnote.TabLocation.Notebook);
  if (!period) return [];

  const raw = await pawnote.notebook(handle, period);
  const records: AttendanceEntry[] = [];

  for (const a of raw.absences) {
    records.push({
      id: a.id,
      type: "absence",
      date: a.startDate.toISOString(),
      startTime: a.startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      endTime: a.endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      reason: a.reason,
      justified: a.justified,
    });
  }

  for (const d of raw.delays) {
    records.push({
      id: d.id,
      type: "late",
      date: d.date.toISOString(),
      startTime: d.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      reason: d.reason,
      justified: d.justified,
    });
  }

  for (const p of raw.punishments) {
    records.push({
      id: p.id,
      type: "punishment",
      date: p.dateGiven.toISOString(),
      startTime: "",
      reason: p.reasons.join(", ") || p.title,
      justified: true,
    });
  }

  return records;
}
