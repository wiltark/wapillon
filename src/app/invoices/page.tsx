"use client";

import Header from "@/components/Header";
import Papicon from "@/components/Papicon";
import { Badge, Empty, LoadingPanel, Metric, Panel, RowItem, Rows } from "@/components/ui";
import { useApiData, useAuth } from "@/lib/auth-context";
import { formatShortDate, type InvoiceEntry } from "@/lib/services/types";

export default function InvoicesPage() {
  const { session } = useAuth();
  const { data: invoices, loading } = useApiData<InvoiceEntry[]>("/api/invoices", []);

  // The nav hides this page for other roles, but a direct URL should still
  // explain itself rather than showing an empty list.
  if (session && session.role !== "parent") {
    return (
      <>
        <Header title="Facturation" />
        <main className="p-4 sm:p-6">
          <Panel>
            <Empty icon="Lock">La facturation est réservée aux comptes parents.</Empty>
          </Panel>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header title="Facturation" subtitle="Chargement…" />
        <main className="p-4 space-y-4 sm:p-6">
          <LoadingPanel rows={5} />
        </main>
      </>
    );
  }

  const unpaid = invoices.filter((i) => !i.paid);
  const total = invoices.reduce((sum, i) => sum + i.amount, 0);
  const due = unpaid.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <Header title="Facturation" subtitle={`${invoices.length} factures`} />
      <main className="p-4 space-y-4 sm:p-6">
        <Panel>
          <div className="grid grid-cols-3 gap-5">
            <Metric value={invoices.length.toString()} label="Factures" />
            <Metric
              value={due.toFixed(2)}
              unit="€"
              label="Reste à payer"
              color={due > 0 ? "var(--danger)" : "var(--success)"}
            />
            <Metric value={total.toFixed(2)} unit="€" label="Total facturé" />
          </div>
        </Panel>

        <Panel title="Historique" meta={`${invoices.length} factures`} flush delay={0.05}>
          {invoices.length === 0 ? (
            <Empty icon="Document">Aucune facture</Empty>
          ) : (
            <Rows>
              {invoices.map((invoice) => (
                <RowItem
                  key={invoice.id}
                  accent={invoice.paid ? "var(--success)" : "var(--danger)"}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {invoice.label}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                      {formatShortDate(invoice.date)}
                    </span>
                  </span>

                  <Badge tone={invoice.paid ? "success" : "danger"}>
                    {invoice.paid ? "Payée" : "À payer"}
                  </Badge>

                  <span className="w-20 shrink-0 text-right text-[15px] font-bold tabular-nums">
                    {invoice.amount.toFixed(2)} €
                  </span>

                  {invoice.documentId != null && (
                    <a
                      href={`/api/homework/document?id=${invoice.documentId}&name=${encodeURIComponent(invoice.label)}.pdf`}
                      download
                      aria-label={`Télécharger ${invoice.label}`}
                      className="shrink-0 transition-opacity hover:opacity-60"
                    >
                      <Papicon name="Download" size={14} color="var(--muted)" />
                    </a>
                  )}
                </RowItem>
              ))}
            </Rows>
          )}
        </Panel>
      </main>
    </>
  );
}
