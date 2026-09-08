"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name?: string | null;
};

type ClassRecord = {
  id: string;
  campus_id: string | null;
  level: string | null;
  class_suffix: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
};

type Campus = {
  id: string;
  short_name: string | null;
  campus_name: string | null;
};

type TuitionRecord = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  class_id: string | null;
  status: string | null;
  is_trial: boolean;
  payment_status: string | null;
  payment_amount: number | null;
  standard_tuition: number | null;
  redeem_amount: number | null;
  amount_payable: number | null;
  created_at: string | null;
};

type TuitionConfiguration = {
  id: string;
  academic_year: number;
  term: number;
  class_id: string;
  standard_tuition: number | null;
  status: string | null;
};

type DisplayRecord = TuitionRecord & {
  student: Student;
  classRecord: ClassRecord | null;
  campus: Campus | null;
  isUpcoming?: boolean;
  tuitionOpen?: boolean;
  tuitionOpeningAt?: string | null;
  availableCredits?: number;
  redeemCredits?: number;
  unavailableReason?: string | null;
  recommendedClassId?: string | null;
};

function studentName(student: Student) {
  return (
    student.preferred_name?.trim() ||
    [student.first_name, student.last_name].filter(Boolean).join(" ").trim() ||
    "Student"
  );
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `$${Number(value).toFixed(2)}`;
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatOpeningDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function classLabel(classRecord: ClassRecord | null, campus: Campus | null) {
  if (!classRecord) return "—";
  const campusName = campus?.short_name?.trim() || campus?.campus_name?.trim() || "";
  const day = classRecord.day?.trim() || "";
  const level = classRecord.level?.trim() || "";
  const suffix = classRecord.class_suffix?.trim() || "";
  return [campusName, day, level, suffix].filter(Boolean).join(" | ");
}

function classTimeLabel(classRecord: ClassRecord | null) {
  if (!classRecord) return "";
  const start = formatTime(classRecord.start_time);
  const end = formatTime(classRecord.end_time);
  return start || end ? `${start}${start && end ? " – " : ""}${end}` : "";
}

function parentPaymentStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() === "paid" ? "Paid" : "Not Paid";
}

function paymentStatusClass(status: string) {
  return status === "Paid" ? "paid" : "not-paid";
}

function getTuitionOpeningAt(finalLesson: string | null): Date | null {
  if (!finalLesson) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(finalLesson);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;

  // Australia/Brisbane is UTC+10 year-round.
  // 08:00 Brisbane on the following day = 22:00 UTC on final-lesson day.
  return new Date(Date.UTC(year, month - 1, day, 22, 0, 0));
}

export default function ParentTuitionPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DisplayRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("all");

  async function loadTuition() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const email = user?.email?.trim().toLowerCase();
      if (!email) {
        throw new Error("Your account does not have an email address.");
      }

      // A parent email can have multiple rows in the parents table.
      // We only need the first family record, so do not use single()/maybeSingle().
      const { data: parentRows, error: parentError } = await supabase
        .from("parents")
        .select("family_id")
        .eq("email", email)
        .limit(1);

      if (parentError) throw parentError;

      const familyId = parentRows?.[0]?.family_id;
      if (!familyId) {
        setRecords([]);
        return;
      }

      const { data: studentRows, error: studentError } = await supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name")
        .eq("family_id", familyId)
        .order("first_name");

      if (studentError) throw studentError;

      const students = (studentRows ?? []) as Student[];
      const studentIds = students.map((student) => student.id);

      if (studentIds.length === 0) {
        setRecords([]);
        return;
      }

      const { data: enrolmentRows, error: enrolmentError } = await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          academic_year,
          term,
          class_id,
          status,
          is_trial,
          payment_status,
          payment_amount,
          standard_tuition,
          redeem_amount,
          amount_payable,
          created_at
        `)
        .in("student_id", studentIds)
        .eq("is_trial", false)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false })
        .order("created_at", { ascending: false });

      if (enrolmentError) throw enrolmentError;

      const tuitionRows = (enrolmentRows ?? []) as TuitionRecord[];

      // Keep the existing formal-enrolment history.
      const classIds = Array.from(
        new Set(
          tuitionRows
            .map((row) => row.class_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      // Academic Calendar is used to identify the term that is current today.
      const { data: calendarRows, error: calendarError } = await supabase
        .from("academic_calendar")
        .select("academic_year, term, start_date, end_date")
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      if (calendarError) throw calendarError;

      type CalendarRow = {
        academic_year: number;
        term: number;
        start_date: string | null;
        end_date: string | null;
      };

      const calendars = (calendarRows ?? []) as CalendarRow[];
      const now = new Date();

      const isCalendarCurrent = (calendar: CalendarRow) => {
        if (!calendar.start_date || !calendar.end_date) return false;
        const start = new Date(`${calendar.start_date}T00:00:00+10:00`);
        const end = new Date(`${calendar.end_date}T23:59:59+10:00`);
        return now >= start && now <= end;
      };

      const activeFormalByStudent = new Map<string, TuitionRecord>();

      for (const row of tuitionRows) {
        if (row.status !== "Active") continue;
        const existing = activeFormalByStudent.get(row.student_id);
        if (!existing) {
          activeFormalByStudent.set(row.student_id, row);
          continue;
        }

        const existingKey =
          existing.academic_year * 10 + existing.term;
        const rowKey = row.academic_year * 10 + row.term;
        if (rowKey > existingKey) {
          activeFormalByStudent.set(row.student_id, row);
        }
      }

      // If more than one Active formal enrolment exists, prefer the one whose
      // Academic Calendar contains today's date.
      for (const student of students) {
        const current = activeFormalByStudent.get(student.id);
        if (!current) continue;

        const currentCalendar = calendars.find(
          (calendar) =>
            calendar.academic_year === current.academic_year &&
            calendar.term === current.term &&
            isCalendarCurrent(calendar)
        );

        if (currentCalendar) {
          const matchingRows = tuitionRows
            .filter(
              (row) =>
                row.student_id === student.id &&
                row.status === "Active" &&
                row.academic_year === currentCalendar.academic_year &&
                row.term === currentCalendar.term
            )
            .sort((a, b) =>
              (b.created_at ?? "").localeCompare(a.created_at ?? "")
            );
          if (matchingRows[0]) {
            activeFormalByStudent.set(student.id, matchingRows[0]);
          }
        }
      }

      const { data: classRows, error: classError } =
        classIds.length > 0
          ? await supabase
              .from("classes")
              .select(
                "id, campus_id, level, class_suffix, day, start_time, end_time"
              )
              .in("id", classIds)
          : { data: [], error: null };

      if (classError) throw classError;

      const classes = (classRows ?? []) as ClassRecord[];
      const campusIds = Array.from(
        new Set(
          classes
            .map((item) => item.campus_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      const { data: campusRows, error: campusError } =
        campusIds.length > 0
          ? await supabase
              .from("campuses")
              .select("id, short_name, campus_name")
              .in("id", campusIds)
          : { data: [], error: null };

      if (campusError) throw campusError;

      const classMap = new Map(classes.map((item) => [item.id, item]));
      const campusMap = new Map(
        ((campusRows ?? []) as Campus[]).map((item) => [item.id, item])
      );
      const studentMap = new Map(
        students.map((student) => [student.id, student])
      );

      // ------------------------------------------------------------
      // Next-term Tuition
      // ------------------------------------------------------------
      // Tuition is NOT calculated before Re-enrolment is submitted because
      // the selected class is not known yet. Once the parent submits
      // Re-enrolment, the submission stores the final tuition snapshot:
      // selected class, Standard Tuition, available credits, Redeem Amount
      // and Amount Payable. Parent Tuition displays that submitted snapshot
      // until the corresponding formal enrolment record exists.
      // ------------------------------------------------------------
      type ReenrolmentSubmission = {
        id: string;
        student_id: string;
        current_class_id: string;
        recommended_class_id: string;
        selected_class_id: string;
        academic_year: number;
        term: number;
        status: string | null;
        payment_status: string | null;
        standard_tuition: number | null;
        redeem_amount: number | null;
        available_makeup_credits: number | null;
        amount_payable: number | null;
        submitted_at: string | null;
      };

      const { data: submissionRows, error: submissionError } = await supabase
        .from("re_enrolment_submissions")
        .select(`
          id,
          student_id,
          current_class_id,
          recommended_class_id,
          selected_class_id,
          academic_year,
          term,
          status,
          payment_status,
          standard_tuition,
          redeem_amount,
          available_makeup_credits,
          amount_payable,
          submitted_at
        `)
        .in("student_id", studentIds)
        .in("status", ["Submitted", "Completed"])
        .order("submitted_at", { ascending: false });

      if (submissionError) throw submissionError;

      const submissions = (submissionRows ?? []) as ReenrolmentSubmission[];

      const submittedClassIds = Array.from(
        new Set(
          submissions
            .map((row) => row.selected_class_id)
            .filter((value): value is string => Boolean(value))
        )
      ).filter((id) => !classMap.has(id));

      if (submittedClassIds.length > 0) {
        const { data: submittedClassRows, error: submittedClassError } =
          await supabase
            .from("classes")
            .select(
              "id, campus_id, level, class_suffix, day, start_time, end_time"
            )
            .in("id", submittedClassIds);

        if (submittedClassError) throw submittedClassError;

        for (const item of (submittedClassRows ?? []) as ClassRecord[]) {
          classMap.set(item.id, item);
        }

        const submittedCampusIds = Array.from(
          new Set<string>(
            (submittedClassRows ?? [])
              .map((item: ClassRecord) => item.campus_id)
              .filter((value): value is string => Boolean(value))
          )
        ).filter((id) => !campusMap.has(id));

        if (submittedCampusIds.length > 0) {
          const { data: submittedCampusRows, error: submittedCampusError } =
            await supabase
              .from("campuses")
              .select("id, short_name, campus_name")
              .in("id", submittedCampusIds);

          if (submittedCampusError) throw submittedCampusError;

          for (const item of (submittedCampusRows ?? []) as Campus[]) {
            campusMap.set(item.id, item);
          }
        }
      }

      // ------------------------------------------------------------
      // Tuition Configuration fallback
      // ------------------------------------------------------------
      // Some legacy enrolment records may not have a stored Standard Tuition
      // snapshot. The official class-level Tuition Configuration remains the
      // authoritative source for the same Academic Year + Term + Class and
      // can be used as a display fallback without changing historical data.
      // Do not filter by configuration status here: historical Parent Tuition
      // records must remain readable even when an old configuration is now
      // inactive.
      type TuitionConfigKey = string;
      const tuitionConfigKey = (academicYear: number, term: number, classId: string) =>
        `${academicYear}-${term}-${classId}`;

      const tuitionConfigMap = new Map<TuitionConfigKey, TuitionConfiguration>();
      const tuitionConfigClassIds = Array.from(classMap.keys());

      if (tuitionConfigClassIds.length > 0) {
        const { data: tuitionConfigRows, error: tuitionConfigError } =
          await supabase
            .from("tuition_configurations")
            .select("id, academic_year, term, class_id, standard_tuition, status")
            .in("class_id", tuitionConfigClassIds);

        if (tuitionConfigError) throw tuitionConfigError;

        for (const item of (tuitionConfigRows ?? []) as TuitionConfiguration[]) {
          tuitionConfigMap.set(
            tuitionConfigKey(item.academic_year, item.term, item.class_id),
            item
          );
        }
      }

      const displayRows = tuitionRows
        .map((row) => {
          const student = studentMap.get(row.student_id);
          if (!student) return null;

          const classRecord = row.class_id
            ? classMap.get(row.class_id) ?? null
            : null;

          const campus = classRecord?.campus_id
            ? campusMap.get(classRecord.campus_id) ?? null
            : null;

          const configuredTuition = row.class_id
            ? tuitionConfigMap.get(
                tuitionConfigKey(row.academic_year, row.term, row.class_id)
              )?.standard_tuition ?? null
            : null;

          return {
            ...row,
            standard_tuition: row.standard_tuition ?? configuredTuition,
            student,
            classRecord,
            campus,
          };
        })
        .filter(Boolean) as DisplayRecord[];

      const upcomingRows: DisplayRecord[] = [];

      for (const student of students) {
        const current = activeFormalByStudent.get(student.id);
        if (!current) continue;

        const nextAcademicYear =
          current.term >= 4 ? current.academic_year + 1 : current.academic_year;
        const nextTerm = current.term >= 4 ? 1 : current.term + 1;

        // If the target formal enrolment already exists, it is the
        // authoritative tuition/history record. Do not duplicate it with
        // the re-enrolment submission snapshot.
        const hasTargetFormalEnrolment = tuitionRows.some(
          (row) =>
            row.student_id === student.id &&
            row.is_trial === false &&
            row.academic_year === nextAcademicYear &&
            row.term === nextTerm
        );

        if (hasTargetFormalEnrolment) continue;

        // Only a submitted Re-enrolment creates a target-term tuition
        // snapshot for Parent Tuition. A parent who has not submitted yet
        // has no selected class, so no next-term tuition can be calculated.
        const submission = submissions
          .filter(
            (row) =>
              row.student_id === student.id &&
              row.academic_year === nextAcademicYear &&
              row.term === nextTerm &&
              row.status === "Submitted"
          )
          .sort((a, b) =>
            (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")
          )[0];

        if (!submission) continue;

        const selectedClass = classMap.get(submission.selected_class_id) ?? null;
        const selectedCampus = selectedClass?.campus_id
          ? campusMap.get(selectedClass.campus_id) ?? null
          : null;

        const configuredTuition = submission.selected_class_id
          ? tuitionConfigMap.get(
              tuitionConfigKey(
                submission.academic_year,
                submission.term,
                submission.selected_class_id
              )
            )?.standard_tuition ?? null
          : null;

        upcomingRows.push({
          id: `reenrolment-${submission.id}`,
          student_id: student.id,
          academic_year: submission.academic_year,
          term: submission.term,
          class_id: submission.selected_class_id,
          status: "Submitted",
          is_trial: false,
          payment_status: submission.payment_status ?? "Pending",
          payment_amount: null,
          standard_tuition: submission.standard_tuition ?? configuredTuition,
          redeem_amount: submission.redeem_amount,
          amount_payable: submission.amount_payable,
          created_at: submission.submitted_at,
          student,
          classRecord: selectedClass,
          campus: selectedCampus,
          isUpcoming: true,
          // Re-enrolment submission is the point at which the tuition
          // calculation becomes known. Payment status can still be Pending.
          tuitionOpen: true,
          tuitionOpeningAt: null,
          availableCredits: Number(submission.available_makeup_credits ?? 0),
          redeemCredits:
            submission.redeem_amount !== null && submission.redeem_amount > 0
              ? Number(submission.available_makeup_credits ?? 0)
              : 0,
          unavailableReason: null,
          recommendedClassId: submission.recommended_class_id,
        });
      }

      const allRows = [...displayRows, ...upcomingRows].sort((a, b) => {
        if (a.student_id !== b.student_id) {
          return studentName(a.student).localeCompare(studentName(b.student));
        }
        if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
        if (a.academic_year !== b.academic_year) {
          return b.academic_year - a.academic_year;
        }
        return b.term - a.term;
      });

      setRecords(allRows);
    } catch (error) {
      console.error("PARENT TUITION LOAD ERROR:", error);
      setRecords([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Tuition Fee records."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTuition();
  }, []);

  const studentOptions = useMemo(() => {
    const map = new Map<string, Student>();
    records.forEach((record) => map.set(record.student.id, record.student));
    return Array.from(map.values()).sort((a, b) =>
      studentName(a).localeCompare(studentName(b), undefined, {
        sensitivity: "base",
      })
    );
  }, [records]);

  const visibleRecords = useMemo(
    () =>
      selectedStudentId === "all"
        ? records
        : records.filter((record) => record.student_id === selectedStudentId),
    [records, selectedStudentId]
  );

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, DisplayRecord[]>();
    visibleRecords.forEach((record) => {
      const current = groups.get(record.student_id) ?? [];
      current.push(record);
      groups.set(record.student_id, current);
    });
    return Array.from(groups.entries());
  }, [visibleRecords]);

  return (
    <main className="tuition-page">
      <style jsx>{`
        .tuition-page { min-height:100%; padding:32px 16px 48px; color:#10213A; overflow-x:hidden; }
        .page-header { margin:0 auto 32px; max-width:1400px; }
        h1 { margin:0; color:#F4F7FB; font-size:30px; font-weight:700; letter-spacing:-0.025em; line-height:1.25; }
        .page-subtitle { margin:8px 0 0; color:rgba(200,210,223,.7); font-size:14px; line-height:1.5; }
        .card { overflow:hidden; border:1px solid #D9E0E8; border-top:4px solid #D4AF37; border-radius:16px; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.05); margin:0 auto; max-width:1400px; }
        .toolbar { display:flex; align-items:end; justify-content:space-between; gap:24px; padding:24px 32px; border-bottom:1px solid #D9E0E8; }
        .toolbar-title { margin:0; color:#10213A; font-size:25px; font-weight:600; line-height:1.25; }
        .toolbar-copy { margin:8px 0 0; color:#526B88; font-size:15px; line-height:1.5; }
        .tuition-note { margin:10px 0 0; max-width:980px; color:#64748B; font-size:13px; line-height:1.55; }
        .filter { min-width:230px; }
        .filter label { display:block; margin-bottom:7px; color:#56708f; font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; }
        select { width:100%; min-height:46px; padding:0 14px; border:1px solid #cfdbe7; border-radius:12px; background:#f7fafc; color:#0d2748; font-size:15px; outline:none; }
        .records { padding:24px 28px 30px; }
        .child-section + .child-section { margin-top:30px; }
        .child-header { display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:14px; }
        .child-name { margin:0; color:#10213A; font-size:22px; font-weight:600; }
        .record-count { color:#64748B; font-size:14px; }
        .table-wrap { overflow:hidden; border:1px solid #D9E0E8; border-top:4px solid #D4AF37; border-radius:16px; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.05); }
        .table-scroll { max-height:580px; overflow-y:auto; overflow-x:hidden; overscroll-behavior-x:none; overscroll-behavior-y:contain; -webkit-overflow-scrolling:touch; }
        table { width:100%; max-width:100%; min-width:0; table-layout:fixed; border-collapse:collapse; }
        th { position:sticky; top:0; z-index:10; padding:14px 12px; border-bottom:1px solid #D9E0E8; background:#F8FAFC; color:#10213A; font-size:13px; font-weight:600; letter-spacing:0; text-align:left; text-transform:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        td { height:64px; padding:16px 12px; border-bottom:1px solid #E5E7EB; color:#10213A; font-size:14px; vertical-align:top; min-width:0; overflow:hidden; }
        tr:last-child td { border-bottom:0; }
        .upcoming-row td { background:#fffdf4; }
        .table-scroll::-webkit-scrollbar { width:8px; }
        .table-scroll::-webkit-scrollbar-track { background:#F8FAFC; }
        .table-scroll::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:999px; }
        .term,.amount { font-weight:700; white-space:nowrap; }
        .class-name { font-weight:600; overflow-wrap:anywhere; }
        .class-time { margin-top:4px; color:#7890a8; font-size:12px; }
        .breakdown { line-height:1.65; white-space:normal; overflow-wrap:anywhere; }
        .breakdown .label { color:#71869d; }
        .breakdown .redeem { color:#2f6c55; }
        .opening-note { margin-top:6px; color:#8a6500; font-size:12px; line-height:1.45; white-space:normal; }
        .pay-status { display:inline-flex; align-items:center; min-height:30px; padding:0 11px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
        .pay-status.paid { background:#eaf9f0; color:#008447; }
        .pay-status.not-paid { background:#fff6df; color:#a96500; }
        .empty,.loading { padding:62px 24px; text-align:center; color:#607894; }
        .empty-title { margin:0; color:#173657; font-size:20px; font-weight:700; }
        .empty-copy { margin:9px 0 0; font-size:15px; }
        .error { margin:20px 28px 0; padding:14px 16px; border:1px solid #f2c7c7; border-radius:12px; background:#fff2f2; color:#c62828; font-size:14px; }
        .mobile-records { display:none; }
        @media (min-width:640px) {
          h1 { font-size:36px; }
          .page-subtitle { font-size:16px; }
        }
        @media (max-width:900px) {
          .tuition-page { padding:24px 16px 36px; }
          .toolbar { align-items:stretch; flex-direction:column; padding:24px 20px 20px; }
          .filter { min-width:0; }
          .records { padding:20px 16px 24px; }
          .table-wrap { display:none; }
          .mobile-records { display:block; }
          .mobile-record { padding:18px; border:1px solid #d7e1eb; border-radius:16px; background:#fff; }
          .mobile-record.upcoming { background:#fffdf4; }
          .mobile-record + .mobile-record { margin-top:12px; }
          .mobile-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
          .mobile-term { margin:0; font-size:17px; font-weight:700; }
          .mobile-class { margin-top:6px; color:#5c7591; font-size:13px; line-height:1.5; }
          .mobile-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:18px; }
          .mobile-field-label { color:#70859c; font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
          .mobile-field-value { margin-top:5px; color:#173657; font-size:14px; font-weight:600; }
          .mobile-payable { grid-column:1 / -1; padding-top:14px; border-top:1px solid #e5ebf1; }
          .mobile-payable .mobile-field-value { font-size:20px; }
          .opening-note { white-space:normal; }
        }
        @media (max-width:520px) {
          .page-subtitle { font-size:15px; }
          .child-header { align-items:flex-start; flex-direction:column; gap:4px; }
          .mobile-grid { grid-template-columns:1fr; }
          .mobile-payable { grid-column:auto; }
        }
      `}</style>

      <header className="page-header">
        <h1>Tuition Fee</h1>
        <p className="page-subtitle">
          View my children&apos;s tuition and payment records.
        </p>
      </header>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2 className="toolbar-title">Tuition &amp; Payment History</h2>
            <p className="toolbar-copy">
              Formal enrolment tuition records and next-term tuition information.
            </p>
            <p className="tuition-note">
              Tuition is based on the selected class. Make-up Credit redemption is based on the current class, with up to two available Make-up Credits redeemable toward the next term.
            </p>
          </div>

          {studentOptions.length > 1 && (
            <div className="filter">
              <label htmlFor="student-filter">Child</label>
              <select
                id="student-filter"
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
              >
                <option value="all">All Children</option>
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {studentName(student)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {errorMessage && <div className="error">{errorMessage}</div>}

        {loading ? (
          <div className="loading">Loading Tuition Fee records...</div>
        ) : visibleRecords.length === 0 ? (
          <div className="empty">
            <p className="empty-title">No Tuition Fee records found.</p>
            <p className="empty-copy">
              Tuition information will appear here for children with an active formal enrolment.
            </p>
          </div>
        ) : (
          <div className="records">
            {groupedRecords.map(([studentId, studentRecords]) => {
              const student = studentRecords[0].student;

              return (
                <section className="child-section" key={studentId}>
                  <div className="child-header">
                    <h3 className="child-name">{studentName(student)}</h3>
                    <span className="record-count">
                      {studentRecords.length} {studentRecords.length === 1 ? "record" : "records"}
                    </span>
                  </div>

                  <div className="table-wrap">
                    <div className="table-scroll">
                      <table>
                        <thead>
                        <tr>
                          <th>Term</th>
                          <th>Class</th>
                          <th>Standard Tuition</th>
                          <th>Make-up Credit</th>
                          <th>Amount Payable</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRecords.map((record) => {
                          const paymentStatus = parentPaymentStatus(record.payment_status);
                          const statusClass = paymentStatusClass(paymentStatus);

                          return (
                            <tr className={record.isUpcoming ? "upcoming-row" : ""} key={record.id}>
                              <td className="term">
                                {record.academic_year} · T{record.term}
                                {record.isUpcoming && (
                                  <div className="opening-note">Next term</div>
                                )}
                              </td>
                              <td>
                                <div className="class-name">
                                  {classLabel(record.classRecord, record.campus)}
                                </div>
                                {classTimeLabel(record.classRecord) && (
                                  <div className="class-time">{classTimeLabel(record.classRecord)}</div>
                                )}
                              </td>
                              <td className="amount">
                                {record.standard_tuition !== null
                                  ? formatMoney(record.standard_tuition)
                                  : record.isUpcoming && record.tuitionOpeningAt
                                    ? <><span>Not available yet</span><div className="opening-note">From {formatOpeningDate(record.tuitionOpeningAt)}</div></>
                                    : "—"}
                              </td>
                              <td className="breakdown">
                                <span className="label">Redeem: </span>
                                <span className="redeem">
                                  {record.redeem_amount && record.redeem_amount > 0
                                    ? `-${formatMoney(record.redeem_amount)}`
                                    : "$0.00"}
                                </span>
                                {record.isUpcoming && record.tuitionOpen && (
                                  <div className="class-time">
                                    Available credits: {record.availableCredits ?? 0} · Redeem: {record.redeemCredits ?? 0}
                                  </div>
                                )}
                              </td>
                              <td className="amount">
                                {formatMoney(record.amount_payable)}
                              </td>
                              <td>
                                <span className={`pay-status ${statusClass}`}>
                                  {paymentStatus}
                                </span>
                                {record.isUpcoming && record.tuitionOpeningAt && !record.tuitionOpen && (
                                  <div className="opening-note">Available from {formatOpeningDate(record.tuitionOpeningAt)}</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mobile-records">
                    {studentRecords.map((record) => {
                      const paymentStatus = parentPaymentStatus(record.payment_status);
                      const statusClass = paymentStatusClass(paymentStatus);

                      return (
                        <article className={`mobile-record ${record.isUpcoming ? "upcoming" : ""}`} key={record.id}>
                          <div className="mobile-top">
                            <div>
                              <h4 className="mobile-term">
                                {record.academic_year} · Term {record.term}
                              </h4>
                              <div className="mobile-class">
                                {classLabel(record.classRecord, record.campus)}
                                {classTimeLabel(record.classRecord) ? ` · ${classTimeLabel(record.classRecord)}` : ""}
                              </div>
                            </div>
                            <span className={`pay-status ${statusClass}`}>{paymentStatus}</span>
                          </div>

                          {record.isUpcoming && !record.tuitionOpen && record.tuitionOpeningAt && (
                            <div className="opening-note">
                              Next-term Tuition Fee will be available from {formatOpeningDate(record.tuitionOpeningAt)} Brisbane time.
                            </div>
                          )}

                          <div className="mobile-grid">
                            <div>
                              <div className="mobile-field-label">Standard Tuition</div>
                              <div className="mobile-field-value">
                                {record.standard_tuition !== null ? formatMoney(record.standard_tuition) : "Not available yet"}
                              </div>
                            </div>
                            <div>
                              <div className="mobile-field-label">Make-up Credit</div>
                              <div className="mobile-field-value">
                                {record.redeem_amount && record.redeem_amount > 0 ? `-${formatMoney(record.redeem_amount)}` : "$0.00"}
                              </div>
                            </div>
                            <div>
                              <div className="mobile-field-label">Payment</div>
                              <div className="mobile-field-value">{paymentStatus}</div>
                            </div>
                            <div className="mobile-payable">
                              <div className="mobile-field-label">Amount Payable</div>
                              <div className="mobile-field-value">
                                {formatMoney(record.amount_payable)}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
