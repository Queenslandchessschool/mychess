// ======================================================
// MyCHESS Coach Scope
//
// Shared Coach Scope Utility
//
// Purpose:
// - Provide ONE standard Coach scope
// - Used by Coach Portal modules
// - Current scope = all Active Students belonging to
//   all Classes assigned to the current Coach
//   for the current Academic Year / Term
//
// IMPORTANT:
// - This is NOT Current Class Scope.
// - This is Coach-wide Scope.
// - A Coach may have multiple Classes.
// - Students from all assigned Classes belong to the
//   Coach Scope.
// - Duplicate students are removed.
// - Admin Super Scope is NOT handled here.
//
// Shared by:
// - Coach Attendance
// - Coach Make-up
// - Future Coach modules
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Types
// ======================================================

export interface CoachScopeStudent {
  student_id: string;
  student_code: string;
  first_name: string;
  preferred_name: string | null;
  last_name: string;
  current_level: string | null;
}

export interface CoachScopeResult {
  classIds: string[];
  students: CoachScopeStudent[];
}


// ======================================================
// Get Current Coach Scope
//
// Scope:
//
// Current Coach
//      ↓
// Current Academic Year / Term
//      ↓
// All assigned Classes
//      ↓
// All Active Student Enrolments
//      ↓
// Unique Students
//
// IMPORTANT:
// This function does NOT use the current lesson/class.
//
// It returns the Coach-wide student scope.
// ======================================================

export async function getCoachScope(
  coachId: string,
  academicYear: number,
  term: number
): Promise<CoachScopeResult> {

  // ====================================================
  // 1. Load Classes assigned to this Coach
  // ====================================================

  const {
    data: scheduleData,
    error: scheduleError,
  } = await supabase
    .from("class_schedule")
    .select(`
      class_id,
      classes!inner(
        coach_id
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
      "classes.coach_id",
      coachId
    );

  if (scheduleError) {
    console.error(
      "COACH SCOPE → CLASS SCHEDULE ERROR:",
      scheduleError
    );

    throw scheduleError;
  }


  // ====================================================
  // 2. Build unique Class IDs
  //
  // A class may have multiple schedule records.
  // Therefore we MUST de-duplicate class_id.
  // ====================================================

  const classIds = Array.from(
    new Set(
      (scheduleData ?? [])
        .map(
          (row: any) =>
            row.class_id
        )
        .filter(Boolean)
    )
  );


  // ====================================================
  // 3. No Classes
  // ====================================================

  if (
    classIds.length === 0
  ) {
    return {
      classIds: [],
      students: [],
    };
  }


  // ====================================================
  // 4. Load Active Student Enrolments
  //
  // Coach Scope =
  // all Active Students from all assigned Classes.
  // ====================================================

  const {
    data: enrolments,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      student_id,
      class_id,
      students(
  id,
  student_code,
  first_name,
  preferred_name,
  last_name,
  current_level
)
    `)
    .in(
      "class_id",
      classIds
    )
    .eq(
      "academic_year",
      academicYear
    )
    .eq(
      "term",
      term
    )
    .eq(
      "status",
      "Active"
    );

  if (enrolmentError) {
    console.error(
      "COACH SCOPE → ENROLMENT ERROR:",
      enrolmentError
    );

    throw enrolmentError;
  }


  // ====================================================
  // 5. Build Unique Student Scope
  //
  // A student may appear in more than one assigned
  // class.
  //
  // The Coach Scope must contain the student only once.
  // ====================================================

  const studentMap =
    new Map<
      string,
      CoachScopeStudent
    >();


  for (
    const item of enrolments ?? []
  ) {

    const student =
      Array.isArray(
        item.students
      )
        ? item.students[0]
        : item.students;


    if (!student) {
      continue;
    }


    if (
      studentMap.has(
        item.student_id
      )
    ) {
      continue;
    }


    studentMap.set(
      item.student_id,
      {
        student_id:
          item.student_id,

        student_code:
          student.student_code ??
          "",

        first_name:
          student.first_name ??
          "",

        preferred_name:
          student.preferred_name ??
          null,

        last_name:
          student.last_name ??
          "",
        current_level:
  student.current_level ??
  null,
  
      }
    );
  }


  // ====================================================
  // 6. Sort Students
  //
  // Same standard used by Class Detail:
  // Last Name → First Name
  // ====================================================

  const students =
    Array.from(
      studentMap.values()
    ).sort(
      (a, b) => {

        const lastNameCompare =
          a.last_name.localeCompare(
            b.last_name,
            undefined,
            {
              sensitivity:
                "base",
            }
          );


        if (
          lastNameCompare !== 0
        ) {
          return lastNameCompare;
        }


        return a.first_name.localeCompare(
          b.first_name,
          undefined,
          {
            sensitivity:
              "base",
          }
        );
      }
    );


  // ====================================================
  // 7. Return
  // ====================================================

  return {
    classIds,
    students,
  };
}