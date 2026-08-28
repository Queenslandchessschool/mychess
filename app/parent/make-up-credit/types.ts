export interface MakeupCredit {
  id: string;

  student_id: string;

  credits: number;

  reason: string;

  status: string;

  created_at: string;

  used_at: string | null;
}