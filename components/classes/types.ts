export type ClassStatus = "Active" | "Inactive";

export type ClassDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type ClassLevel =
  | "Beginner"
  | "Novice"
  | "Intermediate"
  | "Advanced"
  | "Novice to Intermediate"
  | "Intermediate to Advanced";

export interface ClassRecord {
  id: string;

  campus_id: string;

  coach_id: string;

  day: ClassDay;

  start_time: string;

  end_time: string;

  level: ClassLevel;

  class_suffix: string;

  capacity: number;

  status: ClassStatus;

  notes: string;

  created_at?: string;
}

export interface ClassFormData {
  campus_id: string;

  coach_id: string;

  day: ClassDay;

  start_time: string;

  end_time: string;

  level: ClassLevel;

  class_suffix: string;

  capacity: number;

  status: ClassStatus;

  notes: string;
}

export interface CampusLookup {
  id: string;

  campus_code: string;

  campus_name: string;

  short_name: string;

  address: string;

  type:
    | "Main Campus"
    | "Branch Campus"
    | "School Program"
    | "Online";

  status: string;

  notes?: string;
}

export interface CoachLookup {
  id: string;

  first_name: string;

  last_name: string;

  display_name: string;

  title: string;

  mobile: string;

  email: string;

  status: string;

  notes?: string;
}

export interface ClassTableRow {
  id: string;

  class_name: string;

  student_count: number;

  capacity: number;

  coach_name: string;

  start_time: string;

  end_time: string;

  status: ClassStatus;
}