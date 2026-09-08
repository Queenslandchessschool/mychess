// ======================================================
// MyCHESS Global Business Time
// Business Timezone: Australia/Brisbane
//
// Purpose:
// - One shared "current business time" for the whole app
// - Development/UAT can simulate Brisbane wall-clock time
// - Production defaults to real Brisbane time
//
// IMPORTANT:
// - Does NOT change the system clock
// - Does NOT change database timestamps
// - Does NOT modify Class Schedule
// - Attendance Time Engine remains unchanged
// ======================================================

export const BUSINESS_TIMEZONE = "Australia/Brisbane";

const TEST_CLOCK_ENABLED_KEY = "mychess_test_clock_enabled";
const TEST_CLOCK_VALUE_KEY = "mychess_test_clock_value";

// ======================================================
// Types
// ======================================================

export interface BrisbaneBusinessTime {
  dateKey: string;
  hour: number;
  minute: number;
  second: number;
}

// ======================================================
// Parse simulated Brisbane wall-clock time
//
// Expected format:
// YYYY-MM-DDTHH:mm
//
// Example:
// 2026-09-16T08:00
// ======================================================

function parseSimulatedBrisbaneTime(
  raw: string
): BrisbaneBusinessTime | null {
  if (!raw) return null;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
      raw
    );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`,
    hour,
    minute,
    second,
  };
}

// ======================================================
// Get real Brisbane business time
// ======================================================

function getRealBrisbaneBusinessTime(
  date: Date = new Date()
): BrisbaneBusinessTime {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour ?? 0),
    minute: Number(values.minute ?? 0),
    second: Number(values.second ?? 0),
  };
}

// ======================================================
// Get current MyCHESS Business Time
//
// This is the SINGLE shared time source for business logic.
//
// Production:
//   Real Brisbane time
//
// Development/UAT:
//   Simulated Brisbane wall-clock time when enabled
// ======================================================

export function getBusinessTime(): BrisbaneBusinessTime {
  if (typeof window !== "undefined") {
    const enabled =
      window.localStorage.getItem(TEST_CLOCK_ENABLED_KEY) === "true";

    const value =
      window.localStorage.getItem(TEST_CLOCK_VALUE_KEY) ?? "";

    if (enabled && value) {
      const simulated =
        parseSimulatedBrisbaneTime(value);

      if (simulated) {
        return simulated;
      }
    }
  }

  return getRealBrisbaneBusinessTime();
}

// ======================================================
// Test Clock Controls
//
// Development / UAT only.
//
// These functions do not affect:
// - database time
// - server time
// - browser system time
// - Class Schedule
// ======================================================

export function setTestClock(
  value: string
): void {
  const parsed =
    parseSimulatedBrisbaneTime(value);

  if (!parsed) {
    throw new Error(
      "Invalid Brisbane test clock value."
    );
  }

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    TEST_CLOCK_VALUE_KEY,
    value
  );

  window.localStorage.setItem(
    TEST_CLOCK_ENABLED_KEY,
    "true"
  );
}

export function clearTestClock(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    TEST_CLOCK_ENABLED_KEY
  );

  window.localStorage.removeItem(
    TEST_CLOCK_VALUE_KEY
  );
}

export function isTestClockEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(
      TEST_CLOCK_ENABLED_KEY
    ) === "true"
  );
}

export function getTestClockValue(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(
      TEST_CLOCK_VALUE_KEY
    ) ?? ""
  );
}

export function getBusinessTimeAsDate(): Date {
  const now = getBusinessTime();

  return new Date(
    `${now.dateKey}T${String(now.hour).padStart(2, "0")}:${String(
      now.minute
    ).padStart(2, "0")}:${String(now.second).padStart(2, "0")}+10:00`
  );
}