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
<>
    <div className="flex items-center gap-3 mb-8">

      <div
        className={
          step >= 1
            ? "font-bold text-blue-600"
            : ""
        }
      >
        ① Student
      </div>

      <div>→</div>

      <div
        className={
          step >= 2
            ? "font-bold text-blue-600"
            : ""
        }
      >
        ② Parent
      </div>

      <div>→</div>

      <div
        className={
          step >= 3
            ? "font-bold text-blue-600"
            : ""
        }
      >
        ③ Enrollment
      </div>

      <div>→</div>

      <div
        className={
          step >= 4
            ? "font-bold text-blue-600"
            : ""
        }
      >
        ④ Review
      </div>

    </div>

   <form
  onSubmit={handleSubmit}
  className="space-y-8"
>
      {step === 1 && (

<div>

    <h2 className="text-xl font-semibold mb-4">
        Student Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="First Name *"
            value={formData.student.first_name}
            onChange={(e) =>
              updateStudent(
                "first_name",
                e.target.value
              )
            }
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
          />

          <input
            placeholder="Preferred Name"
            value={
              formData.student.preferred_name
            }
            onChange={(e) =>
              updateStudent(
                "preferred_name",
                e.target.value
              )
            }
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
          />

        <div>
  <label className="block text-sm font-medium mb-1">
    DOB
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
  />
</div>

          <input
            placeholder="School"
            value={formData.student.school}
            onChange={(e) =>
              updateStudent(
                "school",
                e.target.value
              )
            }
          />
          <input
            placeholder="Grade"
            value={formData.student.school_year}
            onChange={(e) =>
              updateStudent(
                "school_year",
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Medical Information"
            value={
              formData.student
                .medical_information
            }
            onChange={(e) =>
              updateStudent(
                "medical_information",
                e.target.value
              )
            }
          />

          <input
            placeholder="Emergency Contact *"
            value={
              formData.student
                .emergency_contact
            }
            onChange={(e) =>
              updateStudent(
                "emergency_contact",
                e.target.value
              )
            }
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
          />

        </div>
      </div>
      )}

      {step === 2 && (

<div>

    <h2 className="text-xl font-semibold mb-4">
        Parent Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="Parent Name *"
            value={formData.parent.parent1_name}
            onChange={(e) =>
              updateParent(
                "parent1_name",
                e.target.value
              )
            }
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
          />

          <input
            placeholder="Email *"
            value={formData.parent.email}
            onChange={(e) =>
              updateParent(
                "email",
                e.target.value
              )
            }
          />

          <input
            placeholder="Mobile *"
            value={formData.parent.mobile}
            onChange={(e) =>
              updateParent(
                "mobile",
                e.target.value
              )
            }
          />

        </div>
      </div>

      )}

            {step === 3 && (

<div>

  <h2 className="text-xl font-semibold mb-4">
    Enrollment Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

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
          />

          <select
            value={formData.enrollment.term}
            onChange={(e) =>
              updateEnrollment(
                "term",
                Number(e.target.value)
              )
            }
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

          <input
            type="date"
            value={formData.enrollment.join_date}
            onChange={(e) =>
              updateEnrollment(
                "join_date",
                e.target.value
              )
            }
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.enrollment.is_trial}
              onChange={(e) =>
                updateEnrollment(
                  "is_trial",
                  e.target.checked
                )
              }
            />
            Trial Lesson
          </label>

        </div>
      </div>
      )}

            {step === 3 && (

<div>

  <div>
  <h2 className="text-xl font-semibold mb-4">
    Special Request
  </h2>

  {isSchoolProgram && (
    <>
      <label className="flex items-center gap-2 mb-2">
  <input
    type="checkbox"
    checked={
      !formData.enrollment.special_request.classroom_pickup &&
      !formData.enrollment.special_request.ymca_dropoff &&
      !formData.enrollment.special_request.walk_home
    }
    onChange={(e) => {
      if (e.target.checked) {
        updateSpecialRequest("classroom_pickup", false);
        updateSpecialRequest("ymca_dropoff", false);
        updateSpecialRequest("walk_home", false);
      }
    }}
  />
  None of them
</label>

      <label className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={
            formData.enrollment.special_request.classroom_pickup
          }
          onChange={(e) =>
            updateSpecialRequest(
              "classroom_pickup",
              e.target.checked
            )
          }
        />
        Classroom Pick-up (Prep or Year 1 ONLY)
      </label>

      <label className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={
            formData.enrollment.special_request.ymca_dropoff
          }
          onChange={(e) =>
            updateSpecialRequest(
              "ymca_dropoff",
              e.target.checked
            )
          }
        />
        YMCA Drop-off
      </label>
    </>
  )}

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={
        formData.enrollment.special_request.walk_home
      }
      onChange={(e) =>
        updateSpecialRequest(
          "walk_home",
          e.target.checked
        )
      }
    />
    Walk Home
  </label>
</div>

  <h2 className="text-xl font-semibold mb-4">
    Medical Snapshot
        </h2>

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
          className="w-full border rounded-lg p-3"
          rows={4}
        />
      </div>

      )}

{step === 4 && (

<div>

  <h2 className="text-xl font-semibold mb-4">
    Review
  </h2>

  <div className="space-y-6">

    <div className="border rounded-lg p-4">

      <h3 className="font-semibold mb-2">
        Student
      </h3>

      <p>
        {formData.student.first_name}{" "}
        {formData.student.last_name}
      </p>

      <p>
        Preferred Name:
        {" "}
        {formData.student.preferred_name || "-"}
      </p>

    </div>

    <div className="border rounded-lg p-4">

      <h3 className="font-semibold mb-2">
        Parent
      </h3>

      <p>{formData.parent.parent1_name}</p>

      <p>{formData.parent.email}</p>

      <p>{formData.parent.mobile}</p>

    </div>

    <div className="border rounded-lg p-4">

      <h3 className="font-semibold mb-2">
        Enrollment
      </h3>

      <p>
        Academic Year:
        {" "}
        {formData.enrollment.academic_year}
      </p>

      <p>
        Term:
        {" "}
        {formData.enrollment.term}
      </p>

      <p>
  Join Date:
  {" "}
  {formData.enrollment.join_date}
</p>

      <p>
  Campus:
  {" "}
  {selectedCampus?.short_name ?? "-"}
</p>

<p>
  Class:
  {" "}
  {selectedClass
    ? `${selectedCampus?.short_name} | ${selectedClass.day} | ${selectedClass.level}`
    : "-"}
</p>

      <p>
        Trial:
        {" "}
        {formData.enrollment.is_trial
          ? "Yes"
          : "No"}
      </p>

    </div>

  </div>

</div>

)}

      <div className="flex justify-end gap-3 pt-6 border-t">

        {step === 1 ? (

  <button
    type="button"
    className="px-5 py-2 rounded-lg border"
    onClick={() => window.history.back()}
  >
    Cancel
  </button>

) : (

  <button
    type="button"
    className="px-5 py-2 rounded-lg border"
    onClick={() => setStep(step - 1)}
  >
    Previous
  </button>

)}

        {step < 4 ? (

  <button
    type="button"
    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
  alert("Please enter a valid email address.");
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

  if (!(formData.enrollment.class_id ?? "").trim()) {
    alert("Please select a class.");
    return;
  }
 if (
  formData.enrollment.special_request.classroom_pickup &&
  formData.enrollment.special_request.walk_home
) {
  alert(
    "Classroom Pickup cannot be combined with Walk Home."
  );
  return;
}

if (
  formData.enrollment.special_request.ymca_dropoff &&
  formData.enrollment.special_request.walk_home
) {
  alert(
    "YMCA Drop-off cannot be combined with Walk Home."
  );
  return;
} 

}

  if (step < 4) {

setStep(step + 1);

};

}}
  >
    Next
  </button>

) : (

  <button
    type="submit"
    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
    Submit Registration
  </button>

)}

      </div>

    </form>

</>
  );
}

