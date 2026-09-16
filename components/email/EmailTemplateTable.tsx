"use client";

import { useMemo, useState } from "react";

interface EmailTemplateTableProps {
  templates: any[];
  onEdit: (template: any) => void;
}

type SortKey =
  | "template_name"
  | "business_event"
  | "status"
  | "subject"
  | "updated_at";

type SortDirection = "asc" | "desc";

export default function EmailTemplateTable({
  templates,
  onEdit,
}: EmailTemplateTableProps) {
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

  const sortedTemplates = useMemo(() => {
    if (!sortKey) {
      return templates;
    }

    return [...templates].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      switch (sortKey) {
        case "template_name":
          valueA = a.template_name ?? "";
          valueB = b.template_name ?? "";
          break;

        case "business_event":
          valueA = a.business_event ?? "";
          valueB = b.business_event ?? "";
          break;

        case "status":
          valueA = a.status ?? "";
          valueB = b.status ?? "";
          break;

        case "subject":
          valueA = a.subject ?? "";
          valueB = b.subject ?? "";
          break;

        case "updated_at":
          valueA = a.updated_at ?? "";
          valueB = b.updated_at ?? "";
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
  }, [templates, sortKey, sortDirection]);

  function formatUpdatedAt(value: string | null | undefined) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Brisbane",
    }).format(date);
  }

  function SortHeader({
    label,
    sortValue,
    className = "",
  }: {
    label: string;
    sortValue: SortKey;
    className?: string;
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
          ${className}
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
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
            EMAIL TEMPLATE LIST
          </p>
        </div>

        <span className="text-sm text-[#C8D2DF]/70">
          {templates.length} templates
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
                <th className="w-[22%] px-4 py-3">
                  <SortHeader
                    label="Template Name"
                    sortValue="template_name"
                  />
                </th>

                <th className="w-[18%] px-4 py-3">
                  <SortHeader
                    label="Business Event"
                    sortValue="business_event"
                  />
                </th>

                <th className="w-[11%] px-4 py-3 text-left">
                  <SortHeader
                    label="Status"
                    sortValue="status"
                  />
                </th>

                <th className="w-[25%] px-4 py-3">
                  <SortHeader
                    label="Subject"
                    sortValue="subject"
                  />
                </th>

                <th className="w-[14%] px-4 py-3">
                  <SortHeader
                    label="Updated"
                    sortValue="updated_at"
                  />
                </th>

                <th className="w-[10%] px-3 py-3 text-right">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Action
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedTemplates.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#C8D2DF]"
                  >
                    No email templates found.
                  </td>
                </tr>
              ) : (
                sortedTemplates.map((template, index) => {
                  const isInactive =
                    template.status === "Inactive";

                  return (
                    <tr
                      key={template.id}
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
                      {/* Template Name */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate font-semibold">
                          {template.template_name || "—"}
                        </span>
                      </td>

                      {/* Business Event */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {template.business_event || "—"}
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
                          {template.status || "Active"}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {template.subject || "—"}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-xs text-[#64748B]">
                          {formatUpdatedAt(template.updated_at)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onEdit(template)}
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
        {sortedTemplates.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#C8D2DF]">
            No email templates found.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-t border-[#D4AF37]/15">
            {sortedTemplates.map((template, index) => {
              const isInactive =
                template.status === "Inactive";

              return (
                <div
                  key={template.id}
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
                        {template.template_name || "—"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {template.business_event || "No business event"}
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
                      {template.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="truncate text-xs text-[#64748B]">
                      {template.subject || "No subject"}
                    </p>

                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      Updated:{" "}
                      {formatUpdatedAt(template.updated_at)}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(template)}
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