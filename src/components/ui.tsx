"use client";

/**
 * Dashboard building blocks.
 *
 * Two rules drive these, because the previous pass got both wrong:
 *  1. Colour carries meaning — subject hue, pass/fail, above/below class average.
 *     Nothing is grey just because it was easier.
 *  2. One box per block. A Panel is the only bordered container; its rows and
 *     cells never introduce another border. No cards inside cards.
 */

import Link from "next/link";
import { Meter, Typography } from "@heroui/react";
import Papicon from "./Papicon";

/* ── Containers ───────────────────────────────────────────────────────────── */

/**
 * The single bordered surface. Everything inside is flat: rows are separated by
 * hairlines, never by nested boxes.
 */
export function Panel({
  title,
  meta,
  href,
  action,
  delay = 0,
  flush = false,
  children,
}: {
  title?: string;
  meta?: React.ReactNode;
  href?: string;
  action?: React.ReactNode;
  delay?: number;
  /** Remove inner padding — for tables and row lists that manage their own. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="wap-in rounded-2xl border border-border overflow-hidden"
      style={{ background: "var(--surface)", animationDelay: `${delay}s` }}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="flex items-baseline gap-2 min-w-0">
            {title && <h2 className="text-[13px] font-bold truncate">{title}</h2>}
            {meta && (
              <span className="text-[11px] tabular-nums truncate" style={{ color: "var(--muted)" }}>
                {meta}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {action}
            {href && (
              <Link
                href={href}
                className="flex items-center gap-0.5 text-[11px] font-semibold transition-opacity hover:opacity-60"
                style={{ color: "var(--accent)" }}
              >
                Tout voir <Papicon name="ChevronRight" size={11} />
              </Link>
            )}
          </div>
        </header>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/** Hairline-separated list inside a Panel (use with `flush`). */
export function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

export function RowItem({
  onPress,
  accent,
  dim = false,
  children,
}: {
  onPress?: () => void;
  /** Left colour rule — the subject hue. */
  accent?: string;
  dim?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      {accent && (
        <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: accent }} />
      )}
      {children}
    </>
  );
  const cls = `flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
    dim ? "opacity-45" : ""
  }`;

  return onPress ? (
    <button type="button" onClick={onPress} className={`${cls} hover:bg-default/40`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/* ── Numbers ──────────────────────────────────────────────────────────────── */

/** Big figure with a label. The number is the point, so it gets the size. */
export function Metric({
  value,
  unit,
  label,
  color = "var(--foreground)",
  trend,
}: {
  value: string;
  unit?: string;
  label: string;
  color?: string;
  trend?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-baseline gap-1">
        <span className="text-[26px] leading-none font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
            {unit}
          </span>
        )}
        {trend !== undefined && trend !== 0 && <Trend value={trend} />}
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide truncate"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

/** Signed delta against the class average — green above, red below. */
export function Trend({ value, showValue = true }: { value: number; showValue?: boolean }) {
  if (value === 0) return null;
  const up = value > 0;
  const color = up ? "var(--success)" : "var(--danger)";
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums"
      style={{ color }}
    >
      <Papicon name={up ? "ArrowUp" : "ArrowDown"} size={10} color={color} />
      {showValue && `${up ? "+" : ""}${value.toFixed(1)}`}
    </span>
  );
}

/** Horizontal gauge, 0–20 by default. Colour follows the value. */
export function Gauge({
  value,
  max = 20,
  color,
  label,
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const hue = color ?? scoreColor(value, max);
  return (
    <Meter value={pct} aria-label={label ?? `${value} sur ${max}`} className="w-full">
      <Meter.Track className="h-1.5 rounded-full" style={{ background: "var(--default)" }}>
        <Meter.Fill className="h-full rounded-full" style={{ width: `${pct}%`, background: hue }} />
      </Meter.Track>
    </Meter>
  );
}

/** Tiny inline bar chart — shows the shape of a series without a chart library. */
export function Sparkline({
  values,
  max = 20,
  color = "var(--accent)",
  height = 28,
}: {
  values: number[];
  max?: number;
  color?: string;
  height?: number;
}) {
  if (values.length === 0) return null;
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden="true">
      {values.map((v, i) => {
        const pct = Math.max(6, Math.min(100, (v / max) * 100));
        return (
          <span
            key={i}
            className="flex-1 rounded-[2px] min-w-[3px]"
            style={{
              height: `${pct}%`,
              background: color,
              opacity: 0.35 + (i / Math.max(1, values.length - 1)) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Labels ───────────────────────────────────────────────────────────────── */

type Tone = "accent" | "success" | "warning" | "danger" | "muted";

/** Dense colour-coded label. Not a Chip — this stays small and tabular. */
export function Badge({
  tone = "muted",
  icon,
  solid = false,
  children,
}: {
  tone?: Tone;
  icon?: string;
  solid?: boolean;
  children: React.ReactNode;
}) {
  const color = `var(--${tone})`;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0"
      style={
        solid
          ? { background: color, color: "var(--accent-foreground)" }
          : { background: `color-mix(in oklch, ${color} 14%, transparent)`, color }
      }
    >
      {icon && <Papicon name={icon} size={9} color={solid ? "currentColor" : color} />}
      {children}
    </span>
  );
}

/** Subject name prefixed by its colour dot. */
export function SubjectTag({ subject, color }: { subject: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{subject}</span>
    </span>
  );
}

/* ── States ───────────────────────────────────────────────────────────────── */

export function Empty({ icon = "Info", children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10">
      <Papicon name={icon} size={22} color="var(--muted)" />
      <Typography type="body-sm" color="muted">
        {children}
      </Typography>
    </div>
  );
}

export function LoadingPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border border-border overflow-hidden"
      style={{ background: "var(--surface)" }}
    >
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2 w-2 rounded-full wap-shimmer shrink-0" />
            <span className="h-3 rounded wap-shimmer flex-1" style={{ maxWidth: "45%" }} />
            <span className="h-3 w-10 rounded wap-shimmer shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Red below 8, amber below 12, green above — the usual French marking bands. */
export function scoreColor(value: number, max = 20): string {
  const out = (value / max) * 20;
  if (out < 8) return "var(--danger)";
  if (out < 12) return "var(--warning)";
  return "var(--success)";
}
