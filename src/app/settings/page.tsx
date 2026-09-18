"use client";

import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { value: "light",  icon: "Sun",  label: "Clair"   },
  { value: "dark",   icon: "Moon", label: "Sombre"  },
  { value: "system", icon: "Gears", label: "Système" },
] as const;

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const student     = session?.student;
  const initials    = student ? `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` : "?";
  const serviceName = session?.service === "ecoledirecte" ? "École Directe" : session?.service === "pronote" ? "Pronote" : "—";
  const serviceLogo = session?.service === "ecoledirecte" ? "/ecoledirecte.svg" : session?.service === "pronote" ? "/pronote.svg" : null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <Header title="Réglages" />
      <main className="p-4 space-y-6 sm:p-6 max-w-2xl">

        {/* Account */}
        <section className="wap-in" style={{ animationDelay: "0s" }}>
          <SectionLabel>Compte</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">

            {/* Profile */}
            <div className="flex items-center gap-4 p-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {student ? `${student.firstName} ${student.lastName}` : "—"}
                </p>
                <p className="text-sm text-muted truncate">{student?.className || "—"}</p>
                <p className="text-xs text-muted mt-0.5 truncate">{student?.school || "—"}</p>
              </div>
            </div>

            {/* Service */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                style={{ background: serviceLogo ? "white" : "color-mix(in oklch, var(--accent) 12%, transparent)" }}>
                {serviceLogo ? (
                  <img src={serviceLogo} alt={serviceName} className="h-5 w-5 object-contain" />
                ) : (
                  <Papicon name="Lock" size={16} color="var(--accent)" />
                )}
              </div>
              <span className="flex-1 text-sm">Service scolaire</span>
              <span className="text-sm text-muted">{serviceName}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 p-4 hover:bg-default/50 transition-colors"
              style={{ color: "var(--danger)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in oklch, var(--danger) 12%, transparent)" }}
              >
                <Papicon name="Logout" size={16} color="var(--danger)" />
              </div>
              <span className="flex-1 text-sm text-left font-medium">Se déconnecter</span>
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="wap-in" style={{ animationDelay: "0.07s" }}>
          <SectionLabel>Apparence</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-medium mb-3">Thème</p>
            <div className="flex gap-2">
              {THEMES.map((t) => {
                const active = mounted && theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all"
                    style={
                      active
                        ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                        : { background: "var(--surface-secondary)", color: "var(--foreground)" }
                    }
                  >
                    <Papicon name={t.icon} size={16} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="wap-in" style={{ animationDelay: "0.14s" }}>
          <SectionLabel>À propos</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">

            <div className="flex items-center gap-4 p-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Papicon name="Butterfly" size={22} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Wapillon Web</p>
                <p className="text-xs text-muted">Version 1.0.0 — Basé sur Papillon</p>
              </div>
            </div>

            <ExternalLink icon="ExternalLink" label="Code source"       href="https://github.com/PapillonApp/Papillon" />
            <ExternalLink icon="ExternalLink" label="Documentation"     href="https://docs.papillon.bzh"                />
            <ExternalLink icon="Heart"        label="Soutenir Papillon" href="https://ko-fi.com/thepapillonapp"         />
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-4 wap-in" style={{ animationDelay: "0.2s" }}>
          <p className="text-xs text-muted">© 2026 Association Papillon & contributeurs</p>
          <p className="text-xs text-muted mt-1 flex items-center justify-center gap-1">
            Fait avec <Papicon name="Heart" size={12} color="var(--danger)" /> par des étudiants
          </p>
        </div>
      </main>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{children}</p>
  );
}

function ExternalLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 hover:bg-default/50 transition-colors"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--surface-secondary)" }}
      >
        <Papicon name={icon} size={16} color="var(--muted)" />
      </div>
      <span className="flex-1 text-sm">{label}</span>
      <Papicon name="ExternalLink" size={14} color="var(--muted)" />
    </a>
  );
}
