"use client";

import Header from "@/components/Header";
import SubjectIcon from "@/components/SubjectIcon";
import Papicon from "@/components/Papicon";
import { useApiData } from "@/lib/auth-context";
import { type HomeworkEntry, type HomeworkDocument, formatDate, formatShortDate } from "@/lib/services/types";
import { useState, useCallback } from "react";
import React from "react";

type FilterMode = "all" | "pending" | "done";

export default function HomeworkPage() {
  const { data: homework, loading } = useApiData<HomeworkEntry[]>("/api/homework", []);

  // optimistic overrides: undefined = use server value, boolean = local override
  const [localDone, setLocalDone]   = useState<Record<string, boolean>>({});
  const [pending, setPending]        = useState<Record<string, boolean>>({}); // IDs being synced
  const [filter, setFilter]          = useState<FilterMode>("pending");
  const [expandedId, setExpandedId]  = useState<string | null>(null);

  const getEffectiveDone = useCallback(
    (h: HomeworkEntry) => (h.id in localDone ? localDone[h.id] : h.done),
    [localDone]
  );

  const toggle = useCallback(async (h: HomeworkEntry) => {
    // Read current effective state synchronously — setState updater runs async (next render)
    const current = h.id in localDone ? localDone[h.id] : h.done;
    const newDone = !current;

    setLocalDone((prev) => ({ ...prev, [h.id]: newDone }));
    setPending((p) => ({ ...p, [h.id]: true }));
    try {
      await fetch("/api/homework", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: h.id, done: newDone }),
      });
    } catch {
      setLocalDone((prev) => ({ ...prev, [h.id]: !newDone }));
    } finally {
      setPending((p) => { const n = { ...p }; delete n[h.id]; return n; });
    }
  }, [localDone]);

  const homeworkWithStatus = homework.map((h) => ({
    ...h,
    done: getEffectiveDone(h),
  }));

  const filtered = homeworkWithStatus.filter((h) => {
    if (filter === "pending") return !h.done;
    if (filter === "done")    return h.done;
    return true;
  });

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, h) => {
    (acc[h.dueDate] ??= []).push(h);
    return acc;
  }, {});

  const sortedDates  = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const pendingCount = homeworkWithStatus.filter((h) => !h.done).length;
  const doneCount    = homeworkWithStatus.filter((h) => h.done).length;

  if (loading) {
    return (
      <>
        <Header title="Devoirs" subtitle="Chargement..." />
        <div className="flex items-center justify-center py-24">
          <Papicon name="Butterfly" size={32} className="wap-pulse-accent" color="var(--accent)" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Devoirs" subtitle={`${pendingCount} à faire`} />
      <main className="p-4 space-y-5 sm:p-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 wap-in" style={{ animationDelay: "0s" }}>
          {([
            { value: pendingCount,    label: "À faire",  color: "var(--warning)" },
            { value: doneCount,       label: "Terminés", color: "var(--success)" },
            { value: homework.length, label: "Total",    color: "var(--accent)"  },
          ] as const).map(({ value, label, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 wap-in" style={{ animationDelay: "0.06s" }}>
          {(["all", "pending", "done"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
              style={
                filter === mode
                  ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }
              }
            >
              {mode === "all" ? "Tous" : mode === "pending" ? "À faire" : "Terminés"}
            </button>
          ))}
        </div>

        {/* Empty */}
        {sortedDates.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface flex flex-col items-center justify-center gap-2 p-16 text-muted wap-in" style={{ animationDelay: "0.1s" }}>
            <Papicon name="Tasks" size={28} color="var(--muted)" />
            <p className="text-sm">Aucun devoir</p>
          </div>
        )}

        {/* Grouped list */}
        <div className="space-y-5">
          {sortedDates.map((date, di) => {
            const isToday    = new Date(date).toDateString() === new Date().toDateString();
            const isTomorrow = new Date(date).toDateString() === new Date(Date.now() + 86400000).toDateString();

            return (
              <div key={date} className="wap-in" style={{ animationDelay: `${0.1 + di * 0.05}s` }}>

                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-sm font-bold capitalize">
                    {isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : formatDate(date)}
                  </h3>
                  {isToday && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "color-mix(in oklch, var(--danger) 12%, transparent)", color: "var(--danger)" }}>
                      Urgent
                    </span>
                  )}
                  <span className="text-xs text-muted ml-auto">{formatShortDate(date)}</span>
                </div>

                <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
                  {grouped[date].map((hw) => {
                    const expanded   = expandedId === hw.id;
                    const isSyncing  = !!pending[hw.id];

                    return (
                      <div key={hw.id} className={hw.done && !isSyncing ? "opacity-60" : ""}>

                        <div className="flex items-start hover:bg-default/40 transition-colors">

                          {/* Checkbox — standalone, no nesting */}
                          <button
                            type="button"
                            onClick={() => toggle(hw)}
                            disabled={isSyncing}
                            className="shrink-0 flex items-center justify-center p-3 sm:p-4 disabled:opacity-50"
                            aria-label={hw.done ? "Marquer à faire" : "Marquer comme fait"}
                          >
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                              style={
                                isSyncing
                                  ? { borderColor: "var(--accent)", background: "color-mix(in oklch, var(--accent) 20%, transparent)" }
                                  : hw.done
                                  ? { background: "var(--success)", borderColor: "var(--success)" }
                                  : { borderColor: "var(--muted)" }
                              }
                            >
                              {hw.done && !isSyncing && <Papicon name="Check" size={10} color="white" />}
                            </span>
                          </button>

                          {/* Content row — click to expand */}
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : hw.id)}
                            className="flex flex-1 items-start gap-3 py-3 pr-3 sm:py-4 sm:pr-4 text-left min-w-0"
                          >
                            <SubjectIcon subject={hw.subject} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm leading-snug ${hw.done ? "line-through" : ""}`}>
                                {hw.title}
                              </p>
                              <p className="text-xs text-muted mt-0.5">{hw.subject}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              {hw.documents && hw.documents.length > 0 && (
                                <span
                                  className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{ background: "color-mix(in oklch, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                                >
                                  <Papicon name="Paperclip" size={9} color="var(--accent)" />
                                  {hw.documents.length}
                                </span>
                              )}
                              <Papicon
                                name={expanded ? "ChevronUp" : "ChevronDown"}
                                size={14}
                                color="var(--muted)"
                              />
                            </div>
                          </button>
                        </div>

                        {/* Detail panel */}
                        {expanded && (
                          <div className="border-t border-border px-4 py-4 space-y-4" style={{ background: "var(--surface-secondary)" }}>

                            <div className="flex gap-4">
                              {/* Description */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Description</p>
                                {hw.description && hw.description.trim() !== "" ? (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{hw.description}</p>
                                ) : (
                                  <p className="text-sm text-muted italic">Aucune description fournie.</p>
                                )}
                                {hw.descriptionHtml && (
                                  <div
                                    className="mt-3 prose prose-sm max-w-none [&_img]:rounded-xl [&_img]:w-full [&_img]:h-auto [&_img]:object-contain [&_img]:cursor-pointer"
                                    style={{ "--tw-prose-body": "var(--foreground)" } as React.CSSProperties}
                                    dangerouslySetInnerHTML={{ __html: hw.descriptionHtml }}
                                  />
                                )}
                              </div>

                              {/* Documents */}
                              {hw.documents && hw.documents.length > 0 && (
                                <div className="shrink-0 w-40 sm:w-48 space-y-2">
                                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Fichiers</p>
                                  {hw.documents.map((doc: HomeworkDocument) => {
                                    const url = `/api/homework/document?id=${doc.id}&name=${encodeURIComponent(doc.name)}`;
                                    const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
                                    const isImage = ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext);
                                    const isVideo = ["mp4","mov","webm","avi","mkv"].includes(ext);
                                    if (isImage) {
                                      return (
                                        <a key={doc.id} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden hover:opacity-80 transition-opacity">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={url} alt={doc.name} className="w-full h-auto rounded-xl object-cover" style={{ maxHeight: 160 }} />
                                          <p className="text-[10px] text-muted mt-1 truncate">{doc.name}</p>
                                        </a>
                                      );
                                    }
                                    if (isVideo) {
                                      return (
                                        <div key={doc.id} className="rounded-xl overflow-hidden">
                                          <video
                                            src={url}
                                            controls
                                            className="w-full rounded-xl"
                                            style={{ maxHeight: 160 }}
                                          />
                                          <p className="text-[10px] text-muted mt-1 truncate">{doc.name}</p>
                                        </div>
                                      );
                                    }
                                    return (
                                      <a
                                        key={doc.id}
                                        href={url}
                                        download={doc.name}
                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-opacity hover:opacity-70"
                                        style={{ background: "color-mix(in oklch, var(--accent) 10%, transparent)", color: "var(--accent)" }}
                                      >
                                        <Papicon name="Paperclip" size={11} color="var(--accent)" />
                                        <span className="truncate">{doc.name}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggle(hw)}
                              disabled={isSyncing}
                              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                              style={
                                hw.done
                                  ? { background: "color-mix(in oklch, var(--warning) 12%, transparent)", color: "var(--warning)" }
                                  : { background: "color-mix(in oklch, var(--success) 12%, transparent)", color: "var(--success)" }
                              }
                            >
                              <Papicon
                                name={hw.done ? "Cross" : "Check"}
                                size={12}
                                color={hw.done ? "var(--warning)" : "var(--success)"}
                              />
                              {isSyncing ? "Synchronisation…" : hw.done ? "Marquer à faire" : "Marquer comme fait"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
