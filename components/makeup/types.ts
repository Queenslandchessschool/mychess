export interface MakeupCredit {
  id: string;

  student_id: string;
  student_name: string;

  leave_record_id: string | null;

  attendance_id: string | null;

  credits: number;

  reason: string;

  status: string;

  created_at: string;

  used_at: string | null;
}

export interface MakeupFormData {
  student_id: string;

  credits: number;

  reason: string;
}

export interface StudentOption {
  id: string;

  name: string;
}