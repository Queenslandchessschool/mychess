import {
  getLessonTimePhase,
  isRollCallEnabled,
  isLeaveOpen,
  isAutoReconciliationAllowed,
  isAttendanceLocked,
} from "./attendanceTime";

const lessonDate = "2026-08-13";
const lessonStart = "17:45";

function testTime(label: string, iso: string) {
  const now = new Date(iso);

  console.log(`\n========== ${label} ==========`);

  console.log(
    "Brisbane Phase:",
    getLessonTimePhase(
      lessonDate,
      lessonStart,
      now
    )
  );

  console.log(
    "Leave Open:",
    isLeaveOpen(
      lessonDate,
      lessonStart,
      now
    )
  );

  console.log(
    "Roll Call Enabled:",
    isRollCallEnabled(
      lessonDate,
      lessonStart,
      now
    )
  );

  console.log(
    "Auto Reconciliation:",
    isAutoReconciliationAllowed(
      lessonDate,
      lessonStart,
      now
    )
  );

  console.log(
    "Attendance Locked:",
    isAttendanceLocked(
      lessonDate,
      now
    )
  );
}


// ======================================================
// TEST 1
// 17:14 Brisbane
// ======================================================

testTime(
  "17:14 — Before T-30",
  "2026-08-13T07:14:00.000Z"
);


// ======================================================
// TEST 2
// 17:15 Brisbane
// ======================================================

testTime(
  "17:15 — T-30",
  "2026-08-13T07:15:00.000Z"
);


// ======================================================
// TEST 3
// 17:44 Brisbane
// ======================================================

testTime(
  "17:44 — One minute before lesson",
  "2026-08-13T07:44:00.000Z"
);


// ======================================================
// TEST 4
// 17:45 Brisbane
// ======================================================

testTime(
  "17:45 — Lesson Start",
  "2026-08-13T07:45:00.000Z"
);


// ======================================================
// TEST 5
// 18:30 Brisbane
// ======================================================

testTime(
  "18:30 — Lesson in progress",
  "2026-08-13T08:30:00.000Z"
);


// ======================================================
// TEST 6
// 23:59 Brisbane
// ======================================================

testTime(
  "23:59 — Before Attendance Lock",
  "2026-08-13T13:59:00.000Z"
);


// ======================================================
// TEST 7
// Next day 00:00 Brisbane
// ======================================================

testTime(
  "00:00 — Attendance Locked",
  "2026-08-13T14:00:00.000Z"
);