import { supabase } from "@/lib/supabase";
import type {
  AttendanceHistoryRecord,
  AttendanceHistoryScope,
} from "@/components/attendance/attendanceHistoryTypes";

type AttendanceHistoryOptions = {
  scope: AttendanceHistoryScope;

  coachId?: string | null;
  studentIds?: string[];
};

export async function getAttendanceHistory({
  scope,
  coachId = null,
  studentIds = [],
}: AttendanceHistoryOptions): Promise<AttendanceHistoryRecord[]> {
  if (scope === "coach" && !coachId) {
    return [];
  }

  if (scope === "parent" && studentIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("attendance")
    .select(`
      id,
      student_id,
      lesson_id,
      attendance_status,
      attendance_type,
      created_at,
      updated_at,

      students:student_id (
        id,
        student_code,
        first_name,
        preferred_name,
        last_name,
        current_level,
        school_class
      ),

      lessons:lesson_id (
        id,
        lesson_date,
        academic_year,
        term,
        class_id,

        classes:class_id (
          class_suffix,
          level,
          start_time,
          end_time,

          campuses:campus_id (
            campus_name
          ),

          coaches:coach_id (
            id,
            display_name
          )
        )
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (scope === "parent") {
    query = query.in(
      "student_id",
      studentIds
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  const records: AttendanceHistoryRecord[] =
    (data ?? [])
      .filter((row: any) => {
        if (scope !== "coach") {
          return true;
        }

        return (
          row.lessons?.classes?.coaches?.id ===
          coachId
        );
      })
      .map((row: any) => {
        const student =
          row.students;

        const lesson =
          row.lessons;

        const classData =
          lesson?.classes;

        const campus =
          classData?.campuses;

        const coach =
          classData?.coaches;

        return {
          id: row.id,

          studentId:
            row.student_id,

          studentName:
            `${student?.first_name ?? ""}${
              student?.preferred_name?.trim()
                ? ` (${student.preferred_name.trim()})`
                : ""
            } ${
              student?.last_name ?? ""
            }`.trim(),

          studentCode:
            student?.student_code ?? null,

          classId:
            lesson?.class_id ?? "",

          className:
            [
              classData?.level,
              classData?.class_suffix,
            ]
              .filter(Boolean)
              .join(" "),

          campus:
            campus?.campus_name ?? null,

          coachId:
            coach?.id ?? null,

          coachName:
            coach?.display_name ?? null,

          lessonId:
            row.lesson_id,

          lessonDate:
            lesson?.lesson_date ?? "",

          startTime:
            classData?.start_time ?? null,

          endTime:
            classData?.end_time ?? null,

          status:
            row.attendance_status,

          attendanceType:
            row.attendance_type ?? null,

          createdAt:
            row.created_at ?? null,

          updatedAt:
            row.updated_at ?? null,

          operator: null,
        };
      });

  return records;
}