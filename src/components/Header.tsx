"use client";

import Papicon from "./Papicon";
import { useSidebar } from "./Sidebar";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default hover:text-foreground md:hidden"
        >
          <Papicon name="Menu" size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground sm:text-xl truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted sm:text-sm truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default hover:text-foreground">
          <Papicon name="Search" size={18} />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default hover:text-foreground">
          <Papicon name="Bell" size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
}
