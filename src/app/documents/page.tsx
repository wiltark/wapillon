"use client";

import Header from "@/components/Header";
import Icon from "@/components/Icon";
import { Empty, LoadingPanel, Panel, RowItem, Rows } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import type { SchoolDocument } from "@/lib/services/ecoledirecte";

/** Category keys as École Directe names them, mapped to readable labels. */
const CATEGORY_LABELS: Record<string, string> = {
  notes: "Bulletins et relevés",
  viescolaire: "Vie scolaire",
  administratifs: "Administratif",
  factures: "Factures",
  inscriptions: "Inscriptions",
};

export default function DocumentsPage() {
  const { data: documents, loading } = useApiData<SchoolDocument[]>("/api/documents", []);

  if (loading) {
    return (
      <>
        <Header title="Documents" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={5} />
        </main>
      </>
    );
  }

  // Group by the category the school filed each document under.
  const groups = documents.reduce<Record<string, SchoolDocument[]>>((acc, doc) => {
    (acc[doc.type] ??= []).push(doc);
    return acc;
  }, {});
  const categories = Object.keys(groups).sort();

  return (
    <>
      <Header title="Documents" subtitle={`${documents.length} documents`} />
      <main className="p-4 space-y-4 sm:p-6">
        {documents.length === 0 ? (
          <Panel>
            <Empty icon="Document">Aucun document disponible</Empty>
          </Panel>
        ) : (
          categories.map((category, i) => (
            <Panel
              key={category}
              title={CATEGORY_LABELS[category] ?? category}
              meta={`${groups[category].length} fichiers`}
              flush
              delay={i * 0.05}
            >
              <Rows>
                {groups[category].map((doc) => (
                  <RowItem key={doc.id} accent="var(--accent)">
                    <Icon name="Document" size={14} color="var(--accent)" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[13px] font-medium">{doc.name}</span>
                      {doc.date && (
                        <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                          {doc.date}
                        </span>
                      )}
                    </span>
                    <a
                      href={`/api/homework/document?id=${doc.id}&name=${encodeURIComponent(doc.name)}`}
                      download={doc.name}
                      aria-label={`Télécharger ${doc.name}`}
                      className="shrink-0 transition-opacity hover:opacity-60"
                    >
                      <Icon name="Download" size={14} color="var(--muted)" />
                    </a>
                  </RowItem>
                ))}
              </Rows>
            </Panel>
          ))
        )}
      </main>
    </>
  );
}
