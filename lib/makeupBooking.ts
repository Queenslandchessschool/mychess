import { supabase } from "@/lib/supabase";
import {
  hasLessonStarted,
} from "@/lib/attendanceTime";

export interface EligibleMakeupLesson {
  id: string;

  lesson_date: string;

  start_time: string;

  end_time: string;

  class_id: string;

  class_name: string;

  level: string;

  campus_name: string;
}

interface GetEligibleMakeupLessonsParams {
  studentId: string;
}

const LEVEL_ORDER = [
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
];

export async function getEligibleMakeupLessons({
  studentId,
}: GetEligibleMakeupLessonsParams): Promise<
  EligibleMakeupLesson[]
> {
  if (!studentId) {
    return [];
  }

  const today =
    new Date().toLocaleDateString("en-CA");

  /*
   * ============================================================
   * Frozen Make-up Booking Eligibility
   * ============================================================
   *
   * A student may book:
   *
   * 1. A future lesson
   * 2. A non-cancelled lesson
   * 3. Same level
   * 4. One level higher
   * 5. Any campus
   *
   * A student may NOT book:
   *
   * 6. Their own current class
   * 7. Private lessons
   *
   * The candidate lesson does NOT need to contain the
   * student's enrolment.
   *
   * ============================================================
   */

  /*
   * ------------------------------------------------------------
   * Step 1 — Get student's active enrolments
   * ------------------------------------------------------------
   */

  const {
    data: enrolments,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      class_id,
      classes:class_id (
        id,
        level
      )
    `)
    .eq("student_id", studentId)
    .eq("status", "Active");

  if (enrolmentError) {
    console.error(
      "Failed to load student's active enrolments:",
      enrolmentError
    );

    return [];
  }

  if (
    !enrolments ||
    enrolments.length === 0
  ) {
    return [];
  }

  /*
   * ------------------------------------------------------------
   * Step 2 — Determine current level(s) and current class(es)
   * ------------------------------------------------------------
   */

  const currentClassIds =
    new Set<string>();

  const currentLevels =
    new Set<string>();

  for (
    const enrolment of enrolments as any[]
  ) {
    if (enrolment.class_id) {
      currentClassIds.add(
        enrolment.class_id
      );
    }

    const level =
      enrolment.classes?.level;

    if (level) {
      currentLevels.add(level);
    }
  }

  if (
    currentClassIds.size === 0 ||
    currentLevels.size === 0
  ) {
    return [];
  }

  /*
   * ------------------------------------------------------------
   * Step 3 — Determine eligible levels
   * ------------------------------------------------------------
   *
   * Same level + one level higher.
   */

  const eligibleLevels =
    new Set<string>();

  for (
    const currentLevel of currentLevels
  ) {
    const index =
      LEVEL_ORDER.indexOf(
        currentLevel
      );

    if (index === -1) {
      continue;
    }

    /*
     * Same level
     */

    eligibleLevels.add(
      LEVEL_ORDER[index]
    );

    /*
     * One level higher
     */

    if (
      index + 1 <
      LEVEL_ORDER.length
    ) {
      eligibleLevels.add(
        LEVEL_ORDER[index + 1]
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * Step 4 — Load future lessons
   * ------------------------------------------------------------
   *
   * Campus is intentionally NOT used as a filter.
   *
   * Candidate lessons do NOT need to contain the
   * student's enrolment.
   */

  const {
    data: lessons,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(`
      id,
      lesson_date,
      status,
      class_id,
      classes:class_id (
        id,
        level,
        class_suffix,
        start_time,
        end_time,
        campus:campus_id (
          campus_name,
          short_name
        )
      )
    `)
    .gte(
      "lesson_date",
      today
    )
    .neq(
      "status",
      "Cancelled"
    )
    .order(
      "lesson_date",
      {
        ascending: true,
      }
    );

  if (lessonError) {
    console.error(
      "Failed to load eligible make-up lessons:",
      lessonError
    );

    return [];
  }

  /*
   * ------------------------------------------------------------
   * Step 5 — Apply eligibility rules
   * ------------------------------------------------------------
   */

  const eligibleLessons =
    (lessons ?? [])
      .filter((lesson: any) => {
        const classData =
          lesson.classes;

        if (!classData) {
          return false;
        }

        /*
         * Same level OR one level higher
         */

        if (
          !eligibleLevels.has(
            classData.level
          )
        ) {
          return false;
        }

        /*
         * Never allow the student's own
         * current class.
         */

        if (
          currentClassIds.has(
            lesson.class_id
          )
        ) {
          return false;
        }

        /*
         * Private lessons are not eligible
         * for make-up booking.
         */

        const classSuffix =
          classData.class_suffix
            ?.trim()
            .toLowerCase() ?? "";

        if (
          classSuffix.startsWith(
            "private"
          )
        ) {
          return false;
        }

        return true;
      })
      .map((lesson: any) => {
        const classData =
          lesson.classes;

        const campus =
          classData?.campus;

        const level =
          classData?.level ?? "";

        const suffix =
          classData?.class_suffix ?? "";

        const className =
          `${level} ${suffix}`.trim();

        const campusName =
          campus?.short_name ||
          campus?.campus_name ||
          "";

        return {
          id: lesson.id,

          lesson_date:
            lesson.lesson_date,

          start_time:
            classData?.start_time ?? "",

          end_time:
            classData?.end_time ?? "",

          class_id:
            lesson.class_id,

          class_name:
            className,

          level:
            level,

          campus_name:
            campusName,
        };
      });

  return eligibleLessons;
}


/*
 * ============================================================
 * Shared Make-up Booking Creation
 * ============================================================
 *
 * Used by:
 *
 * - Parent Portal
 * - Admin Portal
 *
 * Booking flow:
 *
 * Available Credit
 *       ↓
 * Create Booking
 *       ↓
 * Booking = Booked
 *       ↓
 * Credit = Booked
 *
 * Attendance is NOT created here.
 *
 * Attendance is handled by the Attendance workflow later.
 *
 * ============================================================
 */

interface CreateMakeupBookingParams {
  creditId: string;

  lessonId: string;
}

export async function createMakeupBooking({
  creditId,
  lessonId,
}: CreateMakeupBookingParams) {

  /*
   * ------------------------------------------------------------
   * Step 1 — Validate input
   * ------------------------------------------------------------
   */

  if (!creditId) {
    throw new Error(
      "Make-up credit is required."
    );
  }

  if (!lessonId) {
    throw new Error(
      "Lesson is required."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 2 — Load Credit
   * ------------------------------------------------------------
   */

  const {
    data: credit,
    error: creditError,
  } = await supabase
    .from("makeup_credits")
    .select(`
      id,
      student_id,
      credits,
      status
    `)
    .eq(
      "id",
      creditId
    )
    .maybeSingle();

  if (creditError) {
    console.error(
      "MAKEUP BOOKING → CREDIT LOOKUP ERROR:",
      creditError
    );

    throw new Error(
      "Unable to verify the make-up credit."
    );
  }

  if (!credit) {
    throw new Error(
      "Make-up credit not found."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 3 — Credit must still be Available
   * ------------------------------------------------------------
   */

  if (
    credit.status !== "Available"
  ) {
    throw new Error(
      "This make-up credit is no longer available."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 4 — Load Lesson
   * ------------------------------------------------------------
   */

  const {
    data: lesson,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(`
      id,
      lesson_date,
      status
    `)
    .eq(
      "id",
      lessonId
    )
    .maybeSingle();

  if (lessonError) {
    console.error(
      "MAKEUP BOOKING → LESSON LOOKUP ERROR:",
      lessonError
    );

    throw new Error(
      "Unable to verify the selected lesson."
    );
  }

  if (!lesson) {
    throw new Error(
      "Selected lesson was not found."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 5 — Lesson must still be valid
   * ------------------------------------------------------------
   */

  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  if (
    lesson.lesson_date < today
  ) {
    throw new Error(
      "This lesson is no longer available for booking."
    );
  }

  if (
    lesson.status === "Cancelled"
  ) {
    throw new Error(
      "This lesson has been cancelled."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 6 — Duplicate protection
   *
   * Same Student
   * +
   * Same Lesson
   * +
   * Existing booking is not Cancelled
   * =
   * Reject
   * ------------------------------------------------------------
   */

  const {
    data: existingBooking,
    error: duplicateError,
  } = await supabase
    .from("makeup_bookings")
    .select("id")
    .eq(
      "student_id",
      credit.student_id
    )
    .eq(
      "lesson_id",
      lessonId
    )
    .neq(
      "status",
      "Cancelled"
    )
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error(
      "MAKEUP BOOKING → DUPLICATE CHECK ERROR:",
      duplicateError
    );

    throw new Error(
      "Unable to verify existing bookings."
    );
  }

  if (existingBooking) {
    throw new Error(
      "This student already has a booking for this lesson."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 7 — Create Booking
   *
   * attendance_id intentionally remains NULL.
   * ------------------------------------------------------------
   */

  const {
    data: booking,
    error: bookingError,
  } = await supabase
    .from("makeup_bookings")
    .insert({
      credit_id:
        credit.id,

      student_id:
        credit.student_id,

      lesson_id:
        lessonId,

      status:
        "Booked",
    })
    .select(`
      id,
      credit_id,
      student_id,
      lesson_id,
      attendance_id,
      status,
      created_at,
      completed_at
    `)
    .single();

  if (bookingError) {
    console.error(
      "MAKEUP BOOKING → CREATE ERROR:",
      bookingError
    );

    throw new Error(
      "Unable to create the make-up booking."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 8 — Credit Available → Booked
   * ------------------------------------------------------------
   */

  const {
    data: updatedCredit,
    error: creditUpdateError,
  } = await supabase
    .from("makeup_credits")
    .update({
      status: "Booked",
    })
    .eq(
      "id",
      credit.id
    )
    .eq(
      "status",
      "Available"
    )
    .select("id")
    .maybeSingle();

  if (
    creditUpdateError ||
    !updatedCredit
  ) {
    console.error(
      "MAKEUP BOOKING → CREDIT STATUS UPDATE ERROR:",
      creditUpdateError
    );

    /*
     * Compensating rollback:
     *
     * Do not leave a Booking behind if
     * the Credit could not be reserved.
     */

    await supabase
      .from("makeup_bookings")
      .delete()
      .eq(
        "id",
        booking.id
      );

    throw new Error(
      "Unable to reserve the make-up credit."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 9 — Return created Booking
   * ------------------------------------------------------------
   */

  return booking;
}


/*
 * ============================================================
 * Shared Make-up Booking Cancellation
 * ============================================================
 *
 * Used by:
 *
 * - Parent Portal
 * - Future Admin cancellation flow
 *
 * Cancellation is NOT deletion.
 *
 * Before lesson starts:
 *
 * Booked
 *   ↓
 * Cancelled
 *
 * Credit:
 *
 * Booked
 *   ↓
 * Available
 *
 * The original booking record remains in
 * makeup_bookings for history / audit purposes.
 *
 * ============================================================
 */

interface CancelMakeupBookingParams {
  bookingId: string;
}

export async function cancelMakeupBooking({
  bookingId,
}: CancelMakeupBookingParams) {

  /*
   * ------------------------------------------------------------
   * Step 1 — Validate input
   * ------------------------------------------------------------
   */

  if (!bookingId) {
    throw new Error(
      "Booking is required."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 2 — Load Booking + Lesson + Credit
   * ------------------------------------------------------------
   */

const {
  data: booking,
  error: bookingError,
} = await supabase
  .from("makeup_bookings")
  .select(`
    id,
    credit_id,
    student_id,
    lesson_id,
    status,
    lessons:lesson_id(
      lesson_date,
      status,
      class_id,
      classes:class_id(
        start_time
      )
    ),
    makeup_credits:credit_id(
      id,
      status
    )
  `)
  .eq(
    "id",
    bookingId
  )
  .maybeSingle();

  if (bookingError) {
    console.error(
      "MAKEUP CANCEL → BOOKING LOOKUP ERROR:",
      bookingError
    );

    throw new Error(
      "Unable to verify the make-up booking."
    );
  }

  if (!booking) {
    throw new Error(
      "Make-up booking not found."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 3 — Booking must still be Booked
   * ------------------------------------------------------------
   */

  if (
    booking.status !== "Booked"
  ) {
    throw new Error(
      "This make-up booking can no longer be cancelled."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 4 — Lesson must exist
   * ------------------------------------------------------------
   */

  const lesson =
    Array.isArray(booking.lessons)
      ? booking.lessons[0]
      : booking.lessons;

  if (!lesson) {
    throw new Error(
      "The lesson for this booking could not be found."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 5 — Lesson itself must not be cancelled
   * ------------------------------------------------------------
   */

  if (
    lesson.status === "Cancelled"
  ) {
    throw new Error(
      "This lesson has already been cancelled."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 6 — Lesson Start protection
   *
   * Parent cancellation is allowed ONLY before
   * the scheduled lesson start time.
   *
   * Australia/Brisbane is handled by the
   * shared Attendance Time Engine.
   * ------------------------------------------------------------
   */

const classData =
  Array.isArray(lesson.classes)
    ? lesson.classes[0]
    : lesson.classes;

if (
  !classData?.start_time
) {
  throw new Error(
    "The class start time for this booking could not be found."
  );
}

if (
  hasLessonStarted(
    lesson.lesson_date,
    classData.start_time
  )
) {
  throw new Error(
    "This make-up booking can no longer be cancelled because the lesson has started."
  );
}

  /*
   * ------------------------------------------------------------
   * Step 7 — Credit must still be Booked
   * ------------------------------------------------------------
   */

  const credit =
    Array.isArray(
      booking.makeup_credits
    )
      ? booking.makeup_credits[0]
      : booking.makeup_credits;

  if (!credit) {
    throw new Error(
      "The make-up credit for this booking could not be found."
    );
  }

  if (
    credit.status !== "Booked"
  ) {
    throw new Error(
      "The make-up credit is not in a cancellable state."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 8 — Booking Booked → Cancelled
   *
   * Conditional update protects against:
   *
   * - duplicate cancellation
   * - race conditions
   * - another process changing the booking
   * ------------------------------------------------------------
   */

  const {
    data: cancelledBooking,
    error: cancelError,
  } = await supabase
    .from("makeup_bookings")
    .update({
      status: "Cancelled",
    })
    .eq(
      "id",
      booking.id
    )
    .eq(
      "status",
      "Booked"
    )
    .select(`
      id,
      credit_id,
      student_id,
      lesson_id,
      attendance_id,
      status,
      created_at,
      completed_at
    `)
    .maybeSingle();

  if (
    cancelError ||
    !cancelledBooking
  ) {
    console.error(
      "MAKEUP CANCEL → BOOKING UPDATE ERROR:",
      cancelError
    );

    throw new Error(
      "Unable to cancel the make-up booking."
    );
  }

  /*
   * ------------------------------------------------------------
   * Step 9 — Credit Booked → Available
   * ------------------------------------------------------------
   */

  const {
    data: restoredCredit,
    error: creditRestoreError,
  } = await supabase
    .from("makeup_credits")
    .update({
      status: "Available",
    })
    .eq(
      "id",
      credit.id
    )
    .eq(
      "status",
      "Booked"
    )
    .select("id")
    .maybeSingle();

  if (
    creditRestoreError ||
    !restoredCredit
  ) {
    console.error(
      "MAKEUP CANCEL → CREDIT RESTORE ERROR:",
      creditRestoreError
    );

    /*
     * Compensating rollback:
     *
     * If Credit restoration fails,
     * do not leave the Booking Cancelled.
     */

    await supabase
      .from("makeup_bookings")
      .update({
        status: "Booked",
      })
      .eq(
        "id",
        booking.id
      )
      .eq(
        "status",
        "Cancelled"
      );

    throw new Error(
      "Unable to restore the make-up credit."
    );
  }
  /*
   * ------------------------------------------------------------
   * Step 10 — Remove linked Make-up Attendance
   *
   * Cancellation is only allowed before the lesson starts.
   *
   * If this booking has already been synchronised into Attendance,
   * remove ONLY its linked Make-up Attendance record.
   *
   * Safety conditions:
   * - attendance_id must exist
   * - attendance must belong to the same student
   * - attendance must belong to the same lesson
   * - attendance_type must be Make-up
   *
   * Regular / Trial / Excused Attendance is never touched.
   * ------------------------------------------------------------
   */

  if (cancelledBooking.attendance_id) {
    const {
      data: deletedAttendance,
      error: attendanceDeleteError,
    } = await supabase
      .from("attendance")
      .delete()
      .eq(
        "id",
        cancelledBooking.attendance_id
      )
      .eq(
        "student_id",
        cancelledBooking.student_id
      )
      .eq(
        "lesson_id",
        cancelledBooking.lesson_id
      )
      .eq(
        "attendance_type",
        "Make-up"
      )
      .select("id")
      .maybeSingle();

    if (attendanceDeleteError) {
      console.error(
        "MAKEUP CANCEL → ATTENDANCE DELETE ERROR:",
        attendanceDeleteError
      );

      /*
       * Compensating rollback:
       *
       * Attendance removal failed, therefore restore:
       *
       * Credit: Available → Booked
       * Booking: Cancelled → Booked
       *
       * This keeps Booking / Credit / Attendance
       * from being left in an inconsistent state.
       */

      await supabase
        .from("makeup_credits")
        .update({
          status: "Booked",
        })
        .eq(
          "id",
          credit.id
        )
        .eq(
          "status",
          "Available"
        );

      await supabase
        .from("makeup_bookings")
        .update({
          status: "Booked",
        })
        .eq(
          "id",
          booking.id
        )
        .eq(
          "status",
          "Cancelled"
        );

      throw new Error(
        "Unable to remove the make-up attendance."
      );
    }

    /*
     * No attendance row is also acceptable.
     *
     * This can happen if the booking was cancelled
     * before the Attendance integration created a record.
     */
    void deletedAttendance;
  }
  /*
   * ------------------------------------------------------------
   * Step 11 — Return cancelled booking
   * ------------------------------------------------------------
   */

  return cancelledBooking;
}