import { format, formatDistanceToNow } from "date-fns";

const LAGOS_TIMEZONE = "Africa/Lagos";

/**
 * Convert a date string or Date to a Date object adjusted for Lagos/Nigeria timezone display.
 */
export function toLagosDate(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return d;
}

/**
 * Format a date in Lagos/Nigeria timezone (Africa/Lagos, WAT UTC+1).
 * Uses Intl.DateTimeFormat for accurate timezone conversion.
 */
export function formatLagos(
  date: string | Date,
  formatStr?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (formatStr === "relative") {
    // For relative time, use formatDistanceToNow (approximate, acceptable)
    return formatDistanceToNow(d, { addSuffix: true });
  }

  if (formatStr === "date") {
    return d.toLocaleDateString("en-NG", { timeZone: LAGOS_TIMEZONE });
  }

  if (formatStr === "datetime") {
    return d.toLocaleString("en-NG", {
      timeZone: LAGOS_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (formatStr === "full") {
    return d.toLocaleString("en-NG", {
      timeZone: LAGOS_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  if (formatStr === "time") {
    return d.toLocaleTimeString("en-NG", {
      timeZone: LAGOS_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (formatStr === "monthYear") {
    return d.toLocaleDateString("en-NG", {
      timeZone: LAGOS_TIMEZONE,
      month: "short",
      year: "numeric",
    });
  }

  // Default: date only
  return d.toLocaleDateString("en-NG", {
    timeZone: LAGOS_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format relative time from now (e.g., "2 hours ago").
 */
export function formatLagosRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
