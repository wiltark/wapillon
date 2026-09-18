"use client";

import { useState } from "react";
import { Alert } from "@heroui/react";
import Header from "@/components/Header";
import Icon, { type IconName } from "@/components/Icon";
import { Badge, Empty, LoadingPanel, Panel, Rows } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import { type NewsEntry, formatDate, formatShortDate } from "@/lib/services/types";

type CategoryKey = "info" | "event" | "urgent" | "menu";

const CATEGORIES: Record<
  CategoryKey,
  { label: string; icon: IconName; tone: "accent" | "danger" | "success" }
> = {
  info: { label: "Info", icon: "Info", tone: "accent" },
  event: { label: "Événement", icon: "Calendar", tone: "accent" },
  urgent: { label: "Urgent", icon: "Bell", tone: "danger" },
  menu: { label: "Cantine", icon: "Cutlery", tone: "success" },
};

export default function NewsPage() {
  const { data: news, loading } = useApiData<NewsEntry[]>("/api/news", []);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) {
    return (
      <>
        <Header title="Actualités" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={6} />
        </main>
      </>
    );
  }

  const urgent = news.filter((n) => n.category === "urgent");
  const others = news.filter((n) => n.category !== "urgent");

  return (
    <>
      <Header title="Actualités" subtitle={`${news.length} actualités`} />
      <main className="p-4 space-y-4 sm:p-6">
        {urgent.map((item, i) => (
          <Alert
            key={item.id}
            status="danger"
            className="wap-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Alert.Indicator>
              <Icon name="Bell" size={16} />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>{item.title}</Alert.Title>
              <Alert.Description>
                {item.content}
                <span className="block mt-1.5 text-[11px] opacity-70">
                  {item.author} · {formatDate(item.date)}
                </span>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ))}

        <Panel
          title="Toutes les actualités"
          meta={`${others.length} publications`}
          flush
          delay={0.05}
        >
          {others.length === 0 ? (
            <Empty icon="Newspaper">Aucune actualité</Empty>
          ) : (
            <Rows>
              {others.map((item) => {
                const cfg = CATEGORIES[item.category as CategoryKey] ?? CATEGORIES.info;
                const color = `var(--${cfg.tone})`;
                const open = openId === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-default/40"
                    >
                      <span
                        className="w-[3px] self-stretch rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <Icon name={cfg.icon} size={14} color={color} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium truncate">
                          {item.title}
                        </span>
                        <span
                          className="block text-[11px] truncate"
                          style={{ color: "var(--muted)" }}
                        >
                          {item.author} · {formatShortDate(item.date)}
                        </span>
                      </span>
                      <Badge tone={cfg.tone}>{cfg.label}</Badge>
                      <Icon
                        name={open ? "ChevronUp" : "ChevronDown"}
                        size={13}
                        color="var(--muted)"
                      />
                    </button>

                    {open && (
                      <div
                        className="px-4 pb-4 pt-1"
                        style={{ background: "var(--surface-secondary)" }}
                      >
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                        <span
                          className="block mt-2 text-[11px] capitalize"
                          style={{ color: "var(--muted)" }}
                        >
                          Publié par {item.author} · {formatDate(item.date)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </Rows>
          )}
        </Panel>
      </main>
    </>
  );
}
