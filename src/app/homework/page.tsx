"use client";

import React, { useCallback, useState } from "react";
import { Button, Checkbox, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import {
  Badge,
  Empty,
  Gauge,
  LoadingPanel,
  Metric,
  Panel,
  Rows,
  SubjectTag,
} from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import {
  type HomeworkDocument,
  type HomeworkEntry,
  formatDate,
  formatShortDate,
  getSubjectColor,
} from "@/lib/services/types";

type FilterMode = "all" | "pending" | "done";

const FILTER_LABELS: Record<FilterMode, string> = {
  all: "Tous",
  pending: "À faire",
  done: "Terminés",
};

export default function HomeworkPage() {
  const { data: homework, loading } = useApiData<HomeworkEntry[]>("/api/homework", []);

  // optimistic overrides: undefined = use server value, boolean = local override
  const [localDone, setLocalDone] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({}); // IDs being synced
  const [filter, setFilter] = useState<FilterMode>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEffectiveDone = useCallback(
    (h: HomeworkEntry) => (h.id in localDone ? localDone[h.id] : h.done),
    [localDone]
  );

  const toggle = useCallback(
    async (h: HomeworkEntry) => {
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
        setPending((p) => {
          const n = { ...p };
          delete n[h.id];
          return n;
        });
      }
    },
    [localDone]
  );

  const withStatus = homework.map((h) => ({ ...h, done: getEffectiveDone(h) }));

  const visible = withStatus.filter((h) => {
    if (filter === "pending") return !h.done;
    if (filter === "done") return h.done;
    return true;
  });

  const grouped = visible.reduce<Record<string, typeof visible>>((acc, h) => {
    (acc[h.dueDate] ??= []).push(h);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const pendingCount = withStatus.filter((h) => !h.done).length;
  const doneCount = withStatus.filter((h) => h.done).length;
  const completion = withStatus.length > 0 ? doneCount / withStatus.length : 1;

  if (loading) {
    return (
      <>
        <Header title="Devoirs" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={7} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Devoirs" subtitle={`${pendingCount} à faire`} />
      <main className="p-4 space-y-4 sm:p-6">
        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:items-center">
            <Metric
              value={pendingCount.toString()}
              label="À faire"
              color={pendingCount > 0 ? "var(--warning)" : "var(--success)"}
            />
            <Metric value={doneCount.toString()} label="Terminés" color="var(--success)" />
            <Metric value={withStatus.length.toString()} label="Total" />
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Avancement · {Math.round(completion * 100)}%
              </span>
              <Gauge
                value={completion}
                max={1}
                color={completion === 1 ? "var(--success)" : "var(--accent)"}
                label="Avancement"
              />
            </div>
          </div>
        </Panel>

        <div className="wap-in" style={{ animationDelay: "0.05s" }}>
          <ToggleButtonGroup
            size="sm"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[filter]}
            onSelectionChange={(keys) => {
              const [first] = [...keys];
              if (first) setFilter(first as FilterMode);
            }}
          >
            {(Object.keys(FILTER_LABELS) as FilterMode[]).map((mode, i) => (
              <ToggleButton key={mode} id={mode}>
                {i > 0 && <ToggleButtonGroup.Separator />}
                {FILTER_LABELS[mode]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        {dates.length === 0 ? (
          <Panel delay={0.1}>
            <Empty icon="Tasks">Aucun devoir</Empty>
          </Panel>
        ) : (
          dates.map((date, i) => {
            const isToday = new Date(date).toDateString() === new Date().toDateString();
            const isTomorrow =
              new Date(date).toDateString() ===
              new Date(Date.now() + 86400000).toDateString();
            const label = isToday
              ? "Aujourd'hui"
              : isTomorrow
                ? "Demain"
                : formatDate(date);

            return (
              <Panel
                key={date}
                title={label}
                meta={`${grouped[date].length} devoir(s) · ${formatShortDate(date)}`}
                flush
                delay={0.1 + i * 0.04}
                action={isToday ? <Badge tone="danger">Urgent</Badge> : undefined}
              >
                <Rows>
                  {grouped[date].map((hw) => (
                    <HomeworkRow
                      key={hw.id}
                      homework={hw}
                      expanded={expandedId === hw.id}
                      syncing={!!pending[hw.id]}
                      onToggle={() => toggle(hw)}
                      onExpand={() => setExpandedId(expandedId === hw.id ? null : hw.id)}
                    />
                  ))}
                </Rows>
              </Panel>
            );
          })
        )}
      </main>
    </>
  );
}

function HomeworkRow({
  homework: hw,
  expanded,
  syncing,
  onToggle,
  onExpand,
}: {
  homework: HomeworkEntry;
  expanded: boolean;
  syncing: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const color = getSubjectColor(hw.subject);

  return (
    <div className={hw.done && !syncing ? "opacity-45" : ""}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: color }} />

        {/* Checkbox stays outside the expand button so the targets never nest */}
        <Checkbox
          isSelected={hw.done}
          isDisabled={syncing}
          onChange={onToggle}
          aria-label={hw.done ? "Marquer à faire" : "Marquer comme fait"}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>

        <button
          type="button"
          onClick={onExpand}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
        >
          <span className="flex-1 min-w-0">
            <span
              className={`block text-[13px] font-medium truncate ${hw.done ? "line-through" : ""}`}
            >
              {hw.title}
            </span>
            <SubjectTag subject={hw.subject} color={color} />
          </span>

          {hw.documents && hw.documents.length > 0 && (
            <Badge tone="accent" icon="Paperclip">
              {hw.documents.length}
            </Badge>
          )}

          <Papicon name={expanded ? "ChevronUp" : "ChevronDown"} size={13} color="var(--muted)" />
        </button>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1 space-y-3"
          style={{ background: "var(--surface-secondary)" }}
        >
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 min-w-0">
              <span
                className="block text-[10px] font-bold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                Description
              </span>
              {hw.description && hw.description.trim() !== "" ? (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{hw.description}</p>
              ) : (
                <p className="text-[13px] italic" style={{ color: "var(--muted)" }}>
                  Aucune description fournie.
                </p>
              )}
              {hw.descriptionHtml && (
                <div
                  className="mt-3 prose prose-sm max-w-none [&_img]:rounded-xl [&_img]:w-full [&_img]:h-auto [&_img]:object-contain"
                  style={{ "--tw-prose-body": "var(--foreground)" } as React.CSSProperties}
                  dangerouslySetInnerHTML={{ __html: hw.descriptionHtml }}
                />
              )}
            </div>

            {hw.documents && hw.documents.length > 0 && (
              <div className="shrink-0 sm:w-44 space-y-2">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Fichiers
                </span>
                {hw.documents.map((doc) => (
                  <DocumentPreview key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>

          <Button
            variant={hw.done ? "secondary" : "primary"}
            size="sm"
            isDisabled={syncing}
            onPress={onToggle}
          >
            <Papicon name={hw.done ? "Cross" : "Check"} size={12} />
            {syncing ? "Synchronisation…" : hw.done ? "Marquer à faire" : "Marquer comme fait"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DocumentPreview({ doc }: { doc: HomeworkDocument }) {
  const url = `/api/homework/document?id=${doc.id}&name=${encodeURIComponent(doc.name)}`;
  const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isVideo = ["mp4", "mov", "webm", "avi", "mkv"].includes(ext);

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={doc.name}
          className="w-full h-auto rounded-lg object-cover"
          style={{ maxHeight: 140 }}
        />
        <span className="block mt-1 text-[10px] truncate" style={{ color: "var(--muted)" }}>
          {doc.name}
        </span>
      </a>
    );
  }

  if (isVideo) {
    return (
      <div className="rounded-lg overflow-hidden">
        <video src={url} controls className="w-full rounded-lg" style={{ maxHeight: 140 }} />
        <span className="block mt-1 text-[10px] truncate" style={{ color: "var(--muted)" }}>
          {doc.name}
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      download={doc.name}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
      style={{
        background: "color-mix(in oklch, var(--accent) 12%, transparent)",
        color: "var(--accent)",
      }}
    >
      <Papicon name="Paperclip" size={10} color="var(--accent)" />
      <span className="truncate">{doc.name}</span>
    </a>
  );
}
