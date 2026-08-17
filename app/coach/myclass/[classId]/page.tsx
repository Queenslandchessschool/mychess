"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TEST_COACH_ID =
  "3fef5df8-f438-4258-9c3c-e1cf58a2d0a8";

type ClassInfo = {
  id: string;
  day: string;
  level: string;
  classSuffix: string;
  campus: string;
  startTime: string;
  endTime: string;
  academicYear: number;
  term: number;
};

type Student = {
  student_id: string;
  student_code: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
};

function formatTime(time: string | null) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

export default function CoachClassDetailPage() {
  const params = useParams();

  const classId = Array.isArray(params.classId)
    ? params.classId[0]
    : params.classId;

  const [classInfo, setClassInfo] =
    useState<ClassInfo | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;

    async function loadClassDetail() {
      setLoading(true);
      setError(null);

      /*
       * 1. Load the current schedule for this class
       *    and verify that it belongs to this Coach.
       */
      const {
        data: schedule,
        error: scheduleError,
      } = await supabase
        .from("class_schedule")
        .select(`
          id,
          academic_year,
          term,
          first_lesson,
          final_lesson,
          class_id,
          classes(
            day,
            level,
            class_suffix,
            start_time,
            end_time,
            coach_id,
            campus:campuses(
              campus_code
            )
          )
        `)
        .eq("id", classId)
        .single();

      if (scheduleError) {
        console.error(
          "CLASS DETAIL SCHEDULE ERROR:",
          scheduleError
        );

        setError(scheduleError.message);
        setLoading(false);
        return;
      }

      const classData: any = Array.isArray(schedule.classes)
  ? schedule.classes[0]
  : schedule.classes;

      if (!classData) {
        setError(
          "Class information could not be found."
        );
        setLoading(false);
        return;
      }

      /*
       * Coach permission check.
       */
      if (
        classData.coach_id !== TEST_COACH_ID
      ) {
        setError(
          "You are not assigned to this class."
        );
        setLoading(false);
        return;
      }

      const campus =
        Array.isArray(classData.campus)
          ? classData.campus[0]
              ?.campus_code ?? ""
          : classData.campus
              ?.campus_code ?? "";

      setClassInfo({
        id: schedule.class_id,

        day:
          classData.day ?? "",

        level:
          classData.level ?? "",

        classSuffix:
          classData.class_suffix?.trim() ?? "",

        campus,

        startTime:
          formatTime(
            classData.start_time
          ),

        endTime:
          formatTime(
            classData.end_time
          ),

        academicYear:
          schedule.academic_year,

        term:
          schedule.term,
      });

      /*
       * 2. Load Active Students from the
       *    current Term's Student Enrolments.
       *
       *    This follows the same source used
       *    by Admin Attendance.
       */
      const {
        data: enrolments,
        error: enrolmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          student_id,
          students(
            id,
            student_code,
            first_name,
            preferred_name,
            last_name
          )
        `)
        .eq(
          "class_id",
          schedule.class_id
        )
        .eq(
          "academic_year",
          schedule.academic_year
        )
        .eq(
          "term",
          schedule.term
        )
        .eq(
          "status",
          "Active"
        );

      if (enrolmentError) {
        console.error(
          "CLASS DETAIL STUDENT ERROR:",
          enrolmentError
        );

        setError(enrolmentError.message);
        setLoading(false);
        return;
      }

    const studentRows: Student[] =
  (enrolments ?? [])
    .map((item: any): Student | null => {
      const student = Array.isArray(item.students)
        ? item.students[0]
        : item.students;

      if (!student) {
        return null;
      }

      return {
        student_id: item.student_id,

        student_code:
          student.student_code ?? "",

        first_name:
          student.first_name ?? "",

        preferred_name:
          student.preferred_name ?? "",

        last_name:
          student.last_name ?? "",
      };
    })
    .filter(
      (student): student is Student =>
        student !== null
    )
    .sort((a, b) => {
      const lastNameCompare =
        a.last_name.localeCompare(
          b.last_name,
          undefined,
          {
            sensitivity: "base",
          }
        );

      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return a.first_name.localeCompare(
        b.first_name,
        undefined,
        {
          sensitivity: "base",
        }
      );
    });

      setStudents(studentRows);
      setLoading(false);
    }

    loadClassDetail();
  }, [classId]);

  if (loading) {
    return (
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          px-4
          py-5
          sm:px-6
          sm:py-8
          lg:px-8
        "
      >
        <p className="text-sm text-[#C8D2DF]">
          Loading class...
        </p>
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          px-4
          py-5
          sm:px-6
          sm:py-8
          lg:px-8
        "
      >
        <div
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-red-300/30
            bg-[#152F50]
            p-6
          "
        >
          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#D4AF37]
              via-[#D4AF37]/55
              to-transparent
            "
          />

          <p className="font-semibold text-red-300">
            Unable to load class
          </p>

          <p className="mt-2 text-sm text-[#C8D2DF]">
            {error ??
              "Class information could not be found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-5
        sm:px-6
        sm:py-8
        lg:px-8
      "
    >
      {/* CLASS HEADER */}
      <section className="mb-6 sm:mb-8">
        <p
          className="
            mb-3
            text-xs
            font-semibold
            uppercase
            tracking-[0.28em]
            text-[#D4AF37]
          "
        >
          MYCLASS
        </p>

        <h1
          className="
            text-3xl
            font-bold
            tracking-tight
            text-[#F4F7FB]
            sm:text-4xl
          "
        >
          {classInfo.campus} ·{" "}
          {classInfo.level}
          {classInfo.classSuffix
            ? ` · ${classInfo.classSuffix}`
            : ""}
        </h1>

        <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
          {classInfo.day}
          <span className="mx-2 text-[#D4AF37]/60">
            ·
          </span>
          {classInfo.startTime} –{" "}
          {classInfo.endTime}
        </p>

        <p className="mt-1 text-sm text-[#C8D2DF]">
          {classInfo.academicYear} · Term{" "}
          {classInfo.term}
        </p>

        <div
          className="
            mt-5
            h-[2px]
            w-24
            bg-gradient-to-r
            from-[#D4AF37]
            via-[#D4AF37]/60
            to-transparent
          "
        />
      </section>

      {/* STUDENTS */}
      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#D4AF37]/35
          bg-[#152F50]
        "
      >
        <div
          className="
            absolute
            left-0
            right-0
            top-0
            h-[3px]
            bg-gradient-to-r
            from-[#D4AF37]
            via-[#D4AF37]/55
            to-transparent
          "
        />

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-[#C8D2DF]/15
            px-5
            py-4
            sm:px-6
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#D4AF37]
            "
          >
            STUDENTS
          </p>

          <span
            className="
              rounded-full
              border
              border-[#D4AF37]/30
              bg-[#102A4A]
              px-3
              py-1
              text-xs
              font-semibold
              text-[#F4F7FB]
            "
          >
            {students.length}
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-[#C8D2DF]">
              No active students are enrolled in
              this class.
            </p>
          </div>
        ) : (
          <div>
            {students.map((student) => (
              <div
                key={student.student_id}
                className="
                  group
                  border-b
                  border-[#C8D2DF]/15
                  px-5
                  py-4
                  transition
                  duration-200
                  last:border-b-0
                  hover:bg-[#1A385C]
                  active:bg-[#1A385C]
                  sm:px-6
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <div className="min-w-0">
                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-[#F4F7FB]
                      "
                    >
                      {student.first_name}{" "}
                      {student.preferred_name
                        ? `(${student.preferred_name}) `
                        : ""}
                      {student.last_name}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-[#C8D2DF]
                      "
                    >
                      {student.student_code}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}