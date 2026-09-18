"use client";

import Header from "@/components/Header";
import { Empty, LoadingPanel, Panel } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import type { MenuDay } from "@/lib/services/ecoledirecte";

function dayLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function MenuPage() {
  const { data: menus, loading } = useApiData<MenuDay[]>("/api/menu", []);

  if (loading) {
    return (
      <>
        <Header title="Menus" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={4} />
        </main>
      </>
    );
  }

  const todayISO = new Date().toISOString().split("T")[0];

  return (
    <>
      <Header title="Menus" subtitle={`${menus.length} jours`} />
      <main className="p-4 space-y-4 sm:p-6">
        {menus.length === 0 ? (
          <Panel>
            <Empty icon="Cutlery">Aucun menu publié</Empty>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((day, i) => {
              const isToday = day.date.startsWith(todayISO);
              return (
                <Panel
                  key={day.date || i}
                  title={dayLabel(day.date)}
                  meta={isToday ? "aujourd'hui" : undefined}
                  delay={i * 0.04}
                >
                  <div className="flex flex-col gap-3">
                    {day.courses.map((course, j) => (
                      <div key={j}>
                        <p
                          className="mb-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: "var(--muted)" }}
                        >
                          {course.label}
                        </p>
                        <ul className="flex flex-col gap-0.5">
                          {course.dishes.map((dish, k) => (
                            <li key={k} className="text-[13px] leading-snug">
                              {dish}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
