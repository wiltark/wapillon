"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-subject appearance overrides for the timetable.
 *
 * Stored server-side through Prisma, keyed by the École Directe account id, so
 * the same colours follow the user to another browser or device.
 */
export interface SubjectStyle {
  /** Hex colour replacing the auto-assigned one. */
  color?: string;
  /** Image URL shown behind the course card. */
  image?: string;
  /** Short label replacing a long official subject name. */
  alias?: string;
}

export type SubjectPrefs = Record<string, SubjectStyle>;

/** Curated palette — readable on both themes, distinct from each other. */
export const PRESET_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#64748b",
];

export function useSubjectPrefs() {
  const [prefs, setPrefs] = useState<SubjectPrefs>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subject-prefs")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: SubjectPrefs) => {
        if (!cancelled) setPrefs(data ?? {});
      })
      .catch(() => {
        // Personalisation is cosmetic — fall back to the default palette.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSubject = useCallback(async (subject: string, style: SubjectStyle) => {
    // Apply locally first so the picker feels instant, then persist.
    setPrefs((prev) => {
      const merged = { ...prev[subject], ...style };
      for (const key of Object.keys(merged) as (keyof SubjectStyle)[]) {
        if (!merged[key]) delete merged[key];
      }
      const next = { ...prev };
      if (Object.keys(merged).length === 0) delete next[subject];
      else next[subject] = merged;
      return next;
    });

    try {
      await fetch("/api/subject-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, ...style }),
      });
    } catch {
      // Keep the optimistic value; a reload will show what actually saved.
    }
  }, []);

  const resetSubject = useCallback(async (subject: string) => {
    setPrefs((prev) => {
      const next = { ...prev };
      delete next[subject];
      return next;
    });
    try {
      await fetch(`/api/subject-prefs?subject=${encodeURIComponent(subject)}`, {
        method: "DELETE",
      });
    } catch {
      // Same as above.
    }
  }, []);

  const resetAll = useCallback(async () => {
    setPrefs({});
    try {
      await fetch("/api/subject-prefs", { method: "DELETE" });
    } catch {
      // Same as above.
    }
  }, []);

  return { prefs, loading, setSubject, resetSubject, resetAll };
}
