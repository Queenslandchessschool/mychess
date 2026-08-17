"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigationGroups = [
  {
    label: null,
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: "⌂",
      },
      {
        label: "Registration",
        href: "/admin/students/new",
        icon: "✚",
      },
      {
        label: "Attendance",
        href: "/admin/attendance",
        icon: "◴",
      },
      {
        label: "Lesson",
        href: "/admin/lesson",
        icon: "♟",
      },
    ],
  },

  {
    label: "Master Data",
    items: [
      {
        label: "Students",
        href: "/admin/students",
        icon: "♙",
      },
      {
        label: "Parents",
        href: "/admin/parents",
        icon: "♕",
      },
      {
        label: "Coaches",
        href: "/admin/coaches",
        icon: "♞",
      },
      {
        label: "Venues",
        href: "/admin/venues",
        icon: "⌂",
      },
    ],
  },

  {
    label: "Planning",
    items: [
      {
        label: "Classes",
        href: "/admin/classes",
        icon: "♜",
      },
      {
        label: "Class Schedule",
        href: "/admin/class-schedule",
        icon: "▦",
      },
      {
        label: "Calendar",
        href: "/admin/academic-calendar",
        icon: "◷",
      },
    ],
  },

  {
    label: "Operations",
    items: [
      {
        label: "Leave",
        href: "/admin/leave",
        icon: "◴",
      },
      {
        label: "Make-up",
        href: "/admin/makeup",
        icon: "↻",
      },
      {
        label: "Re-enrolment",
        href: "/admin/reenrolment",
        icon: "↺",
      },
      {
        label: "Trial Management",
        href: "/admin/trials",
        icon: "★",
      },
    ],
  },

  {
    label: null,
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        icon: "▥",
      },
      {
        label: "Information Hub",
        href: "/admin/info",
        icon: "ⓘ",
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: "⚙",
      },
    ],
  },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const isActive = (href: string) => {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  // Registration must not activate Students
  if (href === "/admin/students") {
    return (
      pathname === "/admin/students" ||
      (pathname.startsWith("/admin/students/") &&
        pathname !== "/admin/students/new")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  };

  const isGroupExpanded = (label: string) => {
    return expandedGroups.includes(label);
  };

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside
        className="
          fixed
          inset-y-0
          left-0
          z-40
          hidden
          w-[248px]
          flex-col
          border-r
          border-[#D4AF37]/15
          bg-[#0D2444]
          text-[#F4F7FB]
          lg:flex
        "
      >
        {/* Brand */}
        <div className="relative px-5 py-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3"
          >
            <span className="text-2xl leading-none text-[#D4AF37]">
              ♟
            </span>

            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-[#D4AF37]">
                MyCHESS
              </div>

              <div className="mt-0.5 text-[9px] text-[#C8D2DF]/70">
                Queensland Chess School
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-3">
            {navigationGroups.map((group, groupIndex) => {
              const hasSubmenu = Boolean(group.label);

              if (!hasSubmenu) {
                return (
                  <div key={groupIndex} className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            group relative flex items-center gap-3
                            px-3 py-2
                            text-sm
                            transition-colors duration-200
                            ${
                              active
                                ? "text-[#D4AF37]"
                                : "text-[#C8D2DF] hover:text-[#F4F7FB]"
                            }
                          `}
                        >
                          <span
                            className={`
                              flex h-7 w-7 shrink-0 items-center justify-center
                              text-base
                              ${
                                active
                                  ? "text-[#D4AF37]"
                                  : "text-[#C8D2DF]/80 group-hover:text-[#D4AF37]"
                              }
                            `}
                          >
                            {item.icon}
                          </span>

                          <span className="truncate">
                            {item.label}
                          </span>

                          <span
                            className={`
                              absolute
                              bottom-0
                              left-3
                              right-3
                              h-px
                              origin-left
                              bg-[#D4AF37]
                              transition-transform
                              duration-200
                              ${
                                active
                                  ? "scale-x-100"
                                  : "scale-x-0 group-hover:scale-x-100"
                              }
                            `}
                          />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              const expanded = isGroupExpanded(group.label!);

              return (
                <div key={group.label}>
                  {/* First-level group */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label!)}
                    className="
                      group relative flex w-full items-center justify-between
                      px-3 py-2
                      text-left
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-[0.18em]
                      text-[#D4AF37]/80
                      transition-colors
                      hover:text-[#D4AF37]
                    "
                  >
                    <span>{group.label}</span>

                    <span
                      className={`
                        text-[10px]
                        transition-transform
                        duration-200
                        ${expanded ? "rotate-180" : ""}
                      `}
                    >
                      ▾
                    </span>

                    <span
                      className="
                        absolute
                        bottom-0
                        left-3
                        right-3
                        h-px
                        origin-left
                        scale-x-0
                        bg-[#D4AF37]
                        transition-transform
                        duration-200
                        group-hover:scale-x-100
                      "
                    />
                  </button>

                  {/* Second-level items */}
                  {expanded && (
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`
                              group relative flex items-center gap-3
                              px-3 py-2
                              pl-6
                              text-sm
                              transition-colors duration-200
                              ${
                                active
                                  ? "text-[#D4AF37]"
                                  : "text-[#C8D2DF] hover:text-[#F4F7FB]"
                              }
                            `}
                          >
                            <span
                              className={`
                                flex h-7 w-7 shrink-0 items-center justify-center
                                text-base
                                ${
                                  active
                                    ? "text-[#D4AF37]"
                                    : "text-[#C8D2DF]/80 group-hover:text-[#D4AF37]"
                                }
                              `}
                            >
                              {item.icon}
                            </span>

                            <span className="truncate">
                              {item.label}
                            </span>

                            <span
                              className={`
                                absolute
                                bottom-0
                                left-6
                                right-3
                                h-px
                                origin-left
                                bg-[#D4AF37]
                                transition-transform
                                duration-200
                                ${
                                  active
                                    ? "scale-x-100"
                                    : "scale-x-0 group-hover:scale-x-100"
                                }
                              `}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom User Area */}
        <div className="border-t border-[#D4AF37]/15 p-4">
          <div className="rounded-xl border border-[#D4AF37]/20 bg-[#152D4D] px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/60 text-xs font-semibold text-[#D4AF37]">
                AU
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  Admin User
                </p>

                <p className="truncate text-[10px] text-[#C8D2DF]/70">
                  System Administrator
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[9px] text-[#C8D2DF]/45">
            © 2026 MyCHESS
          </p>
        </div>
      </aside>

      {/* =====================================================
          MOBILE HEADER
      ====================================================== */}

      <header
        className="
          sticky top-0 z-50
          border-b border-[#D4AF37]/20
          bg-[#0D2444]/95
          backdrop-blur
          lg:hidden
        "
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5"
          >
            <span className="text-xl text-[#D4AF37]">
              ♟
            </span>

            <span className="text-sm font-semibold tracking-[0.18em] text-[#D4AF37]">
              MyCHESS
            </span>
          </Link>

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl
              border border-[#D4AF37]/35
              text-[#D4AF37]
              transition-colors
              hover:border-[#D4AF37]/80
              active:border-[#D4AF37]/80
            "
          >
            <span className="text-xl">
              {mobileOpen ? "×" : "☰"}
            </span>
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/45 to-transparent" />
      </header>

      {/* =====================================================
          MOBILE MENU
      ====================================================== */}

      {mobileOpen && (
        <div
          className="
            fixed inset-x-0 top-16 z-40
            max-h-[calc(100vh-4rem)]
            overflow-y-auto
            border-b border-[#D4AF37]/20
            bg-[#0D2444]
            p-3
            shadow-2xl
            lg:hidden
          "
        >
          <nav className="space-y-3">
            {navigationGroups.map((group, groupIndex) => {
              const hasSubmenu = Boolean(group.label);

              if (!hasSubmenu) {
                return (
                  <div key={groupIndex} className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`
                            group relative flex items-center gap-3
                            px-3 py-3
                            text-sm
                            ${
                              active
                                ? "text-[#D4AF37]"
                                : "text-[#C8D2DF] hover:text-[#F4F7FB]"
                            }
                          `}
                        >
                          <span
                            className={`
                              flex h-7 w-7 items-center justify-center
                              ${
                                active
                                  ? "text-[#D4AF37]"
                                  : "text-[#C8D2DF] group-hover:text-[#D4AF37]"
                              }
                            `}
                          >
                            {item.icon}
                          </span>

                          <span>{item.label}</span>

                          <span
                            className={`
                              absolute
                              bottom-0
                              left-3
                              right-3
                              h-px
                              origin-left
                              bg-[#D4AF37]
                              transition-transform
                              duration-200
                              ${
                                active
                                  ? "scale-x-100"
                                  : "scale-x-0 group-hover:scale-x-100"
                              }
                            `}
                          />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              const expanded = isGroupExpanded(group.label!);

              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label!)}
                    className="
                      group relative flex w-full items-center justify-between
                      px-3 py-2
                      text-left
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-[0.18em]
                      text-[#D4AF37]/80
                    "
                  >
                    <span>{group.label}</span>

                    <span
                      className={`
                        text-[10px]
                        transition-transform
                        duration-200
                        ${expanded ? "rotate-180" : ""}
                      `}
                    >
                      ▾
                    </span>

                    <span
                      className="
                        absolute
                        bottom-0
                        left-3
                        right-3
                        h-px
                        origin-left
                        scale-x-0
                        bg-[#D4AF37]
                        transition-transform
                        duration-200
                        group-hover:scale-x-100
                      "
                    />
                  </button>

                  {expanded && (
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`
                              group relative flex items-center gap-3
                              px-3 py-3
                              pl-6
                              text-sm
                              ${
                                active
                                  ? "text-[#D4AF37]"
                                  : "text-[#C8D2DF] hover:text-[#F4F7FB]"
                              }
                            `}
                          >
                            <span
                              className={`
                                flex h-7 w-7 items-center justify-center
                                ${
                                  active
                                    ? "text-[#D4AF37]"
                                    : "text-[#C8D2DF] group-hover:text-[#D4AF37]"
                                }
                              `}
                            >
                              {item.icon}
                            </span>

                            <span>{item.label}</span>

                            <span
                              className={`
                                absolute
                                bottom-0
                                left-6
                                right-3
                                h-px
                                origin-left
                                bg-[#D4AF37]
                                transition-transform
                                duration-200
                                ${
                                  active
                                    ? "scale-x-100"
                                    : "scale-x-0 group-hover:scale-x-100"
                                }
                              `}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}