"use client";

import { Alert } from "@heroui/react";
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
} from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import { type AttendanceEntry, formatDate, formatShortDate } from "@/lib/services/types";

type AttendanceType = "absence" | "late" | "departure" | "punishment";

const TYPES: Record<
  AttendanceType,
  { label: string; icon: string; tone: "danger" | "warning" | "accent" }
> = {
  absence: { label: "Absence", icon: "Cross", tone: "danger" },
  late: { label: "Retard", icon: "Clock", tone: "warning" },
  departure: { label: "Départ anticipé", icon: "Logout", tone: "accent" },
  punishment: { label: "Punition", icon: "Bell", tone: "warning" },
};

export default function AttendancePage() {
  const { data: attendance, loading } = useApiData<AttendanceEntry[]>("/api/attendance", []);

  if (loading) {
    return (
      <>
        <Header title="Vie scolaire" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={6} />
        </main>
      </>
    );
  }

  const absences = attendance.filter((a) => a.type === "absence");
  const lates = attendance.filter((a) => a.type === "late");
  const justified = attendance.filter((a) => a.justified);
  const unjustified = attendance.filter((a) => !a.justified);

  const justifiedRatio = attendance.length > 0 ? justified.length / attendance.length : 1;

  const sorted = [...attendance].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <Header title="Vie scolaire" subtitle={`${attendance.length} événements`} />
      <main className="p-4 space-y-4 sm:p-6">
        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-5 sm:items-center">
            <Metric
              value={absences.length.toString()}
              label="Absences"
              color={absences.length > 0 ? "var(--danger)" : "var(--success)"}
            />
            <Metric
              value={lates.length.toString()}
              label="Retards"
              color={lates.length > 0 ? "var(--warning)" : "var(--success)"}
            />
            <Metric value={justified.length.toString()} label="Justifiés" color="var(--success)" />
            <Metric
              value={unjustified.length.toString()}
              label="Non justifiés"
              color={unjustified.length > 0 ? "var(--danger)" : "var(--success)"}
            />
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Taux de justification · {Math.round(justifiedRatio * 100)}%
              </span>
              <Gauge
                value={justifiedRatio}
                max={1}
                color={justifiedRatio === 1 ? "var(--success)" : "var(--warning)"}
                label="Taux de justification"
              />
            </div>
          </div>
        </Panel>

        {unjustified.length > 0 && (
          <Alert status="warning" className="wap-in" style={{ animationDelay: "0.05s" }}>
            <Alert.Indicator>
              <Papicon name="Info" size={16} />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>
                <strong>{unjustified.length} événement(s) non justifié(s)</strong> — pensez à
                régulariser votre situation auprès de la vie scolaire.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <Panel title="Historique" meta={`${sorted.length} événements`} flush delay={0.1}>
          {sorted.length === 0 ? (
            <Empty icon="Clock">Aucun événement</Empty>
          ) : (
            <Rows>
              {sorted.map((record) => {
                const cfg = TYPES[record.type as AttendanceType] ?? TYPES.absence;
                const color = `var(--${cfg.tone})`;
                return (
                  <RowItem key={record.id} accent={color}>
                    <span className="w-[86px] shrink-0">
                      <span className="block text-[12px] font-semibold capitalize truncate">
                        {formatShortDate(record.date)}
                      </span>
                      <span
                        className="block text-[11px] tabular-nums"
                        style={{ color: "var(--muted)" }}
                      >
                        {record.startTime}
                        {record.endTime ? `–${record.endTime}` : ""}
                      </span>
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <Papicon name={cfg.icon} size={12} color={color} />
                        <span className="text-[12px] font-semibold">{cfg.label}</span>
                      </span>
                      <span
                        className="block mt-0.5 text-[11px] truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {[
                          record.subject,
                          record.reason ? `Motif : ${record.reason}` : null,
                          formatDate(record.date),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>

                    <Badge tone={record.justified ? "success" : "danger"}>
                      {record.justified ? "Justifié" : "Non justifié"}
                    </Badge>
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
