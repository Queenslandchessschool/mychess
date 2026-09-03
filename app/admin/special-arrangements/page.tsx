"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

// ======================================================
// MyCHESS — Special Holiday Arrangement
// Admin
//
// Phase 2A
// - Admin only
// - Formal Active Enrolment only
// - Trial enrolments excluded
// - Future lessons preview / mapping
// - Create / View / Edit / Cancel
//
// IMPORTANT:
// This page does NOT modify:
// - attendance
// - lessons.chargeable
// - student_enrolments
// - academic_calendar_events
// - leave_records
// - makeup_credits
// - tuition_configurations
// ======================================================

// ======================================================
// Types
// ======================================================

type EnrolmentOption = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  class_id: string;
  join_date: string | null;
  student_name: string;
  class_name: string;
};

type LessonOption = {
  id: string;
  lesson_date: string;
  class_name: string;
  status: string;
  chargeable: boolean;
};

type ArrangementRecord = {
  id: string;
  student_enrolment_id: string;
  start_date: string;
  end_date: string;
  status: "Active" | "Cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;

  student_name: string;
  class_name: string;
  academic_year: number | null;
  term: number | null;
  affected_lesson_count: number;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error";
};

type FormState = {
  student_enrolment_id: string;
  start_date: string;
  end_date: string;
  notes: string;
};

const emptyForm: FormState = {
  student_enrolment_id: "",
  start_date: "",
  end_date: "",
  notes: "",
};

// ======================================================
// Helpers
// ======================================================

function getBrisbaneToday(): string {
  return new Date().toLocaleDateString(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
    }
  );
}

function formatDate(value: string): string {
  if (!value) return "—";

  const [year, month, day] =
    value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function buildClassName(
  classRecord: any
): string {
  const level =
    classRecord?.level ?? "";

  const suffix =
    classRecord?.class_suffix?.trim() ?? "";

  const day =
    classRecord?.day
      ?.substring(0, 3) ?? "";

  if (suffix && day) {
    return `${day} | ${level} | ${suffix}`;
  }

  if (suffix) {
    return `${level} | ${suffix}`;
  }

  if (day) {
    return `${day} | ${level}`;
  }

  return level || "Class";
}

// ======================================================
// Page
// ======================================================

export default function SpecialArrangementsPage() {
  const [enrolments, setEnrolments] =
    useState<EnrolmentOption[]>([]);

  const [arrangements, setArrangements] =
    useState<ArrangementRecord[]>([]);

  const [affectedLessons, setAffectedLessons] =
    useState<LessonOption[]>([]);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [
    editingArrangement,
    setEditingArrangement,
  ] = useState<ArrangementRecord | null>(
    null
  );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [enrolmentPickerOpen, setEnrolmentPickerOpen] =
    useState(false);

  const [enrolmentSearchTerm, setEnrolmentSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [loadingLessons, setLoadingLessons] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [popup, setPopup] =
    useState<PopupState>({
      open: false,
      title: "",
      message: "",
      type: "info",
    });

  const [confirmCancelArrangement, setConfirmCancelArrangement] =
    useState<ArrangementRecord | null>(null);

  // ======================================================
  // Popup
  // ======================================================

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

  function closePopup() {
    setPopup((previous) => ({
      ...previous,
      open: false,
    }));
  }

  // ======================================================
  // Load Page
  // ======================================================

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      setErrorMessage(
        "Admin access is required."
      );
      setLoading(false);
      return;
    }

    await Promise.all([
      loadEnrolments(),
      loadArrangements(),
    ]);

    setLoading(false);
  }

  // ======================================================
  // Load Formal Active Enrolments
  //
  // IMPORTANT:
  // - is_trial = false
  // - status = Active
  // ======================================================

  async function loadEnrolments() {
    const {
      data,
      error,
    } = await supabase
      .from("student_enrolments")
      .select(`
        id,
        student_id,
        academic_year,
        term,
        class_id,
        join_date,
        is_trial,
        status,
        students:student_id (
          first_name,
          last_name
        ),
        classes:class_id (
          level,
          class_suffix,
          day
        )
      `)
      .eq("status", "Active")
      .eq("is_trial", false)
      .order(
        "academic_year",
        {
          ascending: false,
        }
      )
      .order("term")
      .order("student_id");

    if (error) {
      console.error(
        "SPECIAL ARRANGEMENT → ENROLMENT LOAD ERROR:",
        error
      );

      setErrorMessage(
        "Unable to load formal enrolments."
      );

      return;
    }

    const options: EnrolmentOption[] =
      (data ?? [])
        .filter(
          (item: any) =>
            item.status === "Active" &&
            item.is_trial === false
        )
        .map(
          (item: any) => ({
            id: item.id,
            student_id:
              item.student_id,
            academic_year:
              item.academic_year,
            term: item.term,
            class_id:
              item.class_id,
            join_date:
              item.join_date ?? null,

            student_name:
              `${item.students?.first_name ?? ""} ${
                item.students?.last_name ?? ""
              }`.trim(),

            class_name:
              buildClassName(
                item.classes
              ),
          })
        );

    setEnrolments(options);
  }

  // ======================================================
  // Load Existing Arrangements
  // ======================================================

  async function loadArrangements() {
    const {
      data,
      error,
    } = await supabase
      .from("special_arrangements")
      .select(`
        id,
        student_enrolment_id,
        start_date,
        end_date,
        status,
        notes,
        created_at,
        updated_at,
        student_enrolments:student_enrolment_id (
          academic_year,
          term,
          is_trial,
          students:student_id (
            first_name,
            last_name
          ),
          classes:class_id (
            level,
            class_suffix,
            day
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "SPECIAL ARRANGEMENT → LOAD ERROR:",
        error
      );

      setErrorMessage(
        "Unable to load Special Arrangements."
      );

      return;
    }

    const arrangementIds =
      (data ?? []).map(
        (item: any) => item.id
      );

    let lessonCountMap =
      new Map<string, number>();

    if (
      arrangementIds.length > 0
    ) {
      const {
        data: lessonRows,
        error: lessonError,
      } = await supabase
        .from(
          "special_arrangement_lessons"
        )
        .select(
          "special_arrangement_id"
        )
        .in(
          "special_arrangement_id",
          arrangementIds
        );

      if (lessonError) {
        console.error(
          "SPECIAL ARRANGEMENT → LESSON MAP LOAD ERROR:",
          lessonError
        );

        setErrorMessage(
          "Unable to load affected lessons."
        );

        return;
      }

      for (
        const row of lessonRows ?? []
      ) {
        const current =
          lessonCountMap.get(
            row.special_arrangement_id
          ) ?? 0;

        lessonCountMap.set(
          row.special_arrangement_id,
          current + 1
        );
      }
    }

    const rows: ArrangementRecord[] =
      (data ?? []).map(
        (item: any) => ({
          id: item.id,

          student_enrolment_id:
            item.student_enrolment_id,

          start_date:
            item.start_date,

          end_date:
            item.end_date,

          status:
            item.status ===
            "Cancelled"
              ? "Cancelled"
              : "Active",

          notes:
            item.notes ?? null,

          created_at:
            item.created_at,

          updated_at:
            item.updated_at,

          student_name:
            `${item.student_enrolments?.students?.first_name ?? ""} ${
              item.student_enrolments?.students?.last_name ?? ""
            }`.trim(),

          class_name:
            buildClassName(
              item.student_enrolments
                ?.classes
            ),

          academic_year:
            item.student_enrolments
              ?.academic_year ??
            null,

          term:
            item.student_enrolments
              ?.term ??
            null,

          affected_lesson_count:
            lessonCountMap.get(
              item.id
            ) ?? 0,
        })
      );

    setArrangements(rows);
  }

  // ======================================================
  // Searchable Formal Enrolment Picker
  // ======================================================

  const filteredEnrolments =
    useMemo(() => {
      const query =
        enrolmentSearchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return enrolments;
      }

      return enrolments.filter(
        (item) =>
          item.student_name
            .toLowerCase()
            .includes(query) ||
          item.class_name
            .toLowerCase()
            .includes(query) ||
          String(item.academic_year)
            .includes(query) ||
          String(item.term)
            .includes(query)
      );
    }, [
      enrolments,
      enrolmentSearchTerm,
    ]);

  // ======================================================
  // Selected Enrolment
  // ======================================================

  const selectedEnrolment =
    useMemo(
      () =>
        enrolments.find(
          (item) =>
            item.id ===
            form.student_enrolment_id
        ) ?? null,
      [
        enrolments,
        form.student_enrolment_id,
      ]
    );

  // ======================================================
  // Pre-First-Lesson Gate
  //
  // Special Arrangement may only be created or edited
  // before the student's first enrolled lesson begins.
  // join_date is the authoritative enrolment start date.
  // ======================================================

  function isPreFirstLessonWindow(
    enrolment: EnrolmentOption | null
  ): boolean {
    if (!enrolment?.join_date) {
      return false;
    }

    return (
      getBrisbaneToday() <
      enrolment.join_date
    );
  }

  // ======================================================
  // Load Affected Future Lessons
  // ======================================================

  async function loadAffectedLessons(
    enrolmentId: string,
    startDate: string,
    endDate: string
  ) {
    setAffectedLessons([]);

    if (
      !enrolmentId ||
      !startDate ||
      !endDate
    ) {
      return;
    }

    const enrolment =
      enrolments.find(
        (item) =>
          item.id === enrolmentId
      );

    if (!enrolment) {
      return;
    }

    if (
      endDate < startDate
    ) {
      return;
    }

    const today =
      getBrisbaneToday();

    setLoadingLessons(true);

    const {
      data,
      error,
    } = await supabase
      .from("lessons")
      .select(`
        id,
        lesson_date,
        status,
        chargeable,
        class_id,
        classes:class_id (
          level,
          class_suffix,
          day
        )
      `)
      .eq(
        "class_id",
        enrolment.class_id
      )
      .eq(
        "academic_year",
        enrolment.academic_year
      )
      .eq(
        "term",
        enrolment.term
      )
      .gte(
        "lesson_date",
        startDate > today
          ? startDate
          : today
      )
      .lte(
        "lesson_date",
        endDate
      )
      .neq(
        "status",
        "Cancelled"
      )
      .order(
        "lesson_date"
      );

    if (error) {
      console.error(
        "SPECIAL ARRANGEMENT → AFFECTED LESSON LOAD ERROR:",
        error
      );

      showPopup(
        "Unable to Load Lessons",
        "The affected lesson preview could not be loaded.",
        "error"
      );

      setLoadingLessons(false);
      return;
    }

    const options: LessonOption[] =
      (data ?? []).map(
        (lesson: any) => ({
          id: lesson.id,
          lesson_date:
            lesson.lesson_date,
          class_name:
            buildClassName(
              lesson.classes
            ),
          status:
            lesson.status,
          chargeable:
            lesson.chargeable,
        })
      );

    setAffectedLessons(
      options
    );

    setLoadingLessons(false);
  }

  // ======================================================
  // Form Changes
  // ======================================================

  function updateForm(
    field: keyof FormState,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleEnrolmentChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      student_enrolment_id:
        value,
    }));

    setAffectedLessons([]);

    if (
      form.start_date &&
      form.end_date &&
      value
    ) {
      void loadAffectedLessons(
        value,
        form.start_date,
        form.end_date
      );
    }
  }

  function handleStartDateChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      start_date: value,
    }));

    if (
      form.student_enrolment_id &&
      value &&
      form.end_date
    ) {
      void loadAffectedLessons(
        form.student_enrolment_id,
        value,
        form.end_date
      );
    }
  }

  function handleEndDateChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      end_date: value,
    }));

    if (
      form.student_enrolment_id &&
      form.start_date &&
      value
    ) {
      void loadAffectedLessons(
        form.student_enrolment_id,
        form.start_date,
        value
      );
    }
  }

  // ======================================================
  // Reset Form
  // ======================================================

  function resetForm() {
    setForm(emptyForm);
    setEditingArrangement(null);
    setAffectedLessons([]);
    setEnrolmentPickerOpen(false);
    setEnrolmentSearchTerm("");
  }

  // ======================================================
  // Validate Form
  // ======================================================

  function validateForm(): string | null {
    if (
      !form.student_enrolment_id
    ) {
      return "Please select a formal active enrolment.";
    }

    if (!form.start_date) {
      return "Please select a start date.";
    }

    if (!form.end_date) {
      return "Please select an end date.";
    }

    if (
      form.end_date <
      form.start_date
    ) {
      return "End Date cannot be earlier than Start Date.";
    }

    const today =
      getBrisbaneToday();

    if (
      form.end_date <
      today
    ) {
      return "The Special Arrangement must apply to future lessons.";
    }

    const enrolment =
      enrolments.find(
        (item) =>
          item.id ===
          form.student_enrolment_id
      );

    if (!enrolment) {
      return "The selected formal enrolment is no longer available.";
    }

    if (!enrolment.join_date) {
      return "The selected enrolment does not have a Join Date. A Special Arrangement can only be recorded when the first enrolled lesson date is known.";
    }

    if (!isPreFirstLessonWindow(enrolment)) {
      return "Special Arrangements must be agreed and recorded before the student's first enrolled lesson begins. New or edited arrangements are no longer available for this enrolment.";
    }

    return null;
  }

  // ======================================================
  // Overlap Protection
  // ======================================================

  async function hasOverlappingArrangement(): Promise<boolean> {
    const {
      data,
      error,
    } = await supabase
      .from("special_arrangements")
      .select(
        "id, start_date, end_date, status"
      )
      .eq(
        "student_enrolment_id",
        form.student_enrolment_id
      )
      .eq(
        "status",
        "Active"
      )
      .lte(
        "start_date",
        form.end_date
      )
      .gte(
        "end_date",
        form.start_date
      );

    if (error) {
      console.error(
        "SPECIAL ARRANGEMENT → OVERLAP CHECK ERROR:",
        error
      );

      throw error;
    }

    return (
      (data ?? []).some(
        (item: any) =>
          item.id !==
          editingArrangement?.id
      )
    );
  }

  // ======================================================
  // Parent Leave Conflict Protection
  // ======================================================

  async function getSubmittedLeaveConflict(): Promise<string | null> {
    const enrolment =
      enrolments.find(
        (item) =>
          item.id ===
          form.student_enrolment_id
      );

    if (
      !enrolment ||
      affectedLessons.length === 0
    ) {
      return null;
    }

    const lessonIds =
      affectedLessons.map(
        (lesson) => lesson.id
      );

    const {
      data,
      error,
    } = await supabase
      .from("leave_records")
      .select("lesson_id")
      .eq(
        "student_id",
        enrolment.student_id
      )
      .in(
        "lesson_id",
        lessonIds
      )
      .eq(
        "status",
        "Submitted"
      );

    if (error) {
      console.error(
        "SPECIAL ARRANGEMENT → LEAVE CONFLICT CHECK ERROR:",
        error
      );

      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const conflictingLessonIds =
      new Set(
        data.map(
          (row: any) =>
            row.lesson_id
        )
      );

    const firstConflict =
      affectedLessons.find(
        (lesson) =>
          conflictingLessonIds.has(
            lesson.id
          )
      );

    return firstConflict
      ? `A submitted Parent Leave already exists for ${formatDate(
          firstConflict.lesson_date
        )}. Special Arrangement cannot overlap a Parent Leave for the same lesson.`
      : "A submitted Parent Leave already exists for one or more affected lessons. Special Arrangement cannot overlap a Parent Leave.";
  }

  // ======================================================
  // Create / Update Arrangement
  // ======================================================

  async function handleSave() {
    if (saving) return;

    setErrorMessage("");

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      setErrorMessage(
        "Admin access is required."
      );
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      showPopup(
        "Please Check the Form",
        validationError,
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      if (
        await hasOverlappingArrangement()
      ) {
        showPopup(
          "Overlapping Arrangement",
          "An Active Special Arrangement already exists for this formal enrolment during the selected period.",
          "error"
        );

        setSaving(false);
        return;
      }

      const leaveConflict =
        await getSubmittedLeaveConflict();

      if (leaveConflict) {
        showPopup(
          "Parent Leave Conflict",
          leaveConflict,
          "error"
        );

        setSaving(false);
        return;
      }

      // --------------------------------------------------
      // UPDATE
      // --------------------------------------------------

      if (editingArrangement) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "special_arrangements"
          )
          .update({
            start_date:
              form.start_date,
            end_date:
              form.end_date,
            notes:
              form.notes.trim() ||
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            editingArrangement.id
          );

        if (updateError) {
          throw updateError;
        }

        const {
          error: deleteMapError,
        } = await supabase
          .from(
            "special_arrangement_lessons"
          )
          .delete()
          .eq(
            "special_arrangement_id",
            editingArrangement.id
          );

        if (deleteMapError) {
          throw deleteMapError;
        }

        if (
          affectedLessons.length > 0
        ) {
          const mappingRows =
            affectedLessons.map(
              (lesson) => ({
                special_arrangement_id:
                  editingArrangement.id,
                lesson_id:
                  lesson.id,
              })
            );

          const {
            error: mapError,
          } = await supabase
            .from(
              "special_arrangement_lessons"
            )
            .insert(
              mappingRows
            );

          if (mapError) {
            throw mapError;
          }
        }

        showPopup(
          "Arrangement Updated",
          "The Special Arrangement has been updated successfully.",
          "success"
        );
      }

      // --------------------------------------------------
      // CREATE
      // --------------------------------------------------

      else {
        const {
          data: arrangement,
          error: createError,
        } = await supabase
          .from(
            "special_arrangements"
          )
          .insert({
            student_enrolment_id:
              form.student_enrolment_id,
            start_date:
              form.start_date,
            end_date:
              form.end_date,
            status:
              "Active",
            notes:
              form.notes.trim() ||
              null,
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        if (
          affectedLessons.length > 0
        ) {
          const mappingRows =
            affectedLessons.map(
              (lesson) => ({
                special_arrangement_id:
                  arrangement.id,
                lesson_id:
                  lesson.id,
              })
            );

          const {
            error: mapError,
          } = await supabase
            .from(
              "special_arrangement_lessons"
            )
            .insert(
              mappingRows
            );

          if (mapError) {
            // Best-effort cleanup of the
            // newly-created arrangement.
            await supabase
              .from(
                "special_arrangements"
              )
              .delete()
              .eq(
                "id",
                arrangement.id
              );

            throw mapError;
          }
        }

        showPopup(
          "Arrangement Created",
          "The Special Arrangement has been created successfully.",
          "success"
        );
      }

      resetForm();
      await loadArrangements();
    } catch (error: any) {
      console.error(
        "SPECIAL ARRANGEMENT → SAVE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ??
          "Unable to save the Special Arrangement."
      );

      showPopup(
        "Save Failed",
        error?.message ??
          "Unable to save the Special Arrangement.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================================
  // Edit
  // ======================================================

  function startEdit(
    arrangement: ArrangementRecord
  ) {
    if (
      arrangement.status ===
      "Cancelled"
    ) {
      return;
    }

    const enrolment =
      enrolments.find(
        (item) =>
          item.id ===
          arrangement.student_enrolment_id
      ) ?? null;

    if (!isPreFirstLessonWindow(enrolment)) {
      showPopup(
        "Special Arrangement Locked",
        enrolment?.join_date
          ? `This Special Arrangement can no longer be edited because the student's first enrolled lesson begins on ${formatDate(
              enrolment.join_date
            )}.`
          : "This Special Arrangement can no longer be edited because the enrolment Join Date is unavailable.",
        "info"
      );
      return;
    }

    setEditingArrangement(
      arrangement
    );

    setForm({
      student_enrolment_id:
        arrangement.student_enrolment_id,
      start_date:
        arrangement.start_date,
      end_date:
        arrangement.end_date,
      notes:
        arrangement.notes ?? "",
    });

    void loadAffectedLessons(
      arrangement.student_enrolment_id,
      arrangement.start_date,
      arrangement.end_date
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ======================================================
  // Cancel
  // ======================================================

  function handleCancel(
    arrangement: ArrangementRecord
  ) {
    if (
      arrangement.status ===
      "Cancelled" ||
      saving
    ) {
      return;
    }

    setConfirmCancelArrangement(
      arrangement
    );
  }

  async function confirmCancelArrangementNow(
    arrangement: ArrangementRecord
  ) {
    setConfirmCancelArrangement(null);

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      setErrorMessage(
        "Admin access is required."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        error,
      } = await supabase
        .from(
          "special_arrangements"
        )
        .update({
          status:
            "Cancelled",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          arrangement.id
        );

      if (error) {
        throw error;
      }

      showPopup(
        "Arrangement Cancelled",
        "The Special Arrangement has been cancelled. Historical records have been preserved.",
        "success"
      );

      if (
        editingArrangement?.id ===
        arrangement.id
      ) {
        resetForm();
      }

      await loadArrangements();
    } catch (error: any) {
      console.error(
        "SPECIAL ARRANGEMENT → CANCEL ERROR:",
        error
      );

      showPopup(
        "Cancel Failed",
        error?.message ??
          "Unable to cancel the Special Arrangement.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================================
  // Filter
  // ======================================================

  const filteredArrangements =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return arrangements.filter(
        (item) => {
          const matchesStatus =
            statusFilter === "All" ||
            item.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            item.student_name
              .toLowerCase()
              .includes(query) ||
            item.class_name
              .toLowerCase()
              .includes(query) ||
            String(
              item.academic_year ??
                ""
            ).includes(query) ||
            String(
              item.term ?? ""
            ).includes(query)
          );
        }
      );
    }, [
      arrangements,
      searchTerm,
      statusFilter,
    ]);

  // ======================================================
  // Render
  // ======================================================

  if (loading) {
    // Keep the shared Admin ChessboardBackground visible while data loads.
    // Do not render a white loading card to avoid the initial white flash.
    return <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" />;
  }

  if (errorMessage &&
      enrolments.length === 0 &&
      arrangements.length === 0) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 w-full bg-amber-400" />

            <div className="p-5 sm:p-6">
              <h1 className="text-2xl font-bold text-[#10213A]">
                Special Holiday Arrangement
              </h1>

              <p className="mt-2 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">

          {/* ==================================================
              Header
          ================================================== */}

          <section>
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
              Special Holiday Arrangement
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#C8D2DF]/70 sm:text-base">
              Manage planned special arrangements for
              future lessons. Special Arrangements are
              maintained by Admin and are separate from
              Parent Leave.
            </p>
          </section>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* ==================================================
              Main Cards
          ================================================== */}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">

            {/* ==================================================
                Create / Edit Card
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1 w-full bg-amber-400" />

              <div className="p-5 sm:p-6">

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {editingArrangement
                        ? "Edit Arrangement"
                        : "New Arrangement"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Formal active enrolments only.
                    </p>
                  </div>

                  {editingArrangement && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* Enrolment */}

                <div className="mt-6">
                  <label
                    htmlFor="student-enrolment"
                    className="text-sm font-medium text-slate-800"
                  >
                    Formal Enrolment
                  </label>

                  <div className="relative mt-2">
                    <button
                      type="button"
                      id="student-enrolment"
                      disabled={
                        Boolean(
                          editingArrangement
                        ) || saving
                      }
                      onClick={() => {
                        if (
                          editingArrangement ||
                          saving
                        ) {
                          return;
                        }

                        setEnrolmentPickerOpen(
                          (previous) =>
                            !previous
                        );
                      }}
                      className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                    >
                      <span
                        className={
                          selectedEnrolment
                            ? "truncate"
                            : "text-slate-500"
                        }
                      >
                        {selectedEnrolment
                          ? `${selectedEnrolment.student_name} — ${selectedEnrolment.class_name} — ${selectedEnrolment.academic_year} T${selectedEnrolment.term}`
                          : "Select formal enrolment..."}
                      </span>

                      <span
                        aria-hidden="true"
                        className="ml-3 shrink-0 text-slate-500"
                      >
                        {enrolmentPickerOpen
                          ? "▲"
                          : "▼"}
                      </span>
                    </button>

                    {enrolmentPickerOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                        <div className="border-b border-slate-200 bg-slate-50 p-2">
                          <input
                            type="search"
                            value={
                              enrolmentSearchTerm
                            }
                            onChange={(
                              event
                            ) =>
                              setEnrolmentSearchTerm(
                                event.target.value
                              )
                            }
                            placeholder="Search student, class, year..."
                            autoFocus
                            className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {filteredEnrolments.length ===
                          0 ? (
                            <div className="px-4 py-4 text-sm text-slate-500">
                              No matching formal enrolments.
                            </div>
                          ) : (
                            filteredEnrolments.map(
                              (item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    handleEnrolmentChange(
                                      item.id
                                    );
                                    setEnrolmentPickerOpen(
                                      false
                                    );
                                    setEnrolmentSearchTerm(
                                      ""
                                    );
                                  }}
                                  className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-amber-50 ${
                                    item.id ===
                                    form.student_enrolment_id
                                      ? "bg-amber-50 font-medium text-slate-900"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {item.student_name} —{" "}
                                  {item.class_name} —{" "}
                                  {item.academic_year} T
                                  {item.term}
                                </button>
                              )
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEnrolment && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                      <div>
                        <span className="font-medium text-slate-800">
                          Student:
                        </span>{" "}
                        {selectedEnrolment.student_name}
                      </div>

                      <div>
                        <span className="font-medium text-slate-800">
                          Class:
                        </span>{" "}
                        {selectedEnrolment.class_name}
                      </div>

                      <div>
                        <span className="font-medium text-slate-800">
                          Academic:
                        </span>{" "}
                        {selectedEnrolment.academic_year}{" "}
                        Term{" "}
                        {selectedEnrolment.term}
                      </div>

                      <div>
                        <span className="font-medium text-slate-800">
                          First Enrolled Lesson:
                        </span>{" "}
                        {selectedEnrolment.join_date
                          ? formatDate(
                              selectedEnrolment.join_date
                            )
                          : "—"}
                      </div>

                      {!isPreFirstLessonWindow(
                        selectedEnrolment
                      ) && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                          Special Arrangement entry is locked after the student's first enrolled lesson begins.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dates */}

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>
                    <label
                      htmlFor="start-date"
                      className="text-sm font-medium text-slate-800"
                    >
                      Start Date
                    </label>

                    <input
                      id="start-date"
                      type="date"
                      value={
                        form.start_date
                      }
                      min={
                        getBrisbaneToday()
                      }
                      onChange={(event) =>
                        handleStartDateChange(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="end-date"
                      className="text-sm font-medium text-slate-800"
                    >
                      End Date
                    </label>

                    <input
                      id="end-date"
                      type="date"
                      value={
                        form.end_date
                      }
                      min={
                        form.start_date ||
                        getBrisbaneToday()
                      }
                      onChange={(event) =>
                        handleEndDateChange(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                    />
                  </div>

                </div>

                {/* Notes */}

                <div className="mt-5">
                  <label
                    htmlFor="notes"
                    className="text-sm font-medium text-slate-800"
                  >
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value
                      )
                    }
                    rows={4}
                    disabled={saving}
                    placeholder="Optional internal notes..."
                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                  />
                </div>

                {/* Affected Lesson Preview */}

                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Affected Future Lessons
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Non-cancelled lessons within the selected period.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {affectedLessons.length}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {loadingLessons ? (
                      <div className="p-4 text-sm text-slate-500">
                        Loading lessons...
                      </div>
                    ) : affectedLessons.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">
                        Select a formal enrolment and a valid future date range to preview lessons.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {affectedLessons.map(
                          (lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-start justify-between gap-4 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900">
                                  {formatDate(
                                    lesson.lesson_date
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {lesson.class_name}
                                </div>
                              </div>

                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                Future Lesson
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save */}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    loadingLessons ||
                    (Boolean(selectedEnrolment) &&
                      !isPreFirstLessonWindow(
                        selectedEnrolment
                      ))
                  }
                  className="mt-6 min-h-[48px] w-full rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingArrangement
                    ? "Save Changes"
                    : "Create Arrangement"}
                </button>

              </div>
            </section>

            {/* ==================================================
                Existing Arrangements
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1 w-full bg-amber-400" />

              <div className="p-5 sm:p-6">

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Existing Arrangements
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Active and historical Special Arrangements.
                  </p>
                </div>

                {/* Search / Filter */}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value
                      )
                    }
                    placeholder="Search student, class, year..."
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value
                      )
                    }
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="All">
                      All Status
                    </option>

                    <option value="Active">
                      Active
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>

                {/* Mobile Cards */}

                <div className="mt-5 space-y-4 md:hidden">
                  {filteredArrangements.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                      No Special Arrangements found.
                    </div>
                  ) : (
                    filteredArrangements.map(
                      (item) => (
                        <article
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="break-words text-sm font-semibold text-slate-900">
                                {item.student_name ||
                                  "Student"}
                              </h3>

                              <p className="mt-1 break-words text-xs text-slate-500">
                                {item.class_name}
                              </p>
                            </div>

                            <span
                              className={
                                item.status ===
                                "Active"
                                  ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                  : "shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                              }
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="text-slate-400">
                                Period
                              </div>

                              <div className="mt-1 font-medium text-slate-700">
                                {formatDate(
                                  item.start_date
                                )}{" "}
                                –{" "}
                                {formatDate(
                                  item.end_date
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-slate-400">
                                Academic
                              </div>

                              <div className="mt-1 font-medium text-slate-700">
                                {item.academic_year ??
                                  "—"}{" "}
                                T
                                {item.term ??
                                  "—"}
                              </div>
                            </div>

                            <div>
                              <div className="text-slate-400">
                                Affected Lessons
                              </div>

                              <div className="mt-1 font-medium text-slate-700">
                                {
                                  item.affected_lesson_count
                                }
                              </div>
                            </div>

                            <div>
                              <div className="text-slate-400">
                                Notes
                              </div>

                              <div className="mt-1 break-words font-medium text-slate-700">
                                {item.notes ||
                                  "—"}
                              </div>
                            </div>
                          </div>

                          {item.status ===
                            "Active" && (
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    item
                                  )
                                }
                                disabled={
                                  saving ||
                                  !isPreFirstLessonWindow(
                                    enrolments.find(
                                      (enrolment) =>
                                        enrolment.id ===
                                        item.student_enrolment_id
                                    ) ?? null
                                  )
                                }
                                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleCancel(
                                    item
                                  )
                                }
                                disabled={saving}
                                className="min-h-[44px] flex-1 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </article>
                      )
                    )
                  )}
                </div>

                {/* Desktop Table */}

                <div className="mt-5 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="w-[19%] px-4 py-3 font-semibold">
                            Student
                          </th>

                          <th className="w-[17%] px-4 py-3 font-semibold">
                            Class
                          </th>

                          <th className="w-[22%] px-4 py-3 font-semibold">
                            Period
                          </th>

                          <th className="w-[9%] px-4 py-3 font-semibold">
                            Lessons
                          </th>

                          <th className="w-[12%] px-4 py-3 font-semibold">
                            Status
                          </th>

                          <th className="w-[21%] px-4 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredArrangements.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              No Special Arrangements found.
                            </td>
                          </tr>
                        ) : (
                          filteredArrangements.map(
                            (item) => (
                              <tr
                                key={item.id}
                                className="align-top"
                              >
                                <td className="break-words px-4 py-4 font-medium text-slate-900">
                                  {item.student_name ||
                                    "Student"}
                                </td>

                                <td className="break-words px-4 py-4 text-slate-600">
                                  {item.class_name}
                                </td>

                                <td className="whitespace-nowrap px-3 py-4 text-[13px] tracking-tight text-slate-600">
                                  {formatDate(
                                    item.start_date
                                  )}{" "}
                                  –{" "}
                                  {formatDate(
                                    item.end_date
                                  )}
                                </td>

                                <td className="px-4 py-4 text-slate-600">
                                  {
                                    item.affected_lesson_count
                                  }
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={
                                      item.status ===
                                      "Active"
                                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                        : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                                    }
                                  >
                                    {
                                      item.status
                                    }
                                  </span>
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex justify-end gap-2">
                                    {item.status ===
                                      "Active" && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            startEdit(
                                              item
                                            )
                                          }
                                          disabled={
                                            saving ||
                                            !isPreFirstLessonWindow(
                                              enrolments.find(
                                                (enrolment) =>
                                                  enrolment.id ===
                                                  item.student_enrolment_id
                                              ) ?? null
                                            )
                                          }
                                          className="min-h-[40px] rounded-xl border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleCancel(
                                              item
                                            )
                                          }
                                          disabled={
                                            saving
                                          }
                                          className="min-h-[40px] rounded-xl border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ====================================================
          Popup
      ==================================================== */}

      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div
              className={
                popup.type ===
                "success"
                  ? "h-1 w-full bg-emerald-500"
                  : popup.type ===
                    "error"
                  ? "h-1 w-full bg-red-500"
                  : "h-1 w-full bg-amber-400"
              }
            />

            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {popup.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {popup.message}
              </p>

              <button
                type="button"
                onClick={closePopup}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelArrangement && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-arrangement-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="h-1 w-full bg-red-400" />

            <div className="p-5 sm:p-6">
              <h2
                id="cancel-arrangement-title"
                className="text-lg font-semibold text-slate-900"
              >
                Cancel Special Arrangement?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cancel the Special Arrangement for{" "}
                <span className="font-semibold text-slate-900">
                  {confirmCancelArrangement.student_name}
                </span>
                ?
              </p>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmCancelArrangement(null)
                  }
                  disabled={saving}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void confirmCancelArrangementNow(
                      confirmCancelArrangement
                    )
                  }
                  disabled={saving}
                  className="min-h-[44px] rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}