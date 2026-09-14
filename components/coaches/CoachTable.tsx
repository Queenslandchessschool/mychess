"use client";

import { useMemo, useState } from "react";

interface CoachTableProps {
  coaches: any[];
  onEdit: (coach: any) => void;
  onToggleStatus: (coach: any) => void;
}

type SortKey =
  | "display_name"
  | "title"
  | "mobile"
  | "email"
  | "blue_card_expiry";

type SortDirection = "asc" | "desc";

export default function CoachTable({
  coaches,
  onEdit,
  onToggleStatus,
}: CoachTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function getBlueCardStatus(coach: any) {
    if (!coach.blue_card_expiry) {
      return "";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(
      `${coach.blue_card_expiry}T00:00:00`
    );

    return expiry >= today ? "Active" : "Expired";
  }

  function formatExpiry(date: string | null | undefined) {
    if (!date) {
      return "—";
    }

    const [year, month, day] = date.split("-");

    if (!year || !month || !day) {
      return date;
    }

    return `${day}/${month}/${year}`;
  }

  const sortedCoaches = useMemo(() => {
    if (!sortKey) {
      return coaches;
    }

    return [...coaches].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      switch (sortKey) {
        case "display_name":
          valueA = a.display_name ?? "";
          valueB = b.display_name ?? "";
          break;

        case "title":
          valueA = a.title ?? "";
          valueB = b.title ?? "";
          break;

        case "mobile":
          valueA = a.mobile ?? "";
          valueB = b.mobile ?? "";
          break;

        case "email":
          valueA = a.email ?? "";
          valueB = b.email ?? "";
          break;

        case "blue_card_expiry":
          valueA = a.blue_card_expiry ?? "";
          valueB = b.blue_card_expiry ?? "";
          break;
      }

      const comparison = valueA
        .toString()
        .localeCompare(
          valueB.toString(),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [coaches, sortKey, sortDirection]);

  function SortHeader({
    label,
    sortValue,
  }: {
    label: string;
    sortValue: SortKey;
  }) {
    const isActive = sortKey === sortValue;

    return (
      <button
        type="button"
        onClick={() => handleSort(sortValue)}
        className={`
          inline-flex
          items-center
          gap-1
          text-left
          text-xs
          uppercase
          tracking-wide
          transition-colors
          duration-200
          ${
            isActive
              ? "text-[#D4AF37]"
              : "text-[#C8D2DF]/70 hover:text-[#D4AF37]"
          }
        `}
      >
        <span>{label}</span>

        {isActive && (
          <span className="text-[11px]">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#D4AF37]/45 bg-[#102B4D]">
      {/* Gold gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

      {/* List Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          COACH LIST
        </p>

        <span className="text-sm text-[#C8D2DF]/70">
          {coaches.length} coaches
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div
  className="
    max-h-[calc(100vh-260px)]
    overflow-y-auto
    overflow-x-hidden
    border-t border-[#D4AF37]/15
  "
>
  <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-[#102B4D]">
              <tr className="border-b border-[#D4AF37]/15">
                <th className="w-[16%] px-4 py-3">
                  <SortHeader
                    label="Display Name"
                    sortValue="display_name"
                  />
                </th>

                <th className="w-[9%] px-4 py-3">
                  <SortHeader
                    label="Title"
                    sortValue="title"
                  />
                </th>

                <th className="w-[12%] px-4 py-3">
                  <SortHeader
                    label="Mobile"
                    sortValue="mobile"
                  />
                </th>

                <th className="w-[16%] px-4 py-3">
                  <SortHeader
                    label="Email"
                    sortValue="email"
                  />
                </th>

                <th className="w-[10%] px-4 py-3 text-left">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Blue Card
                  </span>
                </th>

                <th className="w-[10%] px-4 py-3">
                  <SortHeader
                    label="Expiry"
                    sortValue="blue_card_expiry"
                  />
                </th>

                <th className="w-[8%] px-4 py-3 text-left">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Status
                  </span>
                </th>

                <th className="w-[19%] px-3 py-3 text-right">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedCoaches.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[#C8D2DF]"
                  >
                    No coaches found.
                  </td>
                </tr>
              ) : (
                sortedCoaches.map((coach, index) => {
                  const isInactive =
                    coach.status === "Inactive";

                  const blueCardStatus =
                    getBlueCardStatus(coach);

                  return (
                    <tr
                      key={coach.id}
                      className={`
                        border-b border-[#0D2444]/15
                        text-sm
                        text-[#10213A]
                        transition-colors
                        duration-200
                        ${
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-[#F8F5ED]"
                        }
                      `}
                    >
                      {/* Display Name */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate font-semibold">
                          {coach.display_name || "—"}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {coach.title || "—"}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {coach.mobile || "—"}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {coach.email || "—"}
                        </span>
                      </td>

                      {/* Blue Card */}
                      <td className="px-4 py-3.5">
                        {blueCardStatus ? (
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              px-2.5
                              py-1
                              text-xs
                              font-semibold
                              ${
                                blueCardStatus === "Expired"
                                  ? "bg-[#F1F3F5] text-[#64748B]"
                                  : "bg-[#EEF7EF] text-[#39734A]"
                              }
                            `}
                          >
                            {blueCardStatus}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {formatExpiry(
                            coach.blue_card_expiry
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-2.5
                            py-1
                            text-xs
                            font-semibold
                            ${
                              isInactive
                                ? "bg-[#F1F3F5] text-[#64748B]"
                                : "bg-[#EEF7EF] text-[#39734A]"
                            }
                          `}
                        >
                          {coach.status || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(coach)}
                            className="
                              shrink-0
                              rounded-lg
                              border
                              border-[#0D2444]/20
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-[#10213A]
                              transition-colors
                              duration-200
                              hover:border-[#D4AF37]
                              hover:text-[#8A6900]
                              active:border-[#D4AF37]
                            "
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onToggleStatus(coach)
                            }
                            className="
                              shrink-0
                              rounded-lg
                              border
                              border-[#0D2444]/15
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-[#64748B]
                              transition-colors
                              duration-200
                              hover:border-[#D4AF37]
                              hover:text-[#8A6900]
                              active:border-[#D4AF37]
                            "
                          >
                            {isInactive
                              ? "Activate"
                              : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List */}
      <div className="md:hidden">
        {sortedCoaches.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#C8D2DF]">
            No coaches found.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-t border-[#D4AF37]/15">
            {sortedCoaches.map((coach, index) => {
              const isInactive =
                coach.status === "Inactive";

              const blueCardStatus =
                getBlueCardStatus(coach);

              return (
                <div
                  key={coach.id}
                  className={`
                    border-b
                    border-[#0D2444]/10
                    px-4
                    py-4
                    ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#F8F5ED]"
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#10213A]">
                        {coach.display_name ||
                          "No display name"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {coach.title || "No title"}
                      </p>
                    </div>

                    <span
                      className={`
                        shrink-0
                        rounded-full
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        ${
                          isInactive
                            ? "bg-[#F1F3F5] text-[#64748B]"
                            : "bg-[#EEF7EF] text-[#39734A]"
                        }
                      `}
                    >
                      {coach.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[#64748B]">
                    <p className="truncate">
                      {coach.mobile || "No mobile"}
                    </p>

                    <p className="truncate">
                      {coach.email || "No email"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span
                      className={`
                        font-semibold
                        ${
                          blueCardStatus === "Expired"
                            ? "text-[#64748B]"
                            : blueCardStatus === "Active"
                            ? "text-[#39734A]"
                            : "text-[#94A3B8]"
                        }
                      `}
                    >
                      Blue Card: {blueCardStatus || "—"}
                    </span>

                    <span className="text-[#64748B]">
                      Expiry:{" "}
                      {formatExpiry(
                        coach.blue_card_expiry
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(coach)}
                      className="
                        flex-1
                        rounded-lg
                        border
                        border-[#0D2444]/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#10213A]
                        transition-colors
                        duration-200
                        hover:border-[#D4AF37]
                        hover:text-[#8A6900]
                        active:border-[#D4AF37]
                      "
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggleStatus(coach)
                      }
                      className="
                        flex-1
                        rounded-lg
                        border
                        border-[#0D2444]/15
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#64748B]
                        transition-colors
                        duration-200
                        hover:border-[#D4AF37]
                        hover:text-[#8A6900]
                        active:border-[#D4AF37]
                      "
                    >
                      {isInactive
                        ? "Activate"
                        : "Deactivate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}