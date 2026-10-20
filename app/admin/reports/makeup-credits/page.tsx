
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CreditRecord = {
  id: string;
  student_id: string;
  credits: number | null;
  status: string | null;
  reason: string | null;
  created_at: string | null;
  used_at: string | null;
  leave_record_id: string | null;
  attendance_id: string | null;
  students:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
};

type FilterStatus = "All" | "Available" | "Booked" | "Used" | "Issues";

const PAGE_SIZE = 1000;

export default function CreditReportPage() {
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const allRows: CreditRecord[] = [];
      let start = 0;

      while (true) {
        const { data, error: queryError } = await supabase
          .from("makeup_credits")
          .select(`
            id,
            student_id,
            credits,
            status,
            reason,
            created_at,
            used_at,
            leave_record_id,
            attendance_id,
            students:student_id(first_name,last_name)
          `)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(start, start + PAGE_SIZE - 1);

        if (queryError) throw queryError;

        const batch = (data ?? []) as unknown as CreditRecord[];
        allRows.push(...batch);

        if (batch.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
      }

      setRecords(allRows);
    } catch (err) {
      console.error("Credit report load failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Credit Report."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport, refreshKey]);

  const getStudentName = (record: CreditRecord) => {
    const student = Array.isArray(record.students)
      ? record.students[0]
      : record.students;

    return [student?.first_name, student?.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown Student";
  };

  const stats = useMemo(() => {
    const available = records.filter(
      (r) => r.status === "Available"
    );
    const booked = records.filter((r) => r.status === "Booked");
    const used = records.filter((r) => r.status === "Used");

    const nonPositive = records.filter(
      (r) => Number(r.credits ?? 0) <= 0
    );

    const missingSource = records.filter(
      (r) => !r.leave_record_id && !r.attendance_id
    );

    const unknownStatus = records.filter(
      (r) => !["Available", "Booked", "Used"].includes(r.status ?? "")
    );

    const usableAvailable = available.reduce(
      (sum, r) => sum + Math.max(0, Number(r.credits ?? 0)),
      0
    );

    const usableBooked = booked.reduce(
      (sum, r) => sum + Math.max(0, Number(r.credits ?? 0)),
      0
    );

    const usableUsed = used.reduce(
      (sum, r) => sum + Math.max(0, Number(r.credits ?? 0)),
      0
    );

    return {
      totalRecords: records.length,
      availableRecords: available.length,
      bookedRecords: booked.length,
      usedRecords: used.length,
      usableAvailable,
      usableBooked,
      usableUsed,
      nonPositive: nonPositive.length,
      missingSource: missingSource.length,
      unknownStatus: unknownStatus.length,
    };
  }, [records]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const isIssue =
        Number(record.credits ?? 0) <= 0 ||
        !record.leave_record_id && !record.attendance_id ||
        !["Available", "Booked", "Used"].includes(record.status ?? "");

      const matchesFilter =
        filter === "All" ||
        (filter === "Issues" && isIssue) ||
        record.status === filter;

      const studentName = getStudentName(record);

      const matchesSearch =
        !term ||
        studentName.toLowerCase().includes(term) ||
        record.student_id.toLowerCase().includes(term) ||
        (record.reason ?? "").toLowerCase().includes(term) ||
        record.id.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [records, filter, search]);

  function exportCsv() {
    const headers = [
      "Student",
      "Student ID",
      "Credit ID",
      "Credits",
      "Status",
      "Reason",
      "Created At",
      "Used At",
      "Leave Record ID",
      "Attendance ID",
    ];

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const lines = [
      headers.map(escapeCsv).join(","),
      ...filtered.map((r) =>
        [
          getStudentName(r),
          r.student_id,
          r.id,
          r.credits,
          r.status,
          r.reason,
          r.created_at,
          r.used_at,
          r.leave_record_id,
          r.attendance_id,
        ].map(escapeCsv).join(",")
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + lines.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mychess-credit-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const cardClass =
    "relative overflow-hidden rounded-[18px] border border-[#D4AF37]/40 bg-[#152D4D] p-5 sm:p-6";

  const goldLine =
    "absolute left-0 top-0 h-[3px] w-[58%] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/70 to-transparent";

  const numberClass = "mt-2 text-3xl font-bold tracking-tight text-[#F4F7FB]";

  const filters: FilterStatus[] = [
    "All",
    "Available",
    "Booked",
    "Used",
    "Issues",
  ];

  return (
    <main className="min-h-screen text-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              MyCHESS · ADMIN REPORTS
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Credit Management Report
            </h1>
            <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
              Overview, student credit records and data checks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRefreshKey((v) => v + 1)}
              disabled={loading}
              className="min-h-[42px] rounded-xl border border-[#D4AF37]/60 px-4 py-2 text-sm font-semibold text-[#F4F7FB] hover:bg-[#D4AF37]/10 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={exportCsv}
              disabled={loading || filtered.length === 0}
              className="min-h-[42px] rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#10213A] hover:bg-[#F4D35E] disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <section className="mb-6 rounded-xl border border-red-400/50 bg-red-950/30 p-4">
            <h2 className="font-semibold text-red-200">
              Unable to load report
            </h2>
            <p className="mt-1 break-words text-sm text-red-100">{error}</p>
            <p className="mt-2 text-xs text-red-100/80">
              Check the browser console and Supabase permissions.
            </p>
          </section>
        )}

        <section className="mb-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Credit Overview</h2>
            <span className="text-xs text-[#C8D2DF]">
              {loading ? "Updating data..." : `${stats.totalRecords} records`}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Available Credits"
              subtitle={`${stats.availableRecords} records`}
              value={stats.usableAvailable}
              line={goldLine}
              cardClass={cardClass}
              numberClass={numberClass}
            />
            <SummaryCard
              title="Booked Credits"
              subtitle={`${stats.bookedRecords} records`}
              value={stats.usableBooked}
              line={goldLine}
              cardClass={cardClass}
              numberClass={numberClass}
            />
            <SummaryCard
              title="Used Credits"
              subtitle={`${stats.usedRecords} records`}
              value={stats.usableUsed}
              line={goldLine}
              cardClass={cardClass}
              numberClass={numberClass}
            />
            <SummaryCard
              title="All Credit Records"
              subtitle="Database record count"
              value={stats.totalRecords}
              line={goldLine}
              cardClass={cardClass}
              numberClass={numberClass}
            />
          </div>
        </section>

        <section className="mb-7">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Data Checks</h2>
            <p className="mt-1 text-sm text-[#C8D2DF]">
              Review these records before making corrections. Missing source
              links are a review flag, not automatic proof of an error.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <IssueCard
              title="Zero / Negative Credits"
              value={stats.nonPositive}
              detail="Records with credits less than or equal to zero"
              line={goldLine}
              cardClass={cardClass}
            />
            <IssueCard
              title="No Leave / Attendance Link"
              value={stats.missingSource}
              detail="May include legitimate manual adjustments"
              line={goldLine}
              cardClass={cardClass}
            />
            <IssueCard
              title="Unknown Status"
              value={stats.unknownStatus}
              detail="Statuses outside Available, Booked and Used"
              line={goldLine}
              cardClass={cardClass}
            />
          </div>
        </section>

        <section className={cardClass}>
          <div className={goldLine} />
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
                CREDIT REGISTER
              </p>
              <h2 className="mt-1 text-xl font-bold">Credit Details</h2>
              <p className="mt-1 text-sm text-[#C8D2DF]">
                Search students, review records and export the filtered list.
              </p>
            </div>
            <span className="text-sm text-[#C8D2DF]">
              {filtered.length} shown
            </span>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, student ID, reason or credit ID..."
              className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0D2444] px-4 text-sm text-white outline-none placeholder:text-[#9EADBF] focus:border-[#D4AF37]"
            />

            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    filter === item
                      ? "border-[#D4AF37] bg-[#D4AF37] text-[#10213A]"
                      : "border-white/15 text-[#C8D2DF] hover:border-[#D4AF37]/70"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-[#C8D2DF]">
              Loading credit records...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-[#C8D2DF]">
              Records are unavailable until the query succeeds.
            </div>
                    ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#C8D2DF]">
              No matching credit records.
            </div>
          ) : (
            <>
              {/* Mobile: credit record cards */}
<div className="grid gap-3 md:hidden">
  {filtered.map((record) => {
    const issues: string[] = [];

    if (Number(record.credits ?? 0) <= 0) {
      issues.push("Non-positive");
    }

    if (!record.leave_record_id && !record.attendance_id) {
      issues.push("No source link");
    }

    if (!["Available", "Booked", "Used"].includes(record.status ?? "")) {
      issues.push("Unknown status");
    }

    const statusClass =
      record.status === "Available"
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
        : record.status === "Booked"
          ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
          : record.status === "Used"
            ? "border-slate-300/30 bg-slate-300/10 text-slate-200"
            : "border-red-300/40 bg-red-300/10 text-red-200";

    return (
      <article
        key={record.id}
        className="relative overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-[#102744] p-4"
      >
        <div className="absolute left-0 top-0 h-[2px] w-2/5 bg-gradient-to-r from-[#D4AF37] to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-base font-semibold text-[#F4F7FB]">
            {getStudentName(record)}
          </h3>

          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass}`}
          >
            {record.status || "Unknown"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#0D2444] px-3 py-2">
          <span className="text-sm text-[#C8D2DF]">Credits</span>
          <span className="text-xl font-bold text-[#D4AF37]">
            {record.credits ?? 0}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
              Reason
            </dt>
            <dd className="mt-1 break-words text-[#C8D2DF]">
              {record.reason || "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
              Source
            </dt>
            <dd className="mt-1 text-[#C8D2DF]">
              {record.leave_record_id && record.attendance_id
                ? "Leave and Attendance linked"
                : record.leave_record_id
                  ? "Leave linked"
                  : record.attendance_id
                    ? "Attendance linked"
                    : "Manual / unlinked"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
              Created
            </dt>
            <dd className="mt-1 text-[#C8D2DF]">
              {record.created_at
                ? new Date(record.created_at).toLocaleString("en-AU", {
                    timeZone: "Australia/Brisbane",
                  })
                : "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
              Used
            </dt>
            <dd className="mt-1 text-[#C8D2DF]">
              {record.used_at
                ? new Date(record.used_at).toLocaleString("en-AU", {
                    timeZone: "Australia/Brisbane",
                  })
                : "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
              Audit
            </dt>
            <dd className="mt-1 break-words">
              {issues.length === 0 ? (
                <span className="text-[#9EADBF]">No flags</span>
              ) : (
                <span className="text-amber-200">
                  {issues.join(", ")}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </article>
    );
  })}
</div>

{/* Desktop: preserve the full credit table */}
<div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">

              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-[#0D2444] text-xs uppercase tracking-wide text-[#D4AF37]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Used</th>
                    <th className="px-4 py-3">Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record, index) => {
                    const issues: string[] = [];
                    if (Number(record.credits ?? 0) <= 0) {
                      issues.push("Non-positive");
                    }
                    if (!record.leave_record_id && !record.attendance_id) {
                      issues.push("No source link");
                    }
                    if (!["Available", "Booked", "Used"].includes(record.status ?? "")) {
                      issues.push("Unknown status");
                    }

                    const statusClass =
                      record.status === "Available"
                        ? "border-emerald-400/40 text-emerald-200"
                        : record.status === "Booked"
                          ? "border-amber-300/40 text-amber-200"
                          : record.status === "Used"
                            ? "border-slate-300/30 text-slate-200"
                            : "border-red-300/40 text-red-200";

                    return (
                      <tr
                        key={record.id}
                        className={
                          index % 2 === 0
                            ? "bg-[#152D4D]"
                            : "bg-[#102744]"
                        }
                      >
                        <td className="px-4 py-3">
  <div className="font-semibold">
    {getStudentName(record)}
  </div>
</td>
                        <td className="px-4 py-3 font-semibold">
                          {record.credits ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass}`}>
                            {record.status || "Unknown"}
                          </span>
                        </td>
                        <td className="max-w-[240px] px-4 py-3 text-[#C8D2DF]">
                          <div className="break-words">
                            {record.reason || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#C8D2DF]">
                          {record.leave_record_id && <div>Leave linked</div>}
                          {record.attendance_id && <div>Attendance linked</div>}
                          {!record.leave_record_id && !record.attendance_id && (
                            <div>Manual / unlinked</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#C8D2DF]">
                          {record.created_at
                            ? new Date(record.created_at).toLocaleString("en-AU", {
                                timeZone: "Australia/Brisbane",
                              })
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#C8D2DF]">
                          {record.used_at
                            ? new Date(record.used_at).toLocaleString("en-AU", {
                                timeZone: "Australia/Brisbane",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {issues.length === 0 ? (
                            <span className="text-[#9EADBF]">No flags</span>
                          ) : (
                            <span className="text-amber-200">
                              {issues.join(", ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}

          <p className="mt-4 text-xs leading-5 text-[#9EADBF]">
            Available, Booked and Used totals count positive credit quantities.
            Audit flags identify records for review; they do not automatically
            classify a record as invalid. This report is read-only and does not
            calculate term eligibility or historical payment redemption.
          </p>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  subtitle,
  value,
  line,
  cardClass,
  numberClass,
}: {
  title: string;
  subtitle: string;
  value: number;
  line: string;
  cardClass: string;
  numberClass: string;
}) {
  return (
    <div className={cardClass}>
      <div className={line} />
      <p className="text-sm font-semibold text-[#D4AF37]">{title}</p>
      <p className={numberClass}>{value.toLocaleString("en-AU")}</p>
      <p className="mt-2 text-xs text-[#C8D2DF]">{subtitle}</p>
    </div>
  );
}

function IssueCard({
  title,
  value,
  detail,
  line,
  cardClass,
}: {
  title: string;
  value: number;
  detail: string;
  line: string;
  cardClass: string;
}) {
  return (
    <div className={cardClass}>
      <div className={line} />
      <p className="text-sm font-semibold text-[#C8D2DF]">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[#F4F7FB]">
        {value.toLocaleString("en-AU")}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#9EADBF]">{detail}</p>
    </div>
  );
}
