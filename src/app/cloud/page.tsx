"use client";

import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import CloudViewer, { canPreview } from "@/components/CloudViewer";
import { Empty, LoadingPanel, Panel, RowItem, Rows } from "@/components/ui";
import { useApiData } from "@/lib/auth-context";
import type { CloudItem } from "@/lib/services/ecoledirecte";

/** Human-readable file size, e.g. "1.4 Mo". */
function formatSize(bytes?: number): string | undefined {
  if (!bytes) return undefined;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Finds a folder node by id inside the tree, descending through children. */
function findFolder(node: CloudItem | null, id: string): CloudItem | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    if (child.kind !== "folder") continue;
    const found = findFolder(child, id);
    if (found) return found;
  }
  return null;
}

export default function CloudPage() {
  const { data: root, loading, refetch } = useApiData<CloudItem | null>("/api/cloud", null);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<CloudItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = useMemo(() => {
    if (!root) return null;
    if (path.length === 0) return root;
    return findFolder(root, path[path.length - 1].id) ?? root;
  }, [root, path]);

  const children = currentFolder?.children ?? [];
  // The trash folder is a regular child ("CORBEILLE") — surfaced separately so
  // it always sits last instead of mixed alphabetically among real folders.
  const trash = children.find((c) => c.isTrash);
  const folders = children.filter((c) => c.kind === "folder" && !c.isTrash);
  const files = children.filter((c) => c.kind === "file");

  async function handleFileChosen(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folderId", currentFolder?.id ?? "");
      const res = await fetch("/api/cloud/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Échec de l'envoi");
      }
      await refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Header title="Cloud" subtitle={loading ? "Chargement…" : `${children.length} éléments`} />
      <main className="p-4 space-y-4 sm:p-6">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 text-[12px] font-medium min-w-0" style={{ color: "var(--muted)" }}>
            <button
              type="button"
              onClick={() => setPath([])}
              className="transition-opacity hover:opacity-60"
              style={{ color: path.length === 0 ? "var(--foreground)" : "var(--accent)" }}
            >
              MonCloud
            </button>
            {path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1 min-w-0">
                <Icon name="ChevronRight" size={11} />
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, i + 1))}
                  className="truncate transition-opacity hover:opacity-60"
                  style={i === path.length - 1 ? { color: "var(--foreground)" } : { color: "var(--accent)" }}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Icon name="Upload" size={14} color="var(--accent-foreground)" />
            {uploading ? "Envoi…" : "Téléverser"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFileChosen(file);
            }}
          />
        </div>

        {uploadError && (
          <Panel>
            <p className="text-[12.5px] font-medium" style={{ color: "var(--danger)" }}>
              {uploadError}
            </p>
          </Panel>
        )}

        {loading ? (
          <LoadingPanel rows={5} />
        ) : !root || children.length === 0 ? (
          <Panel>
            <Empty icon="Folder">Ce dossier est vide</Empty>
          </Panel>
        ) : (
          <Panel flush>
            <Rows>
              {folders.map((folder) => (
                <RowItem
                  key={folder.id}
                  onPress={() => setPath([...path, { id: folder.id, name: folder.name }])}
                >
                  <Icon name="Folder" size={14} color="var(--accent)" />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{folder.name}</span>
                  <Icon name="ChevronRight" size={12} color="var(--muted)" />
                </RowItem>
              ))}
              {files.map((file) => {
                const previewable = canPreview(file.name);
                return (
                  <RowItem
                    key={file.id}
                    accent="var(--accent)"
                    onPress={previewable ? () => setPreview(file) : undefined}
                  >
                    <Icon name="Document" size={14} color="var(--accent)" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[13px] font-medium">{file.name}</span>
                      {(file.date || file.size) && (
                        <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                          {[file.date, formatSize(file.size)].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <a
                      href={`/api/homework/document?id=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name)}`}
                      download={file.name}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Télécharger ${file.name}`}
                      className="shrink-0 transition-opacity hover:opacity-60"
                    >
                      <Icon name="Download" size={14} color="var(--muted)" />
                    </a>
                  </RowItem>
                );
              })}
              {trash && (
                <RowItem
                  key={trash.id}
                  dim
                  onPress={() => setPath([...path, { id: trash.id, name: trash.name }])}
                >
                  <Icon name="Trash" size={14} color="var(--muted)" />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium">Corbeille</span>
                  <Icon name="ChevronRight" size={12} color="var(--muted)" />
                </RowItem>
              )}
            </Rows>
          </Panel>
        )}
      </main>

      {preview && (
        <CloudViewer fileId={preview.id} fileName={preview.name} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
