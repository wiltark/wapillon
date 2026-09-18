"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const tabs: { name: string; href: string; icon: IconName }[] = [
  { name: "Accueil", href: "/", icon: "Home" },
  { name: "EDT", href: "/timetable", icon: "Calendar" },
  { name: "Notes", href: "/grades", icon: "Grades" },
  { name: "Devoirs", href: "/homework", icon: "Tasks" },
  { name: "Réglages", href: "/settings", icon: "Gears" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-muted active:text-foreground"
              }`}
            >
              <Icon
                name={tab.icon}
                size={22}
                className={isActive ? "text-accent" : ""}
              />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
