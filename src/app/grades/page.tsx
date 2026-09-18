"use client";

import Header from "@/components/Header";
import SubjectIcon from "@/components/SubjectIcon";
import Papicon from "@/components/Papicon";
import { useApiData } from "@/lib/auth-context";
import {
  type Grade,
  computeGeneralAverage,
  computeSubjectAverages,
  formatShortDate,
} from "@/lib/services/types";
import { useState } from "react";

type SortMode = "date" | "subject" | "value";

export default function GradesPage() {
  const { data: grades, loading } = useApiData<Grade[]>("/api/grades", []);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const generalAvg = computeGeneralAverage(grades);
  const subjectAverages = computeSubjectAverages(grades);

  const filteredGrades = selectedSubject
    ? grades.filter((g) => g.subject === selectedSubject)
    : grades;

  const sortedGrades = [...filteredGrades].sort((a, b) => {
    if (sortMode === "date")    return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortMode === "value")   return b.value / b.outOf - a.value / a.outOf;
    return a.subject.localeCompare(b.subject);
  });

  const sortedSubjectAvgs = [...subjectAverages].sort((a, b) => b.average - a.average);

  if (loading) {
    return (
      <>
        <Header title="Notes" subtitle="Chargement..." />
        <div className="flex items-center justify-center py-24">
          <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
        </div>
      </>
    );
  }

  const best  = grades.length > 0 ? Math.max(...grades.map((g) => (g.value / g.outOf) * 20)).toFixed(1) : "—";
  const worst = grades.length > 0 ? Math.min(...grades.map((g) => (g.value / g.outOf) * 20)).toFixed(1) : "—";

  return (
    <>
      <Header title="Notes" subtitle={`${grades.length} notes`} />
      <main className="p-4 space-y-6 sm:p-6">

        {/* General average */}
        <div
          className="rounded-2xl border border-border bg-surface flex items-center gap-4 sm:gap-6 p-4 sm:p-6 wap-in"
          style={{ animationDelay: "0s" }}
        >
          <div
            className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "color-mix(in oklch, var(--accent) 15%, transparent)", color: "var(--accent)" }}
          >
            <Papicon name="Grades" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted">Moyenne générale</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">{generalAvg.toFixed(2)}</span>
              <span className="text-base sm:text-lg text-muted">/20</span>
            </div>
          </div>
          <div className="hidden sm:flex gap-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold" style={{ color: "var(--success)" }}>{best}</p>
              <p className="text-xs text-muted">Meilleure</p>
            </div>
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold" style={{ color: "var(--danger)" }}>{worst}</p>
              <p className="text-xs text-muted">Plus basse</p>
            </div>
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold" style={{ color: "var(--accent)" }}>{grades.length}</p>
              <p className="text-xs text-muted">Notes</p>
            </div>
          </div>
        </div>

        {/* Subject averages */}
        <div className="wap-in" style={{ animationDelay: "0.07s" }}>
          <h2 className="text-sm sm:text-base font-bold mb-3">Moyennes par matière</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedSubjectAvgs.map((sa) => (
              <button
                key={sa.subject}
                onClick={() => setSelectedSubject(selectedSubject === sa.subject ? null : sa.subject)}
                className="rounded-2xl border border-border bg-surface flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 text-left transition-all hover:bg-default/50 active:scale-[0.98]"
                style={selectedSubject === sa.subject ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" } : {}}
              >
                <SubjectIcon subject={sa.subject} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted truncate">{sa.subject}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold">{sa.average.toFixed(1)}</span>
                    <span className="text-[10px] sm:text-xs text-muted">/20</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Grade list */}
        <div className="wap-in" style={{ animationDelay: "0.14s" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold">
              {selectedSubject ? `Notes — ${selectedSubject}` : "Toutes les notes"}
            </h2>
            <div className="flex items-center gap-2">
              {selectedSubject && (
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="text-xs font-medium transition-opacity hover:opacity-60"
                  style={{ color: "var(--accent)" }}
                >
                  Tout afficher
                </button>
              )}
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="appearance-none rounded-xl border border-border bg-surface px-3 py-1.5 pr-7 text-xs font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  <option value="date">Par date</option>
                  <option value="value">Par note</option>
                  <option value="subject">Par matière</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <Papicon name="ChevronDown" size={12} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {sortedGrades.map((grade) => {
              const normalized = (grade.value / grade.outOf) * 20;
              const classAvg   = grade.classAverage ?? normalized;
              const diff        = normalized - classAvg;
              return (
                <div key={grade.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-default/50 transition-colors">
                  <SubjectIcon subject={grade.subject} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{grade.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted mt-0.5 flex-wrap">
                      <span className="truncate">{grade.subject}</span>
                      <span>•</span>
                      <span>{formatShortDate(grade.date)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Coeff. {grade.coefficient}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {grade.classAverage != null && (
                      <span className="hidden lg:inline text-xs text-muted">Classe : {grade.classAverage.toFixed(1)}</span>
                    )}
                    <div
                      className="flex items-center gap-0.5 text-xs font-medium"
                      style={{ color: diff > 0 ? "var(--success)" : diff < 0 ? "var(--danger)" : "var(--muted)" }}
                    >
                      <Papicon name={diff > 0 ? "ArrowUp" : diff < 0 ? "ArrowDown" : "Minus"} size={12} />
                      <span className="hidden sm:inline">{diff > 0 ? "+" : ""}{diff.toFixed(1)}</span>
                    </div>
                    <div className="text-right min-w-[40px] sm:min-w-[48px]">
                      <span className="text-base sm:text-lg font-bold">{grade.value}</span>
                      <span className="text-xs text-muted">/{grade.outOf}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
