// ======================================================
// MyCHESS Attendance Time Engine
// Business Timezone: Australia/Brisbane
// ======================================================

export const ATTENDANCE_TIMEZONE = "Australia/Brisbane";


// ======================================================
// Types
// ======================================================

export type LessonTimePhase =
  | "BEFORE_T30"
  | "T30_WINDOW"
  | "LESSON_STARTED"
  | "LOCKED";


// ======================================================
// Brisbane Date Parts
//
// All Attendance business-time calculations must use
// Australia/Brisbane rather than the browser's local timezone.
// ======================================================

interface BrisbaneDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}


// ======================================================
// Get Brisbane date/time parts
// ======================================================

export function getBrisbaneDateParts(
  date: Date = new Date()
): BrisbaneDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const get = (type: string): number => {
    const value = parts.find(
      (part) => part.type === type
    )?.value;

    return Number(value ?? 0);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}


// ======================================================
// Get today's date in Brisbane
//
// Returns YYYY-MM-DD
// ======================================================

export function getBrisbaneDate(
  date: Date = new Date()
): string {
  const parts = getBrisbaneDateParts(date);

  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}


// ======================================================
// Convert Brisbane local date/time to a comparable
// timestamp.
//
// This function intentionally treats the supplied
// Brisbane date/time as the business-time reference.
// ======================================================

export function brisbaneTimestamp(
  date: string,
  time: string
): number {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  const [hour, minute] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  // Brisbane does not observe daylight saving time.
  //
  // UTC+10 is therefore sufficient for our business
  // timezone calculations.
  return Date.UTC(
    year,
    month - 1,
    day,
    hour - 10,
    minute,
    0
  );
}


// ======================================================
// Lesson Start Timestamp
//
// lessonDate: YYYY-MM-DD
// startTime: HH:mm or HH:mm:ss
// ======================================================

export function getLessonStartTimestamp(
  lessonDate: string,
  startTime: string
): number {
  return brisbaneTimestamp(
    lessonDate,
    startTime
  );
}


// ======================================================
// Lesson T-30 Timestamp
// ======================================================

export function getLessonT30Timestamp(
  lessonDate: string,
  startTime: string
): number {
  return (
    getLessonStartTimestamp(
      lessonDate,
      startTime
    ) -
    30 * 60 * 1000
  );
}


// ======================================================
// Lesson Lock Timestamp
//
// Attendance remains editable until 23:59 Brisbane time
// on the lesson date.
//
// Lock boundary = next day 00:00 Brisbane.
// ======================================================

export function getLessonLockTimestamp(
  lessonDate: string
): number {
  const [year, month, day] = lessonDate
    .split("-")
    .map(Number);

  return Date.UTC(
    year,
    month - 1,
    day + 1,
    -10,
    0,
    0
  );
}


// ======================================================
// Determine lesson phase
// ======================================================

export function getLessonTimePhase(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): LessonTimePhase {
  const nowTimestamp = now.getTime();

  const t30Timestamp =
    getLessonT30Timestamp(
      lessonDate,
      startTime
    );

  const startTimestamp =
    getLessonStartTimestamp(
      lessonDate,
      startTime
    );

  const lockTimestamp =
    getLessonLockTimestamp(
      lessonDate
    );

  if (nowTimestamp >= lockTimestamp) {
    return "LOCKED";
  }

  if (nowTimestamp >= startTimestamp) {
    return "LESSON_STARTED";
  }

  if (nowTimestamp >= t30Timestamp) {
    return "T30_WINDOW";
  }

  return "BEFORE_T30";
}


// ======================================================
// Convenience helpers
// ======================================================

export function isBeforeLessonT30(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  return (
    getLessonTimePhase(
      lessonDate,
      startTime,
      now
    ) === "BEFORE_T30"
  );
}


export function isInT30Window(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  return (
    getLessonTimePhase(
      lessonDate,
      startTime,
      now
    ) === "T30_WINDOW"
  );
}


export function hasLessonStarted(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  return (
    getLessonTimePhase(
      lessonDate,
      startTime,
      now
    ) === "LESSON_STARTED"
  );
}


export function isAttendanceLocked(
  lessonDate: string,
  now: Date = new Date()
): boolean {
  return (
    getLessonTimePhase(
      lessonDate,
      "00:00",
      now
    ) === "LOCKED"
  );
}


// ======================================================
// Roll Call
//
// Roll Call is only enabled once the lesson has started.
// ======================================================

export function isRollCallEnabled(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const phase = getLessonTimePhase(
    lessonDate,
    startTime,
    now
  );

  return (
    phase === "LESSON_STARTED"
  );
}


// ======================================================
// Leave
//
// Leave can be synchronized before the lesson starts.
// Once the lesson starts, Leave is considered closed.
// ======================================================

export function isLeaveOpen(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const phase = getLessonTimePhase(
    lessonDate,
    startTime,
    now
  );

  return (
    phase === "BEFORE_T30" ||
    phase === "T30_WINDOW"
  );
}


// ======================================================
// Automatic reconciliation
//
// Automatic attendance reconciliation is allowed:
// - during T-30 window
// - at lesson start
//
// It stops after lesson start.
// ======================================================

export function isAutoReconciliationAllowed(
  lessonDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const phase = getLessonTimePhase(
    lessonDate,
    startTime,
    now
  );

  return (
    phase === "T30_WINDOW" ||
    phase === "LESSON_STARTED"
  );
}