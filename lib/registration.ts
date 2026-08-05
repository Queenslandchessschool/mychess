export interface RegistrationStudent {
  first_name: string;
  last_name: string;
  preferred_name?: string;

  gender?: string;
  dob?: string;

  school?: string;
  school_year?: string;

  medical_information?: string;
  emergency_contact?: string;

  notes?: string;
}

export interface RegistrationParent {
  parent1_name: string;
  parent2_name?: string;

  preferred_contact: "Parent1" | "Parent2";

  email: string;
  mobile: string;

  address?: string;
}

export interface SpecialRequest {

  classroom_pickup: boolean;

  ymca_dropoff: boolean;

  walk_home: boolean;

}

export interface RegistrationEnrollment {
  academic_year: number;

  term: number;

  campus_id: string;

  class_id: string;

  join_date: string;

  is_trial: boolean;

  special_request: SpecialRequest;

  medical_snapshot?: string;
}

export interface RegistrationData {
  student: RegistrationStudent;

  parent: RegistrationParent;

  enrollment: RegistrationEnrollment;
}