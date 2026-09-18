"use client";

import Header from "@/components/Header";
import SubjectIcon from "@/components/SubjectIcon";
import Papicon from "@/components/Papicon";
import { useAuth, useApiData } from "@/lib/auth-context";
import {
  type Grade,
  type TimetableEntry,
  type HomeworkEntry,
  type NewsEntry,
  computeGeneralAverage,
  formatShortDate,
  formatTime,
  getSubjectColor,
} from "@/lib/services/types";
import Link from "next/link";

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const newsConfig: Record<string, { label: string; color: string; icon: string }> = {
  info:   { label: "Info",      color: "var(--accent)",  icon: "Info"     },
  event:  { label: "Événement", color: "var(--accent)",  icon: "Calendar" },
  urgent: { label: "Urgent",    color: "var(--danger)",  icon: "Bell"     },
  menu:   { label: "Cantine",   color: "var(--success)", icon: "Cutlery"  },
};

export default function Home() {
  const { session } = useAuth();
  const { data: grades, loading: gL } = useApiData<Grade[]>("/api/grades", []);
  const { data: timetable, loading: tL } = useApiData<TimetableEntry[]>("/api/timetable", []);
  const { data: homework, loading: hL } = useApiData<HomeworkEntry[]>("/api/homework", []);
  const { data: news, loading: nL } = useApiData<NewsEntry[]>("/api/news", []);

  const loading = gL || tL || hL || nL;
  const firstName = session?.student?.firstName || "Élève";
  const generalAvg = computeGeneralAverage(grades);

  const today = new Date();
  const dayName = dayNames[today.getDay()];
  const todayStr = today.toISOString().split("T")[0];
  const todayCourses = timetable
    .filter((c) => c.start.startsWith(todayStr))
    .sort((a, b) => a.start.localeCompare(b.start));

  const pendingHomework = homework.filter((h) => !h.done);
  const recentGrades = [...grades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const latestNews = news.slice(0, 3);

  if (loading) {
    return (
      <>
        <Header title={`Bonjour, ${firstName}`} subtitle={`${dayName} — Bonne journée !`} />
        <div className="flex items-center justify-center py-24">
          <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`Bonjour, ${firstName}`} subtitle={`${dayName} — Bonne journée !`} />
      <main className="p-4 space-y-6 sm:p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 wap-in" style={{ animationDelay: "0s" }}>
          <StatCard icon="Grades"       label="Moyenne générale" value={generalAvg.toFixed(2)} suffix="/20"       color="var(--accent)"  />
          <StatCard icon="GraduationHat" label="Dernière note"    value={recentGrades[0]?.value.toString() ?? "—"} suffix={recentGrades[0] ? `/${recentGrades[0].outOf}` : ""} color="var(--success)" />
          <StatCard icon="Tasks"        label="Devoirs à faire"  value={pendingHomework.length.toString()}         suffix="restants"      color="var(--warning)" />
          <StatCard icon="Calendar"     label="Cours aujourd'hui" value={todayCourses.length.toString()}            suffix="cours"         color="var(--accent)"  />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Schedule */}
          <div className="lg:col-span-2 wap-in" style={{ animationDelay: "0.07s" }}>
            <SectionHeader title="Emploi du temps" subtitle={dayName} href="/timetable" />
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {todayCourses.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted">Pas de cours aujourd&apos;hui</p>
              ) : (
                todayCourses.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-default/50 transition-colors">
                    <div className="flex flex-col items-center text-xs text-muted w-12 shrink-0">
                      <span className="font-semibold text-foreground">{formatTime(c.start)}</span>
                      <div className="h-3 w-px bg-border my-0.5" />
                      <span>{formatTime(c.end)}</span>
                    </div>
                    <div className="h-10 w-1 rounded-full shrink-0" style={{ backgroundColor: c.color || getSubjectColor(c.subject) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <SubjectIcon subject={c.subject} size="sm" />
                        <span className="font-medium text-sm truncate">{c.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                        <span className="truncate">{c.teacher}</span>
                        <span>•</span>
                        <span>{c.room}</span>
                      </div>
                    </div>
                    {c.status !== "normal" && (
                      <StatusBadge status={c.status} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="wap-in" style={{ animationDelay: "0.12s" }}>
              <SectionHeader title="Dernières notes" href="/grades" />
              <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
                {recentGrades.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted">Aucune note</p>
                ) : (
                  recentGrades.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-3 hover:bg-default/50 transition-colors">
                      <SubjectIcon subject={g.subject} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{g.title}</p>
                        <p className="text-xs text-muted truncate">{g.subject}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold">{g.value}</span>
                        <span className="text-xs text-muted">/{g.outOf}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="wap-in" style={{ animationDelay: "0.17s" }}>
              <SectionHeader title="Devoirs à venir" href="/homework" />
              <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
                {pendingHomework.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted">Aucun devoir</p>
                ) : (
                  pendingHomework.slice(0, 4).map((h) => (
                    <div key={h.id} className="flex items-center gap-3 p-3 hover:bg-default/50 transition-colors">
                      <SubjectIcon subject={h.subject} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.title}</p>
                        <p className="text-xs text-muted">Pour le {formatShortDate(h.dueDate)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* News */}
        <div className="wap-in" style={{ animationDelay: "0.22s" }}>
          <SectionHeader title="Actualités" href="/news" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((n) => {
              const cfg = newsConfig[n.category] ?? newsConfig.info;
              return (
                <div key={n.id} className="rounded-2xl border border-border bg-surface p-4 hover:bg-default/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: `color-mix(in oklch, ${cfg.color} 12%, transparent)`, color: cfg.color }}
                    >
                      <Papicon name={cfg.icon} size={10} /> {cfg.label}
                    </span>
                    <span className="text-xs text-muted">{formatShortDate(n.date)}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{n.title}</h3>
                  <p className="text-xs text-muted line-clamp-2">{n.content}</p>
                  <p className="text-xs text-muted mt-2">— {n.author}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ icon, label, value, suffix, color }: { icon: string; label: string; value: string; suffix: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface flex items-center gap-3 p-3 sm:p-4">
      <div
        className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
      >
        <Papicon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-muted truncate">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-xl font-bold">{value}</span>
          <span className="text-xs text-muted">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm sm:text-base font-bold truncate">{title}</h2>
        {subtitle && <span className="text-xs text-muted hidden sm:inline">— {subtitle}</span>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs font-medium shrink-0 transition-opacity hover:opacity-60" style={{ color: "var(--accent)" }}>
          Voir tout <Papicon name="ChevronRight" size={12} />
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDanger = status === "cancelled";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
      style={{
        background: `color-mix(in oklch, ${isDanger ? "var(--danger)" : "var(--warning)"} 12%, transparent)`,
        color: isDanger ? "var(--danger)" : "var(--warning)",
      }}
    >
      {isDanger ? "Annulé" : "Modifié"}
    </span>
  );
}
