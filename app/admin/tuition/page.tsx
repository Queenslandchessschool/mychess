"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

// ======================================================
// Types
// ======================================================

type AcademicCalendar = {
  id: string;
  academic_year: number;
  term: number;
};

type Campus = {
  id: string;
  campus_code: string | null;
  short_name: string | null;
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

type TuitionConfiguration = {
  id: string;
  academic_year: number;
  term: number;
  class_id: string;
  single_lesson_fee: number;
  total_lessons: number;
  calculated_tuition: number;
  standard_tuition: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  academic_year: string;
  term: string;
  class_id: string;
  single_lesson_fee: string;
  total_lessons: string;
  standard_tuition: string;
  status: string;
  notes: string;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error";
};

const emptyForm: FormState = {
  academic_year: "",
  term: "",
  class_id: "",
  single_lesson_fee: "",
  total_lessons: "9",
  standard_tuition: "",
  status: "Active",
  notes: "",
};

// ======================================================
// Helpers
// ======================================================

function formatMoney(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return `$${value.toFixed(2)}`;
}

function buildClassName(
  item: ClassRecord,
  campusMap: Map<string, Campus>
) {
  const campus = item.campus_id
    ? campusMap.get(item.campus_id)
    : undefined;

  const campusName =
    campus?.campus_code ??
    campus?.short_name ??
    "";

  const day =
    item.day?.substring(0, 3) ?? "";

  const level =
    item.level ?? "";

  const suffix =
    item.class_suffix?.trim() ?? "";

  return suffix
    ? `${campusName} | ${day} | ${level} | ${suffix}`
    : `${campusName} | ${day} | ${level}`;
}

// ======================================================
// Page
// ======================================================

export default function TuitionPage() {
  const [calendars, setCalendars] = useState<
    AcademicCalendar[]
  >([]);

  const [campuses, setCampuses] = useState<
    Campus[]
  >([]);

  const [classes, setClasses] = useState<
    ClassRecord[]
  >([]);

  const [configurations, setConfigurations] =
    useState<TuitionConfiguration[]>([]);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [
    editingConfiguration,
    setEditingConfiguration,
  ] = useState<TuitionConfiguration | null>(
    null
  );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

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
  // Initial Load
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

    const [
      calendarResult,
      campusResult,
      classResult,
      configurationResult,
    ] = await Promise.all([
      supabase
        .from("academic_calendar")
        .select(
          "id, academic_year, term"
        )
        .order("academic_year", {
          ascending: false,
        })
        .order("term"),

      supabase
        .from("campuses")
        .select(
          "id, campus_code, short_name"
        )
        .order("short_name"),

      supabase
        .from("classes")
        .select(
          `
            id,
            campus_id,
            level,
            class_suffix,
            day,
            start_time,
            end_time,
            status
          `
        )
        .order("day")
        .order("start_time"),

      supabase
        .from("tuition_configurations")
        .select(
          `
            id,
            academic_year,
            term,
            class_id,
            single_lesson_fee,
            total_lessons,
            calculated_tuition,
            standard_tuition,
            status,
            notes,
            created_at,
            updated_at
          `
        )
        .order("academic_year", {
          ascending: false,
        })
        .order("term")
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (calendarResult.error) {
      console.error(
        "TUITION CALENDAR LOAD ERROR:",
        calendarResult.error
      );

      setErrorMessage(
        calendarResult.error.message
      );

      setLoading(false);
      return;
    }

    if (campusResult.error) {
      console.error(
        "TUITION CAMPUS LOAD ERROR:",
        campusResult.error
      );

      setErrorMessage(
        campusResult.error.message
      );

      setLoading(false);
      return;
    }

    if (classResult.error) {
      console.error(
        "TUITION CLASS LOAD ERROR:",
        classResult.error
      );

      setErrorMessage(
        classResult.error.message
      );

      setLoading(false);
      return;
    }

    if (configurationResult.error) {
      console.error(
        "TUITION CONFIGURATION LOAD ERROR:",
        configurationResult.error
      );

      setErrorMessage(
        configurationResult.error.message
      );

      setLoading(false);
      return;
    }

    const loadedCalendars =
      (calendarResult.data ??
        []) as AcademicCalendar[];

    const loadedCampuses =
      (campusResult.data ??
        []) as Campus[];

    const loadedClasses =
      (classResult.data ??
        []) as ClassRecord[];

    const loadedConfigurations =
      (configurationResult.data ??
        []) as TuitionConfiguration[];

    setCalendars(loadedCalendars);
    setCampuses(loadedCampuses);
    setClasses(loadedClasses);
    setConfigurations(
      loadedConfigurations
    );

    // ====================================================
    // Default Academic Year / Term
    // ====================================================

    if (
      loadedCalendars.length > 0 &&
      !form.academic_year &&
      !form.term
    ) {
      setForm((previous) => ({
        ...previous,
        academic_year:
          String(
            loadedCalendars[0].academic_year
          ),
        term:
          String(
            loadedCalendars[0].term
          ),
      }));
    }

    setLoading(false);
  }

  // ======================================================
  // Lookup Maps
  // ======================================================

  const campusMap = useMemo(() => {
    return new Map(
      campuses.map((item) => [
        item.id,
        item,
      ])
    );
  }, [campuses]);

  const classMap = useMemo(() => {
    return new Map(
      classes.map((item) => [
        item.id,
        item,
      ])
    );
  }, [classes]);

  // ======================================================
  // Academic Year
  //
  // IMPORTANT:
  // Academic Year must be unique.
  // ======================================================

  const academicYearOptions =
    useMemo(() => {
      const years = new Set<number>();

      calendars.forEach((item) => {
        years.add(item.academic_year);
      });

      return Array.from(years).sort(
        (a, b) => b - a
      );
    }, [calendars]);

  // ======================================================
  // Term Options
  //
  // Only terms belonging to the selected year.
  // ======================================================

  const termOptions = useMemo(() => {
    if (!form.academic_year) {
      return [];
    }

    const terms = new Set<number>();

    calendars
      .filter(
        (item) =>
          String(
            item.academic_year
          ) === form.academic_year
      )
      .forEach((item) => {
        terms.add(item.term);
      });

    return Array.from(terms).sort(
      (a, b) => a - b
    );
  }, [
    calendars,
    form.academic_year,
  ]);

  // ======================================================
  // Class Options
  // ======================================================

  const classOptions = useMemo(() => {
    return [...classes].sort((a, b) => {
      const aName = buildClassName(
        a,
        campusMap
      );

      const bName = buildClassName(
        b,
        campusMap
      );

      return aName.localeCompare(
        bName
      );
    });
  }, [
    classes,
    campusMap,
  ]);

  // ======================================================
  // Calculated Tuition Preview
  //
  // Business Rule:
  //
  // Single Lesson Fee × Total Lessons
  //
  // Database calculated_tuition remains
  // the final source of truth.
  // ======================================================

  const calculatedPreview =
    useMemo(() => {
      const fee =
        Number(
          form.single_lesson_fee
        );

      const lessons =
        Number(
          form.total_lessons
        );

      if (
        !Number.isFinite(fee) ||
        !Number.isFinite(lessons) ||
        fee < 0 ||
        lessons <= 0
      ) {
        return null;
      }

      return (
        Math.round(
          fee * lessons * 100
        ) / 100
      );
    }, [
      form.single_lesson_fee,
      form.total_lessons,
    ]);

  // ======================================================
  // Form Update
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

  function handleAcademicYearChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      academic_year: value,
      term: "",
    }));
  }

  // ======================================================
  // Validation
  // ======================================================

  function validateForm(): string | null {
    if (!form.academic_year) {
      return "Please select Academic Year.";
    }

    if (!form.term) {
      return "Please select Term.";
    }

    if (!form.class_id) {
      return "Please select Class.";
    }

    if (
      form.single_lesson_fee === ""
    ) {
      return "Please enter Single Lesson Fee.";
    }

    const fee =
      Number(
        form.single_lesson_fee
      );

    if (
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      return "Single Lesson Fee must be a valid amount.";
    }

    if (
      form.total_lessons === ""
    ) {
      return "Please enter Total Lessons.";
    }

    const lessons =
      Number(
        form.total_lessons
      );

    if (
      !Number.isInteger(lessons) ||
      lessons <= 0
    ) {
      return "Total Lessons must be a positive whole number.";
    }

    if (
      form.standard_tuition === ""
    ) {
      return "Please enter Standard Tuition.";
    }

    const standard =
      Number(
        form.standard_tuition
      );

    if (
      !Number.isFinite(standard) ||
      standard < 0
    ) {
      return "Standard Tuition must be a valid amount.";
    }

    return null;
  }

  // ======================================================
  // Add Configuration
  // ======================================================

  async function addConfiguration() {
    const validation =
      validateForm();

    if (validation) {
      showPopup(
        "Tuition Configuration",
        validation,
        "error"
      );
      return;
    }

    setSaving(true);

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      showPopup(
        "Access Required",
        "Admin access is required.",
        "error"
      );

      setSaving(false);
      return;
    }

    const academicYear =
      Number(
        form.academic_year
      );

    const term =
      Number(form.term);

    const fee =
      Number(
        form.single_lesson_fee
      );

    const lessons =
      Number(
        form.total_lessons
      );

    const standard =
      Number(
        form.standard_tuition
      );

    // ====================================================
    // Frontend Duplicate Protection
    // ====================================================

    const duplicate =
      configurations.find(
        (item) =>
          item.academic_year ===
            academicYear &&
          item.term === term &&
          item.class_id ===
            form.class_id
      );

    if (duplicate) {
      showPopup(
        "Tuition Configuration",
        "A tuition configuration already exists for this Academic Year, Term and Class.",
        "error"
      );

      setSaving(false);
      return;
    }

    const {
      data: inserted,
      error,
    } = await supabase
      .from(
        "tuition_configurations"
      )
      .insert([
        {
          academic_year:
            academicYear,
          term,
          class_id:
            form.class_id,
          single_lesson_fee:
            fee,
          total_lessons:
            lessons,
          standard_tuition:
            standard,
          status:
            form.status,
          notes:
            form.notes.trim() ||
            null,
        },
      ])
      .select(
        `
          id,
          academic_year,
          term,
          class_id,
          single_lesson_fee,
          total_lessons,
          calculated_tuition,
          standard_tuition,
          status,
          notes,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "TUITION CONFIGURATION INSERT ERROR:",
        error
      );

      showPopup(
        "Save Failed",
        error.message,
        "error"
      );

      setSaving(false);
      return;
    }

    if (!inserted) {
      showPopup(
        "Save Failed",
        "The tuition configuration could not be confirmed after saving.",
        "error"
      );

      setSaving(false);
      return;
    }

    setForm((previous) => ({
      ...emptyForm,
      academic_year:
        previous.academic_year,
      term:
        previous.term,
    }));

    await loadPage();

    setSaving(false);

    showPopup(
      "Saved Successfully",
      "The tuition configuration has been saved.",
      "success"
    );
  }

  // ======================================================
  // Update Configuration
  // ======================================================

  async function updateConfiguration() {
    if (
      !editingConfiguration
    ) {
      return;
    }

    const validation =
      validateForm();

    if (validation) {
      showPopup(
        "Tuition Configuration",
        validation,
        "error"
      );
      return;
    }

    setSaving(true);

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      showPopup(
        "Access Required",
        "Admin access is required.",
        "error"
      );

      setSaving(false);
      return;
    }

    const academicYear =
      Number(
        form.academic_year
      );

    const term =
      Number(form.term);

    const fee =
      Number(
        form.single_lesson_fee
      );

    const lessons =
      Number(
        form.total_lessons
      );

    const standard =
      Number(
        form.standard_tuition
      );

    const duplicate =
      configurations.find(
        (item) =>
          item.id !==
            editingConfiguration.id &&
          item.academic_year ===
            academicYear &&
          item.term === term &&
          item.class_id ===
            form.class_id
      );

    if (duplicate) {
      showPopup(
        "Tuition Configuration",
        "A tuition configuration already exists for this Academic Year, Term and Class.",
        "error"
      );

      setSaving(false);
      return;
    }

    const { error } =
      await supabase
        .from(
          "tuition_configurations"
        )
        .update({
          academic_year:
            academicYear,
          term,
          class_id:
            form.class_id,
          single_lesson_fee:
            fee,
          total_lessons:
            lessons,
          standard_tuition:
            standard,
          status:
            form.status,
          notes:
            form.notes.trim() ||
            null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          editingConfiguration.id
        );

    if (error) {
      console.error(
        "TUITION CONFIGURATION UPDATE ERROR:",
        error
      );

      showPopup(
        "Update Failed",
        error.message,
        "error"
      );

      setSaving(false);
      return;
    }

    setEditingConfiguration(
      null
    );

    setForm((previous) => ({
      ...emptyForm,
      academic_year:
        previous.academic_year,
      term:
        previous.term,
    }));

    await loadPage();

    setSaving(false);

    showPopup(
      "Updated Successfully",
      "The tuition configuration has been updated.",
      "success"
    );
  }

  // ======================================================
  // Start Edit
  // ======================================================

  function startEdit(
    configuration: TuitionConfiguration
  ) {
    setEditingConfiguration(
      configuration
    );

    setForm({
      academic_year:
        String(
          configuration.academic_year
        ),
      term:
        String(
          configuration.term
        ),
      class_id:
        configuration.class_id,
      single_lesson_fee:
        Number(
          configuration.single_lesson_fee
        ).toFixed(2),
      total_lessons:
        String(
          configuration.total_lessons
        ),
      standard_tuition:
        Number(
          configuration.standard_tuition
        ).toFixed(2),
      status:
        configuration.status,
      notes:
        configuration.notes ??
        "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ======================================================
  // Cancel Edit
  // ======================================================

  function cancelEdit() {
    setEditingConfiguration(
      null
    );

    setForm((previous) => ({
      ...emptyForm,
      academic_year:
        previous.academic_year,
      term:
        previous.term,
    }));
  }

  // ======================================================
  // Filtered Configuration List
  // ======================================================

  const filteredConfigurations =
    configurations.filter(
      (item) => {
        const classRecord =
          classMap.get(
            item.class_id
          );

        const className =
          classRecord
            ? buildClassName(
                classRecord,
                campusMap
              )
            : "";

        const keyword =
          searchTerm
            .trim()
            .toLowerCase();

        const matchesSearch =
          !keyword ||
          className
            .toLowerCase()
            .includes(keyword) ||
          String(
            item.academic_year
          ).includes(keyword) ||
          `term ${item.term}`
            .toLowerCase()
            .includes(keyword);

        const matchesStatus =
          statusFilter ===
            "All" ||
          item.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  // ======================================================
  // Loading
  // ======================================================

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
            <div className="p-8">
              <p className="text-sm text-[#10213A]">
                Loading Tuition Configuration...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // Error
  // ======================================================

  if (errorMessage) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
            <div className="p-8">
              <h1 className="text-2xl font-bold text-[#10213A]">
                Tuition Configuration
              </h1>

              <p className="mt-4 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // Main Render
  // ======================================================

  return (
    <>
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">

          {/* ==================================================
              PAGE HEADER
          ================================================== */}

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
              Tuition Configuration
            </h1>

            <p className="mt-2 text-sm text-[#C8D2DF]/70 sm:text-base">
              Configure tuition fees by Academic Year, Term and Class.
            </p>
          </div>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* ==================================================
                FORM CARD
            ================================================== */}

            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">

                <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold text-[#10213A]">
                    {editingConfiguration
                      ? "Edit Tuition Configuration"
                      : "New Tuition Configuration"}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Set the class tuition pricing for the selected academic term.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">

                  {/* Academic Year */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Academic Year
                    </label>

                    <select
                      value={
                        form.academic_year
                      }
                      onChange={(e) =>
                        handleAcademicYearChange(
                          e.target.value
                        )
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="">
                        Select Academic Year
                      </option>

                      {academicYearOptions.map(
                        (year) => (
                          <option
                            key={year}
                            value={String(
                              year
                            )}
                          >
                            {year}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Term */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Term
                    </label>

                    <select
                      value={form.term}
                      onChange={(e) =>
                        updateForm(
                          "term",
                          e.target.value
                        )
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="">
                        Select Term
                      </option>

                      {termOptions.map(
                        (term) => (
                          <option
                            key={term}
                            value={String(
                              term
                            )}
                          >
                            Term {term}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Class */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Class
                    </label>

                    <select
                      value={
                        form.class_id
                      }
                      onChange={(e) =>
                        updateForm(
                          "class_id",
                          e.target.value
                        )
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="">
                        Select Class
                      </option>

                      {classOptions.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {buildClassName(
                              item,
                              campusMap
                            )}
                            {item.status !==
                              "Active"
                              ? ` (${item.status})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Single Lesson Fee */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Single Lesson Fee
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">
                        $
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.single_lesson_fee
                        }
                        onChange={(e) =>
                          updateForm(
                            "single_lesson_fee",
                            e.target.value
                          )
                        }
                        placeholder="16.50"
                        className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white pl-8 pr-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                      />
                    </div>
                  </div>

                  {/* Total Lessons */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Total Lessons
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        form.total_lessons
                      }
                      onChange={(e) =>
                        updateForm(
                          "total_lessons",
                          e.target.value
                        )
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    />
                  </div>

                  {/* Calculated Tuition */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Calculated Tuition
                    </label>

                    <div className="flex min-h-[48px] items-center justify-between rounded-xl border border-[#D9E0E8] bg-[#F8FAFC] px-4">
                      <span className="text-sm text-[#64748B]">
                        Auto-calculated
                      </span>

                      <span className="font-semibold text-[#10213A]">
                        {formatMoney(
                          calculatedPreview
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[#64748B]">
                      Calculated automatically from Single Lesson Fee × Total Lessons.
                    </p>
                  </div>

                  {/* Standard Tuition */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Standard Tuition
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">
                        $
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.standard_tuition
                        }
                        onChange={(e) =>
                          updateForm(
                            "standard_tuition",
                            e.target.value
                          )
                        }
                        placeholder={
                          calculatedPreview !==
                          null
                            ? calculatedPreview.toFixed(
                                2
                              )
                            : "149.00"
                        }
                        className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white pl-8 pr-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                      />
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[#64748B]">
                      Defaults to Calculated Tuition. Admin may override when required.
                    </p>
                  </div>

                  {/* Status */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value
                        )
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>
                    </select>
                  </div>

                  {/* Notes */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Notes
                    </label>

                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        updateForm(
                          "notes",
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="Optional internal notes..."
                      className="w-full rounded-xl border border-[#D9E0E8] bg-white px-4 py-3 text-sm leading-6 text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    />
                  </div>

                  {/* Buttons */}

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row">

                    <button
                      type="button"
                      disabled={saving}
                      onClick={
                        editingConfiguration
                          ? updateConfiguration
                          : addConfiguration
                      }
                      className="min-h-[48px] flex-1 rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : editingConfiguration
                          ? "Update"
                          : "Save"}
                    </button>

                    {editingConfiguration && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={
                          cancelEdit
                        }
                        className="min-h-[48px] flex-1 rounded-xl border border-[#D9E0E8] bg-white px-5 text-sm font-semibold text-[#10213A] transition-colors hover:border-[#B9C3D0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                CONFIGURATION LIST
            ================================================== */}

            <div className="lg:col-span-2">

              {/* Search / Filter */}

              <div className="mb-4 flex flex-col gap-3 sm:flex-row">

                <input
                  type="text"
                  placeholder="Search tuition configuration..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  className="min-h-[52px] min-w-0 flex-1 rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] placeholder:text-[#94A3B8] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="min-h-[52px] rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              {/* ==================================================
                  DESKTOP / TABLET LIST
                  
                  No horizontal scrolling.
                  Fixed header.
                  Vertical scrolling only.
              ================================================== */}

              <div className="hidden overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm md:block">

                <div className="max-h-[580px] overflow-y-auto">
                  <table className="w-full table-fixed text-sm">

                    <thead className="sticky top-0 z-10 border-b border-[#D9E0E8] bg-[#F8FAFC]">
                      <tr>
                        <th className="w-[8%] px-2 py-4 text-left font-semibold text-[#10213A]">
                          Year
                        </th>

                        <th className="w-[8%] px-2 py-4 text-left font-semibold text-[#10213A]">
                          Term
                        </th>

                        <th className="w-[25%] px-2 py-4 text-left font-semibold text-[#10213A]">
                          Class
                        </th>

                        <th className="w-[10%] px-2 py-4 text-right font-semibold text-[#10213A]">
                          Fee
                        </th>

                        <th className="w-[9%] px-2 py-4 text-right font-semibold text-[#10213A]">
                          Lessons
                        </th>

                        <th className="w-[12%] px-2 py-4 text-right font-semibold text-[#10213A]">
                          Calculated
                        </th>

                        <th className="w-[12%] px-2 py-4 text-right font-semibold text-[#10213A]">
                          Standard
                        </th>

                        <th className="w-[9%] px-2 py-4 text-center font-semibold text-[#10213A]">
                          Status
                        </th>

                        <th className="w-[7%] px-2 py-4 text-center font-semibold text-[#10213A]">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E5E7EB]">

                      {filteredConfigurations.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-6 py-12 text-center text-sm text-[#64748B]"
                          >
                            No tuition configurations found.
                          </td>
                        </tr>
                      )}

                      {filteredConfigurations.map(
                        (item) => {
                          const classRecord =
                            classMap.get(
                              item.class_id
                            );

                          const className =
                            classRecord
                              ? buildClassName(
                                  classRecord,
                                  campusMap
                                )
                              : "Unknown Class";

                          return (
                            <tr
                              key={item.id}
                              className="h-[64px] hover:bg-[#F8FAFC]"
                            >
                              <td className="truncate px-2 py-4 text-[#10213A]">
                                {
                                  item.academic_year
                                }
                              </td>

                              <td className="truncate px-2 py-4 text-[#10213A]">
                                T{item.term}
                              </td>

                              <td
                                title={
                                  className
                                }
                                className="truncate px-2 py-4 font-medium text-[#10213A]"
                              >
                                {
                                  className
                                }
                              </td>

                              <td className="whitespace-nowrap px-2 py-4 text-right text-[#10213A]">
                                {formatMoney(
                                  Number(
                                    item.single_lesson_fee
                                  )
                                )}
                              </td>

                              <td className="px-2 py-4 text-right text-[#10213A]">
                                {
                                  item.total_lessons
                                }
                              </td>

                              <td className="whitespace-nowrap px-2 py-4 text-right font-medium text-[#10213A]">
                                {formatMoney(
                                  Number(
                                    item.calculated_tuition
                                  )
                                )}
                              </td>

                              <td className="whitespace-nowrap px-2 py-4 text-right font-semibold text-[#10213A]">
                                {formatMoney(
                                  Number(
                                    item.standard_tuition
                                  )
                                )}
                              </td>

                              <td className="px-2 py-4 text-center">
                                <span
                                  className={
                                    item.status ===
                                    "Active"
                                      ? "inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                                      : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                  }
                                >
                                  {
                                    item.status
                                  }
                                </span>
                              </td>

                              <td className="px-2 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEdit(
                                      item
                                    )
                                  }
                                  className="font-semibold text-[#10213A] underline decoration-[#D4AF37] decoration-2 underline-offset-4 hover:text-[#D4AF37]"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}

                    </tbody>
                  </table>
                </div>
              </div>

              {/* ==================================================
                  MOBILE CARD LIST
              ================================================== */}

              <div className="space-y-4 md:hidden">

                {filteredConfigurations.length ===
                  0 && (
                  <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm text-[#64748B]">
                      No tuition configurations found.
                    </p>
                  </div>
                )}

                {filteredConfigurations.map(
                  (item) => {
                    const classRecord =
                      classMap.get(
                        item.class_id
                      );

                    const className =
                      classRecord
                        ? buildClassName(
                            classRecord,
                            campusMap
                          )
                        : "Unknown Class";

                    return (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm"
                      >

                        {/* Card Header */}

                        <div className="border-b border-[#E5E7EB] px-5 py-4">
                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                                {item.academic_year} · Term{" "}
                                {item.term}
                              </p>

                              <h3 className="mt-1 break-words text-base font-semibold leading-6 text-[#10213A]">
                                {className}
                              </h3>
                            </div>

                            <span
                              className={
                                item.status ===
                                "Active"
                                  ? "shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                  : "shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                              }
                            >
                              {
                                item.status
                              }
                            </span>
                          </div>
                        </div>

                        {/* Pricing Grid */}

                        <div className="grid grid-cols-2 gap-px bg-[#E5E7EB]">

                          <div className="bg-white px-5 py-4">
                            <p className="text-xs text-[#64748B]">
                              Single Lesson Fee
                            </p>

                            <p className="mt-1 text-base font-semibold text-[#10213A]">
                              {formatMoney(
                                Number(
                                  item.single_lesson_fee
                                )
                              )}
                            </p>
                          </div>

                          <div className="bg-white px-5 py-4">
                            <p className="text-xs text-[#64748B]">
                              Total Lessons
                            </p>

                            <p className="mt-1 text-base font-semibold text-[#10213A]">
                              {
                                item.total_lessons
                              }
                            </p>
                          </div>

                          <div className="bg-white px-5 py-4">
                            <p className="text-xs text-[#64748B]">
                              Calculated Tuition
                            </p>

                            <p className="mt-1 text-base font-semibold text-[#10213A]">
                              {formatMoney(
                                Number(
                                  item.calculated_tuition
                                )
                              )}
                            </p>
                          </div>

                          <div className="bg-white px-5 py-4">
                            <p className="text-xs text-[#64748B]">
                              Standard Tuition
                            </p>

                            <p className="mt-1 text-base font-bold text-[#10213A]">
                              {formatMoney(
                                Number(
                                  item.standard_tuition
                                )
                              )}
                            </p>
                          </div>

                        </div>

                        {/* Card Action */}

                        <div className="border-t border-[#E5E7EB] px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                item
                              )
                            }
                            className="min-h-[44px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm font-semibold text-[#10213A] transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]"
                          >
                            Edit Configuration
                          </button>
                        </div>

                      </div>
                    );
                  }
                )}

              </div>

              {/* ==================================================
                  BUSINESS RULE NOTE
              ================================================== */}

              <div className="mt-4 overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white/95 p-5 shadow-sm sm:p-6">
                <p className="text-sm leading-6 text-[#475569]">
                  <span className="font-semibold text-[#10213A]">
                    Pricing rule:
                  </span>{" "}
                  Calculated Tuition = Single Lesson Fee × Total Lessons.
                  Standard Tuition defaults to Calculated Tuition and may be overridden by Admin.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          MYCHESS WINDOW POPUP
      ====================================================== */}

      {popup.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07172B]/55 px-4 backdrop-blur-[2px]"
          onClick={closePopup}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tuition-popup-title"
            className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#D9E0E8] bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Gold Header Line */}

            <div className="h-1 bg-[#D4AF37]" />

            <div className="p-6 sm:p-7">

              <div className="flex items-start gap-4">

                <div
                  className={
                    popup.type ===
                    "success"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
                      : popup.type ===
                          "error"
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#10213A]"
                  }
                >
                  {popup.type ===
                  "success"
                    ? "✓"
                    : popup.type ===
                        "error"
                      ? "!"
                      : "i"}
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="tuition-popup-title"
                    className="text-lg font-semibold text-[#10213A]"
                  >
                    {popup.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    {popup.message}
                  </p>
                </div>

              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closePopup}
                  autoFocus
                  className="min-h-[44px] min-w-[88px] rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                >
                  OK
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}