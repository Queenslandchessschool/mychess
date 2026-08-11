"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationData } from "@/lib/registration";
import {
  isValidEmail,
  isValidMobile,
} from "@/lib/validators";

interface Props {
  onSubmit: (data: RegistrationData) => Promise<void>;
}

const initialFormData: RegistrationData = {
  student: {
    first_name: "",
    last_name: "",
    preferred_name: "",
    gender: "",
    dob: "",
    school: "",
    school_year: "",
    medical_information: "",
    emergency_contact: "",
    notes: "",
  },

  parent: {
    parent1_name: "",
    parent2_name: "",
    preferred_contact: "Parent1",
    email: "",
    mobile: "",
    address: "",
  },

  enrollment: {
    academic_year: new Date().getFullYear(),
    term: 3,
    campus_id: "",
    class_id: "",
    join_date: new Date().toISOString().split("T")[0],
    is_trial: false,
    medical_snapshot: "",
    special_request: {
      classroom_pickup: false,
      ymca_dropoff: false,
      walk_home: false,
    },
  },
};

export default function RegistrationForm({
  onSubmit,
}: Props) {
  const [formData, setFormData] =
    useState<RegistrationData>(initialFormData);

  const [step, setStep] = useState(1);

  const [campuses, setCampuses] = useState<any[]>([]);

  const [classes, setClasses] = useState<any[]>([]);

  const router = useRouter();

  function updateStudent(
    field: string,
    value: any
  ) {
    setFormData((prev) => ({
      ...prev,
      student: {
        ...prev.student,
        [field]: value,
      },
    }));
  }

  function updateParent(
    field: string,
    value: any
  ) {
    setFormData((prev) => ({
      ...prev,
      parent: {
        ...prev.parent,
        [field]: value,
      },
    }));
  }

  function updateEnrollment(
    field: string,
    value: any
  ) {
    setFormData((prev) => ({
      ...prev,
      enrollment: {
        ...prev.enrollment,
        [field]: value,
      },
    }));
  }

  function updateSpecialRequest(
    field: string,
    value: boolean
  ) {
    setFormData((prev) => {
      const request = {
        ...prev.enrollment.special_request,
        [field]: value,
      };

      // Walk Home 勾选时，取消另外两个
      if (field === "walk_home" && value) {
        request.classroom_pickup = false;
        request.ymca_dropoff = false;
      }

      // Classroom Pick-up 勾选时，取消 Walk Home
      if (field === "classroom_pickup" && value) {
        request.walk_home = false;
      }

      // YMCA Drop-off 勾选时，取消 Walk Home
      if (field === "ymca_dropoff" && value) {
        request.walk_home = false;
      }

      return {
        ...prev,
        enrollment: {
          ...prev.enrollment,
          special_request: request,
        },
      };
    });
  }

  useEffect(() => {
    loadCampuses();
  }, []);

  useEffect(() => {
    if (formData.enrollment.campus_id) {
      loadClasses(formData.enrollment.campus_id);
    } else {
      setClasses([]);
    }
  }, [formData.enrollment.campus_id]);

  async function loadCampuses() {
    const { data } = await supabase
      .from("campuses")
      .select("*")
      .order("short_name");

    setCampuses(data ?? []);
  }

  async function loadClasses(campusId: string) {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        campuses (
          short_name
        )
      `)
      .eq("campus_id", campusId)
      .eq("status", "Active")
      .order("day")
      .order("start_time");

    if (error) {
      console.error(error);
      return;
    }

    setClasses(data ?? []);
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      await onSubmit(formData);

      setFormData(initialFormData);
      setStep(1);

      // router.push("/admin/students");
    } catch (error) {
      console.error(error);
      alert("Registration failed.");
    }
  }

  const selectedCampus = campuses.find(
    (c) => c.id === formData.enrollment.campus_id
  );

  const selectedClass = classes.find(
    (c) => c.id === formData.enrollment.class_id
  );

  const isSchoolProgram =
    selectedCampus?.type === "School Program";

  return (
    <div className="w-full">
      {/* ------------------------------------------------ */}
      {/* STEP INDICATOR                                  */}
      {/* ------------------------------------------------ */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
        <div className="flex items-center">
          {/* STEP 1 */}
          <div className="flex min-w-0 flex-1 items-center">
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                step >= 1
                  ? "bg-[#011029] text-white ring-2 ring-[#D4AF37]/70 ring-offset-1"
                  : "bg-[#EEF5FB] text-[#7890A8]",
              ].join(" ")}
            >
              1
            </div>

            <span
              className={[
                "ml-2 hidden text-xs font-medium sm:block",
                step >= 1
                  ? "text-[#011029]"
                  : "text-slate-400",
              ].join(" ")}
            >
              Student
            </span>
          </div>

          <div
            className={[
              "h-px flex-1",
              step >= 2
                ? "bg-[#011029]"
                : "bg-slate-200",
            ].join(" ")}
          />

          {/* STEP 2 */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                step >= 2
                  ? "bg-[#011029] text-white ring-2 ring-[#D4AF37]/70 ring-offset-1"
                  : "bg-[#EEF5FB] text-[#7890A8]",
              ].join(" ")}
            >
              2
            </div>

            <span
              className={[
                "ml-2 hidden text-xs font-medium sm:block",
                step >= 2
                  ? "text-[#011029]"
                  : "text-slate-400",
              ].join(" ")}
            >
              Parent
            </span>
          </div>

          <div
            className={[
              "h-px flex-1",
              step >= 3
                ? "bg-[#011029]"
                : "bg-slate-200",
            ].join(" ")}
          />

          {/* STEP 3 */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                step >= 3
                  ? "bg-[#011029] text-white ring-2 ring-[#D4AF37]/70 ring-offset-1"
                  : "bg-[#EEF5FB] text-[#7890A8]",
              ].join(" ")}
            >
              3
            </div>

            <span
              className={[
                "ml-2 hidden text-xs font-medium sm:block",
                step >= 3
                  ? "text-[#011029]"
                  : "text-slate-400",
              ].join(" ")}
            >
              Program
            </span>
          </div>

          <div
            className={[
              "h-px flex-1",
              step >= 4
                ? "bg-[#011029]"
                : "bg-slate-200",
            ].join(" ")}
          />

          {/* STEP 4 */}
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                step >= 4
                  ? "bg-[#011029] text-white ring-2 ring-[#D4AF37]/70 ring-offset-1"
                  : "bg-[#EEF5FB] text-[#7890A8]",
              ].join(" ")}
            >
              4
            </div>

            <span
              className={[
                "ml-2 hidden text-xs font-medium sm:block",
                step >= 4
                  ? "text-[#011029]"
                  : "text-slate-400",
              ].join(" ")}
            >
              Review
            </span>
          </div>
        </div>

        <div className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7890A8] sm:hidden">
          Step {step} of 4
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* FORM                                             */}
      {/* ------------------------------------------------ */}

      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-[20px] border border-[#D4AF37]/40 bg-[#FFFDF8] shadow-[0_12px_35px_rgba(0,0,0,0.10)]"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#8F6B18] via-[#F4D35E] to-[#8F6B18]" />
        {/* ============================================== */}
        {/* STEP 1 — STUDENT                              */}
        {/* ============================================== */}

        {step === 1 && (
          <div className="p-4 pt-6 sm:p-6 sm:pt-7 lg:p-7">
            <div className="mb-5">
              <h2 className="border-l-[3px] border-[#D4AF37] pl-3 text-lg font-semibold tracking-tight text-[#011029]">
                Student Information
              </h2>

              <p className="mt-1 text-xs text-[#5F7690]">
                Tell us a little about your child.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <input
                placeholder="First Name *"
                value={formData.student.first_name}
                onChange={(e) =>
                  updateStudent(
                    "first_name",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="Last Name *"
                value={formData.student.last_name}
                onChange={(e) =>
                  updateStudent(
                    "last_name",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="Preferred Name"
                value={formData.student.preferred_name}
                onChange={(e) =>
                  updateStudent(
                    "preferred_name",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="Gender"
                value={formData.student.gender}
                onChange={(e) =>
                  updateStudent(
                    "gender",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <div>
                <label className="mb-1 block px-1 text-[11px] font-medium text-slate-500">
                  Date of Birth
                </label>

                <input
                  type="date"
                  value={formData.student.dob}
                  onChange={(e) =>
                    updateStudent(
                      "dob",
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
                />
              </div>

              <input
                placeholder="Grade"
                value={formData.student.school_year}
                onChange={(e) =>
                  updateStudent(
                    "school_year",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="School"
                value={formData.student.school}
                onChange={(e) =>
                  updateStudent(
                    "school",
                    e.target.value
                  )
                }
                className="col-span-2 h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="Emergency Contact *"
                value={formData.student.emergency_contact}
                onChange={(e) =>
                  updateStudent(
                    "emergency_contact",
                    e.target.value
                  )
                }
                className="col-span-2 h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <textarea
                placeholder="Medical Information"
                value={
                  formData.student.medical_information
                }
                onChange={(e) =>
                  updateStudent(
                    "medical_information",
                    e.target.value
                  )
                }
                rows={2}
                className="col-span-2 w-full resize-none rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 py-2.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <textarea
                placeholder="Notes"
                value={formData.student.notes}
                onChange={(e) =>
                  updateStudent(
                    "notes",
                    e.target.value
                  )
                }
                rows={2}
                className="col-span-2 w-full resize-none rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 py-2.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* STEP 2 — PARENT                               */}
        {/* ============================================== */}

        {step === 2 && (
          <div className="p-4 pt-6 sm:p-6 sm:pt-7 lg:p-7">
            <div className="mb-5">
              <h2 className="border-l-[3px] border-[#D4AF37] pl-3 text-lg font-semibold tracking-tight text-[#011029]">
                Parent / Guardian
              </h2>

              <p className="mt-1 text-xs text-[#5F7690]">
                Who should we contact about the registration?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <input
                placeholder="Parent Name *"
                value={formData.parent.parent1_name}
                onChange={(e) =>
                  updateParent(
                    "parent1_name",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                placeholder="Parent 2 Name"
                value={formData.parent.parent2_name}
                onChange={(e) =>
                  updateParent(
                    "parent2_name",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                type="email"
                placeholder="Email *"
                value={formData.parent.email}
                onChange={(e) =>
                  updateParent(
                    "email",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <input
                type="tel"
                placeholder="Mobile *"
                value={formData.parent.mobile}
                onChange={(e) =>
                  updateParent(
                    "mobile",
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* STEP 3 — PROGRAM                              */}
        {/* ============================================== */}

        {step === 3 && (
          <div className="p-4 pt-6 sm:p-6 sm:pt-7 lg:p-7">
            <div className="mb-5">
              <h2 className="border-l-[3px] border-[#D4AF37] pl-3 text-lg font-semibold tracking-tight text-[#011029]">
                Program
              </h2>

              <p className="mt-1 text-xs text-[#5F7690]">
                Choose the program and class that suits your child.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <input
                type="number"
                placeholder="Academic Year"
                value={formData.enrollment.academic_year}
                onChange={(e) =>
                  updateEnrollment(
                    "academic_year",
                    Number(e.target.value)
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />

              <select
                value={formData.enrollment.term}
                onChange={(e) =>
                  updateEnrollment(
                    "term",
                    Number(e.target.value)
                  )
                }
                className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
                <option value={4}>Term 4</option>
              </select>

              <select
                value={formData.enrollment.campus_id}
                onChange={(e) =>
                  updateEnrollment(
                    "campus_id",
                    e.target.value
                  )
                }
                className="col-span-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#011029] focus:bg-white focus:ring-2 focus:ring-[#011029]/10"
              >
                <option value="">
                  Select Campus
                </option>

                {campuses.map((campus) => (
                  <option
                    key={campus.id}
                    value={campus.id}
                  >
                    {campus.short_name}
                  </option>
                ))}
              </select>

              <select
                value={formData.enrollment.class_id}
                onChange={(e) =>
                  updateEnrollment(
                    "class_id",
                    e.target.value
                  )
                }
                className="col-span-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#011029] focus:bg-white focus:ring-2 focus:ring-[#011029]/10"
              >
                <option value="">
                  Select Class
                </option>

                {classes.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.id}
                  >
                    {`${cls.campuses?.short_name} | ${cls.day} | ${cls.level}`}
                  </option>
                ))}
              </select>

              <div>
                <label className="mb-1 block px-1 text-[11px] font-medium text-slate-500">
                  Join Date
                </label>

                <input
                  type="date"
                  value={formData.enrollment.join_date}
                  onChange={(e) =>
                    updateEnrollment(
                      "join_date",
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
                />
              </div>

              <label className="flex h-11 items-center rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A]">
                <input
                  type="checkbox"
                  checked={formData.enrollment.is_trial}
                  onChange={(e) =>
                    updateEnrollment(
                      "is_trial",
                      e.target.checked
                    )
                  }
                  className="mr-2.5 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                />

                Trial Lesson
              </label>
            </div>

            {/* SPECIAL REQUEST */}

            <div className="mt-5 border-t border-[#D4AF37]/20 pt-5">
              <h3 className="border-l-2 border-[#D4AF37] pl-2.5 text-sm font-semibold text-[#011029]">
                Special Request
              </h3>

              <p className="mt-1 mb-3 text-xs text-[#5F7690]">
                Select any applicable arrangements.
              </p>

              <div className="space-y-2">
                {isSchoolProgram && (
                  <>
                    <label className="flex min-h-10 items-center rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]">
                      <input
                        type="checkbox"
                        checked={
                          !formData.enrollment.special_request
                            .classroom_pickup &&
                          !formData.enrollment.special_request
                            .ymca_dropoff &&
                          !formData.enrollment.special_request
                            .walk_home
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateSpecialRequest(
                              "classroom_pickup",
                              false
                            );
                            updateSpecialRequest(
                              "ymca_dropoff",
                              false
                            );
                            updateSpecialRequest(
                              "walk_home",
                              false
                            );
                          }
                        }}
                        className="mr-3 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                      />

                      None of them
                    </label>

                    <label className="flex min-h-10 items-center rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]">
                      <input
                        type="checkbox"
                        checked={
                          formData.enrollment.special_request
                            .classroom_pickup
                        }
                        onChange={(e) =>
                          updateSpecialRequest(
                            "classroom_pickup",
                            e.target.checked
                          )
                        }
                        className="mr-3 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                      />

                      Classroom Pick-up (Prep or Year 1 ONLY)
                    </label>

                    <label className="flex min-h-10 items-center rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]">
                      <input
                        type="checkbox"
                        checked={
                          formData.enrollment.special_request
                            .ymca_dropoff
                        }
                        onChange={(e) =>
                          updateSpecialRequest(
                            "ymca_dropoff",
                            e.target.checked
                          )
                        }
                        className="mr-3 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                      />

                      YMCA Drop-off
                    </label>
                  </>
                )}

                <label className="flex min-h-10 items-center rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 text-sm text-[#10213A] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]">
                  <input
                    type="checkbox"
                    checked={
                      formData.enrollment.special_request
                        .walk_home
                    }
                    onChange={(e) =>
                      updateSpecialRequest(
                        "walk_home",
                        e.target.checked
                      )
                    }
                    className="mr-3 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                  />

                  Walk Home
                </label>
              </div>
            </div>

            {/* MEDICAL SNAPSHOT */}

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-[#011029]">
                Medical Snapshot
              </h3>

              <textarea
                placeholder="Medical Snapshot"
                value={
                  formData.enrollment.medical_snapshot
                }
                onChange={(e) =>
                  updateEnrollment(
                    "medical_snapshot",
                    e.target.value
                  )
                }
                rows={2}
                className="w-full resize-none rounded-xl border border-[#CBDCEA] bg-[#EEF5FB] px-3.5 py-2.5 text-sm text-[#10213A] outline-none transition placeholder:text-[#7890A8] focus:border-[#D4AF37] focus:bg-[#F7FBFF] focus:ring-2 focus:ring-[#D4AF37]/15"
              />
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* STEP 4 — REVIEW                               */}
        {/* ============================================== */}

        {step === 4 && (
          <div className="p-4 pt-6 sm:p-6 sm:pt-7 lg:p-7">
            <div className="mb-5">
              <h2 className="border-l-[3px] border-[#D4AF37] pl-3 text-lg font-semibold tracking-tight text-[#011029]">
                Review
              </h2>

              <p className="mt-1 text-xs text-[#5F7690]">
                Please check the details before submitting.
              </p>
            </div>

            <div className="space-y-3">
              {/* STUDENT */}

              <div className="rounded-xl border border-[#D8E4EF] bg-[#EEF5FB]/70 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7B5B16]">
                    Student
                  </h3>
                </div>

                <p className="text-base font-semibold text-[#011029]">
                  {formData.student.first_name}{" "}
                  {formData.student.last_name}
                </p>

                <p className="mt-1 text-sm text-[#5F7690]">
                  Preferred Name:{" "}
                  {formData.student.preferred_name || "-"}
                </p>
              </div>

              {/* PARENT */}

              <div className="rounded-xl border border-[#D8E4EF] bg-[#EEF5FB]/70 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7B5B16]">
                  Parent / Guardian
                </h3>

                <p className="text-sm font-semibold text-[#011029]">
                  {formData.parent.parent1_name}
                </p>

                <div className="mt-1 space-y-0.5 text-sm text-[#5F7690]">
                  <p>{formData.parent.email}</p>
                  <p>{formData.parent.mobile}</p>
                </div>
              </div>

              {/* ENROLLMENT */}

              <div className="rounded-xl border border-[#D8E4EF] bg-[#EEF5FB]/70 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7B5B16]">
                  Enrollment
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Academic Year
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {formData.enrollment.academic_year}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Term
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {formData.enrollment.term}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Join Date
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {formData.enrollment.join_date}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Trial
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {formData.enrollment.is_trial
                        ? "Yes"
                        : "No"}
                    </p>
                  </div>

                  <div className="col-span-2 pt-1">
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Campus
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {selectedCampus?.short_name ?? "-"}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[11px] font-medium text-[#7890A8]">
                      Class
                    </p>
                    <p className="font-medium text-[#10213A]">
                      {selectedClass
                        ? `${selectedCampus?.short_name} | ${selectedClass.day} | ${selectedClass.level}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#D4AF37]/30 bg-[#FFF7DD] px-4 py-3">
              <p className="text-xs leading-5 text-slate-500">
                Please make sure all details are correct before
                submitting your registration.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* NAVIGATION                                      */}
        {/* ------------------------------------------------ */}

        <div className="flex items-center justify-between border-t border-[#D4AF37]/20 bg-[#FFF8E8] px-4 py-3.5 sm:px-6 sm:py-4">
          {step === 1 ? (
            <button
              type="button"
              className="rounded-xl border border-[#CBDCEA] bg-white px-4 py-2.5 text-sm font-medium text-[#536B83] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-[#CBDCEA] bg-white px-4 py-2.5 text-sm font-medium text-[#536B83] transition hover:border-[#D4AF37]/50 hover:bg-[#F7FBFF]"
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="rounded-xl bg-[#011029] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102B4D] active:scale-[0.98]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (step === 1) {
                  if (
                    !formData.student.first_name.trim() ||
                    !formData.student.last_name.trim() ||
                    !(formData.student.emergency_contact ?? "").trim()
                  ) {
                    alert(
                      "Please complete all required fields."
                    );
                    return;
                  }
                }

                if (step === 2) {
                  if (
                    !(formData.parent.parent1_name ?? "").trim() ||
                    !(formData.parent.email ?? "").trim() ||
                    !(formData.parent.mobile ?? "").trim()
                  ) {
                    alert(
                      "Please complete all required fields."
                    );
                    return;
                  }

                  if (!isValidEmail(formData.parent.email)) {
                    alert(
                      "Please enter a valid email address."
                    );
                    return;
                  }

                  if (!isValidMobile(formData.parent.mobile)) {
                    alert(
                      "Please enter a valid Australian mobile number."
                    );
                    return;
                  }
                }

                if (step === 3) {
                  if (
                    !(formData.enrollment.class_id ?? "").trim()
                  ) {
                    alert("Please select a class.");
                    return;
                  }

                  if (
                    formData.enrollment.special_request
                      .classroom_pickup &&
                    formData.enrollment.special_request
                      .walk_home
                  ) {
                    alert(
                      "Classroom Pickup cannot be combined with Walk Home."
                    );
                    return;
                  }

                  if (
                    formData.enrollment.special_request
                      .ymca_dropoff &&
                    formData.enrollment.special_request
                      .walk_home
                  ) {
                    alert(
                      "YMCA Drop-off cannot be combined with Walk Home."
                    );
                    return;
                  }
                }

                if (step < 4) {
                  setStep(step + 1);
                }
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-xl bg-[#011029] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102B4D] active:scale-[0.98]"
            >
              Submit Registration
            </button>
          )}
        </div>
      </form>
    </div>
  );
}