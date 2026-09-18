"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Papicon from "./Papicon";
import { useState, createContext, useContext, type ReactNode } from "react";

const navigation = [
  { name: "Accueil", href: "/", icon: "Home" },
  { name: "Emploi du temps", href: "/timetable", icon: "Calendar" },
  { name: "Notes", href: "/grades", icon: "Grades" },
  { name: "Devoirs", href: "/homework", icon: "Tasks" },
  { name: "Actualités", href: "/news", icon: "Newspaper" },
  { name: "Vie scolaire", href: "/attendance", icon: "Clock" },
  { name: "Réglages", href: "/settings", icon: "Gears" },
];

// Sidebar context for mobile toggle
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
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
  const { session, logout } = useAuth();
  const { isOpen, close } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);

  const student = session?.student;
  const initials = student
    ? `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`
    : "?";

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={[
          "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-surface transition-all duration-300",
          "max-md:w-[280px]",
          isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          "md:translate-x-0 md:w-[72px]",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        ].join(" ")}
      >
        {/* Logo row */}
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Papicon name="Butterfly" size={18} />
          </div>
          <span className={`text-base font-bold text-foreground md:hidden ${collapsed ? "lg:hidden" : "lg:block"}`}>
            Wapillon
          </span>
          <button
            onClick={close}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-default md:hidden"
          >
            <Papicon name="Cross" size={16} />
          </button>
        </div>

        {/* User card */}
        <div className={`mx-3 mt-3 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="flex w-full items-center gap-3 rounded-xl bg-accent/10 p-3 md:hidden lg:flex">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">
                {student ? `${student.firstName} ${student.lastName}` : "Non connecté"}
              </span>
              <span className="truncate text-xs text-muted">
                {student?.className || ""}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-3 flex flex-1 flex-col gap-0.5 px-3 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={[
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive ? "bg-accent/10 text-accent" : "text-foreground hover:bg-default",
                  "md:justify-center md:px-0",
                  collapsed ? "lg:justify-center lg:px-0" : "lg:justify-start lg:px-3",
                ].join(" ")}
                title={item.name}
              >
                <Papicon
                  name={item.icon}
                  size={20}
                  className={`shrink-0 ${
                    isActive ? "text-accent" : "text-muted group-hover:text-foreground"
                  }`}
                />
                <span className={`md:hidden ${collapsed ? "lg:hidden" : "lg:inline"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-all hover:bg-default hover:text-foreground"
          >
            {collapsed ? (
              <Papicon name="ChevronRight" size={16} />
            ) : (
              <>
                <Papicon name="ChevronLeft" size={16} />
                <span>Réduire</span>
              </>
            )}
          </button>
          <button
            onClick={() => { close(); logout(); }}
            className={[
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-all hover:bg-danger/10",
              "md:justify-center",
              collapsed ? "lg:justify-center" : "lg:justify-start",
            ].join(" ")}
          >
            <Papicon name="Logout" size={18} />
            <span className={`md:hidden ${collapsed ? "lg:hidden" : "lg:inline"}`}>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
