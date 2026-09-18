"use client";

import { useState } from "react";
import { Button, ListBox, Select } from "@heroui/react";
import Header from "@/components/Header";
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
  Trend,
  scoreColor,
} from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import {
  type Grade,
  computeGeneralAverage,
  computeSubjectAverages,
  formatShortDate,
  getSubjectColor,
} from "@/lib/services/types";

type SortMode = "date" | "subject" | "value";

const SORT_LABELS: Record<SortMode, string> = {
  date: "Par date",
  value: "Par note",
  subject: "Par matière",
};

export default function GradesPage() {
  const { data: grades, loading } = useApiData<Grade[]>("/api/grades", []);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [subject, setSubject] = useState<string | null>(null);

  const average = computeGeneralAverage(grades);
  const subjectAverages = computeSubjectAverages(grades);

  const visible = subject ? grades.filter((g) => g.subject === subject) : grades;

  const sorted = [...visible].sort((a, b) => {
    if (sortMode === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortMode === "value") return b.value / b.outOf - a.value / a.outOf;
    return a.subject.localeCompare(b.subject);
  });

  if (loading) {
    return (
      <>
        <Header title="Notes" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={7} />
        </main>
      </>
    );
  }

  const normalized = grades.map((g) => (g.value / g.outOf) * 20);
  const best = normalized.length ? Math.max(...normalized) : 0;
  const worst = normalized.length ? Math.min(...normalized) : 0;

  // Oldest → newest, so the sparkline reads left to right like a timeline
  const trendSeries = [...grades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-16)
    .map((g) => (g.value / g.outOf) * 20);

  const ranked = [...subjectAverages].sort((a, b) => b.average - a.average);

  return (
    <>
      <Header title="Notes" subtitle={`${grades.length} évaluations`} />
      <main className="p-4 space-y-4 sm:p-6">
        {/* Overview: the four numbers that matter, plus the shape of the year */}
        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-5 sm:items-center">
            <Metric
              value={average.toFixed(2)}
              unit="/20"
              label="Moyenne générale"
              color={scoreColor(average)}
            />
            <Metric
              value={best.toFixed(1)}
              label="Meilleure"
              color="var(--success)"
            />
            <Metric value={worst.toFixed(1)} label="Plus basse" color="var(--danger)" />
            <Metric value={grades.length.toString()} label="Évaluations" />
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

        {/* Subject table — the dense view: average, class, delta, gauge */}
        <Panel
          title="Par matière"
          meta={`${ranked.length} matières`}
          flush
          delay={0.05}
          action={
            subject && (
              <Button variant="ghost" size="sm" onPress={() => setSubject(null)}>
                Réinitialiser
              </Button>
            )
          }
        >
          {ranked.length === 0 ? (
            <Empty icon="Grades">Aucune moyenne disponible</Empty>
          ) : (
            <Rows>
              {ranked.map((entry) => {
                const color = getSubjectColor(entry.subject);
                const active = subject === entry.subject;
                const classAvg = averageOfClass(grades, entry.subject);
                const delta = classAvg == null ? 0 : entry.average - classAvg;
                return (
                  <RowItem
                    key={entry.subject}
                    accent={color}
                    onPress={() => setSubject(active ? null : entry.subject)}
                  >
                    <span
                      className="flex-1 min-w-0"
                      style={active ? { color: "var(--accent)" } : undefined}
                    >
                      <SubjectTag subject={entry.subject} color={color} />
                    </span>

                    <span className="hidden sm:block w-28 shrink-0">
                      <Gauge value={entry.average} color={color} label={entry.subject} />
                    </span>

                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
                      {classAvg != null ? classAvg.toFixed(1) : "—"}
                    </span>

                    <span className="w-12 shrink-0 text-right">
                      <Trend value={delta} />
                    </span>

                    <span className="w-14 shrink-0 text-right">
                      <span
                        className="text-[15px] font-bold tabular-nums"
                        style={{ color: scoreColor(entry.average) }}
                      >
                        {entry.average.toFixed(1)}
                      </span>
                    </span>
                  </RowItem>
                );
              })}
            </Rows>
          )}
        </Panel>

        {/* Individual marks */}
        <Panel
          title={subject ?? "Toutes les notes"}
          meta={`${sorted.length} notes`}
          flush
          delay={0.1}
          action={
            <Select
              aria-label="Trier les notes"
              selectedKey={sortMode}
              onSelectionChange={(key) => setSortMode(key as SortMode)}
            >
              <Select.Trigger className="h-7 min-w-[118px] text-[11px]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                    <ListBox.Item key={mode} id={mode} textValue={SORT_LABELS[mode]}>
                      {SORT_LABELS[mode]}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          }
        >
          {sorted.length === 0 ? (
            <Empty icon="Grades">Aucune note à afficher</Empty>
          ) : (
            <Rows>
              {sorted.map((grade) => {
                const color = getSubjectColor(grade.subject);
                const out20 = (grade.value / grade.outOf) * 20;
                const delta = grade.classAverage != null ? out20 - grade.classAverage : 0;
                return (
                  <RowItem key={grade.id} accent={color}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium truncate">{grade.title}</span>
                      <span
                        className="flex items-center gap-1.5 mt-0.5 text-[11px] tabular-nums"
                        style={{ color: "var(--muted)" }}
                      >
                        <SubjectTag subject={grade.subject} color={color} />
                        <span>·</span>
                        <span>{formatShortDate(grade.date)}</span>
                      </span>
                    </span>

                    {grade.coefficient !== 1 && (
                      <Badge tone="muted">×{grade.coefficient}</Badge>
                    )}

                    <span
                      className="hidden lg:block w-10 shrink-0 text-right text-[11px] tabular-nums"
                      style={{ color: "var(--muted)" }}
                    >
                      {grade.classAverage != null ? grade.classAverage.toFixed(1) : "—"}
                    </span>

                    <span className="w-12 shrink-0 text-right">
                      <Trend value={delta} />
                    </span>

                    <span className="w-16 shrink-0 text-right tabular-nums">
                      <span className="text-[16px] font-bold" style={{ color: scoreColor(out20) }}>
                        {grade.value}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                        /{grade.outOf}
                      </span>
                    </span>
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

/** Mean of the per-grade class averages for one subject, when the school sends them. */
function averageOfClass(grades: Grade[], subject: string): number | null {
  const values = grades
    .filter((g) => g.subject === subject && g.classAverage != null)
    .map((g) => g.classAverage as number);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
