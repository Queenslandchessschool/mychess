"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import type { MakeupCredit } from "./types";

/**
 * ============================================================
 * MyCHESS — Parent Portal — Make-up Credit
 * ============================================================
 *
 * Parent Flow:
 *
 * Authenticated Parent
 *        ↓
 * Parent Email
 *        ↓
 * Family ID
 *        ↓
 * Family Children
 *        ↓
 * Make-up Credits
 *
 * Frozen Rules:
 *
 * - Parent scope is Family-based.
 * - Parent may only see credits belonging to
 *   students in their own Family.
 * - One Leave = One Make-up Credit.
 * - One Credit represents one Make-up Lesson.
 * - Special Arrangements do not generate Credits.
 * - Credits should be used within the current Term where possible.
 * - Maximum two unused Credits may roll into the next Term
 *   for tuition purposes.
 * - Credits do not accumulate indefinitely.
 *
 * Business timezone:
 * Australia/Brisbane
 * ============================================================
 */

type Student = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;
};

type FamilyStudent = {
  student: Student;
};

export default function ParentMakeupCreditPage() {
  // ==========================================================
  // Loading / Error
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================
  // Parent / Family
  // ==========================================================

  const [parentEmail, setParentEmail] =
    useState("");

  const [familyId, setFamilyId] =
    useState<string | null>(null);

  const [familyStudents, setFamilyStudents] =
    useState<FamilyStudent[]>([]);

  // ==========================================================
  // Make-up Credits
  // ==========================================================

  const [credits, setCredits] =
    useState<MakeupCredit[]>([]);

  // ==========================================================
  // Load Parent / Family / Credits
  // ==========================================================

  async function loadMakeupCredits() {
    setLoading(true);
    setError(null);

    try {
      // --------------------------------------------------------
      // 1. Authenticated Parent
      // --------------------------------------------------------

      const {
        data: {
          user,
        },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to access Make-up Credits."
        );
      }

      const email =
        user.email?.trim().toLowerCase();

      if (!email) {
        throw new Error(
          "Your account does not have an email address."
        );
      }

      setParentEmail(email);

      // --------------------------------------------------------
      // 2. Resolve Family
      // --------------------------------------------------------

      const {
        data: parentRecords,
        error: parentError,
      } = await supabase
        .from("parents")
        .select(`
          family_id,
          student_id
        `)
        .eq("email", email);

      if (parentError) {
        throw parentError;
      }

      if (
        !parentRecords ||
        parentRecords.length === 0
      ) {
        throw new Error(
          "No Parent record is linked to this account."
        );
      }

      const resolvedFamilyId =
        parentRecords.find(
          (row) => row.family_id
        )?.family_id ?? null;

      if (!resolvedFamilyId) {
        throw new Error(
          "Your Parent record does not have a Family ID."
        );
      }

      setFamilyId(
        resolvedFamilyId
      );

      // --------------------------------------------------------
      // 3. Load all children in this Family
      // --------------------------------------------------------

      const {
        data: familyParents,
        error: familyError,
      } = await supabase
        .from("parents")
        .select(`
          student_id
        `)
        .eq(
          "family_id",
          resolvedFamilyId
        );

      if (familyError) {
        throw familyError;
      }

      const studentIds =
        Array.from(
          new Set(
            (familyParents ?? [])
              .map(
                (row) =>
                  row.student_id
              )
              .filter(Boolean)
          )
        );

      if (studentIds.length === 0) {
        setFamilyStudents([]);
        setCredits([]);
        return;
      }

      // --------------------------------------------------------
      // 4. Load Student Master
      // --------------------------------------------------------

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          preferred_name,
          last_name
        `)
        .in(
          "id",
          studentIds
        )
        .order(
          "student_code"
        );

      if (studentError) {
        throw studentError;
      }

      const students =
        (studentData ?? []) as Student[];

      setFamilyStudents(
        students.map(
          (student) => ({
            student,
          })
        )
      );

      // --------------------------------------------------------
      // 5. Load Make-up Credits
      //
      // IMPORTANT:
      //
      // Credits are restricted at query level to the
      // current Family's student IDs.
      // --------------------------------------------------------

      const {
        data: creditData,
        error: creditError,
      } = await supabase
        .from("makeup_credits")
        .select(`
          id,
          student_id,
          credits,
          reason,
          status,
          created_at,
          used_at
        `)
        .in(
          "student_id",
          studentIds
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (creditError) {
        throw creditError;
      }

      setCredits(
        (creditData ?? []) as MakeupCredit[]
      );

    } catch (loadError: any) {
      console.error(
        "PARENT MAKEUP CREDIT LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ??
          "Unable to load Make-up Credits."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // Initial Load
  // ==========================================================

  useEffect(() => {
    loadMakeupCredits();
  }, []);

  // ==========================================================
  // Helpers
  // ==========================================================

  function getStudentName(
    student: Student
  ) {
    return (
      student.preferred_name?.trim() ||
      student.first_name?.trim() ||
      [
        student.first_name,
        student.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Student"
    );
  }

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleDateString(
      "en-AU",
      {
        timeZone:
          "Australia/Brisbane",
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  function getCreditsForStudent(
    studentId: string
  ) {
    return credits.filter(
      (credit) =>
        credit.student_id ===
        studentId
    );
  }

  // ==========================================================
  // Family Credit Summary
  // ==========================================================

  const availableCreditCount =
    useMemo(
      () =>
        credits
          .filter(
            (credit) =>
              credit.status ===
              "Available"
          )
          .reduce(
            (total, credit) =>
              total +
              Number(
                credit.credits ?? 0
              ),
            0
          ),
      [credits]
    );

  const usedCreditCount =
    useMemo(
      () =>
        credits
          .filter(
            (credit) =>
              credit.status ===
              "Used"
          )
          .reduce(
            (total, credit) =>
              total +
              Number(
                credit.credits ?? 0
              ),
            0
          ),
      [credits]
    );

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <main
        className="
          min-h-screen
          bg-[#0B2342]
          bg-[linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%),linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%)]
          bg-[length:48px_48px]
          bg-[position:0_0,24px_24px]
        "
      >
        <div
  className="
    mx-auto
    w-full
    max-w-[1500px]
    px-4
    py-5
    sm:px-6
    sm:py-8
    lg:px-8
  "
>
          <div
            className="
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              p-6
              shadow-sm
              sm:p-7
            "
          >
            <p className="text-sm text-[#64748B]">
              Loading Make-up Credits...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // Error
  // ==========================================================

  if (error) {
    return (
      <main
        className="
          min-h-screen
          bg-[#0B2342]
          bg-[linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%),linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%)]
          bg-[length:48px_48px]
          bg-[position:0_0,24px_24px]
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1500px]
            px-4
            py-8
            sm:px-6
            lg:px-8
          "
        >
          <section
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              shadow-sm
            "
          >
            <div
              className="
                absolute
                left-0
                top-0
                h-[6px]
                w-[46%]
                bg-gradient-to-r
                from-[#8F6B18]
                via-[#F4D35E]
                to-transparent
              "
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
              }}
            />

            <div
              className="
                p-5
                sm:p-7
              "
            >
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-[#B28A22]
                "
              >
                MAKE-UP CREDIT
              </p>

              <h1
                className="
                  mt-2
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#10213A]
                  sm:text-3xl
                "
              >
                My Make-up Credits
              </h1>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-[#64748B]
                  sm:text-base
                "
              >
                {error}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ==========================================================
  // Main UI
  // ==========================================================

  return (
    <main
      className="
        min-h-screen
        bg-[#0B2342]
        bg-[linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%),linear-gradient(45deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.025)_75%)]
        bg-[length:48px_48px]
        bg-[position:0_0,24px_24px]
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          py-8
          sm:px-6
          lg:px-8
        "
      >

        {/* ================================================== */}
        {/* Page Header */}
        {/* ================================================== */}

        <header className="mb-5 sm:mb-6">

  <h1
    className="
      text-3xl
      font-bold
      tracking-tight
      text-white
      sm:text-4xl
    "
  >
    Make-up Credit
  </h1>

  <p
    className="
      mt-2
      max-w-3xl
      text-sm
      leading-6
      text-[#B8C7DA]
      sm:text-base
    "
  >
    View your family's available and used make-up credits.
  </p>

</header>


        {/* ================================================== */}
        {/* Summary Card */}
        {/* ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-[#D9E0E8]
            bg-[#FFFDF8]
            shadow-sm
          "
        >

          {/* Gold tapered top highlight */}
          <div
            className="
              absolute
              left-0
              top-0
              h-[6px]
              w-[46%]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-transparent
            "
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
            }}
          />

          <div
            className="
              p-5
              sm:p-7
              lg:p-8
            "
          >

            <div className="space-y-1">

  <p
    className="
      text-[11px]
      font-semibold
      uppercase
      tracking-[0.22em]
      text-[#B28A22]
      sm:text-xs
    "
  >
    MAKE-UP CREDIT
  </p>

  <p
    className="
      pt-1
      text-sm
      leading-6
      text-[#64748B]
      sm:text-base
    "
  >
    One credit represents one make-up lesson.
  </p>

</div>


            {/* Summary */}
            <div
              className="
                mt-6
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >

              <div
                className="
                  rounded-xl
                  border
                  border-[#D9E0E8]
                  bg-[#F5F9FD]
                  p-4
                "
              >
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#64748B]
                  "
                >
                  Available
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-[#10213A]
                  "
                >
                  {availableCreditCount}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-[#64748B]
                  "
                >
                  Make-up credits
                </p>
              </div>


              <div
                className="
                  rounded-xl
                  border
                  border-[#D9E0E8]
                  bg-[#F5F9FD]
                  p-4
                "
              >
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#64748B]
                  "
                >
                  Used
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-[#10213A]
                  "
                >
                  {usedCreditCount}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-[#64748B]
                  "
                >
                  Make-up credits
                </p>
              </div>

            </div>

          </div>
        </section>


        {/* ================================================== */}
        {/* Children / Credits */}
        {/* ================================================== */}

        <section className="mt-6">

          <div
            className="
              mb-4
              flex
              flex-col
              gap-1
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >

            <div>

              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#D4AF37]
                "
              >
                FAMILY
              </p>

            <h2 
  className=" 
    mt-1 
    text-xl 
    font-bold 
    text-white 
    sm:text-2xl 
  " 
> 
  {familyStudents.length === 1
    ? "Your Child"
    : "Your Children"}
</h2>

            </div>

            <p
              className="
                text-xs
                text-[#8FA4BE]
                sm:text-sm
              "
            >
              {familyStudents.length}{" "}
              {familyStudents.length === 1
                ? "child"
                : "children"}
            </p>

          </div>


          <div className="space-y-5">

            {familyStudents.map(
  (
    {
      student,
    },
    index
  ) => {

                const studentCredits =
                  getCreditsForStudent(
                    student.id
                  );

                const availableCredits =
                  studentCredits.filter(
                    (credit) =>
                      credit.status ===
                      "Available"
                  );

                const usedCredits =
                  studentCredits.filter(
                    (credit) =>
                      credit.status ===
                      "Used"
                  );

                return (
                  <section
                    key={student.id}
                    className="
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[#D9E0E8]
                      bg-[#FFFDF8]
                      shadow-sm
                    "
                  >

                    {/* Gold tapered top highlight */}
                    <div
                      className="
                        absolute
                        left-0
                        top-0
                        h-[6px]
                        w-[46%]
                        bg-gradient-to-r
                        from-[#8F6B18]
                        via-[#F4D35E]
                        to-transparent
                      "
                      style={{
                        clipPath:
                          "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
                      }}
                    />


                    <div
                      className="
                        p-5
                        sm:p-7
                      "
                    >

                      {/* Child Header */}
                      <div
                        className="
                          flex
                          flex-col
                          gap-2
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >

                        <div>

                          <p
  className="
    text-[11px]
    font-semibold
    uppercase
    tracking-[0.18em]
    text-[#B28A22]
  "
>
  {familyStudents.length === 1
  ? "CHILD"
  : `CHILD ${index + 1}`}
</p>

                          <h3
                            className="
                              mt-1
                              text-xl
                              font-bold
                              text-[#10213A]
                              sm:text-2xl
                            "
                          >
                            {getStudentName(
                              student
                            )}
                          </h3>

                        </div>

                        <div
                          className="
                            inline-flex
                            w-fit
                            items-center
                            rounded-full
                            border
                            border-[#D4AF37]/40
                            bg-[#FFF8DC]
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-[#8F6B18]
                          "
                        >
                          {availableCredits.length}{" "}
                          Available
                        </div>

                      </div>


                      {/* Credit List */}
                      <div className="mt-6">

                        {studentCredits.length ===
                        0 ? (
                          <div
                            className="
                              rounded-xl
                              border
                              border-dashed
                              border-[#CBD5E1]
                              bg-[#F8FAFC]
                              p-5
                              text-center
                            "
                          >
                            <p
                              className="
                                text-sm
                                font-medium
                                text-[#475569]
                              "
                            >
                              No make-up credits
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                leading-5
                                text-[#94A3B8]
                              "
                            >
                              No make-up credit
                              records are currently
                              available for this child.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">

                            {studentCredits.map(
                              (credit) => {

                                const isAvailable =
                                  credit.status ===
                                  "Available";

                                return (
                                  <article
                                    key={credit.id}
                                    className="
                                      rounded-xl
                                      border
                                      border-[#D9E0E8]
                                      bg-[#F5F9FD]
                                      p-4
                                      sm:p-5
                                    "
                                  >

                                    <div
                                      className="
                                        flex
                                        flex-col
                                        gap-4
                                        sm:flex-row
                                        sm:items-start
                                        sm:justify-between
                                      "
                                    >

                                      <div
                                        className="
                                          min-w-0
                                          flex-1
                                        "
                                      >

                                        <div
                                          className="
                                            flex
                                            flex-wrap
                                            items-center
                                            gap-2
                                          "
                                        >

                                          <span
                                            className="
                                              text-sm
                                              font-bold
                                              text-[#10213A]
                                            "
                                          >
                                            {credit.credits}{" "}
                                            {Number(
                                              credit.credits
                                            ) === 1
                                              ? "Credit"
                                              : "Credits"}
                                          </span>

                                          <span
                                            className={`
                                              inline-flex
                                              items-center
                                              rounded-full
                                              px-2.5
                                              py-1
                                              text-[11px]
                                              font-semibold
                                              ${
                                                isAvailable
                                                  ? "bg-[#E8F6EE] text-[#176B3A]"
                                                  : "bg-[#E8ECF2] text-[#64748B]"
                                              }
                                            `}
                                          >
                                            {credit.status}
                                          </span>

                                        </div>


                                        <div className="mt-3">

                                          <p
                                            className="
                                              text-[11px]
                                              font-semibold
                                              uppercase
                                              tracking-[0.14em]
                                              text-[#64748B]
                                            "
                                          >
                                            Reason
                                          </p>

                                          <p
                                            className="
                                              mt-1
                                              text-sm
                                              text-[#10213A]
                                            "
                                          >
                                            {credit.reason ||
                                              "-"}
                                          </p>

                                        </div>

                                      </div>


                                      <div
                                        className="
                                          shrink-0
                                          text-left
                                          sm:text-right
                                        "
                                      >

                                        <p
                                          className="
                                            text-[11px]
                                            font-semibold
                                            uppercase
                                            tracking-[0.14em]
                                            text-[#64748B]
                                          "
                                        >
                                          Created
                                        </p>

                                        <p
                                          className="
                                            mt-1
                                            text-sm
                                            text-[#10213A]
                                          "
                                        >
                                          {formatDate(
                                            credit.created_at
                                          )}
                                        </p>


                                        {credit.used_at && (
                                          <div className="mt-3">

                                            <p
                                              className="
                                                text-[11px]
                                                font-semibold
                                                uppercase
                                                tracking-[0.14em]
                                                text-[#64748B]
                                              "
                                            >
                                              Used
                                            </p>

                                            <p
                                              className="
                                                mt-1
                                                text-sm
                                                text-[#10213A]
                                              "
                                            >
                                              {formatDate(
                                                credit.used_at
                                              )}
                                            </p>

                                          </div>
                                        )}

                                      </div>

                                    </div>

                                  </article>
                                );
                              }
                            )}

                          </div>
                        )}

                      </div>

                    </div>
                  </section>
                );
              }
            )}

          </div>

        </section>


        {/* ================================================== */}
        {/* Make-up Credit Policy */}
        {/* ================================================== */}

        <section
          className="
            relative
            mt-6
            overflow-hidden
            rounded-2xl
            border
            border-[#D9E0E8]
            bg-[#FFFDF8]
            shadow-sm
          "
        >

          {/* Gold tapered top highlight */}
          <div
            className="
              absolute
              left-0
              top-0
              h-[6px]
              w-[46%]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-transparent
            "
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
            }}
          />

          <div
            className="
              p-5
              sm:p-7
              lg:p-8
            "
          >

            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[#B28A22]
                sm:text-xs
              "
            >
              MAKE-UP POLICY
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-bold
                tracking-tight
                text-[#10213A]
                sm:text-2xl
              "
            >
              Make-up Credit Policy
            </h2>


            <div
              className="
                mt-5
                space-y-4
                text-sm
                leading-6
                text-[#475569]
                sm:text-base
              "
            >

              <p>
                To support continuous learning,
                we encourage students to maintain
                100% attendance wherever possible.
                However, we understand that
                circumstances such as illness and
                other unavoidable situations can occur.
              </p>


              <div
                className="
                  rounded-xl
                  border
                  border-[#D9E0E8]
                  bg-[#F5F9FD]
                  p-4
                  sm:p-5
                "
              >

                <ul
                  className="
                    list-disc
                    space-y-2
                    pl-5
                  "
                >
                  <li>
                    <strong className="text-[#10213A]">
                      No refund:
                    </strong>{" "}
                    lesson fees are non-refundable.
                  </li>

                  <li>
                    <strong className="text-[#10213A]">
                      One leave = one make-up credit:
                    </strong>{" "}
                    a submitted Leave Record
                    generates one Make-up Credit.
                  </li>

                  <li>
                    <strong className="text-[#10213A]">
                      One credit = one make-up lesson:
                    </strong>{" "}
                    available credits can be used
                    to book an eligible make-up lesson.
                  </li>

                  <li>
                    We encourage families to use
                    make-up credits during the same
                    Term whenever suitable lessons
                    are available.
                  </li>

                  <li>
                    A maximum of{" "}
                    <strong className="text-[#10213A]">
                      two unused credits
                    </strong>{" "}
                    may roll into the following Term
                    and be applied toward tuition.
                  </li>

                  <li>
                    Credits cannot accumulate
                    indefinitely. The rollover limit
                    is re-calculated for each Term.
                  </li>

                </ul>

              </div>


              {/* Special Arrangements */}
              <div
                className="
                  rounded-xl
                  border
                  border-[#D4AF37]/35
                  bg-[#FFF8DC]
                  p-4
                  sm:p-5
                "
              >

                <p
                  className="
                    font-semibold
                    text-[#10213A]
                  "
                >
                  Special Arrangements
                </p>

                <p className="mt-2">
                  Any special arrangement, such as
                  a long planned holiday, should be
                  discussed with Admin in advance so
                  we can maintain it in the system
                  before the next Term starts.
                </p>

                <p className="mt-2">
                  Lessons covered by an approved
                  Special Arrangement are not charged
                  and do not generate Make-up Credits.
                </p>

              </div>

            </div>

          </div>
        </section>

      </div>
    </main>
  );
}