"use client";

import Header from "@/components/Header";
import SubjectIcon from "@/components/SubjectIcon";
import Papicon from "@/components/Papicon";
import { useApiData } from "@/lib/auth-context";
import { type TimetableEntry, formatTime, getSubjectColor } from "@/lib/services/types";
import { useState, useMemo } from "react";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

// Use local date components — NOT toISOString() which shifts in UTC+N timezones
function localISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun…6=Sat
  const diff = dow === 0 ? -6 : 1 - dow; // step back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function weekLabel(monday: Date): string {
  const friday = addDays(monday, 4);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${fmt(monday)} — ${fmt(friday)}`;
}

export default function TimetablePage() {
  const today   = useMemo(() => new Date(), []);
  const todayDow = today.getDay(); // 0=Sun, 1=Mon…
  const defaultDay = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : 0; // 0-indexed Mon-Fri

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  const monday = useMemo(() => addDays(getMonday(today), weekOffset * 7), [today, weekOffset]);
  const friday = useMemo(() => addDays(monday, 4), [monday]);

  const { data: timetable, loading } = useApiData<TimetableEntry[]>(
    `/api/timetable?start=${localISO(monday)}&end=${localISO(friday)}`,
    []
  );

  const selectedDate    = addDays(monday, selectedDay);
  const selectedDateStr = localISO(selectedDate);

  const dayCourses = [...timetable]
    .filter((c) => c.start.startsWith(selectedDateStr))
    .sort((a, b) => a.start.localeCompare(b.start));

  const todayStr = localISO(today);

  function goToToday() {
    setWeekOffset(0);
    setSelectedDay(defaultDay);
  }

  return (
    <>
      <Header title="Emploi du temps" subtitle={weekLabel(monday)} />
      <main className="p-4 space-y-5 sm:p-6">

        {/* Week nav + day tabs */}
        <div className="flex items-center gap-2 wap-in" style={{ animationDelay: "0s" }}>
          <button
            onClick={() => { setWeekOffset((w) => w - 1); setSelectedDay(0); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-default transition-colors text-muted"
          >
            <Papicon name="ChevronLeft" size={16} />
          </button>

          <div className="flex flex-1 gap-1 overflow-x-auto">
            {DAY_NAMES.map((name, i) => {
              const dayDate  = addDays(monday, i);
              const dateStr  = localISO(dayDate);
              const isToday  = dateStr === todayStr;
              const isActive = selectedDay === i;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedDay(i)}
                  className="flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-xl py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                      : isToday
                      ? { background: "color-mix(in oklch, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)" }
                      : { background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)" }
                  }
                >
                  <span className="hidden sm:inline">{name}</span>
                  <span className="sm:hidden">{name.slice(0, 3)}</span>
                  <span className="text-[10px] opacity-70">
                    {dayDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setWeekOffset((w) => w + 1); setSelectedDay(0); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-default transition-colors text-muted"
          >
            <Papicon name="ChevronRight" size={16} />
          </button>
        </div>

        {weekOffset !== 0 && (
          <button
            onClick={goToToday}
            className="text-xs font-medium transition-opacity hover:opacity-60 wap-in"
            style={{ color: "var(--accent)", animationDelay: "0.04s" }}
          >
            ← Revenir à aujourd&apos;hui
          </button>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div className="rounded-2xl border border-border bg-surface overflow-hidden wap-in" style={{ animationDelay: "0.07s" }}>
              {dayCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted">
                  <Papicon name="Calendar" size={28} color="var(--muted)" />
                  <p className="text-sm">Pas de cours ce jour</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {dayCourses.map((course) => {
                    const color = course.color || getSubjectColor(course.subject);
                    const dur   = Math.round((new Date(course.end).getTime() - new Date(course.start).getTime()) / 60000);
                    return (
                      <div
                        key={course.id}
                        className={`flex gap-3 p-3 sm:gap-4 sm:p-4 hover:bg-default/40 transition-colors ${course.status === "cancelled" ? "opacity-50" : ""}`}
                      >
                        {/* Time column */}
                        <div className="flex flex-col items-center text-xs text-muted w-12 sm:w-14 shrink-0 pt-0.5">
                          <span className="font-semibold text-foreground tabular-nums">{formatTime(course.start)}</span>
                          <div className="flex-1 flex flex-col items-center py-1.5">
                            <div className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <span className="tabular-nums">{formatTime(course.end)}</span>
                        </div>

                        {/* Course card */}
                        <div
                          className="flex-1 min-w-0 rounded-xl p-3"
                          style={{ background: color + "14", borderLeft: `3px solid ${color}` }}
                        >
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <SubjectIcon subject={course.subject} size="sm" />
                            <span className="font-semibold text-sm">{course.subject}</span>
                            {course.status !== "normal" && (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  background: `color-mix(in oklch, ${course.status === "cancelled" ? "var(--danger)" : "var(--warning)"} 15%, transparent)`,
                                  color: course.status === "cancelled" ? "var(--danger)" : "var(--warning)",
                                }}
                              >
                                {course.status === "cancelled" ? "Annulé" : "Modifié"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                            {course.teacher && (
                              <span className="flex items-center gap-1">
                                <Papicon name="User" size={10} color="var(--muted)" />
                                {course.teacher}
                              </span>
                            )}
                            {course.room && (
                              <span className="flex items-center gap-1">
                                <Papicon name="MapPin" size={10} color="var(--muted)" />
                                {course.room}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Papicon name="Clock" size={10} color="var(--muted)" />
                              {dur} min
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Day summary */}
            {dayCourses.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-4 wap-in" style={{ animationDelay: "0.12s" }}>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                  Résumé — {DAY_NAMES[selectedDay]}
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{dayCourses.length}</p>
                    <p className="text-xs text-muted mt-0.5">cours</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>{formatTime(dayCourses[0].start)}</p>
                    <p className="text-xs text-muted mt-0.5">début</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>{formatTime(dayCourses[dayCourses.length - 1].end)}</p>
                    <p className="text-xs text-muted mt-0.5">fin</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
