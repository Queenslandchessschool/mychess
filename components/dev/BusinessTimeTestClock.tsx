"use client";

import { useEffect, useState } from "react";
import {
  BUSINESS_TIMEZONE,
  clearTestClock,
  getBusinessTime,
  getTestClockValue,
  isTestClockEnabled,
  setTestClock,
} from "@/lib/businessTime";

/**
 * MyCHESS Global Business Time — UAT control.
 *
 * Uses the existing lib/businessTime.ts API exactly.
 *
 * This is one shared clock. Re-enrolment, Attendance and other
 * client-side business-time consumers read the same localStorage state.
 * It is development-only and never changes database data or schedules.
 */
export default function BusinessTimeTestClock() {
  const [enabled, setEnabled] = useState(false);
  const [value, setValue] = useState("");
  const [tick, setTick] = useState(0);

  const getLiveBrisbaneDateTimeLocalValue = () => {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  };

  const getBusinessTimeTimestamp = () => {
    const now = getBusinessTime();

    // Brisbane is UTC+10 with no DST.
    return Date.UTC(
      Number(now.dateKey.slice(0, 4)),
      Number(now.dateKey.slice(5, 7)) - 1,
      Number(now.dateKey.slice(8, 10)),
      now.hour - 10,
      now.minute,
      now.second
    );
  };

  const refresh = () => {
    const nextEnabled = isTestClockEnabled();
    const nextValue = getTestClockValue();

    setEnabled(nextEnabled);
    setValue(
      nextValue || getLiveBrisbaneDateTimeLocalValue()
    );
    setTick(getBusinessTimeTimestamp());
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    refresh();

    const interval = window.setInterval(() => {
      setTick(getBusinessTimeTimestamp());
    }, 1000);

    // Keep separate browser tabs/windows in sync.
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "mychess_test_clock_enabled" ||
        event.key === "mychess_test_clock_value"
      ) {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  const handleToggle = () => {
    if (enabled) {
      clearTestClock();
      setEnabled(false);
      setValue(getLiveBrisbaneDateTimeLocalValue());
      setTick(Date.now());
      return;
    }

    const nextValue =
      value || getLiveBrisbaneDateTimeLocalValue();

    setTestClock(nextValue);
    setEnabled(true);
    setValue(nextValue);
    setTick(getBusinessTimeTimestamp());
  };

  const handleValueChange = (nextValue: string) => {
    setValue(nextValue);

    if (enabled && nextValue) {
      setTestClock(nextValue);
      setTick(getBusinessTimeTimestamp());
    }
  };

  const handleReset = () => {
    clearTestClock();

    const liveValue = getLiveBrisbaneDateTimeLocalValue();

    setEnabled(false);
    setValue(liveValue);
    setTick(Date.now());
  };

  const displayedTime = new Intl.DateTimeFormat("en-AU", {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(new Date(tick || Date.now()));

  return (
    <div className="fixed bottom-4 right-4 z-[99999] w-[min(520px,calc(100vw-2rem))] rounded-xl border border-amber-300/30 bg-[#071B36] p-4 text-xs text-amber-50 shadow-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold uppercase tracking-[0.14em] text-amber-200">
          🧪 Global Business Time
        </span>

        <button
          type="button"
          onClick={handleToggle}
          className={`rounded-lg border border-amber-200/40 px-3 py-2 font-semibold ${
            enabled
              ? "bg-amber-200 text-[#10213A]"
              : "text-amber-100 hover:bg-amber-100/10"
          }`}
        >
          {enabled ? "TEST ON" : "TEST OFF"}
        </button>

        <label className="text-amber-100/90">
          Simulate Brisbane time
        </label>

        <input
          type="datetime-local"
          value={value}
          onChange={(event) =>
            handleValueChange(event.target.value)
          }
          disabled={!enabled}
          className="rounded-lg border border-amber-200/40 bg-white px-3 py-2 text-xs text-[#10213A] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-amber-200/40 px-3 py-2 font-semibold text-amber-100 hover:bg-amber-100/10"
        >
          Use Live Time
        </button>
      </div>

      <div className="mt-2 text-amber-100/80">
        Current Business Time:{" "}
        <span className="font-semibold">{displayedTime}</span>
        {enabled ? " · TEST MODE" : " · LIVE"}
      </div>

      <p className="mt-1 text-amber-100/70">
        Shared UAT clock · {BUSINESS_TIMEZONE}. This controls
        business-time calculations only; it does not change the
        database or Class Schedule.
      </p>
    </div>
  );
}
