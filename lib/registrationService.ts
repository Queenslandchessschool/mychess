import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/lib/registration";
import { synchroniseStudentStage } from "@/lib/studentSynchronisation";

/**
 * ============================================================
 * Family ID
 * ============================================================
 */

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function generateFamilyId(): Promise<string> {
  const [
    { data: parentFamilies, error: parentError },
    { data: studentFamilies, error: studentError },
  ] = await Promise.all([
    supabase
      .from("parents")
      .select("family_id")
      .not("family_id", "is", null),

    supabase
      .from("students")
      .select("family_id")
      .not("family_id", "is", null),
  ]);

  if (parentError) throw parentError;
  if (studentError) throw studentError;

  const ids = [
    ...(parentFamilies ?? []).map((row: any) => row.family_id),
    ...(studentFamilies ?? []).map((row: any) => row.family_id),
  ].filter(
    (id): id is string =>
      typeof id === "string" && /^F\d+$/.test(id)
  );

  let maxNumber = 0;

  for (const id of ids) {
    const number = Number(id.substring(1));

    if (Number.isFinite(number)) {
      maxNumber = Math.max(maxNumber, number);
    }
  }

  return `F${String(maxNumber + 1).padStart(4, "0")}`;
}

/**
 * ============================================================
 * Resolve Family
 * ============================================================
 */

async function resolveFamilyId(
  email: string
): Promise<string> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error(
      "Parent email is required to determine Family ID."
    );
  }

  const { data: matchingParents, error } = await supabase
    .from("parents")
    .select("id, student_id, family_id, email")
    .ilike("email", normalizedEmail);

  if (error) throw error;

  const existingFamily = (matchingParents ?? []).find(
    (parent: any) =>
      parent.family_id &&
      normalizeEmail(parent.email ?? "") === normalizedEmail
  );

  if (existingFamily?.family_id) {
    return existingFamily.family_id;
  }

  const familyId = await generateFamilyId();

  for (const parent of matchingParents ?? []) {
    if (!parent.student_id) continue;

    const { error: parentUpdateError } = await supabase
      .from("parents")
      .update({
        family_id: familyId,
      })
      .eq("id", parent.id);

    if (parentUpdateError) {
      throw parentUpdateError;
    }

    const { error: studentUpdateError } = await supabase
      .from("students")
      .update({
        family_id: familyId,
      })
      .eq("id", parent.student_id);

    if (studentUpdateError) {
      throw studentUpdateError;
    }
  }

  return familyId;
}

/**
 * ============================================================
 * Create Student
 * ============================================================
 */

export async function createStudent(
  data: RegistrationData,
  familyId: string
) {
  const { data: student, error } = await supabase
    .from("students")
    .insert({
      first_name: data.student.first_name,
      last_name: data.student.last_name,
      preferred_name: data.student.preferred_name,

      gender: data.student.gender,
      date_of_birth: data.student.dob || null,

      school: data.student.school,
      school_year: data.student.school_year,

      medical_information:
        data.student.medical_information,

      emergency_contact:
        data.student.emergency_contact,

      notes: data.student.notes,

      family_id: familyId,
    })
    .select()
    .single();

  if (error) throw error;

  return student;
}

/**
 * ============================================================
 * Create Parent
 * ============================================================
 */

export async function createParent(
  studentId: string,
  familyId: string,
  data: RegistrationData
) {
  const { data: parent, error } = await supabase
    .from("parents")
    .insert({
      student_id: studentId,

      parent1_name:
        data.parent.parent1_name,

      parent2_name:
        data.parent.parent2_name,

      preferred_contact:
        data.parent.preferred_contact,

      email: normalizeEmail(data.parent.email),

      mobile:
        data.parent.mobile,

      address:
        data.parent.address,

      family_id: familyId,
    })
    .select()
    .single();

  if (error) throw error;

  return parent;
}

/**
 * ============================================================
 * Create Enrollment
 * ============================================================
 */

export async function createEnrollment(
  studentId: string,
  data: RegistrationData
) {
  const { data: enrollment, error } = await supabase
    .from("student_enrolments")
    .insert({
      student_id: studentId,

      class_id:
        data.enrollment.class_id,

      academic_year:
        data.enrollment.academic_year,

      term:
        data.enrollment.term,

      join_date:
        data.enrollment.join_date || null,

      status: "Active",

      is_trial:
        data.enrollment.is_trial,

      medical_snapshot:
        data.enrollment.medical_snapshot ?? null,

      special_request_snapshot:
        data.enrollment.special_request ?? null,

      payment_status: "Pending",

      payment_amount: null,
    })
    .select()
    .single();

  if (error) throw error;

  return enrollment;
}

/**
 * ============================================================
 * Synchronise Student Current Snapshot
 * ============================================================
 *
 * Source of truth:
 *
 * Enrollment.class_id
 *        ↓
 * Classes
 *
 * Then update Student current snapshot.
 *
 * This keeps the Student record aligned with the student's
 * active current-term enrollment.
 * ============================================================
 */

async function synchroniseStudentSnapshot(
  studentId: string,
  classId: string
) {
  if (!classId) {
    throw new Error(
      "Cannot synchronise student snapshot without a class."
    );
  }

  /**
   * Load the selected Class.
   */
  const { data: classData, error: classError } =
    await supabase
      .from("classes")
      .select(`
        id,
        level,
        class_suffix,
        day,
        campus_id
      `)
      .eq("id", classId)
      .single();

  if (classError) {
    throw classError;
  }

  if (!classData) {
    throw new Error(
      "Selected class could not be found."
    );
  }

  /**
   * Current Level comes directly from Classes.
   *
   * Current Class ID is the actual Classes.id.
   *
   * Current Class is kept as a human-readable snapshot.
   *
   * We use the class day + suffix when available.
   * This does NOT replace current_class_id as the
   * authoritative relationship.
   */
  const currentClass =
    classData.class_suffix?.trim()
      ? `${classData.day} | ${classData.class_suffix}`
      : classData.day ?? "";

  const { data: updatedStudent, error: updateError } =
    await supabase
      .from("students")
      .update({
        current_level: classData.level,
        current_class: currentClass,
        current_class_id: classData.id,
      })
      .eq("id", studentId)
      .select()
      .single();

  if (updateError) {
    throw updateError;
  }

  return updatedStudent;
}

/**
 * ============================================================
 * Registration / Activation Entry Point
 * ============================================================
 *
 * Flow:
 *
 * 1. Resolve Family
 * 2. Create Student
 * 3. Create Parent
 * 4. Create Enrollment
 * 5. Synchronise Student Current Snapshot
 *
 * Student Code remains database-generated.
 * ============================================================
 */

export async function activateEnrollment(
  data: RegistrationData
) {
  /**
   * 1. Resolve Family
   */
  const familyId = await resolveFamilyId(
    data.parent.email
  );

  /**
   * 2. Create Student
   */
  const student = await createStudent(
    data,
    familyId
  );

  /**
   * 3. Create Parent
   */
  const parent = await createParent(
    student.id,
    familyId,
    data
  );

  /**
   * 4. Create Enrollment
   */
  const enrollment = await createEnrollment(
    student.id,
    data
  );

    /**
   * 5. Synchronise Student Current Snapshot
   *
   * Enrollment.class_id → Classes → Student
   */
  const updatedStudent =
    await synchroniseStudentSnapshot(
      student.id,
      enrollment.class_id
    );

  /**
   * 6. Synchronise Student Stage
   *
   * Current Active Enrollment is the source of truth
   * for Trial / Regular status.
   *
   * Enrollment.is_trial
   *        ↓
   * Student.student_stage
   */
  const stageSync =
    await synchroniseStudentStage(
      student.id,
      enrollment.academic_year,
      enrollment.term
    );

  return {
    student: updatedStudent,
    parent,
    enrollment,
    familyId,
    stageSync,
  };
}