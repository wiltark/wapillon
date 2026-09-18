"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import Icon, { type IconName } from "./Icon";

import type { AccountRole } from "@/lib/services/types";

interface NavItem {
  name: string;
  href: string;
  icon: IconName;
  /** Omit to show for every role. */
  roles?: AccountRole[];
  /**
   * École Directe module code gating this entry. Schools enable their own set,
   * so an entry with a code only appears when that school actually runs it.
   * Entries without a code are always shown.
   */
  module?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Scolarité",
    items: [
      { name: "Accueil", href: "/", icon: "Home" },
      { name: "Emploi du temps", href: "/timetable", icon: "Calendar", module: "EDT" },
      {
        name: "Notes",
        href: "/grades",
        icon: "Grades",
        roles: ["student", "parent"],
        module: "NOTES",
      },
      {
        name: "Cahier de textes",
        href: "/homework",
        icon: "Tasks",
        roles: ["student", "parent"],
        module: "CAHIER_DE_TEXTES",
      },
      {
        name: "Vie scolaire",
        href: "/attendance",
        icon: "Clock",
        roles: ["student", "parent"],
        module: "VIE_SCOLAIRE",
      },
    ],
  },
  {
    label: "Établissement",
    items: [
      { name: "Messagerie", href: "/messages", icon: "Envelope", module: "MESSAGERIE" },
      { name: "Actualités", href: "/news", icon: "Newspaper" },
      { name: "Vie de la classe", href: "/school", icon: "Info", module: "VIE_DE_LA_CLASSE" },
      { name: "Documents", href: "/documents", icon: "Document", module: "DOCUMENTS_ELEVE" },
      { name: "Menus", href: "/menu", icon: "Cutlery", module: "CANTINE_BARCODE" },
      {
        name: "Facturation",
        href: "/invoices",
        icon: "Document",
        roles: ["parent"],
        module: "SITUATION_FINANCIERE",
      },
    ],
  },
];

/**
 * The sidebar is always expanded. `isOpen` is purely the mobile drawer: from md
 * up the sidebar is pinned and the flag is ignored.
 */
interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen((o) => !o),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { session, logout, switchChild } = useAuth();
  const { isOpen, close } = useSidebar();

  const student = session?.student;
  const initials = student
    ? `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`
    : "?";

  const role = session?.role ?? "student";
  const children = session?.children ?? [];

  /**
   * Codes this school actually runs. When the list is empty — Pronote, or an
   * older ED response — every entry is shown rather than none: hiding the whole
   * app because a field is missing would be far worse than showing one page
   * that turns out to be empty.
   */
  const enabledModules = new Set(
    (session?.modules ?? []).filter((m) => m.enabled).map((m) => m.code)
  );
  const hasModuleList = enabledModules.size > 0;

  return (
    <>
      {/* Scrim: phones only, where the sidebar floats above the page */}
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/*
        Width and position live in globals.css, keyed off `data-open`. Nothing
        here sets them inline — an inline width outranks every media query and
        would leave the sidebar overlapping the page.
      */}
      <aside
        data-open={isOpen || undefined}
        className="wap-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border transition-transform duration-200 ease-out"
        style={{ background: "var(--surface)" }}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--accent)" }}
          >
            <Icon name="Logo" size={18} color="var(--accent-foreground)" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">Scoly</span>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-default/60 md:hidden"
          >
            <Icon name="Cross" size={15} color="var(--muted)" />
          </button>
        </div>

        {/* Child picker — parent accounts with more than one child */}
        {role === "parent" && children.length > 1 && (
          <div className="shrink-0 border-b border-border px-2.5 py-2.5">
            <p
              className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: "var(--muted)" }}
            >
              Enfant
            </p>
            <div className="flex flex-col gap-0.5">
              {children.map((child) => {
                const active = child.id === session?.activeChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => switchChild(child.id).catch(() => {})}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      active ? "" : "hover:bg-default/60"
                    }`}
                    style={
                      active
                        ? {
                            background: "color-mix(in oklch, var(--accent) 14%, transparent)",
                            color: "var(--accent)",
                          }
                        : undefined
                    }
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{
                        background: active ? "var(--accent)" : "var(--surface-secondary)",
                        color: active ? "var(--accent-foreground)" : "var(--muted)",
                      }}
                    >
                      {child.firstName?.[0] ?? "?"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[12px] font-semibold leading-tight">
                        {child.firstName}
                      </span>
                      <span
                        className="truncate text-[10px] leading-tight"
                        style={{ color: active ? "var(--accent)" : "var(--muted)" }}
                      >
                        {child.className}
                      </span>
                    </span>
                    {active && <Icon name="Check" size={11} color="var(--accent)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {NAV_GROUPS.map((group, i) => {
            const items = group.items.filter((item) => {
              if (item.roles && !item.roles.includes(role)) return false;
              if (item.module && hasModuleList && !enabledModules.has(item.module)) return false;
              return true;
            });
            if (items.length === 0) return null;
            return (
            <div key={group.label} className={i > 0 ? "mt-6" : ""}>
              <p
                className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "var(--muted)" }}
              >
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors ${
                          active ? "" : "hover:bg-default/60"
                        }`}
                        style={
                          active
                            ? {
                                background:
                                  "color-mix(in oklch, var(--accent) 14%, transparent)",
                                color: "var(--accent)",
                              }
                            : undefined
                        }
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                          <Icon
                            name={item.icon}
                            size={18}
                            color={active ? "var(--accent)" : "var(--muted)"}
                          />
                        </span>
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            );
          })}
        </nav>

        {/* Account */}
        <div className="shrink-0 border-t border-border p-2.5">
          <Link
            href="/settings"
            onClick={close}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-default/60"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[12.5px] font-semibold leading-tight">
                {student ? `${student.firstName} ${student.lastName}` : "Non connecté"}
              </span>
              <span
                className="truncate text-[11px] leading-tight"
                style={{ color: "var(--muted)" }}
              >
                {student?.className || "—"}
              </span>
            </span>
            <Icon name="Gears" size={14} color="var(--muted)" />
          </Link>

          <button
            type="button"
            onClick={() => {
              close();
              logout();
            }}
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-danger/10"
            style={{ color: "var(--danger)" }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <Icon name="Logout" size={16} color="var(--danger)" />
            </span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
