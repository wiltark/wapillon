"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { Badge, Empty, LoadingPanel } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import { formatShortDate, type MessageEntry, type MessageFolder } from "@/lib/services/types";

interface Inbox {
  messages: MessageEntry[];
  folders: MessageFolder[];
}

export default function MessagesPage() {
  const { data, loading } = useApiData<Inbox>("/api/messages", { messages: [], folders: [] });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, MessageEntry>>({});
  const [loadingBody, setLoadingBody] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  /** Bodies aren't in the list response; fetch once, on first open. */
  const open = async (id: string) => {
    setSelectedId(id);
    if (bodies[id]) return;

    setLoadingBody(id);
    try {
      const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const full: MessageEntry | null = await res.json();
        if (full) setBodies((prev) => ({ ...prev, [id]: full }));
      }
    } catch {
      // The preview stays on screen; nothing else to do.
    } finally {
      setLoadingBody(null);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Messagerie" subtitle="Chargement…" />
        <main className="p-4 sm:p-6">
          <LoadingPanel rows={8} />
        </main>
      </>
    );
  }

  const needle = query.trim().toLowerCase();
  const visible = data.messages.filter((m) => {
    if (unreadOnly && m.read) return false;
    if (!needle) return true;
    return (
      m.subject.toLowerCase().includes(needle) ||
      m.from.toLowerCase().includes(needle) ||
      m.preview.toLowerCase().includes(needle)
    );
  });

  const unread = data.messages.filter((m) => !m.read).length;
  const selected = selectedId ? (bodies[selectedId] ?? data.messages.find((m) => m.id === selectedId)) : null;

  return (
    <>
      <Header
        title="Messagerie"
        subtitle={unread > 0 ? `${unread} non lu(s)` : `${data.messages.length} messages`}
      />

      {/* Two panes on desktop; on mobile the reader replaces the list */}
      <main className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <section
          className={`flex w-full shrink-0 flex-col border-r border-border lg:w-[380px] ${
            selectedId ? "max-lg:hidden" : ""
          }`}
          style={{ background: "var(--surface)" }}
        >
          {/* Search + filter */}
          <div className="shrink-0 border-b border-border p-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--surface-secondary)" }}
            >
              <Papicon name="Search" size={14} color="var(--muted)" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un message…"
                className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:opacity-50"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <FilterChip active={!unreadOnly} onPress={() => setUnreadOnly(false)}>
                Tous
              </FilterChip>
              <FilterChip active={unreadOnly} onPress={() => setUnreadOnly(true)}>
                Non lus {unread > 0 && `(${unread})`}
              </FilterChip>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <Empty icon="Envelope">
                {needle || unreadOnly ? "Aucun message trouvé" : "Aucun message"}
              </Empty>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((message) => {
                  const active = selectedId === message.id;
                  return (
                    <li key={message.id}>
                      <button
                        type="button"
                        onClick={() => open(message.id)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                          active ? "" : "hover:bg-default/40"
                        }`}
                        style={
                          active
                            ? { background: "color-mix(in oklch, var(--accent) 10%, transparent)" }
                            : undefined
                        }
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: message.read ? "transparent" : "var(--accent)" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[12px] ${
                                message.read ? "" : "font-bold"
                              }`}
                              style={{ color: message.read ? "var(--muted)" : "var(--foreground)" }}
                            >
                              {message.from}
                            </span>
                            <span
                              className="shrink-0 text-[10px] tabular-nums"
                              style={{ color: "var(--muted)" }}
                            >
                              {formatShortDate(message.date)}
                            </span>
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-[13px] ${
                              message.read ? "font-medium" : "font-bold"
                            }`}
                          >
                            {message.subject}
                          </span>
                          <span
                            className="mt-0.5 block truncate text-[11px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {message.preview || "—"}
                          </span>
                        </span>
                        {message.hasAttachments && (
                          <Papicon name="Paperclip" size={12} color="var(--muted)" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Reader */}
        <section
          className={`flex min-w-0 flex-1 flex-col ${selectedId ? "" : "max-lg:hidden"}`}
          style={{ background: "var(--background)" }}
        >
          {!selected ? (
            <div className="flex flex-1 items-center justify-center">
              <Empty icon="Envelope">Sélectionnez un message</Empty>
            </div>
          ) : (
            <>
              <div
                className="shrink-0 border-b border-border px-5 py-4"
                style={{ background: "var(--surface)" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-2 flex items-center gap-1.5 text-[12px] font-medium lg:hidden"
                  style={{ color: "var(--accent)" }}
                >
                  <Papicon name="ArrowLeft" size={12} color="var(--accent)" />
                  Retour
                </button>

                <h1 className="text-[17px] font-bold leading-snug">{selected.subject}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    {selected.from.trim()[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="text-[12.5px] font-semibold">{selected.from}</span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {formatShortDate(selected.date)}
                  </span>
                  {selected.hasAttachments && (
                    <Badge tone="accent" icon="Paperclip">
                      {selected.files?.length ?? ""}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {loadingBody === selected.id && !selected.bodyHtml ? (
                  <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                    Chargement du message…
                  </p>
                ) : selected.bodyHtml ? (
                  // Sanitized server-side: scripts, handlers and javascript:
                  // URLs are stripped, while CSS and tables are kept.
                  <div
                    className="wap-mail"
                    dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[13px]">
                    {selected.preview || "(message vide)"}
                  </p>
                )}

                {selected.files && selected.files.length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <p
                      className="mb-2 text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      {selected.files.length} pièce(s) jointe(s)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.files.map((file) => (
                        <a
                          key={file.id}
                          href={`/api/homework/document?id=${file.id}&name=${encodeURIComponent(file.name)}`}
                          download={file.name}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-default/40"
                        >
                          <Papicon name="Paperclip" size={12} color="var(--accent)" />
                          <span className="max-w-[200px] truncate">{file.name}</span>
                          <Papicon name="Download" size={12} color="var(--muted)" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function FilterChip({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--accent-foreground)" }
          : { background: "var(--surface-secondary)", color: "var(--muted)" }
      }
    >
      {children}
    </button>
  );
}
