export interface AcademicCalendarRecord {
  id: string;

  academic_year: number;

  term: number;

  start_date: string;

  end_date: string;

  notes: string;

  created_at?: string;
  updated_at?: string;
}

export interface AcademicCalendarFormData {
  academic_year: number;

  term: number;

  start_date: string;

  end_date: string;

  notes: string;
}

/* ===========================================
   School Operational Events
=========================================== */

export interface OperationalEventRecord {
  id: string;

  event_date: string;

  event_name: string;

  notes: string;

  created_at?: string;
  updated_at?: string;
}

export interface OperationalEventFormData {
  event_date: string;

  event_name: string;

  notes: string;
}