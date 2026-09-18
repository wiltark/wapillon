"use client";

import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { useApiData } from "@/lib/auth-context";
import {
  type NewsEntry,
  formatDate,
  formatShortDate,
} from "@/lib/services/types";

type CategoryKey = "info" | "event" | "urgent" | "menu";

const categoryConfig: Record<CategoryKey, { label: string; icon: string; color: string }> = {
  info:   { label: "Information", icon: "Info",     color: "var(--accent)"  },
  event:  { label: "Événement",   icon: "Calendar", color: "var(--accent)"  },
  urgent: { label: "Urgent",      icon: "Bell",     color: "var(--danger)"  },
  menu:   { label: "Cantine",     icon: "Cutlery",  color: "var(--success)" },
};

export default function NewsPage() {
  const { data: news, loading } = useApiData<NewsEntry[]>("/api/news", []);

  if (loading) {
    return (
      <>
        <Header title="Actualités" subtitle="Chargement..." />
        <div className="flex items-center justify-center py-24">
          <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
        </div>
      </>
    );
  }

  const urgentNews = news.filter((n) => n.category === "urgent");
  const otherNews  = news.filter((n) => n.category !== "urgent");

  return (
    <>
      <Header title="Actualités" subtitle={`${news.length} actualités`} />
      <main className="p-4 space-y-4 sm:p-6 sm:space-y-6">

        {/* Urgent banners */}
        {urgentNews.map((item, i) => (
          <div
            key={item.id}
            className="flex items-start gap-3 sm:gap-4 rounded-2xl p-4 wap-in"
            style={{
              animationDelay: `${i * 0.06}s`,
              background: "color-mix(in oklch, var(--danger) 10%, transparent)",
              border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--danger) 15%, transparent)" }}
            >
              <Papicon name="Bell" size={20} color="var(--danger)" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold" style={{ color: "var(--danger)" }}>{item.title}</h3>
                <span className="text-xs text-muted">{formatShortDate(item.date)}</span>
              </div>
              <p className="text-sm">{item.content}</p>
              <p className="text-xs text-muted mt-2">— {item.author}</p>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {otherNews.length === 0 && urgentNews.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">
            Aucune actualité
          </div>
        )}

        {/* News list */}
        {otherNews.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {otherNews.map((item, i) => {
              const config = categoryConfig[(item.category as CategoryKey)] ?? categoryConfig.info;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-surface p-4 sm:p-5 hover:bg-default/50 transition-colors wap-in"
                  style={{ animationDelay: `${(urgentNews.length + i) * 0.05}s` }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `color-mix(in oklch, ${config.color} 12%, transparent)` }}
                    >
                      <Papicon name={config.icon} size={20} color={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: `color-mix(in oklch, ${config.color} 12%, transparent)`, color: config.color }}
                        >
                          <Papicon name={config.icon} size={10} color={config.color} />
                          {config.label}
                        </span>
                        <span className="text-xs text-muted capitalize">{formatDate(item.date)}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">{item.title}</h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-muted">{item.content}</p>
                      <p className="text-xs text-muted mt-2 sm:mt-3">Publié par {item.author}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
