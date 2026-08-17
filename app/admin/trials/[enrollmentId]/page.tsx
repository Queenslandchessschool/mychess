"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ============================================================
 * Types
 * ============================================================
 */

type TrialDetails = {
  enrollmentId: string;

  studentId: string;
  studentCode: string;

  firstName: string;
  preferredName: string;
  lastName: string;

  gender: string | null;
  dateOfBirth: string | null;
  school: string | null;
  schoolYear: string | null;

  medicalInformation: string | null;
  notes: string | null;

  classId: string;
  classDay: string;
  classSuffix: string;
  classLevel: string;
  campusName: string;

  academicYear: number;
  term: number;
  joinDate: string | null;

  attendanceId: string | null;
  attendanceStatus: string | null;
  lessonDate: string | null;

  feedbackExists: boolean;

  trialStatus:
    | "Scheduled"
    | "Feedback Pending"
    | "Absent";
};

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

function getDisplayedStudentName(
  student: {
    firstName?: string | null;
    preferredName?: string | null;
    lastName?: string | null;
  }
) {
  return `${student.firstName ?? ""}${
    student.preferredName?.trim()
      ? ` (${student.preferredName.trim()})`
      : ""
  } ${student.lastName ?? ""}`.trim();
}

function formatDate(date: string | null) {
  if (!date) return "—";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getClassLabel(
  details: TrialDetails
) {
  return [
    details.campusName,
    details.classDay,
    details.classSuffix,
  ]
    .filter(Boolean)
    .join(" | ");
}

/**
 * ============================================================
 * Page
 * ============================================================
 */

export default function ManageTrialPage({
  params,
}: {
  params: Promise<{
    enrollmentId: string;
  }>;
}) {
  const [details, setDetails] =
    useState<TrialDetails | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const { enrollmentId } = use(params);

  /**
   * ==========================================================
   * Load Trial
   * ==========================================================
   */

  async function loadTrial() {
    setLoading(true);
    setError("");

    try {
      /**
       * ------------------------------------------------------
       * 1. Load Trial Enrollment
       * ------------------------------------------------------
       */

      const {
        data: enrollment,
        error: enrollmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          class_id,
          academic_year,
          term,
          join_date,
          is_trial,
          status,

          students:student_id (
            id,
            student_code,
            first_name,
            preferred_name,
            last_name,
            gender,
            date_of_birth,
            school,
            school_year,
            medical_information,
            notes
          ),

          classes:class_id (
            id,
            day,
            class_suffix,
            level,

            campuses:campus_id (
              campus_name
            )
          )
        `)
        .eq("id", enrollmentId)
        .eq("is_trial", true)
        .single();

      if (enrollmentError) {
        throw enrollmentError;
      }

      if (!enrollment) {
        throw new Error(
          "Trial enrollment could not be found."
        );
      }

      /**
       * ------------------------------------------------------
       * 2. Student
       * ------------------------------------------------------
       */

      const student =
        enrollment.students as any;

      /**
       * ------------------------------------------------------
       * 3. Class
       * ------------------------------------------------------
       */

      const classData =
        enrollment.classes as any;

      const campus =
        classData?.campuses as any;

      /**
       * ------------------------------------------------------
       * 4. Find Attendance
       *
       * Attendance is matched by:
       *
       * Student
       * Class
       * Academic Year
       * Term
       * ------------------------------------------------------
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
          lesson_id,

          lessons:lesson_id (
            id,
            lesson_date,
            class_id,
            academic_year,
            term
          )
        `)
        .eq(
          "student_id",
          enrollment.student_id
        );

      if (attendanceError) {
        throw attendanceError;
      }

      const matchingAttendance =
        (attendanceRows ?? [])
          .map((row: any) => {
            const lesson =
              row.lessons as any;

            return {
              row,
              lesson,
            };
          })
          .filter(
            ({ lesson }) =>
              lesson &&
              lesson.class_id ===
                enrollment.class_id &&
              Number(
                lesson.academic_year
              ) ===
                Number(
                  enrollment.academic_year
                ) &&
              Number(lesson.term) ===
                Number(enrollment.term)
          )
          .sort((a, b) => {
            const dateA =
              String(
                a.lesson?.lesson_date ?? ""
              );

            const dateB =
              String(
                b.lesson?.lesson_date ?? ""
              );

            return dateB.localeCompare(
              dateA
            );
          })[0];

      const attendance =
        matchingAttendance?.row ?? null;

      const lesson =
        matchingAttendance?.lesson ?? null;

      /**
       * ------------------------------------------------------
       * 5. Trial Feedback
       * ------------------------------------------------------
       */

      let feedbackExists = false;

      if (attendance?.id) {
        const {
          data: feedback,
          error: feedbackError,
        } = await supabase
          .from("trial_feedback")
          .select("id")
          .eq(
            "attendance_id",
            attendance.id
          )
          .maybeSingle();

        if (feedbackError) {
          throw feedbackError;
        }

        feedbackExists = !!feedback;
      }

      /**
       * ------------------------------------------------------
       * 6. Current Trial Status
       *
       * This is READ-ONLY for Part 2A.
       *
       * Business actions will be added later.
       * ------------------------------------------------------
       */

      let trialStatus:
        | "Scheduled"
        | "Feedback Pending"
        | "Absent" = "Scheduled";

      if (
        attendance?.attendance_status ===
        "Present"
      ) {
        trialStatus = feedbackExists
          ? "Feedback Pending"
          : "Feedback Pending";
      } else if (
        attendance?.attendance_status ===
        "Absent"
      ) {
        trialStatus = "Absent";
      }

      /**
       * ------------------------------------------------------
       * 7. Build Details
       * ------------------------------------------------------
       */

      setDetails({
        enrollmentId:
          enrollment.id,

        studentId:
          enrollment.student_id,

        studentCode:
          student?.student_code ?? "",

        firstName:
          student?.first_name ?? "",

        preferredName:
          student?.preferred_name ?? "",

        lastName:
          student?.last_name ?? "",

        gender:
          student?.gender ?? null,

        dateOfBirth:
          student?.date_of_birth ?? null,

        school:
          student?.school ?? null,

        schoolYear:
          student?.school_year ?? null,

        medicalInformation:
          student?.medical_information ??
          null,

        notes:
          student?.notes ?? null,

        classId:
          enrollment.class_id,

        classDay:
          classData?.day ?? "",

        classSuffix:
          classData?.class_suffix ?? "",

        classLevel:
          classData?.level ?? "",

        campusName:
          campus?.campus_name ?? "",

        academicYear:
          enrollment.academic_year,

        term:
          enrollment.term,

        joinDate:
          enrollment.join_date ?? null,

        attendanceId:
          attendance?.id ?? null,

        attendanceStatus:
          attendance?.attendance_status ??
          null,

        lessonDate:
          lesson?.lesson_date ?? null,

        feedbackExists,

        trialStatus,
      });
    } catch (err: any) {
      console.error(
        "MANAGE TRIAL LOAD ERROR:",
        err
      );

      setError(
        err?.message ??
          "Unable to load Trial details."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * Initial Load
   * ==========================================================
   */

  useEffect(() => {
    loadTrial();
 }, [enrollmentId]);

  /**
   * ==========================================================
   * Loading
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <div
            className="
              rounded-2xl
              border
              border-[#D4AF37]/45
              bg-[#FFFDF8]
              p-10
              text-center
            "
          >
            <div
              className="
                mx-auto
                h-8
                w-8
                animate-spin
                rounded-full
                border-2
                border-[#D4AF37]/25
                border-t-[#D4AF37]
              "
            />

            <p
              className="
                mt-4
                text-sm
                text-[#64748B]
              "
            >
              Loading Trial details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /**
   * ==========================================================
   * Error
   * ==========================================================
   */

  if (error || !details) {
    return (
      <main className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <Link
            href="/admin/trials"
            className="
              inline-flex
              items-center
              text-sm
              font-semibold
              text-[#D4AF37]
              hover:text-[#F4D35E]
            "
          >
            ← Back to Trial Management
          </Link>

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-6
              text-red-700
            "
          >
            <p className="font-semibold">
              Unable to load Trial
            </p>

            <p className="mt-1 text-sm">
              {error ||
                "Trial details could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /**
   * ==========================================================
   * Render
   * ==========================================================
   */

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1200px]">
        {/* ================================================== */}
        {/* BACK                                                */}
        {/* ================================================== */}

        <Link
          href="/admin/trials"
          className="
            inline-flex
            items-center
            text-sm
            font-semibold
            text-[#D4AF37]
            transition
            hover:text-[#F4D35E]
          "
        >
          ← Back to Trial Management
        </Link>

        {/* ================================================== */}
        {/* PAGE HEADER                                          */}
        {/* ================================================== */}

        <header className="mt-5 mb-6">
          <p
            className="
              mb-2
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#D4AF37]
              sm:text-xs
            "
          >
            OPERATIONS · TRIAL MANAGEMENT
          </p>

          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#F7F9FC]
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                Manage Trial
              </h1>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[#B8C6D8]
                  sm:text-base
                "
              >
                View Trial details and current
                Trial status.
              </p>

              <div
                className="
                  mt-4
                  h-[2px]
                  w-16
                  bg-gradient-to-r
                  from-[#D4AF37]
                  to-[#F4D35E]
                "
              />
            </div>

            <StatusBadge
              status={details.trialStatus}
            />
          </div>
        </header>

        {/* ================================================== */}
        {/* STUDENT + TRIAL SUMMARY                             */}
        {/* ================================================== */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/45
            bg-[#FFFDF8]
            shadow-sm
          "
        >
          <div
            className="
              h-[4px]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-[#8F6B18]
            "
          />

          <div
            className="
              grid
              grid-cols-1
              gap-0
              lg:grid-cols-[1.3fr_1fr]
            "
          >
            {/* Student */}

            <div
              className="
                border-b
                border-[#D9E3ED]
                p-5
                lg:border-b-0
                lg:border-r
                lg:p-7
              "
            >
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#64748B]
                "
              >
                STUDENT
              </p>

              <h2
                className="
                  mt-2
                  text-xl
                  font-bold
                  text-[#10213A]
                  sm:text-2xl
                "
              >
                {getDisplayedStudentName({
                  firstName:
                    details.firstName,
                  preferredName:
                    details.preferredName,
                  lastName:
                    details.lastName,
                })}
              </h2>

              {details.studentCode && (
                <p
                  className="
                    mt-1
                    text-sm
                    text-[#64748B]
                  "
                >
                  {details.studentCode}
                </p>
              )}
            </div>

            {/* Trial Summary */}

            <div className="p-5 lg:p-7">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#64748B]
                "
              >
                TRIAL
              </p>

              <div
                className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-4
                "
              >
                <DetailItem
                  label="Academic Year"
                  value={String(
                    details.academicYear
                  )}
                />

                <DetailItem
                  label="Term"
                  value={`Term ${details.term}`}
                />

                <DetailItem
                  label="Join Date"
                  value={formatDate(
                    details.joinDate
                  )}
                />

                <DetailItem
                  label="Trial Class"
                  value={
                    getClassLabel(details) ||
                    "—"
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* ATTENDANCE                                          */}
        {/* ================================================== */}

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
          <SectionHeader title="Attendance" />

          <div
            className="
              grid
              grid-cols-1
              gap-5
              p-5
              sm:grid-cols-3
              sm:p-6
            "
          >
            <DetailItem
              label="Lesson Date"
              value={formatDate(
                details.lessonDate
              )}
            />

            <DetailItem
              label="Attendance Status"
              value={
                details.attendanceStatus ??
                "Not yet recorded"
              }
            />

            <DetailItem
              label="Feedback"
              value={
                details.feedbackExists
                  ? "Completed"
                  : details.attendanceStatus ===
                    "Present"
                  ? "Pending"
                  : "Not required"
              }
            />
          </div>
        </section>

        {/* ================================================== */}
        {/* STUDENT INFORMATION                                 */}
        {/* ================================================== */}

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
          <SectionHeader title="Student Information" />

          <div
            className="
              grid
              grid-cols-1
              gap-5
              p-5
              sm:grid-cols-2
              lg:grid-cols-4
              sm:p-6
            "
          >
            <DetailItem
              label="First Name"
              value={
                details.firstName || "—"
              }
            />

            <DetailItem
              label="Preferred Name"
              value={
                details.preferredName ||
                "—"
              }
            />

            <DetailItem
              label="Last Name"
              value={
                details.lastName || "—"
              }
            />

            <DetailItem
              label="Gender"
              value={
                details.gender || "—"
              }
            />

            <DetailItem
              label="Date of Birth"
              value={formatDate(
                details.dateOfBirth
              )}
            />

            <DetailItem
              label="School"
              value={
                details.school || "—"
              }
            />

            <DetailItem
              label="School Year"
              value={
                details.schoolYear ||
                "—"
              }
            />

            <DetailItem
              label="Level"
              value={
                details.classLevel ||
                "—"
              }
            />
          </div>
        </section>

        {/* ================================================== */}
        {/* MEDICAL / NOTES                                     */}
        {/* ================================================== */}

        <section
          className="
            mt-6
            grid
            grid-cols-1
            gap-6
            lg:grid-cols-2
          "
        >
          <InfoTextCard
            title="Medical Information"
            value={
              details.medicalInformation
            }
          />

          <InfoTextCard
            title="Notes"
            value={details.notes}
          />
        </section>

        {/* ================================================== */}
        {/* ACTION AREA — RESERVED FOR NEXT STEP               */}
        {/* ================================================== */}

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-[#D4AF37]/25
            bg-[#102B4D]
            p-5
            sm:p-6
          "
        >
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-[#D4AF37]
            "
          >
            TRIAL ACTION
          </p>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-[#B8C6D8]
            "
          >
            Trial decision and follow-up
            actions will be available here
            after the current Trial details
            workflow is verified.
          </p>
        </section>
      </div>
    </main>
  );
}

/**
 * ============================================================
 * Section Header
 * ============================================================
 */

function SectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <div
      className="
        border-b
        border-[#D9E3ED]
        bg-[#F4F8FC]
        px-5
        py-4
        sm:px-6
      "
    >
      <h2
        className="
          text-sm
          font-bold
          uppercase
          tracking-[0.12em]
          text-[#10213A]
        "
      >
        {title}
      </h2>
    </div>
  );
}

/**
 * ============================================================
 * Detail Item
 * ============================================================
 */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.12em]
          text-[#64748B]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          break-words
          text-sm
          font-medium
          text-[#10213A]
        "
      >
        {value}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * Info Text Card
 * ============================================================
 */

function InfoTextCard({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/35
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      <SectionHeader title={title} />

      <div className="p-5 sm:p-6">
        {value?.trim() ? (
          <p
            className="
              whitespace-pre-wrap
              text-sm
              leading-6
              text-[#334155]
            "
          >
            {value}
          </p>
        ) : (
          <p
            className="
              text-sm
              italic
              text-[#94A3B8]
            "
          >
            No information recorded.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * ============================================================
 * Status Badge
 * ============================================================
 */

function StatusBadge({
  status,
}: {
  status:
    | "Scheduled"
    | "Feedback Pending"
    | "Absent";
}) {
  if (status === "Absent") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-red-200
          bg-red-50
          px-3
          py-1.5
          text-xs
          font-semibold
          text-red-700
        "
      >
        × Absent
      </span>
    );
  }

  if (status === "Feedback Pending") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-[#E5D39A]
          bg-[#FFF8E7]
          px-3
          py-1.5
          text-xs
          font-semibold
          text-[#9A7415]
        "
      >
        ! Feedback Pending
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        items-center
        rounded-full
        border
        border-blue-200
        bg-blue-50
        px-3
        py-1.5
        text-xs
        font-semibold
        text-blue-700
      "
    >
      ◷ Scheduled
    </span>
  );
}