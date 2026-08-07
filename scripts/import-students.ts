import * as dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const workbook = XLSX.readFile(
  "./import/MyChess_Student_Import_Template_v2.0_Frozen V3.xlsx"
);

const sheet = workbook.Sheets[workbook.SheetNames[0]];

const rows = XLSX.utils.sheet_to_json(sheet, {
  raw: false,
  defval: "",
});

async function main() {

  for (const row of rows as any[]) {

const { data: student, error: studentError } = await supabase
  .from("students")
  .select("id")
  .eq("first_name", row["First Name*"])
  .eq("last_name", row["Last Name*"])
  .single();

if (studentError || !student) {
  console.log(
    `Student not found: ${row["First Name*"]} ${row["Last Name*"]}`
  );
  continue;
}

/*

const { error: parentError } = await supabase
  .from("parents")
  .insert({
    student_id: student.id,

    family_id: row["Family ID"],

    first_name: row["Parent 1 Name*"],
    last_name: null,

    parent1_name: row["Parent 1 Name*"],
    parent2_name: row["Parent 2 Name"],

    mobile: row["Mobile*"],
    email: row["Email*"],

    preferred_contact: row["Preferred Contact"],

    relationship: "Parent",

    address: row["Address"],
  });

if (parentError) {
  console.log(parentError);
} else {
  console.log(`Parent imported: ${row["Parent 1 Name*"]}`);
}

*/

const campusMap: Record<string, string> = {
  MacGregor: "MACG",
  WRSS: "WRSS",
  Toowong: "TOOW",
  ONLINE: "ONLINE",
};

const { data: campus, error: campusError } = await supabase
  .from("campuses")
  .select("id")
  .eq("campus_code", campusMap[row["Campus*"]])
  .single();

if (campusError || !campus) {
 console.log(`Campus not found: ${row["Campus*"]}`);
  continue;
}

const classParts = String(row["Class*"]).trim().split(" ");

const dayMap: Record<string, string> = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
};

const day = dayMap[classParts[0]];
const level = classParts.slice(1).join(" ");

const currentClass = `${campusMap[row["Campus*"]]} | ${day} | ${level}`;

const { data: classData, error: classError } = await supabase
  .from("classes")
  .select("id")
  .eq("campus_id", campus.id)
  .eq("day", day)
  .eq("level", level)
  .single();

if (classError || !classData) {
  console.log(`Class not found: ${row["Campus*"]} | ${day} | ${level}`);
  continue;
}

await supabase
  .from("students")
  .update({
    preferred_name: row["Preferred Name"],

    school_year: row["School Year"] || null,

    current_class: currentClass,

    current_level: level,
  })
  .eq("id", student.id);

/*

const { error: enrolmentError } = await supabase
  .from("student_enrolments")
  .insert({
    student_id: student.id,
    class_id: classData.id,

    academic_year: Number(row["Academic Year"]),
    term: Number(row["Term"]),

    join_date: row["Join Date"],

    status: "Active",

    is_trial: row["Trial (Y/N)"] === "Y",

    payment_status: "Pending",

   special_request_snapshot: {
  classroom_pickup: row["Classroom Pickup (Y/N)"] === "Y",
  ymca_dropoff: row["YMCA Drop-off (Y/N)"] === "Y",
  walk_home: row["Walk Home (Y/N)"] === "Y",
},
  });

if (enrolmentError) {
  console.log(enrolmentError);
} else {
  console.log(
    `Enrolment imported: ${row["First Name*"]} ${row["Last Name*"]}`
  );
}

*/

  }

  console.log(`Loaded ${rows.length} students`);
}

main().catch(console.error);