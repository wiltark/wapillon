"use client";

import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { useApiData } from "@/lib/auth-context";
import {
  type AttendanceEntry,
  formatDate,
  formatShortDate,
} from "@/lib/services/types";

type AttendanceType = "absence" | "late" | "departure" | "punishment";

const typeConfig: Record<AttendanceType, { label: string; icon: string; color: string }> = {
  absence:    { label: "Absence",         icon: "Cross",  color: "var(--danger)"  },
  late:       { label: "Retard",          icon: "Clock",  color: "var(--warning)" },
  departure:  { label: "Départ anticipé", icon: "Logout", color: "var(--accent)"  },
  punishment: { label: "Punition",        icon: "Bell",   color: "var(--warning)" },
};

export default function AttendancePage() {
  const { data: attendance, loading } = useApiData<AttendanceEntry[]>("/api/attendance", []);

  if (loading) {
    return (
      <>
        <Header title="Vie scolaire" subtitle="Chargement..." />
        <div className="flex items-center justify-center py-24">
          <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
        </div>
      </>
    );
  }

  const absences    = attendance.filter((a) => a.type === "absence");
  const lates       = attendance.filter((a) => a.type === "late");
  const justified   = attendance.filter((a) => a.justified);
  const unjustified = attendance.filter((a) => !a.justified);

  return (
    <>
      <Header title="Vie scolaire" subtitle="Absences, retards et départs" />
      <main className="p-4 space-y-6 sm:p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 wap-in" style={{ animationDelay: "0s" }}>
          <StatTile value={absences.length}    label="Absences"      color="var(--danger)"  />
          <StatTile value={lates.length}       label="Retards"       color="var(--warning)" />
          <StatTile value={justified.length}   label="Justifiés"     color="var(--success)" />
          <StatTile value={unjustified.length} label="Non justifiés" color="var(--danger)"  />
        </div>

        {/* Unjustified warning */}
        {unjustified.length > 0 && (
          <div
            className="flex items-center gap-3 rounded-2xl p-4 wap-in"
            style={{
              animationDelay: "0.06s",
              background: "color-mix(in oklch, var(--warning) 10%, transparent)",
              border: "1px solid color-mix(in oklch, var(--warning) 30%, transparent)",
            }}
          >
            <Papicon name="Info" size={20} color="var(--warning)" className="shrink-0" />
            <p className="text-sm">
              Vous avez{" "}
              <strong>{unjustified.length} événement(s) non justifié(s)</strong>.{" "}
              Veuillez régulariser votre situation auprès de la vie scolaire.
            </p>
          </div>
        )}

        {/* Records */}
        <div className="wap-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm sm:text-base font-bold mb-3">Historique</h2>

          {attendance.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">
              Aucun événement
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {[...attendance]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => {
                  const config = typeConfig[record.type as AttendanceType] ?? typeConfig.absence;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-default/50 transition-colors"
                    >
                      <div
                        className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `color-mix(in oklch, ${config.color} 12%, transparent)` }}
                      >
                        <Papicon name={config.icon} size={18} color={config.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{config.label}</span>
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={
                              record.justified
                                ? { background: "color-mix(in oklch, var(--success) 12%, transparent)", color: "var(--success)" }
                                : { background: "color-mix(in oklch, var(--danger) 12%, transparent)",  color: "var(--danger)"  }
                            }
                          >
                            <Papicon
                              name={record.justified ? "Check" : "Cross"}
                              size={10}
                              color={record.justified ? "var(--success)" : "var(--danger)"}
                            />
                            {record.justified ? "Justifié" : "Non justifié"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5 flex-wrap">
                          <span className="capitalize">{formatDate(record.date)}</span>
                          <span>•</span>
                          <span>{record.startTime}{record.endTime ? ` — ${record.endTime}` : ""}</span>
                          {record.subject && (
                            <>
                              <span>•</span>
                              <span>{record.subject}</span>
                            </>
                          )}
                        </div>
                        {record.reason && (
                          <p className="text-xs text-muted mt-1">Motif : {record.reason}</p>
                        )}
                      </div>

                      <span className="text-xs text-muted shrink-0">{formatShortDate(record.date)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl sm:text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
