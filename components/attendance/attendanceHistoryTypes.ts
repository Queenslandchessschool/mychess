export type AttendanceHistoryScope =
  | "admin"
  | "coach"
  | "parent";

export type AttendanceHistoryRecord = {
  id: string;

  studentId: string;
  studentName: string;
  studentCode: string | null;

  classId: string;
  className: string;
  campus: string | null;

  coachId: string | null;
  coachName: string | null;

  lessonId: string;
  lessonDate: string;
  startTime: string | null;
  endTime: string | null;

  status: string;
  attendanceType: string | null;

  createdAt: string | null;
  updatedAt: string | null;

  operator: string | null;
};