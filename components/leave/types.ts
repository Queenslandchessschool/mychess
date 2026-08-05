export type LeaveReason =
  | "Sick"
  | "Holiday"
  | "Family"
  | "Other";

export interface LeaveRecord {
  id: string;

  student_id: string;
  lesson_id: string;

  student_name: string;
  lesson_date: string;

  reason: LeaveReason;
  comments: string;

  created_at: string;
}

export interface LeaveFormData {
  student_id: string;
  lesson_id: string;

  reason: LeaveReason;
  comments: string;
}

export interface StudentOption {
  id: string;
  name: string;
}

export interface LessonOption {
  id: string;
  lesson_date: string;
  class_name: string;
}