"use client";

import { useEffect } from "react";
import Icon from "./Icon";

/** File extension buckets that get a rich inline preview instead of a download prompt. */
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a"];

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function canPreview(name: string): boolean {
  const ext = extOf(name);
  return ext === "pdf" || IMAGE_EXT.includes(ext) || VIDEO_EXT.includes(ext) || AUDIO_EXT.includes(ext);
}

export default function CloudViewer({
  fileId,
  fileName,
  onClose,
}: {
  fileId: string;
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `/api/homework/document?id=${encodeURIComponent(fileId)}&name=${encodeURIComponent(fileName)}&view=1`;
  const downloadHref = `/api/homework/document?id=${encodeURIComponent(fileId)}&name=${encodeURIComponent(fileName)}`;
  const ext = extOf(fileName);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "color-mix(in oklch, black 80%, transparent)" }}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        >
          <Icon name="Cross" size={18} color="white" />
        </button>
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-white">{fileName}</span>
        <a
          href={downloadHref}
          download={fileName}
          aria-label={`Télécharger ${fileName}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        >
          <Icon name="Download" size={18} color="white" />
        </a>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {ext === "pdf" && (
          <iframe src={src} title={fileName} className="h-full w-full rounded-lg bg-white" />
        )}
        {IMAGE_EXT.includes(ext) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={fileName} className="max-h-full max-w-full rounded-lg object-contain" />
        )}
        {VIDEO_EXT.includes(ext) && (
          <video src={src} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        )}
        {AUDIO_EXT.includes(ext) && <audio src={src} controls className="w-full max-w-lg" />}
      </div>
    </div>
  );
}
