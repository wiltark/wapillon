"use client";

import { Button, Typography } from "@heroui/react";
import Icon from "./Icon";
import { useSidebar } from "./Sidebar";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Ouvrir le menu"
          onPress={toggle}
          className="md:hidden"
        >
          <Icon name="Menu" size={20} />
        </Button>
        <div className="min-w-0">
          <Typography type="h4" className="truncate">
            {title}
          </Typography>
          {subtitle && (
            <Typography type="body-xs" color="muted" className="truncate">
              {subtitle}
            </Typography>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button isIconOnly variant="ghost" size="sm" aria-label="Rechercher">
          <Icon name="Search" size={18} />
        </Button>
        <Button isIconOnly variant="ghost" size="sm" aria-label="Notifications" className="relative">
          <Icon name="Bell" size={18} />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
            style={{ background: "var(--danger)" }}
          />
        </Button>
      </div>
    </header>
  );
}
