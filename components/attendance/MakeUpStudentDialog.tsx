// ======================================================
// MyCHESS Shared Make-up Student Dialog
//
// Shared UI Component
//
// Used by:
// - Admin Attendance
// - Coach Attendance
//
// IMPORTANT:
// - UI / VI is shared
// - Admin / Coach scope is NOT handled here
// - Business logic is NOT handled here
// - Parent component supplies the eligible students
// - Parent component handles Add action
//
// Responsive:
// - Desktop: table
// - Mobile: cards
// - No horizontal scrolling
// ======================================================

"use client";


// ======================================================
// Types
// ======================================================

export interface MakeUpStudent {
  student_id: string;

  student_code: string;

  student_name: string;

  level: string;

  credits: number;
}


interface MakeUpStudentDialogProps {
  open: boolean;

  students: MakeUpStudent[];

  onClose: () => void;

  onAdd: (
    student: MakeUpStudent
  ) => void | Promise<void>;
}


// ======================================================
// Component
// ======================================================

export default function MakeUpStudentDialog({
  open,
  students,
  onClose,
  onAdd,
}: MakeUpStudentDialogProps) {

  if (!open) {
    return null;
  }


  // ====================================================
  // Dialog
  // ====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        overflow-hidden
        bg-[#071A2F]/60
        p-3
        sm:p-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="makeup-dialog-title"
    >

      {/* ==================================================
          Dialog Container
          ================================================== */}

      <div
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-[700px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-[#D4AF37]
          bg-[#FFFCF7]
          text-[#10213A]
          shadow-2xl
        "
      >

        {/* ==================================================
            Header
            ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-[#D4AF37]/30
            px-4
            py-4
            sm:px-6
            sm:py-5
          "
        >

          <h2
            id="makeup-dialog-title"
            className="
              text-lg
              font-semibold
              text-[#10213A]
              sm:text-xl
            "
          >
            Add Make-up
          </h2>


          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              text-xl
              leading-none
              text-[#64748B]
              transition-colors
              hover:bg-[#102A4A]/5
              hover:text-[#10213A]
              active:bg-[#102A4A]/10
            "
          >
            ✕
          </button>

        </div>


        {/* ==================================================
            Student List
            ================================================== */}

        <div
          className="
            min-h-0
            overflow-y-auto
            overflow-x-hidden
          "
        >

          {/* ==================================================
              Empty State
              ================================================== */}

          {students.length === 0 ? (

            <div
              className="
                px-5
                py-8
                text-center
                sm:px-6
                sm:py-10
              "
            >
              <p
                className="
                  text-sm
                  text-[#64748B]
                "
              >
                No students have available
                make-up credits.
              </p>
            </div>

          ) : (

            <>

              {/* ==================================================
                  DESKTOP TABLE
                  ================================================== */}

              <div
                className="
                  hidden
                  sm:block
                "
              >

                <table
                  className="
                    w-full
                    table-fixed
                    text-sm
                    text-[#10213A]
                  "
                >

                  <thead
                    className="
                      border-b
                      border-[#D4AF37]
                      bg-[#FFFCF7]
                    "
                  >

                    <tr>

                      <th
                        className="
                          w-[18%]
                          px-5
                          py-3
                          text-left
                          text-xs
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-[#9A6A00]
                        "
                      >
                        Code
                      </th>

                      <th
                        className="
                          w-[29%]
                          px-3
                          py-3
                          text-left
                          text-xs
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-[#9A6A00]
                        "
                      >
                        Student
                      </th>

                      <th
                        className="
                          w-[22%]
                          px-3
                          py-3
                          text-left
                          text-xs
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-[#9A6A00]
                        "
                      >
                        Level
                      </th>

                      <th
                        className="
                          w-[13%]
                          px-3
                          py-3
                          text-center
                          text-xs
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-[#9A6A00]
                        "
                      >
                        Credits
                      </th>

                      <th
                        className="
                          w-[18%]
                          px-5
                          py-3
                          text-right
                          text-xs
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-[#9A6A00]
                        "
                      >
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {students.map(
                      (student) => (

                        <tr
                          key={
                            student.student_id
                          }
                          className="
                            border-b
                            border-[#D4AF37]/20
                            last:border-b-0
                          "
                        >

                          <td
                            className="
                              px-5
                              py-3
                              font-medium
                            "
                          >
                            {student.student_code}
                          </td>


                          <td
                            className="
                              truncate
                              px-3
                              py-3
                              font-semibold
                            "
                          >
                            {student.student_name}
                          </td>


                          <td
                            className="
                              truncate
                              px-3
                              py-3
                            "
                          >
                            {student.level}
                          </td>


                          <td
                            className="
                              px-3
                              py-3
                              text-center
                              font-semibold
                            "
                          >
                            {student.credits}
                          </td>


                          <td
                            className="
                              px-5
                              py-3
                              text-right
                            "
                          >

                            <button
                              type="button"
                              onClick={() =>
                                onAdd(student)
                              }
                              className="
                                rounded-lg
                                bg-[#2563EB]
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                text-white
                                shadow-sm
                                transition
                                hover:bg-[#1D4ED8]
                                active:bg-[#1E40AF]
                              "
                            >
                              Add
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* ==================================================
                  MOBILE CARDS
                  ================================================== */}

              <div
                className="
                  block
                  sm:hidden
                "
              >

                {students.map(
                  (student) => (

                    <div
                      key={
                        student.student_id
                      }
                      className="
                        border-b
                        border-[#D4AF37]/20
                        px-4
                        py-4
                        last:border-b-0
                      "
                    >

                      {/* Student information */}

                      <div
                        className="
                          min-w-0
                        "
                      >

                        <div
                          className="
                            flex
                            min-w-0
                            items-center
                            justify-between
                            gap-3
                          "
                        >

                          <p
                            className="
                              min-w-0
                              truncate
                              text-sm
                              font-semibold
                              text-[#10213A]
                            "
                          >
                            {student.student_name}
                          </p>


                          <span
                            className="
                              shrink-0
                              rounded-full
                              bg-[#102A4A]
                              px-2.5
                              py-1
                              text-xs
                              font-semibold
                              text-[#F4F7FB]
                            "
                          >
                            {student.student_code}
                          </span>

                        </div>


                        {/* Secondary information */}

                        <div
                          className="
                            mt-2
                            flex
                            min-w-0
                            items-center
                            justify-between
                            gap-3
                          "
                        >

                          <span
                            className="
                              truncate
                              text-xs
                              text-[#64748B]
                            "
                          >
                            {student.level}
                          </span>


                          <span
                            className="
                              shrink-0
                              text-xs
                              font-semibold
                              text-[#9A6A00]
                            "
                          >
                            {student.credits}{" "}
                            {student.credits === 1
                              ? "credit"
                              : "credits"}
                          </span>

                        </div>

                      </div>


                      {/* Action */}

                      <div
                        className="
                          mt-3
                          flex
                          justify-end
                        "
                      >

                        <button
                          type="button"
                          onClick={() =>
                            onAdd(student)
                          }
                          className="
                            min-w-[76px]
                            rounded-lg
                            bg-[#2563EB]
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            shadow-sm
                            transition
                            hover:bg-[#1D4ED8]
                            active:bg-[#1E40AF]
                          "
                        >
                          Add
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            </>

          )}

        </div>

      </div>

    </div>
  );
}