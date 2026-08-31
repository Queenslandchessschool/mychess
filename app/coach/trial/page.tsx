"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";
import { getLessonStartTimestamp } from "@/lib/attendanceTime";

/**
 * ============================================================
 * Types
 * ============================================================
 */

type TrialRow = {
  attendance_id: string;
  lesson_id: string;
  student_id: string;

  student_name: string;

  campus_id: string;
  campus_name: string;
  class_day: string;
  class_level: string;
  class_suffix: string;

  lesson_date: string;
  start_time: string;
  end_time: string;

  attendance_status: string;

  feedback_id: string | null;
  comments: string | null;
  recommended_class_id: string | null;
};

type ClassOption = {
  id: string;
  name: string;
};

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

function getDisplayedStudentName(student: {
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
}) {
  return `${student.first_name ?? ""}${
    student.preferred_name?.trim()
      ? ` (${student.preferred_name.trim()})`
      : ""
  } ${student.last_name ?? ""}`.trim();
}

function formatDate(value: string | null) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const [hourString, minute] = value.split(":");

  const hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

/**
 * ============================================================
 * Page
 * ============================================================
 */

export default function CoachTrialPage() {
  const currentYear = new Date().getFullYear();

  const [academicYear] =
    useState<number>(currentYear);

  const [term] =
    useState<number>(3);

  const [loading, setLoading] =
    useState(true);

  const [trials, setTrials] =
    useState<TrialRow[]>([]);

  const [classOptions, setClassOptions] =
    useState<ClassOption[]>([]);

  const [selectedTrial, setSelectedTrial] =
    useState<TrialRow | null>(null);

  const [comments, setComments] =
    useState("");

  const [recommendedClassId, setRecommendedClassId] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /**
   * ==========================================================
   * Trial Feedback Time Lock
   *
   * Uses the same Lesson Start Time engine as Attendance.
   * Business time: Australia/Brisbane.
   *
   * Before Lesson Start:
   *   Feedback actions are locked.
   *
   * At / after Lesson Start:
   *   Feedback actions are enabled.
   * ==========================================================
   */
  // Use the real current time and refresh periodically so a lesson
  // automatically unlocks at its Brisbane Lesson Start Time.
  const [timeTick, setTimeTick] =
    useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTick(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function hasTrialLessonStarted(
    trial: TrialRow
  ) {
    const lessonStart =
      getLessonStartTimestamp(
        trial.lesson_date,
        trial.start_time
      );

    return timeTick >= lessonStart;
  }

  /**
   * ==========================================================
   * Load Coach Trial Feedback
   *
   * IMPORTANT:
   *
   * This follows the SAME data model as Admin Trial Management:
   *
   * student_enrolments
   *        ↓
   * attendance
   *        ↓
   * lessons
   *        ↓
   * trial_feedback
   *
   * Coach scope is applied through classes.coach_id.
   * ==========================================================
   */

  async function loadTrials() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const currentUser =
        await getCurrentUser();

      /**
       * --------------------------------------------------------
       * 1. Current Coach
       * --------------------------------------------------------
       */

      if (
        !currentUser ||
        currentUser.role !== "coach" ||
        !currentUser.coachId
      ) {
        setTrials([]);
        setClassOptions([]);

        throw new Error(
          "Coach user not found."
        );
      }

      const coachId =
        currentUser.coachId;

      /**
       * --------------------------------------------------------
       * 2. Classes assigned to current Coach
       *
       * THIS IS THE COACH SCOPE.
       * --------------------------------------------------------
       */

      const {
        data: coachClasses,
        error: coachClassError,
      } = await supabase
        .from("classes")
        .select(`
          id,
          day,
          level,
          class_suffix,
          campus_id,
          campuses:campus_id (
            campus_name
          )
        `)
        .eq(
          "coach_id",
          coachId
        );

      if (coachClassError) {
        throw coachClassError;
      }

      const scopedClasses =
        coachClasses ?? [];

      /**
       * --------------------------------------------------------
       * No classes assigned to Coach
       * --------------------------------------------------------
       */

      if (
        scopedClasses.length === 0
      ) {
        setTrials([]);
        setClassOptions([]);

        return;
      }

      const classIds =
        scopedClasses.map(
          (item: any) =>
            item.id
        );

      /**
       * --------------------------------------------------------
       * 3. Active Trial Enrolments
       *
       * SAME SOURCE AS ADMIN TRIAL.
       * --------------------------------------------------------
       */

      const {
        data: enrolments,
        error: enrolmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          academic_year,
          term,
          join_date,
          class_id,
          is_trial,
          status,

          students:student_id (
            id,
            student_code,
            first_name,
            preferred_name,
            last_name
          ),

          classes:class_id (
  id,
  campus_id,
  day,
  class_suffix,
  level,
  start_time,
  end_time,

  campuses:campus_id (
    campus_name
  )
)
        `)
        .eq(
          "academic_year",
          academicYear
        )
        .eq(
          "term",
          term
        )
        .eq(
          "is_trial",
          true
        )
        .eq(
          "status",
          "Active"
        )
        .in(
          "class_id",
          classIds
        )
        .order(
          "join_date",
          {
            ascending: true,
          }
        );

      if (enrolmentError) {
        throw enrolmentError;
      }

      if (
        !enrolments ||
        enrolments.length === 0
      ) {
        setTrials([]);
        return;
      }

      /**
       * --------------------------------------------------------
       * 4. Student IDs
       * --------------------------------------------------------
       */

      const studentIds =
        enrolments
          .map(
            (row: any) =>
              row.student_id
          )
          .filter(Boolean);

      if (
        studentIds.length === 0
      ) {
        setTrials([]);
        return;
      }

      /**
       * --------------------------------------------------------
       * 5. Load Attendance
       *
       * We deliberately load Attendance independently,
       * exactly like Admin Trial.
       *
       * Then we match:
       *
       * Student
       * Class
       * Academic Year
       * Term
       * --------------------------------------------------------
       */

      const {
        data: attendanceRows,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          attendance_status,
          attendance_type,
          lesson_id,

          lessons:lesson_id (
  id,
  lesson_date,
  class_id,
  academic_year,
  term
)
        `)
        .in(
          "student_id",
          studentIds
        );

      if (attendanceError) {
        throw attendanceError;
      }

      /**
       * --------------------------------------------------------
       * 6. Match latest Attendance
       *
       * Key:
       *
       * student_id
       * class_id
       * academic_year
       * term
       *
       * This is the SAME matching principle as Admin.
       * --------------------------------------------------------
       */

      const matchingAttendance =
        new Map<string, any>();

      for (
        const attendance of
          attendanceRows ?? []
      ) {
        const lesson =
          attendance.lessons as any;

        if (!lesson) {
          continue;
        }

        const key = [
          attendance.student_id,
          lesson.class_id,
          lesson.academic_year,
          lesson.term,
        ].join("|");

        const existing =
          matchingAttendance.get(
            key
          );

        const existingLesson =
          existing?.lessons as any;

        if (
          !existing ||
          String(
            lesson.lesson_date ?? ""
          ) >
            String(
              existingLesson?.lesson_date ??
                ""
            )
        ) {
          matchingAttendance.set(
            key,
            attendance
          );
        }
      }

      /**
       * --------------------------------------------------------
       * 7. Load Trial Feedback
       * --------------------------------------------------------
       */

      const attendanceIds =
        (attendanceRows ?? [])
          .map(
            (row: any) =>
              row.id
          )
          .filter(Boolean);

      const feedbackMap =
        new Map<string, any>();

      if (
        attendanceIds.length > 0
      ) {
        const {
          data: feedbackRows,
          error: feedbackError,
        } = await supabase
          .from("trial_feedback")
          .select(`
            id,
            attendance_id,
            recommended_class_id,
            comments
          `)
          .in(
            "attendance_id",
            attendanceIds
          );

        if (feedbackError) {
          throw feedbackError;
        }

        for (
          const feedback of
            feedbackRows ?? []
        ) {
          feedbackMap.set(
            feedback.attendance_id,
            feedback
          );
        }
      }

      /**
       * --------------------------------------------------------
       * 8. Build Coach Trial Feedback List
       *
       * IMPORTANT:
       *
       * Coach Feedback page only shows:
       *
       * Present Trial
       *
       * because Frozen rule:
       *
       * Present → Feedback required
       * Absent  → No Feedback
       * --------------------------------------------------------
       */

      const result: TrialRow[] =
        enrolments
          .map(
            (enrollment: any) => {
              const student =
                enrollment.students ??
                {};

              const classData =
                enrollment.classes ??
                {};

              const campus =
                classData.campuses ??
                {};

              const key = [
                enrollment.student_id,
                enrollment.class_id,
                enrollment.academic_year,
                enrollment.term,
              ].join("|");

              const attendance =
                matchingAttendance.get(
                  key
                );

              /**
               * Only completed Present Trials
               * belong on Coach Feedback page.
               */

              if (
                !attendance ||
                attendance.attendance_status !==
                  "Present"
              ) {
                return null;
              }

              const lesson =
                attendance.lessons as any;

              const feedback =
                feedbackMap.get(
                  attendance.id
                );

              const studentName =
                getDisplayedStudentName(
                  student
                );

              return {
                attendance_id:
                  attendance.id,

                lesson_id:
                  attendance.lesson_id,

                student_id:
                  attendance.student_id,

                student_name:
                  studentName,

                campus_id:
                  classData.campus_id ??
                  "",

                campus_name:
                  campus.campus_name ??
                  "",

                class_day:
                  classData.day ??
                  "",

                class_level:
                  classData.level ??
                  "",

                class_suffix:
                  classData.class_suffix ??
                  "",

                lesson_date:
                  lesson?.lesson_date ??
                  "",

                start_time:
  classData.start_time ??
  "",

end_time:
  classData.end_time ??
  "",

                attendance_status:
                  attendance.attendance_status,

                feedback_id:
                  feedback?.id ??
                  null,

                comments:
                  feedback?.comments ??
                  null,

                recommended_class_id:
                  feedback?.recommended_class_id ??
                  null,
              };
            }
          )
          .filter(
            Boolean
          ) as TrialRow[];

      /**
       * --------------------------------------------------------
       * 9. Sort
       *
       * Latest lesson first.
       * --------------------------------------------------------
       */

      result.sort(
        (a, b) => {
          const dateCompare =
            b.lesson_date.localeCompare(
              a.lesson_date
            );

          if (
            dateCompare !== 0
          ) {
            return dateCompare;
          }

          return a.student_name.localeCompare(
            b.student_name,
            undefined,
            {
              sensitivity:
                "base",
            }
          );
        }
      );

      setTrials(result);
    } catch (error) {
      console.error(
        "COACH TRIAL FEEDBACK LOAD ERROR:",
        error
      );

      setTrials([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load Trial Feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * Open Feedback
   * ==========================================================
   */

  async function openFeedback(
    trial: TrialRow
  ) {
    if (!hasTrialLessonStarted(trial)) {
      setErrorMessage(
        "Trial Feedback is locked until the lesson starts."
      );

      return;
    }

    try {
      setSelectedTrial(trial);

      setComments(
        trial.comments ?? ""
      );

      setRecommendedClassId(
        trial.recommended_class_id ??
          ""
      );

      setClassOptions([]);

      setErrorMessage(null);

      /**
       * --------------------------------------------------------
       * Recommended Class Scope
       *
       * IMPORTANT:
       *
       * Trial list scope remains Coach Scope.
       * Recommended Class scope is different:
       *
       * Trial Campus
       *      ↓
       * Active Classes at that Campus
       *
       * A Coach may therefore recommend another Coach's
       * class when it is at the same Campus.
       * --------------------------------------------------------
       */

      const {
        data: recommendedClasses,
        error: recommendedClassError,
      } = await supabase
        .from("classes")
        .select(`
          id,
          campus_id,
          day,
          level,
          class_suffix,
          status,

          campuses:campus_id (
            campus_name
          )
        `)
        .eq(
          "campus_id",
          trial.campus_id
        )
        .eq(
          "status",
          "Active"
        );

      if (recommendedClassError) {
        throw recommendedClassError;
      }

      const options: ClassOption[] =
        (recommendedClasses ?? [])
          .map((classData: any) => ({
            id: classData.id,
            // Mobile-friendly display: the Trial header already shows
            // Campus + Day, so the dropdown only needs the Class.
            name: [
              classData.level,
              classData.class_suffix,
            ]
              .filter(Boolean)
              .join(" "),
          }))
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              undefined,
              {
                sensitivity: "base",
              }
            )
          );

      setClassOptions(options);
    } catch (error) {
      console.error(
        "COACH TRIAL RECOMMENDED CLASS LOAD ERROR:",
        error
      );

      setClassOptions([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load Recommended Classes."
      );
    }
  }

  /**
   * ==========================================================
   * Save Feedback
   *
   * One Trial Attendance
   *        ↓
   * One Trial Feedback
   *
   * UNIQUE(attendance_id)
   * ==========================================================
   */

  async function handleSaveFeedback() {
    if (
      !selectedTrial ||
      saving
    ) {
      return;
    }

    if (
      !hasTrialLessonStarted(selectedTrial)
    ) {
      setErrorMessage(
        "Trial Feedback cannot be saved before the lesson starts."
      );

      return;
    }

    if (
      !comments.trim()
    ) {
      setErrorMessage(
        "Please enter Coach comments."
      );

      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      const currentUser =
        await getCurrentUser();

      if (
        !currentUser ||
        currentUser.role !==
          "coach" ||
        !currentUser.coachId
      ) {
        throw new Error(
          "Coach user not found."
        );
      }

      const {
        error,
      } = await supabase
        .from(
          "trial_feedback"
        )
        .upsert(
          {
            attendance_id:
              selectedTrial.attendance_id,

            recommended_class_id:
              recommendedClassId ||
              null,

            comments:
              comments.trim(),

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "attendance_id",
          }
        );

      if (error) {
        throw error;
      }

      setSelectedTrial(
        null
      );

      await loadTrials();
    } catch (error) {
      console.error(
        "COACH TRIAL FEEDBACK SAVE ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save Trial Feedback."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * ==========================================================
   * Initial Load
   * ==========================================================
   */

  useEffect(() => {
    loadTrials();
  }, []);

  /**
   * ==========================================================
   * Render
   * ==========================================================
   */

  return (
    <main className="w-full">
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
          lg:py-10
        "
      >
        {/* ==================================================
            PAGE HEADER
            ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#FFFDF8]
            shadow-sm
          "
        >
          <div
            className="
              absolute
              inset-x-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-[#8F6B18]
            "
          />

          <div
            className="
              px-5
              py-5
              sm:px-6
              sm:py-6
            "
          >
            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-[#10213A]
                sm:text-3xl
              "
            >
              Trial Feedback
            </h1>

            <p
              className="
                mt-1.5
                text-sm
                leading-5
                text-[#64748B]
              "
            >
              Review completed Trial lessons and provide Coach feedback.
            </p>
          </div>
        </section>

        {/* ==================================================
            TRIAL FEEDBACK WORKSPACE
            ================================================== */}

        <section
          className="
            mt-6
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#FFFDF8]
            shadow-sm
          "
        >

          {/* Header */}

          <div
            className="
              border-b
              border-[#D9E0E8]
              bg-[#F4F8FC]
              px-5
              py-4
              sm:px-6
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-[#10213A]
                  "
                >
                  Trial Feedback
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-[#64748B]
                  "
                >
                  {academicYear} · Term {term}
                </p>
              </div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-[#10213A]
                "
              >
                {trials.length}{" "}
                {trials.length === 1
                  ? "student"
                  : "students"}
              </div>
            </div>
          </div>

          {/* =================================================
              Loading
              ================================================= */}

          {loading ? (
            <div
              className="
                px-6
                py-14
                text-center
                text-sm
                text-[#64748B]
              "
            >
              Loading Trial feedback...
            </div>
          ) : errorMessage &&
            !selectedTrial ? (
            <div
              className="
                m-5
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-5
                py-4
                text-sm
                text-red-700
              "
            >
              {errorMessage}
            </div>
          ) : trials.length === 0 ? (
            <div
              className="
                px-6
                py-16
                text-center
              "
            >
              <div
                className="
                  text-base
                  font-semibold
                  text-[#10213A]
                "
              >
                No completed Trial lessons
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-[#64748B]
                "
              >
                Completed Trial lessons requiring feedback will appear here.
              </div>
            </div>
          ) : (
            <>
              {/* =================================================
                  DESKTOP
                  No card inside card.
                  ================================================= */}

              <div
                className="
                  hidden
                  lg:block
                  h-[620px]
                  overflow-y-auto
                "
              >
                <table
                  className="
                    w-full
                    min-w-[1050px]
                  "
                >
                  <thead
                    className="
                      sticky
                      top-0
                      z-10
                    "
                  >
                    <tr
                      className="
                        border-b
                        border-[#D9E0E8]
                        bg-[#F4F8FC]
                        text-left
                      "
                    >
                      <th
                        className="
                          px-6
                          py-4
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Student
                      </th>

                      <th
                        className="
                          px-5
                          py-4
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Campus / Day
                      </th>

                      <th
                        className="
                          px-5
                          py-4
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Date
                      </th>

                      <th
                        className="
                          px-5
                          py-4
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Time
                      </th>

                      <th
                        className="
                          px-5
                          py-4
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Level
                      </th>

                      <th
                        className="
                          px-6
                          py-4
                          text-right
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#64748B]
                        "
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {trials.map(
                      (trial) => (
                        <tr
                          key={
                            trial.attendance_id
                          }
                          className="
                            border-b
                            border-[#D9E0E8]
                            transition-colors
                            last:border-b-0
                            hover:bg-[#FFF8E7]/40
                          "
                        >
                          {/* Student */}

                          <td
                            className="
                              px-6
                              py-4
                            "
                          >
                            <p
                              className="
                                text-sm
                                font-semibold
                                text-[#10213A]
                              "
                            >
                              {trial.student_name}
                            </p>
                          </td>

                          {/* Campus / Day */}

                          <td
                            className="
                              px-5
                              py-4
                            "
                          >
                            <p
                              className="
                                text-sm
                                text-[#10213A]
                              "
                            >
                              {trial.campus_name ||
                                "—"}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-[#64748B]
                              "
                            >
                              {trial.class_day ||
                                "—"}
                            </p>
                          </td>

                          {/* Date */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              text-[#475569]
                            "
                          >
                            {formatDate(
                              trial.lesson_date
                            )}
                          </td>

                          {/* Time */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              text-[#475569]
                            "
                          >
                            {formatTime(
                              trial.start_time
                            )}{" "}
                            –{" "}
                            {formatTime(
                              trial.end_time
                            )}
                          </td>

                          {/* Level */}

                          <td
                            className="
                              px-5
                              py-4
                            "
                          >
                            <span
                              className="
                                text-sm
                                text-[#475569]
                              "
                            >
                              {trial.class_level ||
                                "—"}
                            </span>
                          </td>

                          {/* Action */}

                          <td
                            className="
                              px-6
                              py-4
                              text-right
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openFeedback(
                                  trial
                                )
                              }
                              disabled={
                                !hasTrialLessonStarted(
                                  trial
                                )
                              }
                              title={
                                !hasTrialLessonStarted(
                                  trial
                                )
                                  ? "Feedback will be available when the lesson starts."
                                  : undefined
                              }
                              className={`
                                inline-flex
                                min-h-[42px]
                                items-center
                                justify-center
                                rounded-xl
                                border
                                px-5
                                py-2.5
                                text-sm
                                font-semibold
                                text-[#10213A]
                                transition
                                ${
                                  !hasTrialLessonStarted(
                                    trial
                                  )
                                    ? "cursor-not-allowed border-[#CBD5E1] bg-[#E2E8F0] text-[#64748B]"
                                    : trial.feedback_id
                                      ? "border-green-300 bg-green-100 hover:bg-green-200"
                                      : "border-[#D4AF37] bg-[#F4C542] hover:bg-[#E9B934]"
                                }
                                disabled:cursor-not-allowed
                                disabled:opacity-90
                              `}
                            >
                              {!hasTrialLessonStarted(
                                trial
                              )
                                ? "Locked until lesson starts"
                                : trial.feedback_id
                                  ? "View / Edit Feedback"
                                  : "Complete Feedback"}
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  MOBILE
                  Same workspace.
                  No nested cards.
                  ================================================= */}

              <div
                className="
                  divide-y
                  divide-[#D9E0E8]
                  lg:hidden
                  max-h-[620px]
                  overflow-y-auto
                "
              >
                {trials.map(
                  (trial) => (
                    <div
                      key={
                        trial.attendance_id
                      }
                      className="
                        px-5
                        py-4
                      "
                    >
                      {/* Row 1 */}

                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                        "
                      >
                        <div
                          className="
                            min-w-0
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-[#10213A]
                            "
                          >
                            {trial.student_name}
                          </p>
                        </div>

                        <p
                          className="
                            shrink-0
                            text-xs
                            font-medium
                            text-[#64748B]
                          "
                        >
                          {trial.class_level}
                        </p>
                      </div>

                      {/* Row 2 */}

                      <div
                        className="
                          mt-2
                          flex
                          flex-wrap
                          items-center
                          gap-x-3
                          gap-y-1
                          text-sm
                          text-[#475569]
                        "
                      >
                        <span>
                          {trial.campus_name ||
                            "—"}
                        </span>

                        <span
                          className="
                            text-[#CBD5E1]
                          "
                        >
                          |
                        </span>

                        <span>
                          {trial.class_day ||
                            "—"}
                        </span>

                        <span
                          className="
                            text-[#CBD5E1]
                          "
                        >
                          |
                        </span>

                        <span>
                          {formatDate(
                            trial.lesson_date
                          )}
                        </span>

                        <span
                          className="
                            text-[#CBD5E1]
                          "
                        >
                          |
                        </span>

                        <span>
                          {formatTime(
                            trial.start_time
                          )}{" "}
                          –{" "}
                          {formatTime(
                            trial.end_time
                          )}
                        </span>
                      </div>

                      {/* Action */}

                      <div
                        className="
                          mt-3
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openFeedback(
                              trial
                            )
                          }
                          disabled={
                            !hasTrialLessonStarted(
                              trial
                            )
                          }
                          title={
                            !hasTrialLessonStarted(
                              trial
                            )
                              ? "Feedback will be available when the lesson starts."
                              : undefined
                          }
                          className={`
                            inline-flex
                            min-h-[42px]
                            w-full
                            items-center
                            justify-center
                            rounded-xl
                            border
                            px-4
                            py-2.5
                            text-sm
                            font-semibold
                            text-[#10213A]
                            transition
                            ${
                              !hasTrialLessonStarted(
                                trial
                              )
                                ? "cursor-not-allowed border-[#CBD5E1] bg-[#E2E8F0] text-[#64748B]"
                                : trial.feedback_id
                                  ? "border-green-300 bg-green-100 hover:bg-green-200"
                                  : "border-[#D4AF37] bg-[#F4C542] hover:bg-[#E9B934]"
                            }
                            disabled:cursor-not-allowed
                            disabled:opacity-90
                          `}
                        >
                          {!hasTrialLessonStarted(
                            trial
                          )
                            ? "Locked until lesson starts"
                            : trial.feedback_id
                              ? "View / Edit Feedback"
                              : "Complete Feedback"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ======================================================
          FEEDBACK MODAL
          ====================================================== */}

      {selectedTrial && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            px-4
            py-6
          "
        >
          <div
            className="
              w-full
              max-w-2xl
              overflow-hidden
              rounded-2xl
              border
              border-[#D4AF37]
              bg-[#FFFDF8]
              shadow-2xl
            "
          >

            {/* Gold line */}

            <div
              className="
                h-[3px]
                w-full
                bg-gradient-to-r
                from-[#8F6B18]
                via-[#F4D35E]
                to-[#8F6B18]
              "
            />

            {/* Header */}

            <div
              className="
                border-b
                border-[#D9E0E8]
                bg-[#F4F8FC]
                px-5
                py-4
                sm:px-6
              "
            >
              <div
                className="
                  text-lg
                  font-bold
                  text-[#10213A]
                "
              >
                Trial Feedback
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-[#64748B]
                "
              >
                {selectedTrial.student_name}
                {" · "}
                {selectedTrial.campus_name}
                {" · "}
                {selectedTrial.class_day}
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-[#64748B]
                "
              >
                {formatDate(
                  selectedTrial.lesson_date
                )}
                {" · "}
                {formatTime(
                  selectedTrial.start_time
                )}{" "}
                –{" "}
                {formatTime(
                  selectedTrial.end_time
                )}
              </div>
            </div>

            {/* Body */}

            <div
              className="
                space-y-5
                p-5
                sm:p-6
              "
            >

              {!hasTrialLessonStarted(
                selectedTrial
              ) && (
                <div
                  className="
                    rounded-xl
                    border
                    border-[#CBD5E1]
                    bg-[#F1F5F9]
                    px-4
                    py-3
                    text-sm
                    text-[#475569]
                  "
                >
                  Feedback is locked until the lesson starts.
                </div>
              )}

              {/* Recommended Class */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-[#10213A]
                  "
                >
                  Recommended Class
                </label>

                <select
                  value={
                    recommendedClassId
                  }
                  onChange={(event) =>
                    setRecommendedClassId(
                      event.target.value
                    )
                  }
                  disabled={
                    !hasTrialLessonStarted(
                      selectedTrial
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-[#CBD5E1]
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-[#10213A]
                    outline-none
                    focus:border-[#D4AF37]
                    disabled:cursor-not-allowed
                    disabled:bg-[#F1F5F9]
                    disabled:text-[#94A3B8]
                  "
                >
                  <option value="">
                    No recommendation
                  </option>

                  {classOptions.map(
                    (option) => (
                      <option
                        key={
                          option.id
                        }
                        value={
                          option.id
                        }
                      >
                        {option.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Comments */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-[#10213A]
                  "
                >
                  Coach Comments
                </label>

                <textarea
                  value={comments}
                  onChange={(event) =>
                    setComments(
                      event.target.value
                    )
                  }
                  disabled={
                    !hasTrialLessonStarted(
                      selectedTrial
                    )
                  }
                  rows={7}
                  placeholder="Enter your feedback about the student's Trial lesson..."
                  className="
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-[#CBD5E1]
                    bg-white
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-[#10213A]
                    outline-none
                    focus:border-[#D4AF37]
                    disabled:cursor-not-allowed
                    disabled:bg-[#F1F5F9]
                    disabled:text-[#94A3B8]
                  "
                />
              </div>

              {errorMessage && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-700
                  "
                >
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Footer */}

            <div
              className="
                flex
                flex-col-reverse
                gap-3
                border-t
                border-[#D9E0E8]
                bg-[#F8FAFC]
                px-5
                py-4
                sm:flex-row
                sm:justify-end
                sm:px-6
              "
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedTrial(
                    null
                  )
                }
                disabled={saving}
                className="
                  min-h-[44px]
                  rounded-xl
                  border
                  border-[#CBD5E1]
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#475569]
                  hover:bg-[#F8FAFC]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSaveFeedback
                }
                disabled={
                  saving ||
                  !hasTrialLessonStarted(
                    selectedTrial
                  )
                }
                className="
                  min-h-[44px]
                  rounded-xl
                  border
                  border-[#D4AF37]
                  bg-[#F4C542]
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#10213A]
                  transition
                  hover:bg-[#E9B934]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving
                  ? "Saving..."
                  : "Save Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}