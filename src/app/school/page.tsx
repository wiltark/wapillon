"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { Badge, Empty, LoadingPanel, Panel, Rows } from "@/components/ui";
import { useApiData, useAuth } from "@/lib/auth-context";
import type { SchoolPage } from "@/lib/services/ecoledirecte";

export default function SchoolPage() {
  const { session } = useAuth();
  const { data: pages, loading } = useApiData<SchoolPage[]>("/api/school", []);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) {
    return (
      <>
        <Header title="Mon établissement" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={5} />
        </main>
      </>
    );
  }

  const notices = pages.filter((p) => p.kind === "notice");
  const workspaces = pages.filter((p) => p.kind === "workspace");

  return (
    <>
      <Header
        title="Mon établissement"
        subtitle={session?.student?.school || `${pages.length} publications`}
      />
      <main className="p-4 space-y-4 sm:p-6">
        {pages.length === 0 && (
          <Panel>
            <Empty icon="Info">
              Votre établissement n&apos;a publié aucune page pour le moment.
            </Empty>
          </Panel>
        )}

        {notices.length > 0 && (
          <Panel title="Informations" meta={`${notices.length} publications`} flush>
            <Rows>
              {notices.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  open={openId === page.id}
                  onToggle={() => setOpenId(openId === page.id ? null : page.id)}
                />
              ))}
            </Rows>
          </Panel>
        )}

        {workspaces.length > 0 && (
          <Panel
            title="Espaces de travail"
            meta={`${workspaces.length} espaces`}
            flush
            delay={0.05}
          >
            <Rows>
              {workspaces.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  open={openId === page.id}
                  onToggle={() => setOpenId(openId === page.id ? null : page.id)}
                />
              ))}
            </Rows>
          </Panel>
        )}
      </main>
    </>
  );
}

function PageRow({
  page,
  open,
  onToggle,
}: {
  page: SchoolPage;
  open: boolean;
  onToggle: () => void;
}) {
  const isWorkspace = page.kind === "workspace";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-default/40"
      >
        <span
          className="w-[3px] self-stretch rounded-full shrink-0"
          style={{ background: isWorkspace ? "var(--success)" : "var(--accent)" }}
        />
        <Papicon
          name={isWorkspace ? "Folder" : "Info"}
          size={14}
          color={isWorkspace ? "var(--success)" : "var(--accent)"}
        />
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[13px] font-medium">{page.title}</span>
          <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>
            {[page.author, page.date].filter(Boolean).join(" · ") || "Établissement"}
          </span>
        </span>

        {isWorkspace && page.isMember && <Badge tone="success">Membre</Badge>}
        {isWorkspace && page.memberCount != null && (
          <span className="text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
            {page.memberCount}
          </span>
        )}

        <Papicon name={open ? "ChevronUp" : "ChevronDown"} size={13} color="var(--muted)" />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1" style={{ background: "var(--surface-secondary)" }}>
          {page.bodyHtml ? (
            // Sanitized server-side — scripts and handlers are already stripped.
            <div className="wap-mail" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
          ) : (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Aucun contenu détaillé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
