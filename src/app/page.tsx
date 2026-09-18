"use client";

import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import {
  Badge,
  Empty,
  Gauge,
  LoadingPanel,
  Metric,
  Panel,
  RowItem,
  Rows,
  Sparkline,
  SubjectTag,
  scoreColor,
} from "@/components/ui";
import { useApiData, useAuth } from "@/lib/auth-context";
import {
  type Grade,
  type HomeworkEntry,
  type NewsEntry,
  type TimetableEntry,
  computeGeneralAverage,
  formatShortDate,
  formatTime,
  getSubjectColor,
} from "@/lib/services/types";

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const NEWS_TONES: Record<string, { label: string; tone: "accent" | "danger" | "success" }> = {
  info: { label: "Info", tone: "accent" },
  event: { label: "Événement", tone: "accent" },
  urgent: { label: "Urgent", tone: "danger" },
  menu: { label: "Cantine", tone: "success" },
};

export default function Home() {
  const { session } = useAuth();
  const { data: grades, loading: gL } = useApiData<Grade[]>("/api/grades", []);
  const { data: timetable, loading: tL } = useApiData<TimetableEntry[]>("/api/timetable", []);
  const { data: homework, loading: hL } = useApiData<HomeworkEntry[]>("/api/homework", []);
  const { data: news, loading: nL } = useApiData<NewsEntry[]>("/api/news", []);

  const loading = gL || tL || hL || nL;
  const firstName = session?.student?.firstName || "Élève";
  const average = computeGeneralAverage(grades);

  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const todayStr = today.toISOString().split("T")[0];

  const todayCourses = timetable
    .filter((c) => c.start.startsWith(todayStr))
    .sort((a, b) => a.start.localeCompare(b.start));

  const pending = homework.filter((h) => !h.done);
  const recentGrades = [...grades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const trendSeries = [...grades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-16)
    .map((g) => (g.value / g.outOf) * 20);

  const header = <Header title={`Bonjour, ${firstName}`} subtitle={`${dayName} — Bonne journée !`} />;

  if (loading) {
    return (
      <>
        {header}
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={8} />
        </main>
      </>
    );
  }

  const nextCourse = todayCourses.find((c) => new Date(c.end).getTime() > today.getTime());

  return (
    <>
      {header}
      <main className="p-4 space-y-4 sm:p-6">
        {/* Top strip: the day at a glance */}
        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-5 sm:items-center">
            <Metric
              value={average.toFixed(2)}
              unit="/20"
              label="Moyenne"
              color={scoreColor(average)}
            />
            <Metric
              value={pending.length.toString()}
              label="Devoirs à faire"
              color={pending.length > 0 ? "var(--warning)" : "var(--success)"}
            />
            <Metric value={todayCourses.length.toString()} label="Cours aujourd'hui" />
            <Metric
              value={nextCourse ? formatTime(nextCourse.start) : "—"}
              label={nextCourse ? `Prochain · ${nextCourse.subject}` : "Journée terminée"}
              color="var(--accent)"
            />
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Évolution
              </span>
              <Sparkline values={trendSeries} color="var(--accent)" />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Today's schedule */}
          <div className="lg:col-span-2">
            <Panel title="Emploi du temps" meta={dayName} href="/timetable" flush delay={0.05}>
              {todayCourses.length === 0 ? (
                <Empty icon="Calendar">Pas de cours aujourd&apos;hui</Empty>
              ) : (
                <Rows>
                  {todayCourses.map((course) => {
                    const color = course.color || getSubjectColor(course.subject);
                    const over = new Date(course.end).getTime() < today.getTime();
                    return (
                      <RowItem key={course.id} accent={color} dim={over}>
                        <span
                          className="w-[86px] shrink-0 text-[11px] font-semibold tabular-nums"
                          style={{ color: "var(--muted)" }}
                        >
                          {formatTime(course.start)} – {formatTime(course.end)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <SubjectTag subject={course.subject} color={color} />
                          <span
                            className="block mt-0.5 text-[11px] truncate"
                            style={{ color: "var(--muted)" }}
                          >
                            {[course.teacher, course.room].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {course.status !== "normal" && (
                          <Badge tone={course.status === "cancelled" ? "danger" : "warning"}>
                            {course.status === "cancelled" ? "Annulé" : "Modifié"}
                          </Badge>
                        )}
                      </RowItem>
                    );
                  })}
                </Rows>
              )}
            </Panel>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Panel title="Dernières notes" href="/grades" flush delay={0.1}>
              {recentGrades.length === 0 ? (
                <Empty icon="Grades">Aucune note</Empty>
              ) : (
                <Rows>
                  {recentGrades.map((grade) => {
                    const color = getSubjectColor(grade.subject);
                    const out20 = (grade.value / grade.outOf) * 20;
                    return (
                      <RowItem key={grade.id} accent={color}>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] font-medium truncate">
                            {grade.title}
                          </span>
                          <SubjectTag subject={grade.subject} color={color} />
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span
                            className="text-[15px] font-bold"
                            style={{ color: scoreColor(out20) }}
                          >
                            {grade.value}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                            /{grade.outOf}
                          </span>
                        </span>
                      </RowItem>
                    );
                  })}
                </Rows>
              )}
            </Panel>

            <Panel
              title="Devoirs"
              meta={`${pending.length} à faire`}
              href="/homework"
              flush
              delay={0.15}
            >
              {pending.length === 0 ? (
                <Empty icon="Tasks">Rien à faire</Empty>
              ) : (
                <Rows>
                  {pending.slice(0, 5).map((hw) => {
                    const color = getSubjectColor(hw.subject);
                    const urgent =
                      new Date(hw.dueDate).toDateString() === today.toDateString();
                    return (
                      <RowItem key={hw.id} accent={color}>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] font-medium truncate">{hw.title}</span>
                          <SubjectTag subject={hw.subject} color={color} />
                        </span>
                        <Badge tone={urgent ? "danger" : "muted"}>
                          {urgent ? "Aujourd'hui" : formatShortDate(hw.dueDate)}
                        </Badge>
                      </RowItem>
                    );
                  })}
                </Rows>
              )}
            </Panel>
          </div>
        </div>

        {/* Workload by subject — where the pending homework actually sits */}
        {pending.length > 0 && (
          <Panel title="Charge par matière" meta={`${pending.length} devoirs`} delay={0.2}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workloadBySubject(pending).map(({ subject, count, ratio }) => {
                const color = getSubjectColor(subject);
                return (
                  <div key={subject} className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <SubjectTag subject={subject} color={color} />
                      <span className="text-[13px] font-bold tabular-nums shrink-0">{count}</span>
                    </div>
                    <Gauge value={ratio} max={1} color={color} label={`${subject} : ${count}`} />
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* News */}
        <Panel title="Actualités" href="/news" flush delay={0.25}>
          {news.length === 0 ? (
            <Empty icon="Newspaper">Aucune actualité</Empty>
          ) : (
            <Rows>
              {news.slice(0, 4).map((item) => {
                const cfg = NEWS_TONES[item.category] ?? NEWS_TONES.info;
                return (
                  <RowItem key={item.id}>
                    <Papicon name="Newspaper" size={14} color="var(--muted)" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-medium truncate">{item.title}</span>
                      <span
                        className="block text-[11px] truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {item.author} · {formatShortDate(item.date)}
                      </span>
                    </span>
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                  </RowItem>
                );
              })}
            </Rows>
          )}
        </Panel>
      </main>
    </>
  );
}

/** Pending homework grouped by subject, ratio relative to the busiest one. */
function workloadBySubject(homework: HomeworkEntry[]) {
  const counts = new Map<string, number>();
  for (const hw of homework) counts.set(hw.subject, (counts.get(hw.subject) ?? 0) + 1);
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const top = entries[0]?.[1] ?? 1;
  return entries.map(([subject, count]) => ({ subject, count, ratio: count / top }));
}
