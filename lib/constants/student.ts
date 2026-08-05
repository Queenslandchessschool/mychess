export const emptyStudent = {
  student_code: "",

  first_name: "",
  last_name: "",

  gender: "",
  date_of_birth: "",

  school: "",

  current_class: "",

  current_level: "",

  status: "Active",

  is_school_program: false,

  school_year: "",
  school_class: "",

  notes: "",
};

/**
 * Australian School Year Levels
 */
export const SCHOOL_YEAR_OPTIONS = [
  "Prep",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
] as const;

/**
 * Student Gender
 */
export const GENDER_OPTIONS = [
  "Male",
  "Female",
] as const;