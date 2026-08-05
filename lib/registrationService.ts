import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/lib/registration";

/**
 * Create Student Master Data
 */
export async function createStudent(data: RegistrationData) {
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

      medical_information: data.student.medical_information,
      emergency_contact: data.student.emergency_contact,

      notes: data.student.notes,
    })
    .select()
    .single();

  if (error) throw error;

  return student;
}

/**
 * Create Parent
 */
export async function createParent(
  studentId: string,
  data: RegistrationData
) {
  const { data: parent, error } = await supabase
    .from("parents")
    .insert({
      student_id: studentId,
      parent1_name: data.parent.parent1_name,
      parent2_name: data.parent.parent2_name,

      preferred_contact: data.parent.preferred_contact,

      email: data.parent.email,
      mobile: data.parent.mobile,

      address: data.parent.address,
    })
    .select()
    .single();

  if (error) throw error;

  return parent;
}

/**
 * Create Enrollment
 */
export async function createEnrollment(
  studentId: string,
  data: RegistrationData
) {
  const { data: enrollment, error } = await supabase
    .from("student_enrolments")
    .insert({
      student_id: studentId,

class_id: data.enrollment.class_id,

academic_year: data.enrollment.academic_year,

term: data.enrollment.term,

join_date: data.enrollment.join_date || null,

status: "Active",

is_trial: data.enrollment.is_trial,

medical_snapshot:
  data.enrollment.medical_snapshot ?? null,

special_request_snapshot:
  data.enrollment.special_request,

payment_status: "Pending",

payment_amount: null,
    })
    .select()
    .single();

  if (error) throw error;

  return enrollment;
}

/**
 * Registration Entry Point
 */
export async function activateEnrollment(
  data: RegistrationData
) {
  const student = await createStudent(data);

  await createParent(student.id, data);

  const enrollment = await createEnrollment(
    student.id,
    data
  );

  return {
    student,
    enrollment,
  };
}