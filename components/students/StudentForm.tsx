"use client";

interface StudentFormProps {
  form: any;
  setForm: (value: any) => void;
  onSave: () => void;

  editingStudent?: any;
  onCancel?: () => void;
}

export default function StudentForm({
  form,
  setForm,
  onSave,
  editingStudent,
  onCancel,
}: StudentFormProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">

      <h2 className="text-2xl font-bold mb-6">
        Student Information
      </h2>

      <div className="space-y-4">

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Student Code"
          value={form.student_code}
          onChange={(e) =>
            setForm({ ...form, student_code: e.target.value })
          }
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="First Name"
          value={form.first_name}
          onChange={(e) =>
            setForm({ ...form, first_name: e.target.value })
          }
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Last Name"
          value={form.last_name}
          onChange={(e) =>
            setForm({ ...form, last_name: e.target.value })
          }
        />

        <select
          className="w-full border rounded-lg p-2"
          value={form.gender}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value })
          }
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          type="date"
          className="w-full border rounded-lg p-2"
          value={form.date_of_birth}
          onChange={(e) =>
            setForm({
              ...form,
              date_of_birth: e.target.value,
            })
          }
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="School"
          value={form.school}
          onChange={(e) =>
            setForm({ ...form, school: e.target.value })
          }
        />

        <input
  className="w-full border rounded-lg p-2"
  placeholder="Current Level"
  value={form.current_level}
  onChange={(e) =>
    setForm({
      ...form,
      current_level: e.target.value,
    })
  }
/>

<select
  className="w-full border rounded-lg p-2"
  value={form.student_stage}
  onChange={(e) =>
    setForm({
      ...form,
      student_stage: e.target.value,
    })
  }
>
  <option value="Regular">Regular</option>
  <option value="Trial">Trial</option>
</select>

        <label className="flex items-center gap-2">

          <input
            type="checkbox"
            checked={form.is_school_program}
            onChange={(e) =>
              setForm({
                ...form,
                is_school_program: e.target.checked,
              })
            }
          />

          School Program

        </label>

        <input
          className="w-full border rounded-lg p-2"
          placeholder="School Year"
          value={form.school_year}
          onChange={(e) =>
            setForm({
              ...form,
              school_year: e.target.value,
            })
          }
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="School Class"
          value={form.school_class}
          onChange={(e) =>
            setForm({
              ...form,
              school_class: e.target.value,
            })
          }
        />

        <textarea
          rows={4}
          className="w-full border rounded-lg p-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) =>
            setForm({
              ...form,
              notes: e.target.value,
            })
          }
        />

       <div className="flex gap-2">

  <button
    onClick={onSave}
    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
  >
    {editingStudent ? "Update Student" : "Save Student"}
  </button>

  {editingStudent && (
    <button
      onClick={onCancel}
      className="px-5 bg-gray-300 hover:bg-gray-400 rounded-lg"
    >
      Cancel
    </button>
  )}

</div>

      </div>

    </div>
  );
}