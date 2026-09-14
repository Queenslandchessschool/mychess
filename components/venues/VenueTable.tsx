"use client";

import { useMemo, useState } from "react";

interface VenueTableProps {
  venues: any[];
  onEdit: (venue: any) => void;
  onToggleStatus: (venue: any) => void;
}

type SortKey =
  | "campus_code"
  | "campus_name"
  | "short_name"
  | "address"
  | "type";

type SortDirection = "asc" | "desc";

export default function VenueTable({
  venues,
  onEdit,
  onToggleStatus,
}: VenueTableProps) {
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

  const sortedVenues = useMemo(() => {
    if (!sortKey) {
      return venues;
    }

    return [...venues].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      switch (sortKey) {
        case "campus_code":
          valueA = a.campus_code ?? "";
          valueB = b.campus_code ?? "";
          break;

        case "campus_name":
          valueA = a.campus_name ?? "";
          valueB = b.campus_name ?? "";
          break;

        case "short_name":
          valueA = a.short_name ?? "";
          valueB = b.short_name ?? "";
          break;

        case "address":
          valueA = a.address ?? "";
          valueB = b.address ?? "";
          break;

        case "type":
          valueA = a.type ?? "";
          valueB = b.type ?? "";
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
  }, [venues, sortKey, sortDirection]);

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
          VENUE LIST
        </p>

        <span className="text-sm text-[#C8D2DF]/70">
          {venues.length} venues
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
                <th className="w-[9%] px-3 py-3 text-left">
                  <SortHeader
                    label="Code"
                    sortValue="campus_code"
                  />
                </th>

                <th className="w-[18%] px-3 py-3 text-left">
                  <SortHeader
                    label="Campus Name"
                    sortValue="campus_name"
                  />
                </th>

                <th className="w-[11%] px-3 py-3 text-left">
                  <SortHeader
                    label="Short Name"
                    sortValue="short_name"
                  />
                </th>

                <th className="w-[19%] px-3 py-3 text-left">
                  <SortHeader
                    label="Address"
                    sortValue="address"
                  />
                </th>

                <th className="w-[14%] px-3 py-3 text-left">
                  <SortHeader
                    label="Type"
                    sortValue="type"
                  />
                </th>

                <th className="w-[9%] px-3 py-3 text-left">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Status
                  </span>
                </th>

                <th className="w-[20%] px-3 py-3 text-right">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedVenues.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#C8D2DF]"
                  >
                    No venues found.
                  </td>
                </tr>
              ) : (
                sortedVenues.map((venue, index) => {
                  const isInactive =
                    venue.status === "Inactive";

                  return (
                    <tr
                      key={venue.id}
                      className={`
                        border-b
                        border-[#0D2444]/15
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
                      {/* Campus Code */}
                      <td className="px-3 py-3.5">
                        <span className="block truncate font-semibold">
                          {venue.campus_code || "—"}
                        </span>
                      </td>

                      {/* Campus Name */}
                      <td className="px-3 py-3.5">
                        <span className="block truncate font-semibold">
                          {venue.campus_name || "—"}
                        </span>
                      </td>

                      {/* Short Name */}
                      <td className="px-3 py-3.5">
                        <span className="block truncate">
                          {venue.short_name || "—"}
                        </span>
                      </td>

                      {/* Address */}
                      <td className="px-3 py-3.5">
                        <span className="block truncate">
                          {venue.address || "—"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3.5">
                        <span className="block truncate">
                          {venue.type || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
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
                          {venue.status || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2.5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onEdit(venue)}
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
                              onToggleStatus(venue)
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
        {sortedVenues.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#C8D2DF]">
            No venues found.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-t border-[#D4AF37]/15">
            {sortedVenues.map((venue, index) => {
              const isInactive =
                venue.status === "Inactive";

              return (
                <div
                  key={venue.id}
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
                        {venue.campus_name ||
                          "No campus name"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {venue.campus_code ||
                          "No campus code"}
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
                      {venue.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[#64748B]">
                    <p className="truncate">
                      {venue.short_name ||
                        "No short name"}
                    </p>

                    <p className="truncate">
                      {venue.address || "No address"}
                    </p>

                    <p className="truncate">
                      {venue.type || "No type"}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(venue)}
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
                        onToggleStatus(venue)
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