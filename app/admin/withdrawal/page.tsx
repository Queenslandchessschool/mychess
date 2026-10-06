"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";
import { getBusinessTime } from "@/lib/businessTime";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

type Student = {
  id: string;
  student_code: string | null;
  first_name: string;
  last_name: string;
};

type ClassRecord = {
  id: string;
  campus_id: string | null;
  level: string | null;
  class_suffix: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
};

type Campus = {
  id: string;
  campus_code: string | null;
  short_name: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: number;
  term: number;
  status: string;
  is_trial: boolean | null;
  start_date: string | null;
  end_date: string | null;
  join_date: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  standard_tuition: number | null;
  redeem_amount: number | null;
  amount_payable: number | null;
  tuition_configuration_id: string | null;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info";
};

function formatTime(value: string | null) {
  if (!value) return "";
  return value.substring(0, 5);
}

function buildClassName(
  classRecord: ClassRecord | null | undefined,
  campusMap: Map<string, Campus>
) {
  if (!classRecord) return "—";

  const campus = classRecord.campus_id
    ? campusMap.get(classRecord.campus_id)
    : undefined;

  const campusName =
    campus?.campus_code ??
    campus?.short_name ??
    "";

  const day = classRecord.day?.substring(0, 3) ?? "";
  const level = classRecord.level ?? "";
  const suffix = classRecord.class_suffix?.trim() ?? "";

  const time =
    classRecord.start_time && classRecord.end_time
      ? `${formatTime(classRecord.start_time)}–${formatTime(
          classRecord.end_time
        )}`
      : "";

  return [campusName, day, time, level, suffix]
    .filter(Boolean)
    .join(" | ") || "Class";
}

export default function WithdrawalPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);

  const [withdrawnEnrollments, setWithdrawnEnrollments] =
    useState<Enrollment[]>([]);

  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [studentSearch, setStudentSearch] =
    useState("");

  const [currentEnrollment, setCurrentEnrollment] =
    useState<Enrollment | null>(null);

  const [effectiveDate, setEffectiveDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [popup, setPopup] =
    useState<PopupState>({
      open: false,
      title: "",
      message: "",
      type: "info",
    });

  const campusMap = new Map(
    campuses.map((item) => [item.id, item])
  );

  useEffect(() => {
    void loadPage();
  }, []);

  function showPopup(
    title: string,
    message: string,
    type: PopupState["type"] = "info"
  ) {
    setPopup({
      open: true,
      title,
      message,
      type,
    });
  }

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      setErrorMessage("Admin access is required.");
      setLoading(false);
      return;
    }

    const [
      studentResult,
      classResult,
      campusResult,
      withdrawnResult,
    ] = await Promise.all([
      supabase
        .from("students")
        .select(
          "id, student_code, first_name, last_name"
        )
        .eq("status", "Active")
        .order("first_name")
        .order("last_name"),

      supabase
        .from("classes")
        .select(
          "id, campus_id, level, class_suffix, day, start_time, end_time, status"
        )
        .eq("status", "Active")
        .order("day")
        .order("start_time"),

      supabase
        .from("campuses")
        .select(
          "id, campus_code, short_name"
        )
        .order("short_name"),

      supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          class_id,
          academic_year,
          term,
          status,
          is_trial,
          start_date,
          end_date,
          join_date,
          payment_status,
          payment_amount,
          standard_tuition,
          redeem_amount,
          amount_payable,
          tuition_configuration_id
        `)
        .eq("status", "Withdrawn")
        .eq("is_trial", false)
        .order("end_date", {
          ascending: false,
        }),
    ]);

    if (
      studentResult.error ||
      classResult.error ||
      campusResult.error ||
      withdrawnResult.error
    ) {
      console.error(
        "WITHDRAWAL LOAD ERROR:",
        studentResult.error ??
          classResult.error ??
          campusResult.error ??
          withdrawnResult.error
      );

      setErrorMessage(
        "Unable to load withdrawal data."
      );

      setLoading(false);
      return;
    }

    setStudents(
      (studentResult.data ?? []) as Student[]
    );

    setClasses(
      (classResult.data ?? []) as ClassRecord[]
    );

    setCampuses(
      (campusResult.data ?? []) as Campus[]
    );

    setWithdrawnEnrollments(
      (withdrawnResult.data ?? []) as Enrollment[]
    );

    setLoading(false);
  }

  async function loadCurrentEnrollment(
    studentId: string
  ) {
    setCurrentEnrollment(null);
    setEffectiveDate("");
    setErrorMessage("");

    if (!studentId) return;

    const { data, error } = await supabase
      .from("student_enrolments")
      .select(`
        id,
        student_id,
        class_id,
        academic_year,
        term,
        status,
        is_trial,
        start_date,
        end_date,
        join_date,
        payment_status,
        payment_amount,
        standard_tuition,
        redeem_amount,
        amount_payable,
        tuition_configuration_id
      `)
      .eq("student_id", studentId)
      .eq("status", "Active")
      .eq("is_trial", false)
      .order("academic_year", {
        ascending: false,
      })
      .order("term", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "WITHDRAWAL ENROLLMENT LOAD ERROR:",
        error
      );

      setErrorMessage(
        "Unable to load the student's current enrolment."
      );

      return;
    }

    if (!data) {
      setErrorMessage(
        "No active regular enrolment was found."
      );

      return;
    }

    const enrollment = data as Enrollment;

    setCurrentEnrollment(enrollment);

    const today =
      getBusinessTime().dateKey;

    const tomorrowDate = new Date(
      `${today}T00:00:00Z`
    );

    tomorrowDate.setUTCDate(
      tomorrowDate.getUTCDate() + 1
    );

    const tomorrow = tomorrowDate
      .toISOString()
      .substring(0, 10);

    setEffectiveDate(
      enrollment.start_date &&
        enrollment.start_date > tomorrow
        ? enrollment.start_date
        : tomorrow
    );
  }

  async function handleStudentChange(
    studentId: string
  ) {
    setSelectedStudentId(studentId);
    await loadCurrentEnrollment(studentId);
  }

  function validateWithdrawal() {
    if (!currentEnrollment) {
      setErrorMessage(
        "Please select a student with an active enrolment."
      );
      return false;
    }

    if (!effectiveDate) {
      setErrorMessage(
        "Please select the Withdrawal Effective Date."
      );
      return false;
    }

    const today =
      getBusinessTime().dateKey;

    if (effectiveDate <= today) {
      setErrorMessage(
        "Withdrawal Effective Date must be after today. The selected date is the first day the student will no longer be active."
      );
      return false;
    }

    if (
      currentEnrollment.start_date &&
      effectiveDate <=
        currentEnrollment.start_date
    ) {
      setErrorMessage(
        "Withdrawal Effective Date must be after the current enrolment start date."
      );
      return false;
    }

    if (
      currentEnrollment.end_date &&
      effectiveDate >
        currentEnrollment.end_date
    ) {
      setErrorMessage(
        "Withdrawal Effective Date cannot be after the current enrolment end date."
      );
      return false;
    }

    const student = students.find(
      (item) =>
        item.id === selectedStudentId
    );

    if (!student) {
      setErrorMessage(
        "Student could not be found."
      );
      return false;
    }

    setErrorMessage("");
    return true;
  }

  function handleConfirmRequest() {
    if (!validateWithdrawal()) {
      return;
    }

    setConfirmOpen(true);
  }

  async function handleWithdrawal() {
    if (!currentEnrollment) {
      return;
    }

    const student = students.find(
      (item) =>
        item.id === selectedStudentId
    );

    if (!student) {
      setErrorMessage(
        "Student could not be found."
      );
      setConfirmOpen(false);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setConfirmOpen(false);

    try {
      /*
       * Mid-term Withdrawal
       *
       * Active -> Withdrawn
       * end_date -> Withdrawal Effective Date
       *
       * Historical records are retained.
       * No new enrolment is created.
       * No tuition adjustment is created.
       * Attendance Core is not modified.
       */

      const { error: updateError } =
        await supabase
          .from("student_enrolments")
          .update({
            status: "Withdrawn",
            end_date: effectiveDate,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentEnrollment.id
          )
          .eq("status", "Active");

      if (updateError) {
        throw updateError;
      }

      await loadWithdrawalHistory();

      showPopup(
        "Withdrawal Completed",
        `${student.first_name} ${student.last_name} has been withdrawn from the current enrolment effective ${effectiveDate}.`,
        "success"
      );

      setCurrentEnrollment(null);
      setSelectedStudentId("");
      setStudentSearch("");
      setEffectiveDate("");
    } catch (error: any) {
      console.error(
        "WITHDRAWAL ERROR:",
        error
      );

      setErrorMessage(
        error?.message ??
          "Unable to complete the withdrawal."
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadWithdrawalHistory() {
    setHistoryLoading(true);

    const { data, error } =
      await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          class_id,
          academic_year,
          term,
          status,
          is_trial,
          start_date,
          end_date,
          join_date,
          payment_status,
          payment_amount,
          standard_tuition,
          redeem_amount,
          amount_payable,
          tuition_configuration_id
        `)
        .eq("status", "Withdrawn")
        .eq("is_trial", false)
        .order("end_date", {
          ascending: false,
        });

    if (error) {
      console.error(
        "WITHDRAWAL HISTORY ERROR:",
        error
      );
      setHistoryLoading(false);
      return;
    }

    setWithdrawnEnrollments(
      (data ?? []) as Enrollment[]
    );

    setHistoryLoading(false);
  }

  function getStudent(studentId: string) {
    return students.find(
      (student) =>
        student.id === studentId
    );
  }

  if (loading) {
    return (
      <ChessboardBackground>
        <main className="min-h-screen">
          <div className="mx-auto max-w-[1600px] px-6 py-10 text-[#F4F7FB]">
            Loading...
          </div>
        </main>
      </ChessboardBackground>
    );
  }

  const selectedStudent = students.find(
    (item) =>
      item.id === selectedStudentId
  );

  return (
    <ChessboardBackground>
      <main className="min-h-screen">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              ENROLMENT
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Mid-term Withdrawal
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Withdraw a student from their current enrolment while preserving all historical records.
            </p>
          </div>

          <div className="rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-5 shadow-xl">

            <div className="grid grid-cols-1 gap-5">

              <div>

                <label className="mb-2 block text-sm font-medium text-[#F4F7FB]">
                  Student
                </label>

                <div className="space-y-2">

                  <input
                    type="text"
                    placeholder="Search student by code or name..."
                    value={studentSearch}
                    onChange={(e) =>
                      setStudentSearch(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />

                  <select
                    value={selectedStudentId}
                    onChange={(e) =>
                      void handleStudentChange(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  >
                    <option value="">
                      Select Student
                    </option>

                    {students
                      .filter((student) => {
                        const keyword =
                          studentSearch
                            .trim()
                            .toLowerCase();

                        if (!keyword) {
                          return true;
                        }

                        return [
                          student.student_code,
                          student.first_name,
                          student.last_name,
                        ]
                          .filter(Boolean)
                          .some((value) =>
                            String(value)
                              .toLowerCase()
                              .includes(
                                keyword
                              )
                          );
                      })
                      .map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.student_code
                            ? `${student.student_code} — `
                            : ""}
                          {student.first_name}{" "}
                          {student.last_name}
                        </option>
                      ))}
                  </select>

                </div>
              </div>

              {currentEnrollment && (
                <>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#C8D2DF]/60">
                        Student
                      </p>

                      <p className="mt-1 font-semibold text-[#F4F7FB]">
                        {selectedStudent
                          ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                          : "—"}
                      </p>

                      {selectedStudent?.student_code && (
                        <p className="mt-1 text-xs text-[#C8D2DF]/65">
                          {selectedStudent.student_code}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#C8D2DF]/60">
                        Current Status
                      </p>

                      <p className="mt-1 font-semibold text-[#F4F7FB]">
                        Active
                      </p>

                      <p className="mt-1 text-xs text-[#C8D2DF]/65">
                        Regular enrolment
                      </p>
                    </div>

                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">

                    <p className="text-xs uppercase tracking-wider text-[#C8D2DF]/60">
                      Current Class
                    </p>

                    <p className="mt-1 font-semibold text-[#F4F7FB]">
                      {buildClassName(
                        classes.find(
                          (item) =>
                            item.id ===
                            currentEnrollment.class_id
                        ),
                        campusMap
                      )}
                    </p>

                    <p className="mt-1 text-xs text-[#C8D2DF]/65">
                      Term{" "}
                      {currentEnrollment.term},{" "}
                      {currentEnrollment.academic_year}
                    </p>

                    <p className="mt-1 text-xs text-[#C8D2DF]/65">
                      Join Date:{" "}
                      {currentEnrollment.join_date ??
                        "—"}
                    </p>

                    <p className="mt-1 text-xs text-[#C8D2DF]/65">
                      Start Date:{" "}
                      {currentEnrollment.start_date ??
                        "—"}
                    </p>

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium text-[#F4F7FB]">
                      Withdrawal Effective Date
                    </label>

                    <input
                      type="date"
                      value={effectiveDate}
                      min={
                        currentEnrollment.start_date ??
                        undefined
                      }
                      max={
                        currentEnrollment.end_date ??
                        undefined
                      }
                      onChange={(e) =>
                        setEffectiveDate(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    />

                    <p className="mt-2 text-xs text-[#C8D2DF]/65">
                      This is the first day the student will no longer be active. The previous day remains the student's last active day.
                    </p>

                  </div>

                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-4">

                    <p className="text-sm font-semibold text-[#F4F7FB]">
                      Before confirming
                    </p>

                    <ul className="mt-2 space-y-1 text-sm text-[#C8D2DF]/80">

                      <li>
                        • The current enrolment will change from Active to Withdrawn.
                      </li>

                      <li>
                        • Historical attendance, tuition, payment, leave and make-up records will be retained.
                      </li>

                      <li>
                        • The Student Master record will remain.
                      </li>

                      <li>
                        • No new enrolment will be created.
                      </li>

                      <li>
                        • No tuition adjustment will be created automatically.
                      </li>

                      <li>
                        • Attendance Core will not be changed.
                      </li>

                    </ul>

                  </div>

                </>
              )}

              {errorMessage && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {currentEnrollment && (
                <div className="flex justify-end pt-2">

                  <button
                    type="button"
                    onClick={
                      handleConfirmRequest
                    }
                    disabled={saving}
                    className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#10213A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Processing..."
                      : "Confirm Withdrawal"}
                  </button>

                </div>
              )}

            </div>
          </div>

          {/* Withdrawal History */}

          <div className="mt-6 overflow-hidden rounded-[18px] border border-[#D4AF37]/30 bg-white shadow-xl">

            <div className="border-t-4 border-[#D4AF37] px-5 py-5 sm:px-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-lg font-bold text-[#10213A] sm:text-xl">
                    Withdrawal History
                  </h2>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Students who have been withdrawn from a formal enrolment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadWithdrawalHistory()
                  }
                  disabled={historyLoading}
                  className="rounded-lg border border-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#10213A] transition hover:bg-[#D4AF37]/10 disabled:opacity-50"
                >
                  {historyLoading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

              </div>

              {withdrawnEnrollments.length === 0 ? (
                <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-sm text-[#64748B]">
                  No withdrawn enrolments found.
                </div>
              ) : (
                <div className="mt-5 space-y-3">

                  {withdrawnEnrollments.map(
                    (enrollment) => {
                      const student =
                        getStudent(
                          enrollment.student_id
                        );

                      const classRecord =
                        classes.find(
                          (item) =>
                            item.id ===
                            enrollment.class_id
                        );

                      return (
                        <div
                          key={enrollment.id}
                          className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                        >

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">

                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
                                Student
                              </p>

                              <p className="mt-1 font-semibold text-[#10213A]">
                                {student
                                  ? `${student.first_name} ${student.last_name}`
                                  : "Student"}
                              </p>

                              {student?.student_code && (
                                <p className="mt-1 text-xs text-[#64748B]">
                                  {student.student_code}
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
                                Status
                              </p>

                              <p className="mt-1 inline-flex rounded-full bg-[#102B4D] px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                                Withdrawn
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
                                Effective Date
                              </p>

                              <p className="mt-1 font-semibold text-[#10213A]">
                                {enrollment.end_date ??
                                  "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
                                Class
                              </p>

                              <p className="mt-1 font-semibold text-[#10213A]">
                                {buildClassName(
                                  classRecord,
                                  campusMap
                                )}
                              </p>

                              <p className="mt-1 text-xs text-[#64748B]">
                                Term{" "}
                                {enrollment.term},{" "}
                                {enrollment.academic_year}
                              </p>
                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>
          </div>

          {/* Withdrawal Rules */}

          <div className="mt-6 overflow-hidden rounded-[18px] border border-[#D4AF37]/30 bg-white shadow-xl">

            <div className="border-t-4 border-[#D4AF37] px-5 py-5 sm:px-6">

              <h2 className="text-lg font-bold text-[#10213A] sm:text-xl">
                Withdrawal Rules
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                Mid-term Withdrawal is separate from Transfer, Leave, Special Arrangement and Re-enrolment.
              </p>

              <div className="mt-4 grid gap-3 text-sm text-[#475569] md:grid-cols-2">

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="font-semibold text-[#10213A]">
                    Active → Withdrawn
                  </p>

                  <p className="mt-1">
                    The current regular enrolment is closed for future attendance.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="font-semibold text-[#10213A]">
                    Student Master retained
                  </p>

                  <p className="mt-1">
                    The student is not deleted and can return later.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="font-semibold text-[#10213A]">
                    Same-term return
                  </p>

                  <p className="mt-1">
                    A future reactivation flow can change Withdrawn back to Active.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="font-semibold text-[#10213A]">
                    Future-term return
                  </p>

                  <p className="mt-1">
                    Use the existing student re-enrolment process and create the new enrolment.
                  </p>
                </div>

              </div>

            </div>
          </div>

        </div>
      </main>

      {/* MyCHESS Confirmation Modal */}

      {confirmOpen && currentEnrollment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#011029]/75 px-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#102B4D] shadow-2xl">

            <div className="border-b border-[#D4AF37]/20 px-6 py-5">

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                CONFIRM ACTION
              </p>

              <h3 className="mt-1 text-xl font-bold text-[#F4F7FB]">
                Confirm Withdrawal
              </h3>

            </div>

            <div className="px-6 py-5">

              <p className="text-sm leading-6 text-[#F4F7FB]">
                Are you sure you want to withdraw{" "}
                <span className="font-semibold text-[#D4AF37]">
                  {selectedStudent
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                    : "this student"}
                </span>
                ?
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#C8D2DF]/70">
                    Current status
                  </span>

                  <span className="font-semibold text-[#F4F7FB]">
                    Active
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-[#C8D2DF]/70">
                    New status
                  </span>

                  <span className="font-semibold text-[#D4AF37]">
                    Withdrawn
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-[#C8D2DF]/70">
                    Effective date
                  </span>

                  <span className="font-semibold text-[#F4F7FB]">
                    {effectiveDate}
                  </span>
                </div>

              </div>

              <p className="mt-4 text-xs leading-5 text-[#C8D2DF]/65">
                Historical records will be retained. No new enrolment or automatic tuition adjustment will be created.
              </p>

            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setConfirmOpen(false)
                }
                disabled={saving}
                className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-[#F4F7FB] transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleWithdrawal()
                }
                disabled={saving}
                className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#10213A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Processing..."
                  : "Confirm Withdrawal"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* MyCHESS Result Modal */}

      {popup.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#011029]/75 px-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-white shadow-2xl">

            <div className="border-t-4 border-[#D4AF37] px-6 py-6">

              <h3 className="text-xl font-bold text-[#10213A]">
                {popup.title}
              </h3>

              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#475569]">
                {popup.message}
              </p>

              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setPopup((current) => ({
                      ...current,
                      open: false,
                    }))
                  }
                  className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#10213A] transition hover:brightness-110"
                >
                  OK
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

    </ChessboardBackground>
  );
}