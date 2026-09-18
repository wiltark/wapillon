"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { Panel, RowItem, Rows } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

const THEMES = [
  { value: "light", icon: "Sun", label: "Clair" },
  { value: "dark", icon: "Moon", label: "Sombre" },
  { value: "system", icon: "Gears", label: "Système" },
] as const;

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // next-themes only knows the resolved theme after hydration: false on the
  // server, true on the client, without triggering a cascading render.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const student = session?.student;
  const initials = student
    ? `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`
    : "?";
  const serviceName =
    session?.service === "ecoledirecte"
      ? "École Directe"
      : session?.service === "pronote"
        ? "Pronote"
        : "—";
  const serviceLogo =
    session?.service === "ecoledirecte"
      ? "/ecoledirecte.svg"
      : session?.service === "pronote"
        ? "/pronote.svg"
        : null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <Header title="Réglages" />
      <main className="p-4 space-y-4 sm:p-6 max-w-3xl">
        {/* Identity */}
        <Panel>
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold truncate">
                {student ? `${student.firstName} ${student.lastName}` : "—"}
              </p>
              <p className="text-[12px] truncate" style={{ color: "var(--muted)" }}>
                {student?.className || "—"} · {student?.school || "—"}
              </p>
            </div>
            <span
              className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-2 shrink-0"
              style={{ background: "var(--surface-secondary)" }}
            >
              {serviceLogo ? (
                <span className="h-5 w-5 rounded bg-white flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={serviceLogo} alt="" className="h-3.5 w-3.5 object-contain" />
                </span>
              ) : (
                <Papicon name="Lock" size={14} color="var(--accent)" />
              )}
              <span className="text-[12px] font-semibold">{serviceName}</span>
            </span>
          </div>
        </Panel>

        {/* Theme */}
        <Panel title="Apparence" delay={0.05}>
          <ToggleButtonGroup
            fullWidth
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={mounted && theme ? [theme] : []}
            onSelectionChange={(keys) => {
              const [first] = [...keys];
              if (first) setTheme(String(first));
            }}
          >
            {THEMES.map((t, i) => (
              <ToggleButton key={t.value} id={t.value}>
                {i > 0 && <ToggleButtonGroup.Separator />}
                <Papicon name={t.icon} size={15} />
                {t.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Panel>

        {/* Links */}
        <Panel title="À propos" flush delay={0.1}>
          <Rows>
            <RowItem>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Papicon name="Butterfly" size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold">Scoly Web</span>
                <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                  Version 1.0.0 — basé sur Papillon
                </span>
              </span>
            </RowItem>

            <ExternalRow label="Code source" href="https://github.com/PapillonApp/Papillon" />
            <ExternalRow label="Documentation" href="https://docs.papillon.bzh" />
            <ExternalRow
              label="Soutenir Papillon"
              href="https://ko-fi.com/thepapillonapp"
              icon="Heart"
            />
          </Rows>
        </Panel>

        {/* Danger zone */}
        <Panel flush delay={0.15}>
          <RowItem onPress={handleLogout}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--danger) 14%, transparent)" }}
            >
              <Papicon name="Logout" size={16} color="var(--danger)" />
            </span>
            <span
              className="flex-1 text-[13px] font-semibold"
              style={{ color: "var(--danger)" }}
            >
              Se déconnecter
            </span>
            <Papicon name="ChevronRight" size={13} color="var(--danger)" />
          </RowItem>
        </Panel>

        <p className="text-center text-[11px] py-2" style={{ color: "var(--muted)" }}>
          © 2026 Association Papillon & contributeurs
        </p>
      </main>
    </>
  );
}

function ExternalRow({
  label,
  href,
  icon = "ExternalLink",
}: {
  label: string;
  href: string;
  icon?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-default/40"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--surface-secondary)" }}
      >
        <Papicon name={icon} size={15} color="var(--muted)" />
      </span>
      <span className="flex-1 text-[13px]">{label}</span>
      <Papicon name="ExternalLink" size={13} color="var(--muted)" />
    </a>
  );
}
