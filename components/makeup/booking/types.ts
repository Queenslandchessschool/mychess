export interface MakeupBooking {
  id: string;

  credit_id: string;

  student_id: string;
  student_name: string;

  lesson_id: string;
  lesson_name: string;

  attendance_id: string | null;

  status: string;

  created_at: string;

  completed_at: string | null;
}

export interface BookingFormData {
  credit_id: string;

  lesson_id: string;
}

export interface CreditOption {
  id: string;

  student_id: string;

  student_name: string;

  credits: number;
}

export interface LessonOption {
  id: string;

  name: string;
}