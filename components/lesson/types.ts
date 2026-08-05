// ======================================================
// Module 006 - Lesson
// ======================================================

export type LessonStatus =
  | "Planned"
  | "Completed"
  | "Cancelled";

export type LessonCancellationReason =
  | "Teacher Unavailable"
  | "Venue Closure"
  | "School Cancellation"
  | "Other";

export type LessonRecord = {
  id: string;

  class_id: string;
  class_schedule_id: string;

  academic_year: number;
  term: number;

  lesson_date: string;

  status: LessonStatus;
  chargeable: boolean;

  operational_event_id: string | null;
  cancellation_reason: LessonCancellationReason | null;

  notes: string | null;

  generated_at: string;
  created_at: string;
  updated_at: string;
};


// ======================================================
// Lesson Generator
// ======================================================

export type LessonGenerationScope =
  | "Class"
  | "Term"
  | "Academic Year";

export type LessonGeneratorInput = {
  scope: LessonGenerationScope;

  academic_year: number;

  term: number | null;

  class_id: string | null;
};

export type LessonGenerationResult = {
  created: number;
  updated: number;
  unchanged: number;
  protected: number;
};


// ======================================================
// Lesson Form
// ======================================================

export type LessonFormData = {
  lesson_date: string;

  status: LessonStatus;

  chargeable: boolean;

  cancellation_reason: LessonCancellationReason | null;

  notes: string;
};
// ======================================================
// Lesson Generator - Class Option
// ======================================================

export type LessonClassOption = {
  id: string;

  class_suffix: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  level: string | null;
};