"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Child = {
  student_id: string;
  student_name: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  lesson_id: string;
  lesson_date: string;
  campus: string;
  level: string;
  start_time: string;
  end_time: string;
  attendance_status: string;
  attendance_type: string;
};

const INITIAL_LESSONS = 10;
const LOAD_MORE_COUNT = 10;

export default function ParentAttendancePage() {
  // ======================================================
  // States
  // ======================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ======================================================
  // Family children
  // ======================================================

  const [children, setChildren] = useState<Child[]>([]);

  // ======================================================
  // Parent Attendance Records
  // ======================================================

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  // ======================================================
  // Visible lesson count per child
  //
  // Each child is independent.
  // Initial = 10 lessons.
  // Load more = +10 lessons.
  // ======================================================

  const [visibleCounts, setVisibleCounts] = useState<
    Record<string, number>
  >({});

  // ======================================================
  // Initial load
  // ======================================================

  useEffect(() => {
    async function loadParentAttendance() {
      try {
        setLoading(true);
        setError(null);

        // --------------------------------------------------
        // Resolve authenticated Parent
        // --------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user?.email) {
          throw new Error(
            "Your account does not have an email address."
          );
        }

        const email = user.email.trim().toLowerCase();

        // --------------------------------------------------
        // Resolve Family
        //
        // Same Family Scope architecture as MyFAMILY.
        // --------------------------------------------------

        const {
          data: parentRecords,
          error: parentError,
        } = await supabase
          .from("parents")
          .select("family_id, student_id")
          .eq("email", email);

        if (parentError) {
          throw parentError;
        }

        if (!parentRecords || parentRecords.length === 0) {
          throw new Error(
            "No family record was found for this account."
          );
        }

        const resolvedFamilyId =
          parentRecords.find(
            (row) => row.family_id
          )?.family_id ?? null;

        if (!resolvedFamilyId) {
          throw new Error(
            "Your Parent record does not have a Family ID."
          );
        }

        // --------------------------------------------------
        // Resolve Family Children
        // --------------------------------------------------

        const studentIds = Array.from(
          new Set(
            parentRecords
              .map((record) => record.student_id)
              .filter(Boolean)
          )
        );

        if (studentIds.length === 0) {
          setChildren([]);
          setAttendanceRecords([]);
          return;
        }

        const {
          data: studentRecords,
          error: studentError,
        } = await supabase
          .from("students")
          .select(`
            id,
            first_name,
            last_name,
            preferred_name
          `)
          .in("id", studentIds);

        if (studentError) {
          throw studentError;
        }

        const resolvedChildren =
          (studentRecords ?? []).map((student) => ({
            student_id: student.id,
            student_name:
              student.preferred_name?.trim() ||
              `${student.first_name ?? ""} ${
                student.last_name ?? ""
              }`.trim(),
          }));

        setChildren(resolvedChildren);

        // --------------------------------------------------
        // Resolve Past Attendance Records
        // --------------------------------------------------

        const {
          data: attendanceData,
          error: attendanceError,
        } = await supabase
          .from("attendance")
          .select(`
            id,
            student_id,
            lesson_id,
            attendance_status,
            attendance_type,
            lessons:lesson_id (
              lesson_date,
              academic_year,
              term,
              status,
              classes:class_id (
                level,
                start_time,
                end_time,
                campuses:campus_id (
                  campus_name
                )
              )
            )
          `)
          .in("student_id", studentIds);

        if (attendanceError) {
          throw attendanceError;
        }

        console.log(
          "PARENT ATTENDANCE DATA:",
          attendanceData
        );

        console.log(
          "PARENT ATTENDANCE ERROR:",
          attendanceError
        );

        // --------------------------------------------------
        // Resolve completed / past lessons
        //
        // Keep the existing attendance business logic.
        // --------------------------------------------------

        const resolvedAttendance =
          (attendanceData ?? [])
            .filter(
              (record: any) =>
                record.lessons?.lesson_date &&
                record.lessons.lesson_date <
                  new Date().toLocaleDateString("en-CA")
            )
            .filter(
              (record: any) =>
                record.lessons?.status !== "Cancelled"
            )
            .map((record: any) => ({
              id: record.id,
              student_id: record.student_id,
              lesson_id: record.lesson_id,
              lesson_date:
                record.lessons.lesson_date,
              campus:
                record.lessons.classes?.campuses
                  ?.campus_name ?? "",
              level:
                record.lessons.classes?.level ?? "",
              start_time:
                record.lessons.classes?.start_time ?? "",
              end_time:
                record.lessons.classes?.end_time ?? "",
              attendance_status:
                record.attendance_status ?? "",
              attendance_type:
                record.attendance_type ?? "",
            }))
            .sort(
              (a: AttendanceRecord, b: AttendanceRecord) =>
                b.lesson_date.localeCompare(
                  a.lesson_date
                )
            );

        setAttendanceRecords(
          resolvedAttendance
        );

        // --------------------------------------------------
        // Reset visible lesson counts
        // --------------------------------------------------

        const initialCounts: Record<string, number> = {};

        resolvedChildren.forEach((child) => {
          initialCounts[child.student_id] =
            INITIAL_LESSONS;
        });

        setVisibleCounts(initialCounts);
      } catch (err) {
        console.error(
          "PARENT ATTENDANCE LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load attendance."
        );
      } finally {
        setLoading(false);
      }
    }

    loadParentAttendance();
  }, []);

  // ======================================================
  // Loading
  //
  // Keep the page visually quiet while loading.
  // The shared Parent Portal background remains visible.
  // ======================================================

  if (loading) {
    return (
      <main className="min-h-screen" />
    );
  }

  // ======================================================
  // Error
  // ======================================================

  if (error) {
    return (
      <main className="min-h-screen">
        <div
          className="
            mx-auto
            w-full
            max-w-[1500px]
            px-4
            py-6
            sm:px-6
            sm:py-8
            lg:px-8
          "
        >
          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-red-300/40
              bg-[#FFFDF8]
              shadow-xl
            "
          >
            <div className="h-[4px] bg-red-400/70" />

            <div className="p-5 sm:p-6 lg:p-8">
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.24em]
                  text-red-500
                "
              >
                PARENT ATTENDANCE
              </p>

              <h1
                className="
                  mt-3
                  text-2xl
                  font-semibold
                  text-[#10213A]
                "
              >
                Unable to load Attendance
              </h1>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[#64748B]
                "
              >
                {error}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ======================================================
  // Page
  // ======================================================

  return (
    <main className="min-h-screen">
      <div
        className="
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          py-6
          sm:px-6
          sm:py-8
          lg:px-8
        "
      >
        {/* ==================================================
            Page Header
            ================================================== */}

        <div className="mb-8">
          <h1
            className="
              text-3xl
              font-semibold
              tracking-tight
              text-[#F4F7FB]
              sm:text-4xl
            "
          >
            Attendance
          </h1>

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-[#AFC0D3]
              sm:text-base
            "
          >
            View my{" "}
  {children.length === 1 ? "child's" : "children's"}{" "}
  attendance history.
          </p>
        </div>

        {/* ==================================================
            Attendance History
            ================================================== */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/60
            bg-[#FFFDF8]
            shadow-xl
          "
        >
          {/* Gold top line */}

          <div
            className="
              h-[4px]
              bg-gradient-to-r
              from-[#F7D968]
              via-[#D4AF37]
              to-transparent
            "
          />

          <div
            className="
              p-5
              sm:p-6
              lg:p-8
            "
          >
            {/* ==================================================
                Section Header
                ================================================== */}

            <div className="mb-6">
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.24em]
                  text-[#B28700]
                "
              >
                ATTENDANCE HISTORY
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-semibold
                  text-[#10213A]
                  sm:text-3xl
                "
              >
                Past Lessons
              </h2>
            </div>

            {/* ==================================================
                No Children
                ================================================== */}

            {children.length === 0 ? (
              <div
                className="
                  rounded-xl
                  border
                  border-[#D9E0E8]
                  bg-[#F5F8FC]
                  p-5
                  text-sm
                  text-[#64748B]
                "
              >
                No attendance records found.
              </div>
            ) : (
              /* ==================================================
                 Children
                 ================================================== */

              <div className="space-y-8">
                {children.map(
                  (child, childIndex) => {
                    // ------------------------------------------------
                    // Get this child's attendance records
                    // ------------------------------------------------

                    const childRecords =
                      attendanceRecords.filter(
                        (record) =>
                          record.student_id ===
                          child.student_id
                      );

                    // ------------------------------------------------
                    // Visible lesson count
                    // ------------------------------------------------

                    const visibleCount =
                      visibleCounts[
                        child.student_id
                      ] ?? INITIAL_LESSONS;

                    const visibleRecords =
                      childRecords.slice(
                        0,
                        visibleCount
                      );

                    const hasMore =
                      childRecords.length >
                      visibleCount;

                    return (
                      <section
                        key={child.student_id}
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-[#D9E0E8]
                          bg-[#FFFDF8]
                        "
                      >
                        {/* ==========================================
                            Child Header
                            ========================================== */}

                        <div
                          className="
                            border-b
                            border-[#D9E0E8]
                            px-4
                            py-4
                            sm:px-5
                          "
                        >
                          <div
                            className="
                              flex
                              items-baseline
                              gap-x-3
                            "
                          >
                            {/* --------------------------------------
                                Multiple children:
                                CHILD 1 : Name

                                Single child:
                                CHILD : Name
                                -------------------------------------- */}

                            <span
                              className="
                                shrink-0
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.2em]
                                text-[#B28700]
                              "
                            >
                              {children.length > 1
                                ? `Child ${childIndex + 1}`
                                : "Child"}
                            </span>

                            <h3
                              className="
                                min-w-0
                                truncate
                                text-base
                                font-semibold
                                text-[#10213A]
                                sm:text-lg
                              "
                            >
                              : {child.student_name}
                            </h3>
                          </div>
                        </div>

                        {/* ==========================================
                            Lesson Rows
                            ========================================== */}

                        {childRecords.length === 0 ? (
                          <div
                            className="
                              px-4
                              py-5
                              text-sm
                              text-[#64748B]
                              sm:px-5
                            "
                          >
                            No attendance records found.
                          </div>
                        ) : (
                          <div>
                            {visibleRecords.map(
                              (
                                record,
                                lessonIndex
                              ) => {
                                const status =
                                  record.attendance_status
                                    ?.trim()
                                    .toLowerCase() ?? "";

                                const attendanceType =
                                  record.attendance_type
                                    ?.trim()
                                    .toLowerCase() ?? "";

                                const showType =
                                  attendanceType !==
                                    "" &&
                                  attendanceType !==
                                    "regular";

                                // ------------------------------------
                                // Status styling
                                // ------------------------------------

                                let statusClass =
                                  "bg-[#E8EEF6] text-[#10213A]";

                                if (
                                  status === "present"
                                ) {
                                  statusClass =
                                    "bg-[#E4F4E9] text-[#24613A]";
                                } else if (
                                  status === "absent"
                                ) {
                                  statusClass =
                                    "bg-[#FBE7E7] text-[#A43D3D]";
                                } else if (
                                  status === "late"
                                ) {
                                  statusClass =
                                    "bg-[#FBEEDC] text-[#9A5B00]";
                                }

                                // ------------------------------------
                                // Attendance type styling
                                // ------------------------------------

                                let typeClass =
                                  "bg-[#EEF2F7] text-[#52657A]";

                                if (
                                  attendanceType ===
                                  "trial"
                                ) {
                                  typeClass =
                                    "bg-[#E4EEF9] text-[#315F8F]";
                                } else if (
                                  attendanceType ===
                                  "excused"
                                ) {
                                  typeClass =
                                    "bg-[#F1E8C8] text-[#8A6800]";
                                }

                                return (
                                  <div
                                    key={record.id}
                                    className={`
                                      group
                                      border-b
                                      border-[#D9E0E8]
                                      px-4
                                      py-4
                                      transition-colors
                                      duration-150
                                      last:border-b-0
                                      sm:px-5
                                      ${
                                        lessonIndex %
                                          2 ===
                                        0
                                          ? "bg-[#F8FAFC]"
                                          : "bg-[#F1F5F9]"
                                      }
                                      hover:bg-[#EAF0F6]
                                      active:bg-[#E5ECF3]
                                    `}
                                  >
                                    {/* ==================================
                                        Lesson information
                                        ================================== */}

                                    <div
                                      className="
                                        flex
                                        flex-col
                                        gap-3
                                        sm:flex-row
                                        sm:items-center
                                        sm:justify-between
                                        sm:gap-5
                                      "
                                    >
                                      {/* --------------------------------
                                          Date / Time
                                          -------------------------------- */}

                                      <div
                                        className="
                                          min-w-0
                                          shrink-0
                                          sm:flex
                                          sm:items-center
                                          sm:gap-5
                                        "
                                      >
                                        <p
                                          className="
                                            text-sm
                                            font-semibold
                                            text-[#10213A]
                                            sm:whitespace-nowrap
                                          "
                                        >
                                          {new Date(
                                            `${record.lesson_date}T00:00:00`
                                          ).toLocaleDateString(
                                            "en-AU",
                                            {
                                              weekday:
                                                "long",
                                              day: "numeric",
                                              month: "short",
                                            }
                                          )}
                                        </p>

                                        <p
                                          className="
                                            mt-1
                                            text-sm
                                            text-[#64748B]
                                            sm:mt-0
                                            sm:whitespace-nowrap
                                          "
                                        >
                                          {record.start_time &&
                                          record.end_time
                                            ? `${record.start_time} – ${record.end_time}`
                                            : ""}
                                        </p>
                                      </div>

                                      {/* --------------------------------
                                          Campus / Level
                                          -------------------------------- */}

                                      <div
                                        className="
                                          min-w-0
                                          sm:flex
                                          sm:items-center
                                          sm:gap-5
                                        "
                                      >
                                        <p
                                          className="
                                            truncate
                                            text-sm
                                            font-semibold
                                            text-[#10213A]
                                            sm:text-right
                                          "
                                        >
                                          {record.campus}
                                        </p>

                                        <p
                                          className="
                                            mt-1
                                            text-sm
                                            text-[#64748B]
                                            sm:mt-0
                                            sm:whitespace-nowrap
                                          "
                                        >
                                          {record.level}
                                        </p>
                                      </div>
                                    </div>

                                    {/* ==================================
                                        Attendance status
                                        ================================== */}

                                    <div
                                      className="
                                        mt-3
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-2
                                      "
                                    >
                                      {/* --------------------------------
                                          Attendance Status
                                          -------------------------------- */}

                                      {record.attendance_status && (
                                        <span
                                          className={`
                                            inline-flex
                                            items-center
                                            rounded-full
                                            px-3
                                            py-1
                                            text-xs
                                            font-semibold
                                            transition-transform
                                            duration-150
                                            group-active:scale-[0.98]
                                            ${statusClass}
                                          `}
                                        >
                                          {
                                            record.attendance_status
                                          }
                                        </span>
                                      )}

                                      {/* --------------------------------
                                          Special Attendance Type

                                          Regular is intentionally hidden.
                                          Trial / Excused etc. remain visible.
                                          -------------------------------- */}

                                      {showType && (
                                        <span
                                          className={`
                                            inline-flex
                                            items-center
                                            rounded-full
                                            px-3
                                            py-1
                                            text-xs
                                            font-semibold
                                            ${typeClass}
                                          `}
                                        >
                                          {
                                            record.attendance_type
                                          }
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}

                            {/* ==========================================
                                Load More
                                ========================================== */}

                            {hasMore && (
                              <div
                                className="
                                  border-t
                                  border-[#D9E0E8]
                                  px-4
                                  py-4
                                  text-center
                                  sm:px-5
                                "
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleCounts(
                                      (current) => ({
                                        ...current,
                                        [child.student_id]:
                                          visibleCount +
                                          LOAD_MORE_COUNT,
                                      })
                                    )
                                  }
                                  className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    rounded-full
                                    border
                                    border-[#D4AF37]/60
                                    bg-[#FFFDF8]
                                    px-5
                                    py-2
                                    text-sm
                                    font-semibold
                                    text-[#8A6800]
                                    shadow-sm
                                    transition
                                    hover:bg-[#F8F1D8]
                                    hover:border-[#D4AF37]
                                    active:bg-[#F1E8C8]
                                  "
                                >
                                  Load more
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}