// app/admin/class-schedule/types.ts

export interface ClassOption {
  id: string;
  display_name: string;
  day: string;
}

export interface ClassScheduleRecord {
  id: string;

  class_id: string;

  academic_year: number;
  term: number;

  first_lesson: string;
  final_lesson: string;

  status: "Planned" | "Active" | "Completed" | "Cancelled";

notes: string;

  created_at?: string;
  updated_at?: string;
}

export interface ClassScheduleTableRow extends ClassScheduleRecord {
  display_name: string;
}

export interface ClassScheduleFormData {
  class_id: string;

  academic_year: number;
  term: number;

  first_lesson: string;
  final_lesson: string;

  status: "Planned" | "Active" | "Completed" | "Cancelled";

notes: string;
}