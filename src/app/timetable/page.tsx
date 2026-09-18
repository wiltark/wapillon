"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { Badge, Empty, LoadingPanel, Metric, Panel } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import { PRESET_COLORS, useSubjectPrefs, type SubjectStyle } from "@/lib/subject-prefs";
import { type TimetableEntry, formatTime, getSubjectColor } from "@/lib/services/types";

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

/** Minutes since midnight, the unit the whole timeline is laid out in. */
function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function TimetablePage() {
  const today = useMemo(() => new Date(), []);
  const todayDow = today.getDay();
  const defaultDay = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : 0;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [editing, setEditing] = useState<string | null>(null);

  const { prefs, setSubject, resetSubject } = useSubjectPrefs();

  const monday = useMemo(() => addDays(getMonday(today), weekOffset * 7), [today, weekOffset]);
  const friday = useMemo(() => addDays(monday, 4), [monday]);

  const { data: timetable, loading } = useApiData<TimetableEntry[]>(
    `/api/timetable?start=${localISO(monday)}&end=${localISO(friday)}`,
    []
  );

  const selectedDate = addDays(monday, selectedDay);
  const selectedDateStr = localISO(selectedDate);
  const todayStr = localISO(today);
  const isToday = selectedDateStr === todayStr;

  const dayCourses = useMemo(
    () =>
      [...timetable]
        .filter((c) => c.start.startsWith(selectedDateStr))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [timetable, selectedDateStr]
  );

  // Live clock, only while looking at today — the marker would be meaningless
  // on any other day, and this avoids a pointless interval.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();

  const styleFor = (subject: string): SubjectStyle & { color: string } => {
    const custom = prefs[subject] ?? {};
    return { ...custom, color: custom.color || getSubjectColor(subject) };
  };

  if (loading) {
    return (
      <>
        <Header title="Emploi du temps" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={6} />
        </main>
      </>
    );
  }

  /**
   * Where "now" sits in the list.
   *
   * A time-based percentage does not work here: a 25-minute break takes almost
   * no vertical space but a lot of clock time, so the marker drifted onto the
   * next course. Instead we find the exact slot — inside a course, or in the
   * gap before one — and render the marker there.
   */
  const nowSlot: { index: number; inBreak: boolean } | null = (() => {
    if (!isToday || dayCourses.length === 0) return null;

    for (let i = 0; i < dayCourses.length; i++) {
      const start = minutesOfDay(dayCourses[i].start);
      const end = minutesOfDay(dayCourses[i].end);

      if (nowMinutes < start) {
        // Before this course: either the day hasn't started or we're on a break.
        return { index: i, inBreak: i > 0 };
      }
      if (nowMinutes < end) return { index: i, inBreak: false };
    }
    // Past the last course.
    return { index: dayCourses.length, inBreak: false };
  })();

  const totalMinutes = dayCourses
    .filter((c) => c.status !== "cancelled")
    .reduce((sum, c) => sum + (minutesOfDay(c.end) - minutesOfDay(c.start)), 0);

  return (
    <>
      <Header title="Emploi du temps" subtitle={weekLabel(monday)} />
      <main className="p-4 space-y-4 sm:p-6">
        {/* Week strip */}
        <Panel>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Semaine précédente"
              onPress={() => {
                setWeekOffset((w) => w - 1);
                setSelectedDay(0);
              }}
            >
              <Papicon name="ChevronLeft" size={15} />
            </Button>

            <div className="grid flex-1 grid-cols-5 gap-1.5">
              {DAY_NAMES.map((name, i) => {
                const date = addDays(monday, i);
                const iso = localISO(date);
                const dayIsToday = iso === todayStr;
                const active = selectedDay === i;
                const count = timetable.filter((c) => c.start.startsWith(iso)).length;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedDay(i)}
                    className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors"
                    style={
                      active
                        ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                        : {
                            background: "var(--surface-secondary)",
                            color: "var(--foreground)",
                            outline: dayIsToday
                              ? "1px solid color-mix(in oklch, var(--accent) 45%, transparent)"
                              : undefined,
                          }
                    }
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      <span className="hidden sm:inline">{name}</span>
                      <span className="sm:hidden">{name.slice(0, 3)}</span>
                    </span>
                    <span className="text-[15px] font-bold tabular-nums leading-none">
                      {date.getDate()}
                    </span>
                    <span className="text-[10px] tabular-nums opacity-70">
                      {count > 0 ? `${count} cours` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Semaine suivante"
              onPress={() => {
                setWeekOffset((w) => w + 1);
                setSelectedDay(0);
              }}
            >
              <Papicon name="ChevronRight" size={15} />
            </Button>
          </div>

          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-fit"
              onPress={() => {
                setWeekOffset(0);
                setSelectedDay(defaultDay);
              }}
            >
              <Papicon name="ArrowLeft" size={12} />
              Revenir à aujourd&apos;hui
            </Button>
          )}
        </Panel>

        {dayCourses.length > 0 && (
          <Panel delay={0.05}>
            <div className="grid grid-cols-4 gap-5">
              <Metric value={dayCourses.length.toString()} label="Cours" />
              <Metric value={formatTime(dayCourses[0].start)} label="Début" color="var(--accent)" />
              <Metric
                value={formatTime(dayCourses[dayCourses.length - 1].end)}
                label="Fin"
                color="var(--accent)"
              />
              <Metric
                value={`${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`}
                label="Temps de cours"
              />
            </div>
          </Panel>
        )}

        {/* Timeline */}
        <Panel title={DAY_NAMES[selectedDay]} meta={selectedDateStr} delay={0.1}>
          {dayCourses.length === 0 ? (
            <Empty icon="Calendar">Pas de cours ce jour</Empty>
          ) : (
            // A route down the day: one dot per course, joined by a line, with a
            // gauge that fills from the top as the day advances.
            <div className="relative">
              {/*
                The track runs behind everything (z-0) and each dot paints an
                opaque disc over it, so the line reads as joining the dots
                rather than crossing through them.
              */}
              <span
                className="absolute left-[8px] top-3 bottom-3 z-0 w-[2px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, var(--border) 0 5px, transparent 5px 10px)",
                }}
                aria-hidden="true"
              />

              {/*
                Coloured fill, drawn per row rather than as a percentage of the
                total height: rows have uneven heights, so a percentage put the
                end of the bar in the wrong place — which is what made the
                marker look off during a break.
              */}

              <ul className="relative flex flex-col gap-2.5">
                {dayCourses.map((course, i) => {
                  const style = styleFor(course.subject);
                  const start = minutesOfDay(course.start);
                  const end = minutesOfDay(course.end);
                  const over = isToday && end <= nowMinutes;
                  const current = isToday && start <= nowMinutes && nowMinutes < end;
                  const cancelled = course.status === "cancelled";
                  const minutes = end - start;

                  // Gap since the previous course, shown as a break marker
                  const prev = dayCourses[i - 1];
                  const gap = prev ? start - minutesOfDay(prev.end) : 0;
                  // Are we standing in this particular gap right now?
                  const inThisBreak =
                    nowSlot?.inBreak === true && nowSlot.index === i && gap > 0;

                  // This row's stretch of track is coloured once it is behind
                  // us; the row holding "now" is only half-coloured.
                  const trackState: "done" | "active" | "ahead" = !isToday
                    ? "ahead"
                    : nowSlot && i < nowSlot.index
                      ? "done"
                      : current || inThisBreak
                        ? "active"
                        : "ahead";

                  return (
                    <li key={course.id} className="relative">
                      {/* Coloured segment behind this row */}
                      {trackState !== "ahead" && (
                        <span
                          className="absolute left-[8px] top-0 z-0 w-[2px] rounded-full"
                          style={{
                            // +0.625rem bridges the flex gap between rows, so a
                            // run of finished courses reads as one line.
                            height:
                              trackState === "done"
                                ? "calc(100% + 0.625rem)"
                                : "50%",
                            background:
                              trackState === "done" ? "var(--accent)" : "var(--danger)",
                          }}
                          aria-hidden="true"
                        />
                      )}
                      {gap >= 15 && (
                        <div className="relative z-10 flex items-center gap-3 py-1">
                          <span className="flex w-[26px] shrink-0 justify-start">
                            <span
                              className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                              style={{ background: "var(--surface)" }}
                            >
                              <span
                                className={`rounded-full ${
                                  inThisBreak ? "h-[11px] w-[11px] wap-now-dot" : "h-[7px] w-[7px]"
                                }`}
                                style={{
                                  background: inThisBreak ? "var(--danger)" : "var(--border)",
                                }}
                              />
                            </span>
                          </span>
                          <span
                            className={`text-[10.5px] ${inThisBreak ? "font-bold" : ""}`}
                            style={{ color: inThisBreak ? "var(--danger)" : "var(--muted)" }}
                          >
                            {gap >= 60
                              ? `${Math.floor(gap / 60)}h${String(gap % 60).padStart(2, "0")} de pause`
                              : `${gap} min de pause`}
                            {inThisBreak && ` · reprise dans ${start - nowMinutes} min`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-stretch gap-3">
                        {/* The dot — an opaque disc that interrupts the track */}
                        <div className="relative z-10 flex w-[26px] shrink-0 justify-start pt-3">
                          <span
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                            // Page-coloured ring punches a hole in the line so
                            // the dot sits on the track instead of over it.
                            style={{ background: "var(--surface)" }}
                          >
                            <span
                              className={`h-[13px] w-[13px] rounded-full border-[3px] ${
                                current ? "wap-now-dot" : ""
                              }`}
                              style={{
                                borderColor: cancelled
                                  ? "var(--muted)"
                                  : current
                                    ? "var(--danger)"
                                    : style.color,
                                background: over && !current ? style.color : "var(--surface)",
                                opacity: cancelled ? 0.5 : 1,
                              }}
                            />
                          </span>
                        </div>

                        {/* The card */}
                        <div
                          className="relative flex-1 overflow-hidden rounded-xl transition-opacity"
                          style={{
                            minHeight: Math.max(52, Math.min(120, 40 + minutes * 0.42)),
                            opacity: cancelled ? 0.45 : over && !current ? 0.55 : 1,
                            background: style.image
                              ? undefined
                              : `color-mix(in oklch, ${style.color} 12%, var(--surface))`,
                            borderLeft: `3px solid ${style.color}`,
                            outline: current ? `2px solid var(--danger)` : undefined,
                          }}
                        >
                          {style.image && (
                            <>
                              <span
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url("${style.image}")` }}
                                aria-hidden="true"
                              />
                              <span
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(90deg, color-mix(in oklch, ${style.color} 80%, transparent), color-mix(in oklch, ${style.color} 30%, transparent))`,
                                }}
                                aria-hidden="true"
                              />
                            </>
                          )}

                          <div className="relative flex h-full items-start gap-2 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className="text-[12px] font-bold tabular-nums"
                                  style={{
                                    color: style.image ? "rgba(255,255,255,0.9)" : style.color,
                                  }}
                                >
                                  {formatTime(course.start)}–{formatTime(course.end)}
                                </span>
                                {current && !cancelled && <Badge tone="danger">En cours</Badge>}
                                {course.status === "modified" && (
                                  <Badge tone="warning">Modifié</Badge>
                                )}
                                {cancelled && <Badge tone="danger">Annulé</Badge>}
                              </div>

                              <p
                                className={`mt-0.5 truncate text-[13.5px] font-bold ${
                                  cancelled ? "line-through" : ""
                                }`}
                                style={style.image ? { color: "#fff" } : undefined}
                              >
                                {style.alias || course.subject}
                              </p>

                              <p
                                className="mt-0.5 truncate text-[11px]"
                                style={{
                                  color: style.image
                                    ? "rgba(255,255,255,0.85)"
                                    : "var(--muted)",
                                }}
                              >
                                {[course.room, course.teacher, `${minutes} min`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setEditing(editing === course.subject ? null : course.subject)
                              }
                              aria-label={`Personnaliser ${course.subject}`}
                              className="shrink-0 rounded-lg p-1 transition-opacity hover:opacity-60"
                            >
                              <Papicon
                                name="Gears"
                                size={13}
                                color={style.image ? "#fff" : "var(--muted)"}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}

                {/* End of the route */}
                <li className="relative z-10 flex items-center gap-3 pt-1">
                  <span className="flex w-[26px] shrink-0 justify-start">
                    <span
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                      style={{ background: "var(--surface)" }}
                    >
                      <span
                        className="h-[9px] w-[9px] rounded-full border-2"
                        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                      />
                    </span>
                  </span>
                  <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                    Fin des cours
                  </span>
                </li>
              </ul>
            </div>
          )}
        </Panel>

        {editing && (
          <SubjectEditor
            subject={editing}
            style={styleFor(editing)}
            onChange={(s) => setSubject(editing, s)}
            onReset={() => {
              resetSubject(editing);
              setEditing(null);
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </main>
    </>
  );
}

function SubjectEditor({
  subject,
  style,
  onChange,
  onReset,
  onClose,
}: {
  subject: string;
  style: SubjectStyle & { color: string };
  onChange: (s: SubjectStyle) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [image, setImage] = useState(style.image ?? "");
  const [alias, setAlias] = useState(style.alias ?? "");

  return (
    <Panel title={`Personnaliser — ${subject}`} delay={0}>
      <div className="flex flex-col gap-4">
        <div>
          <p
            className="mb-2 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Couleur
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ color })}
                aria-label={`Couleur ${color}`}
                className="h-7 w-7 rounded-lg transition-transform hover:scale-110"
                style={{
                  background: color,
                  outline:
                    style.color.toLowerCase() === color.toLowerCase()
                      ? "2px solid var(--foreground)"
                      : undefined,
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Nom court
            </span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onBlur={() => onChange({ alias })}
              placeholder={subject}
              maxLength={60}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              style={{ background: "var(--field-background)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Image de fond (URL)
            </span>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              onBlur={() => onChange({ image })}
              placeholder="https://…"
              className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              style={{ background: "var(--field-background)" }}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onPress={onClose}>
            Terminé
          </Button>
          <Button variant="ghost" size="sm" onPress={onReset}>
            Réinitialiser
          </Button>
        </div>
      </div>
    </Panel>
  );
}
