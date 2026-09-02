"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { synchroniseStudentStage } from "@/lib/studentSynchronisation";

/**
 * ============================================================
 * Types
 * ============================================================
 */

type EnrolmentClass = {
  id: string;
  day: string;
  classSuffix: string;
  level: string;
  campusName: string;
};

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

  feedbackComments: string | null;
  recommendedClassId: string | null;
  recommendedClassName: string | null;
  feedbackCreatedAt: string | null;
  
  trialStatus:
    | "Scheduled"
    | "Feedback Pending"
    | "Feedback Completed"
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

  const [showEnrolmentConfirmation, setShowEnrolmentConfirmation] =
  useState(false);

const [enrolmentStartDate, setEnrolmentStartDate] =
  useState("");

const [enrolmentClassId, setEnrolmentClassId] =
  useState("");

const [enrolmentClasses, setEnrolmentClasses] =
  useState<EnrolmentClass[]>([]);

const [enrolmentClassesLoading, setEnrolmentClassesLoading] =
  useState(false);

const [actionLoading, setActionLoading] =
  useState(false);

const [showRescheduleModal, setShowRescheduleModal] =
  useState(false);

const [rescheduleDate, setRescheduleDate] =
  useState("");

const [showAbsentActionModal, setShowAbsentActionModal] =
  useState(false);

const { enrollmentId } = use(params);

const router = useRouter();

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
trial_status,
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
      Number(enrollment.term) &&
    String(lesson.lesson_date) ===
      String(enrollment.join_date)
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
let feedbackComments: string | null = null;
let recommendedClassId: string | null = null;
let feedbackCreatedAt: string | null = null;

if (attendance?.id) {
  const {
    data: feedback,
    error: feedbackError,
  } = await supabase
    .from("trial_feedback")
    .select(`
      id,
      attendance_id,
      recommended_class_id,
      comments,
      created_at
    `)
    .eq(
      "attendance_id",
      attendance.id
    )
    .maybeSingle();

  if (feedbackError) {
    throw feedbackError;
  }

  if (feedback) {
    feedbackExists = true;
    feedbackComments =
      feedback.comments ?? null;
    recommendedClassId =
      feedback.recommended_class_id ?? null;
    feedbackCreatedAt =
      feedback.created_at ?? null;
  }
}

/**
 * ------------------------------------------------------
 * 5A. Resolve Recommended Class
 *
 * trial_feedback stores recommended_class_id.
 * Admin displays the human-readable class label.
 * ------------------------------------------------------
 */
let recommendedClassName: string | null = null;

if (recommendedClassId) {
  const {
    data: recommendedClass,
    error: recommendedClassError,
  } = await supabase
    .from("classes")
    .select(`
      id,
      day,
      class_suffix,
      level,
      campuses:campus_id (
        campus_name
      )
    `)
    .eq("id", recommendedClassId)
    .maybeSingle();

  if (recommendedClassError) {
    throw recommendedClassError;
  }

  const recommendedCampus =
    (recommendedClass?.campuses as any) ?? null;

  recommendedClassName = [
    recommendedCampus?.campus_name,
    recommendedClass?.day,
    recommendedClass?.level,
    recommendedClass?.class_suffix,
  ]
    .filter(Boolean)
    .join(" | ");
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
  | "Feedback Completed"
  | "Absent" = "Scheduled";

      if (
        attendance?.attendance_status ===
        "Present"
      ) {
        trialStatus = feedbackExists
          ? "Feedback Completed"
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
feedbackComments,
recommendedClassId,
recommendedClassName,
feedbackCreatedAt,

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
   * Load Classes for Formal Enrolment
   * ==========================================================
   *
   * The Coach recommended class is selected by default, but
   * Admin may choose another current class when confirming
   * the student's regular enrolment.
   * ==========================================================
   */

  async function loadEnrolmentClasses() {
    setEnrolmentClassesLoading(true);

    try {
      const {
        data: classes,
        error: classesError,
      } = await supabase
        .from("classes")
        .select(`
          id,
          day,
          class_suffix,
          level,

          campuses:campus_id (
            campus_name
          )
        `)
        .order("day", {
          ascending: true,
        });

      if (classesError) {
        throw classesError;
      }

      const result: EnrolmentClass[] =
        (classes ?? []).map((classRow: any) => ({
          id: classRow.id,
          day: classRow.day ?? "",
          classSuffix: classRow.class_suffix ?? "",
          level: classRow.level ?? "",
          campusName: classRow.campuses?.campus_name ?? "",
        }));

      setEnrolmentClasses(result);
    } catch (err: any) {
      console.error(
        "FORMAL ENROLMENT CLASS LOAD ERROR:",
        err
      );

      setError(
        err?.message ??
          "Unable to load classes."
      );
    } finally {
      setEnrolmentClassesLoading(false);
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
   * Confirm Formal Enrolment
   * ==========================================================
   *
   * IMPORTANT FROZEN RULE:
   *
   * A Trial Enrolment is a historical record and MUST NOT be
   * converted into a Regular Enrolment.
   *
   * When a Trial student is enrolled:
   * 1. Keep the original Trial Enrolment.
   * 2. Mark that Trial record as trial_status = "Enrolled".
   * 3. Create a NEW Regular Enrolment with is_trial = false.
   * 4. Use the confirmed class and formal start date for the
   *    new Regular Enrolment.
   *
   * This preserves the Trial history and allows the Trial List
   * to continue showing the student as an Enrolled Trial.
   * Historical Trial Attendance / Feedback are untouched.
   * ==========================================================
   */

  async function handleConfirmEnrolment() {
    if (!details || actionLoading) {
      return;
    }

    if (!enrolmentClassId) {
      setError("Please select a class.");
      return;
    }

    if (!enrolmentStartDate) {
      setError("Please select a formal start date.");
      return;
    }

    setActionLoading(true);
    setError("");

    let newRegularEnrollmentId: string | null = null;

    try {
      /**
       * --------------------------------------------------------
       * 1. Guard against duplicate Regular Enrolments
       * --------------------------------------------------------
       *
       * The Trial record remains separate from the Regular
       * record. Do not create a second Active Regular record
       * for the same student / academic year / term.
       * --------------------------------------------------------
       */
      const {
        data: existingRegularEnrollment,
        error: existingRegularError,
      } = await supabase
        .from("student_enrolments")
        .select("id")
        .eq("student_id", details.studentId)
        .eq("academic_year", details.academicYear)
        .eq("term", details.term)
        .eq("is_trial", false)
        .eq("status", "Active")
        .maybeSingle();

      if (existingRegularError) {
        throw existingRegularError;
      }

      if (existingRegularEnrollment?.id) {
        throw new Error(
          "An active regular enrolment already exists for this student and term."
        );
      }

      /**
       * --------------------------------------------------------
       * 2. Create NEW Regular Enrolment
       * --------------------------------------------------------
       *
       * DO NOT update details.enrollmentId here.
       * details.enrollmentId is the original Trial Enrolment.
       *
       * join_date on this new Regular record is the formal
       * enrolment start date. The original Trial join_date stays
       * unchanged as the historical Trial date.
       * --------------------------------------------------------
       */
      const {
        data: newRegularEnrollment,
        error: insertError,
      } = await supabase
        .from("student_enrolments")
        .insert({
          student_id: details.studentId,
          class_id: enrolmentClassId,
          academic_year: details.academicYear,
          term: details.term,
          status: "Active",
          start_date: enrolmentStartDate,
          join_date: enrolmentStartDate,
          is_trial: false,
          trial_status: null,
          payment_status: "Pending",
          payment_amount: null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      newRegularEnrollmentId =
        newRegularEnrollment.id;

      /**
 * --------------------------------------------------------
 * 3. Synchronise Student Stage
 * --------------------------------------------------------
 *
 * The new Active Regular Enrolment is now the current
 * enrolment source for Student stage synchronisation.
 *
 * This must succeed before the original Trial is marked
 * as Enrolled.
 * --------------------------------------------------------
 */
await synchroniseStudentStage(
  details.studentId,
  details.academicYear,
  details.term
);

/**
 * --------------------------------------------------------
 * 4. Preserve Trial History
 * --------------------------------------------------------
 *
 * Only the Trial status changes.
 * is_trial remains TRUE.
 * join_date remains the original Trial date.
 *
 * This is intentionally performed only after the new
 * Regular Enrolment and Student Stage synchronisation
 * have both succeeded.
 * --------------------------------------------------------
 */
const {
  error: trialUpdateError,
} = await supabase
  .from("student_enrolments")
  .update({
    trial_status: "Enrolled",
  })
  .eq("id", details.enrollmentId)
  .eq("is_trial", true);

if (trialUpdateError) {
  throw trialUpdateError;
}
      setShowEnrolmentConfirmation(false);

      router.push("/admin/trials");
      router.refresh();
    } catch (err: any) {
      /**
       * --------------------------------------------------------
       * Best-effort rollback
       * --------------------------------------------------------
       *
       * If the new Regular Enrolment was created but a later
       * step failed, remove only that newly-created Regular
       * record. The original Trial record is never deleted or
       * converted.
       * --------------------------------------------------------
       */
      if (newRegularEnrollmentId) {
        const { error: rollbackError } =
          await supabase
            .from("student_enrolments")
            .delete()
            .eq("id", newRegularEnrollmentId)
            .eq("is_trial", false);

        if (rollbackError) {
          console.error(
            "FORMAL ENROLMENT ROLLBACK ERROR:",
            rollbackError
          );
        }
      }

      console.error(
        "FORMAL ENROLMENT ERROR:",
        err
      );

      setError(
        err?.message ??
          "Unable to confirm formal enrolment."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /**
   * ==========================================================
   * Trial Action
   * ==========================================================
   *
   * Not Interested:
   * - trial_status = Lost
   * - Student remains Trial
   *
   * Follow-up:
   * - trial_status = Pending
   * - Student remains Trial
   *
   * Enrolled is handled separately by the Formal Enrolment
   * confirmation flow above.
   *
   * Historical Attendance / Feedback are untouched.
   * ==========================================================
   */

  async function handleTrialAction(
    action:
      | "Not Interested"
      | "Follow-up"
  ) {
    if (!details || actionLoading) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      /**
       * --------------------------------------------------------
       * 1. Not Interested
       * --------------------------------------------------------
       */

      if (action === "Not Interested") {
  const {
    error: updateError,
  } = await supabase
    .from("student_enrolments")
    .update({
      trial_status: "Lost",
    })
    .eq("id", details.enrollmentId);

  if (updateError) {
    throw updateError;
  }

  /**
   * --------------------------------------------------------
   * Trial Declined Email
   * --------------------------------------------------------
   *
   * The Trial status must be successfully changed to Lost
   * before the email is sent.
   *
   * Email notification never controls business state.
   * --------------------------------------------------------
   */

  const {
    data: parent,
    error: parentError,
  } = await supabase
    .from("parents")
    .select(`
      parent1_name,
      email
    `)
    .eq("student_id", details.studentId)
    .maybeSingle();

  if (parentError) {
    throw parentError;
  }

  if (!parent?.email) {
    throw new Error(
      "Parent email address could not be found."
    );
  }

  const parentName =
    parent.parent1_name?.trim() ||
    "Parent";

  const studentName =
    getDisplayedStudentName({
      firstName: details.firstName,
      preferredName: details.preferredName,
      lastName: details.lastName,
    });

  const emailResponse = await fetch(
    "/api/email/trial-declined",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parentName,
        parentEmail: parent.email,
        studentName,
      }),
    }
  );

  if (!emailResponse.ok) {
    const emailError =
      await emailResponse.json().catch(() => null);

    throw new Error(
      emailError?.error
        ? typeof emailError.error === "string"
          ? emailError.error
          : "Trial Declined email could not be sent."
        : "Trial Declined email could not be sent."
    );
  }
}

      /**
       * --------------------------------------------------------
       * 2. Follow-up
       * --------------------------------------------------------
       */

      if (action === "Follow-up") {
        const {
          error: updateError,
        } = await supabase
          .from("student_enrolments")
          .update({
            trial_status: "Pending",
          })
          .eq("id", details.enrollmentId);

        if (updateError) {
          throw updateError;
        }
      }

      /**
       * --------------------------------------------------------
       * 3. Return to Trial Management
       * --------------------------------------------------------
       *
       * The Trial list will now reflect the updated state.
       */

      router.push("/admin/trials");
      router.refresh();

    } catch (err: any) {
      console.error(
        "TRIAL ACTION ERROR:",
        err
      );

      setError(
        err?.message ??
          "Unable to complete Trial action."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /**
 * ==========================================================
 * Reschedule Trial
 * ==========================================================
 *
 * Frozen Rule:
 *
 * Absent Trial
 *   ↓
 * Admin Reschedule
 *   ↓
 * New Trial Date
 *   ↓
 * Scheduled
 *
 * The original Attendance record is historical and is never
 * deleted or overwritten.
 *
 * The Trial join_date becomes the new scheduled Trial date.
 * This allows the Attendance Engine to create Attendance only
 * for the newly scheduled Trial lesson.
 * ==========================================================
 */
async function handleRescheduleTrial() {
  if (!details || actionLoading) {
    return;
  }

  if (!rescheduleDate) {
    setError("Please select a new Trial date.");
    return;
  }

  setActionLoading(true);
  setError("");

  try {
    const {
      error: updateError,
    } = await supabase
      .from("student_enrolments")
      .update({
        join_date: rescheduleDate,
        trial_status: "Scheduled",
      })
      .eq("id", details.enrollmentId)
      .eq("is_trial", true)
      .eq("status", "Active");

    if (updateError) {
      throw updateError;
    }

    setShowRescheduleModal(false);
    setRescheduleDate("");

    router.push("/admin/trials");
    router.refresh();
  } catch (err: any) {
    console.error(
      "TRIAL RESCHEDULE ERROR:",
      err
    );

    setError(
      err?.message ??
        "Unable to reschedule Trial."
    );
  } finally {
    setActionLoading(false);
  }
}

async function handleMarkTrialLost() {
  if (!details || actionLoading) {
    return;
  }

  setActionLoading(true);
  setError("");

  try {
    const { error: updateError } = await supabase
      .from("student_enrolments")
      .update({
        trial_status: "Lost",
      })
      .eq("id", details.enrollmentId)
      .eq("is_trial", true)
      .eq("status", "Active");

    if (updateError) {
      throw updateError;
    }

    setShowAbsentActionModal(false);

    router.push("/admin/trials");
    router.refresh();
  } catch (err: any) {
    console.error(
      "TRIAL MARK LOST ERROR:",
      err
    );

    setError(
      err?.message ??
        "Unable to mark Trial as Lost."
    );
  } finally {
    setActionLoading(false);
  }
}
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


{/* =================================================
    TRIAL FEEDBACK
    ================================================= */}

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
  </div>

  <div className="p-5 sm:p-6">
  {details.feedbackExists ? (
    <div className="space-y-5">
      <div>
        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-[#64748B]
          "
        >
          COACH COMMENTS
        </p>

        <p
          className="
            mt-2
            whitespace-pre-wrap
            text-sm
            leading-6
            text-[#334155]
          "
        >
          {details.feedbackComments || "—"}
        </p>
      </div>

      {details.recommendedClassId && (
        <div>
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-[#64748B]
            "
          >
            RECOMMENDED CLASS
          </p>

          <p
            className="
              mt-1
              text-sm
              font-medium
              text-[#10213A]
            "
          >
            {details.recommendedClassName ||
              details.recommendedClassId}
          </p>
        </div>
      )}

      {details.feedbackCreatedAt && (
        <div>
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-[#64748B]
            "
          >
            SUBMITTED
          </p>

          <p
            className="
              mt-1
              text-sm
              text-[#334155]
            "
          >
            {new Date(
              details.feedbackCreatedAt
            ).toLocaleString("en-AU", {
              timeZone: "Australia/Brisbane",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}
    </div>
  ) : (
    <div
      className="
        rounded-xl
        border
        border-[#D9E0E8]
        bg-white
        px-5
        py-5
      "
    >
      <p className="text-sm text-[#64748B]">
        No feedback submitted yet.
      </p>
    </div>
  )}
</div>
</section>

       {/* =================================================
    TRIAL ACTION
    ================================================= */}

<section
  className="
    mt-6
    rounded-2xl
    border
    border-[#D4AF37]/35
    bg-[#102F54]
    px-5
    py-5
    shadow-sm
    sm:px-6
    sm:py-6
  "
>
  <p
    className="
      text-xs
      font-semibold
      uppercase
      tracking-[0.12em]
      text-[#D4AF37]
    "
  >
    Trial Action
  </p>

  <div className="mt-4 space-y-3">

  <p className="text-sm text-[#D9E6F2]">
    Select the trial outcome:
  </p>

  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

    <button
  type="button"
  disabled={actionLoading}
  onClick={async () => {
    if (!details) return;

    setEnrolmentClassId(
      details.recommendedClassId ??
      details.classId
    );

    setEnrolmentStartDate("");
    setShowEnrolmentConfirmation(true);

    await loadEnrolmentClasses();
  }}
  className="
    rounded-xl
    border
    border-[#D4AF37]/50
    bg-white
    px-4
    py-3
    text-sm
    font-semibold
    text-[#102F54]
    shadow-sm
    hover:bg-[#F7F3E8]
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
>
  {actionLoading ? "Saving..." : "Enrolled"}
</button>

    <button
  type="button"
  disabled={actionLoading}
  onClick={() =>
    handleTrialAction("Not Interested")
  }
  className="
    rounded-xl
    border
    border-[#D4AF37]/50
    bg-white
    px-4
    py-3
    text-sm
    font-semibold
    text-[#102F54]
    shadow-sm
    hover:bg-[#F7F3E8]
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
>
  {actionLoading ? "Saving..." : "Not Interested"}
</button>

    <button
  type="button"
  disabled={actionLoading}
  onClick={() =>
    handleTrialAction("Follow-up")
  }
  className="
    rounded-xl
    border
    border-[#D4AF37]/50
    bg-white
    px-4
    py-3
    text-sm
    font-semibold
    text-[#102F54]
    shadow-sm
    hover:bg-[#F7F3E8]
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
>
  {actionLoading ? "Saving..." : "Follow-up"}
</button>

<button
  type="button"
  disabled={actionLoading}
  onClick={() => {
    setError("");
    setShowAbsentActionModal(true);
  }}
  className="
    rounded-xl
    border
    border-[#D4AF37]/50
    bg-white
    px-4
    py-3
    text-sm
    font-semibold
    text-[#102F54]
    shadow-sm
    hover:bg-[#F7F3E8]
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
>
  {actionLoading ? "Saving..." : "Absent"}
</button>

  </div>

</div>
</section>

{showEnrolmentConfirmation && details && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/50
      p-4
    "
  >
    <div
      className="
        w-full
        max-w-lg
        rounded-2xl
        border
        border-[#D4AF37]/45
        bg-[#FFFDF8]
        p-6
        shadow-2xl
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.12em]
            text-[#D4AF37]
          "
        >
          Formal Enrolment
        </p>

        <h2
          className="
            mt-2
            text-xl
            font-bold
            text-[#10213A]
          "
        >
          Confirm Enrolment
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[#64748B]
          "
        >
          Confirm the class and start date for the student&apos;s
          regular enrolment.
        </p>
      </div>

      <div className="mt-6 space-y-5">

        {/* Enrolment Class */}

        <div>
          <label
            htmlFor="enrolment-class"
            className="
              block
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-[#64748B]
            "
          >
            Enrolment Class
          </label>

          <select
            id="enrolment-class"
            value={enrolmentClassId}
            onChange={(event) =>
              setEnrolmentClassId(event.target.value)
            }
            disabled={enrolmentClassesLoading}
            className="
              mt-2
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
              focus:ring-2
              focus:ring-[#D4AF37]/20
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {enrolmentClassesLoading ? (
              <option value="">
                Loading classes...
              </option>
            ) : (
              <>
                <option value="">
                  Select a class
                </option>

                {enrolmentClasses.map((classItem) => (
                  <option
                    key={classItem.id}
                    value={classItem.id}
                  >
                    {[
                      classItem.campusName,
                      classItem.day,
                      classItem.level,
                      classItem.classSuffix,
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                    {classItem.id === details.recommendedClassId
                      ? " (Recommended)"
                      : ""}
                  </option>
                ))}
              </>
            )}
          </select>

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-[#64748B]
            "
          >
            The Coach recommended class is selected by default.
            Admin may choose another suitable class if required.
          </p>
        </div>

        {/* Formal Start Date */}

        <div>
          <label
            htmlFor="enrolment-start-date"
            className="
              block
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-[#64748B]
            "
          >
            Formal Start Date
          </label>

          <input
            id="enrolment-start-date"
            type="date"
            value={enrolmentStartDate}
            onChange={(event) =>
              setEnrolmentStartDate(
                event.target.value
              )
            }
            className="
              mt-2
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
              focus:ring-2
              focus:ring-[#D4AF37]/20
            "
          />

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-[#64748B]
            "
          >
            This is the date the student will begin
            regular lessons. It may be different from
            the Trial date.
          </p>
        </div>

      </div>

      {/* Actions */}

      <div
        className="
          mt-7
          flex
          flex-col-reverse
          gap-3
          sm:flex-row
          sm:justify-end
        "
      >
        <button
          type="button"
          onClick={() =>
            setShowEnrolmentConfirmation(false)
          }
          className="
            rounded-xl
            border
            border-[#CBD5E1]
            bg-white
            px-5
            py-3
            text-sm
            font-semibold
            text-[#475569]
            hover:bg-[#F8FAFC]
          "
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            !enrolmentStartDate ||
            !enrolmentClassId ||
            actionLoading ||
            enrolmentClassesLoading
          }
          onClick={handleConfirmEnrolment}
          className="
            rounded-xl
            bg-[#D4AF37]
            px-5
            py-3
            text-sm
            font-semibold
            text-[#10213A]
            shadow-sm
            hover:bg-[#F4D35E]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {actionLoading
            ? "Saving..."
            : "Confirm Enrolment"}
        </button>
      </div>
    </div>
  </div>
)}

{showRescheduleModal && details && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/50
      p-4
    "
  >
    <div
      className="
        w-full
        max-w-lg
        rounded-2xl
        border
        border-[#D4AF37]/45
        bg-[#FFFDF8]
        p-6
        shadow-2xl
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.12em]
            text-[#D4AF37]
          "
        >
          Reschedule Trial
        </p>

        <h2
          className="
            mt-2
            text-xl
            font-bold
            text-[#10213A]
          "
        >
          Select a New Trial Date
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[#64748B]
          "
        >
          The previous Trial Attendance will remain
          in history. The new date will become the
          scheduled Trial date.
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="reschedule-date"
          className="
            block
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-[#64748B]
          "
        >
          New Trial Date
        </label>

        <input
          id="reschedule-date"
          type="date"
          value={rescheduleDate}
          onChange={(event) =>
            setRescheduleDate(event.target.value)
          }
          className="
            mt-2
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
            focus:ring-2
            focus:ring-[#D4AF37]/20
          "
        />
      </div>

      <div
        className="
          mt-7
          flex
          flex-col-reverse
          gap-3
          sm:flex-row
          sm:justify-end
        "
      >
        <button
          type="button"
          onClick={() => {
            setShowRescheduleModal(false);
            setRescheduleDate("");
          }}
          className="
            rounded-xl
            border
            border-[#CBD5E1]
            bg-white
            px-5
            py-3
            text-sm
            font-semibold
            text-[#475569]
            hover:bg-[#F8FAFC]
          "
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            !rescheduleDate ||
            actionLoading
          }
          onClick={handleRescheduleTrial}
          className="
            rounded-xl
            bg-[#D4AF37]
            px-5
            py-3
            text-sm
            font-semibold
            text-[#10213A]
            shadow-sm
            hover:bg-[#F4D35E]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {actionLoading
            ? "Saving..."
            : "Confirm Reschedule"}
        </button>
      </div>
    </div>
  </div>
)}

{showAbsentActionModal && details && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/50
      p-4
    "
  >
    <div
      className="
        w-full
        max-w-lg
        rounded-2xl
        border
        border-[#D4AF37]/45
        bg-[#FFFDF8]
        p-6
        shadow-2xl
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.12em]
            text-[#D4AF37]
          "
        >
          Trial Action
        </p>

        <h2
          className="
            mt-2
            text-xl
            font-bold
            text-[#10213A]
          "
        >
          Trial marked Absent
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[#64748B]
          "
        >
          What would you like to do next?
        </p>
      </div>

      <div
        className="
          mt-6
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
        "
      >
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => {
            setShowAbsentActionModal(false);
            setRescheduleDate("");
            setError("");
            setShowRescheduleModal(true);
          }}
          className="
            rounded-xl
            border
            border-[#D4AF37]/60
            bg-white
            px-5
            py-3
            text-sm
            font-semibold
            text-[#102F54]
            shadow-sm
            hover:bg-[#F7F3E8]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          Reschedule
        </button>

        <button
          type="button"
          disabled={actionLoading}
          onClick={handleMarkTrialLost}
          className="
            rounded-xl
            border
            border-[#D4AF37]/60
            bg-white
            px-5
            py-3
            text-sm
            font-semibold
            text-[#102F54]
            shadow-sm
            hover:bg-[#F7F3E8]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {actionLoading ? "Saving..." : "Mark as Lost"}
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => {
            setShowAbsentActionModal(false);
            setError("");
          }}
          className="
            rounded-xl
            border
            border-[#CBD5E1]
            bg-white
            px-5
            py-3
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
      </div>
    </div>
  </div>
)}

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
    | "Feedback Completed"
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

  if (status === "Feedback Completed") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-emerald-200
          bg-emerald-50
          px-3
          py-1.5
          text-xs
          font-semibold
          text-emerald-700
        "
      >
        ✓ Feedback Completed
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