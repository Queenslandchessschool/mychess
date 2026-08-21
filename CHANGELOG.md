# MyChess Changelog

All notable changes to this project will be documented in this file.

---

# v0.1.0 - 2026-08-07

## 🎉 Major Milestone

Completed the first production-ready database foundation.

### Database

- Initial Supabase database structure completed.
- Campuses imported.
- Classes imported.
- Students imported.
- Parents imported.
- Student Enrolments imported.
- Student Code (STU0001-STU0120) generated.
- Family ID imported.
- Current Class mapping completed.
- Current Level mapping completed.
- Preferred Name imported.
- School Year imported.

### Modules Completed

- Campus Management
- Coach Management
- Student Management
- Class Management
- Academic Calendar
- Attendance
- Registration

### Data Import

- Students: 120
- Parents: 120
- Student Enrolments: 120

### Git

Initial production database committed to GitHub.

Commit

c7eb50e

Status

Production Candidate

Next Step

Supabase Security Hardening
(RLS + Policies)




# v0.6.0 - Authentication Foundation
**Date:** 2026-08-08

## Added
- Admin login page
- Supabase SSR authentication
- Session middleware
- Protected routes
- Admin dashboard entry

## Changed
- Upgraded Supabase browser client
- Authentication architecture

## Verified
- Login with email/password
- Invalid password displays error
- Successful login redirects to Admin Dashboard
- Protected routes require authentication

Status: ✅ PASS

---

# v0.5.0 - Database Foundation
**Date:** 2026-08-07

## Added
- Student database
- Parent database
- Student enrolment database
- Student import tool
- Parent import tool
- Enrolment import tool
- Student code generation
- Initial CRM data imported (120 students)

## Verified
- Student import
- Parent import
- Enrolment import
- Student code uniqueness
- Database integrity

Status: ✅ PASS

# Changelog

---

## v0.6.1 (2026-08-08)

### 🔐 Authentication
- Implemented Supabase Authentication.
- Added Login page with email/password authentication.
- Added secure session management.
- Added Middleware route protection for Admin, Coach and Parent portals.
- Completed Admin login flow.

### 🛡️ Database Security (RLS)
- Migrated `students` table from development policies to authenticated access.
- Migrated `parents` table from development policies to authenticated access.
- Migrated `student_enrolments` table from development policies to authenticated access.
- Verified Row Level Security (RLS) configuration for all core business tables.

### 🗄️ Database Maintenance
- Investigated duplicated Parent records.
- Identified duplicate import issue (7 duplicated records per student).
- Safely removed duplicated Parent records (840 → 120).
- Verified Student–Parent relationships remain correct.
- Verified Family ID integrity after cleanup.

### ✅ Milestone
Authentication foundation and core database security completed.

System is now ready for the next development phase:
- Admin Layout
- Student Management
- Parent Management
- Attendance Module

## Students + Parents — Frozen Baseline

### Students
- Student Management module finalised.
- Student table layout and responsive behaviour verified.
- Student table supports Ascending / Descending sorting.
- Student form and field structure finalised.
- Student/Class relationship verified.
- School Program checkbox removed from Student form.
- Student Information heading simplified.

### Parents
- Parent Management module finalised.
- Parent table layout and responsive behaviour verified.
- Parent form and field structure finalised.
- Parent/Student/Class relationships verified.
- Parent table currently does NOT include the Student module's Ascending / Descending sorting.
- This difference is recorded as a known limitation and does not block the current frozen baseline.

### Canonical UI/UX Rule
- The Student module is the canonical template for all future modules.
- Any new page or module must follow the established Student design and interaction patterns.
- Do not independently redesign existing UI patterns for new modules.
- Adapt data and module-specific functionality only where required.
## Classes Module — Frozen Business / UI Polish Pending

**Date:** 2026-08-10

### Business / Code Status

Classes Module business logic and implementation have been completed and verified.

### Completed

- Classes database structure completed.
- Class CRUD operations completed:
  - Create
  - Update
  - Delete
- Class search completed.
- Status filter completed.
- Campus lookup integrated.
- Coach lookup integrated.
- Class name generation completed.
- Supabase integration completed.
- Class validation completed.
- Compile verification completed.
- Business testing completed.
- Class Schedule relationship verified.

### Business Rules

Classes is responsible for the core Class definition, including:

- Campus
- Coach
- Day
- Time
- Capacity
- Class Name / Class Definition

Classes does NOT own:

- Academic Year
- Academic Term
- First Lesson
- Final Lesson
- Attendance
- Leave
- Tuition
- Academic Calendar
- Re-enrolment

These responsibilities remain with their respective modules.

### Student Count

Student Count currently displays:

`0 / Capacity`

This is an intentional deferred state.

Student Count will be connected to actual enrolment data after the Enrolment Module is completed.

No change to the current Classes database or business logic is required.

### UI / VI Status

Classes follows the MyCHESS Global VI and the Student Module Canonical UI/UX Template.

Current implementation includes:

- MyCHESS global background
- Navy chessboard background
- Gold accent system
- Form / Table separation
- Search and filter pattern
- Sticky table header
- Scrollable table body
- Responsive desktop / mobile behaviour
- Standard table action pattern

### UI Polish Pending

The Classes business implementation is Frozen.

Remaining work is UI / VI refinement only.

Known UI polish items:

1. Class Form card styling should more closely match the Student Form card.
2. Class Form should use the standard Gold border / top Gold highlight treatment.
3. Class Form input backgrounds should align more closely with the Student Module's Warm Ivory / light content treatment.
4. Minor spacing and visual hierarchy refinements may be applied where necessary.

The Class Table is considered structurally stable and should not be substantially redesigned during UI polishing.

### Canonical UI Rule

Student remains the canonical UI/UX template for Classes and all future MyCHESS modules.

Future UI refinement must follow:

Student
↓
Established UI / UX Pattern
↓
Classes / Other Modules

Only module-specific data, fields and functionality should differ.

### Frozen Boundary

The following are Frozen and must not be changed as part of UI polishing:

- Database architecture
- Core business rules
- CRUD behaviour
- Class / Campus / Coach relationships
- Class Schedule responsibility boundaries
- Student Count deferred logic

UI refinement must not introduce business-rule changes.

### Status

Business Specification: 🔒 FROZEN  
Database: 🔒 FROZEN  
Business Logic: 🔒 FROZEN  
CRUD: 🔒 FROZEN  
Supabase Integration: 🔒 FROZEN  
Business Testing: ✅ PASS  
UI / VI: 🟡 POLISH PENDING

### Acceptance

Classes Module is accepted as:

**Business / Code Frozen — UI Polish Pending**

No further business redesign is required.

MyCHESS — Lesson Module
Frozen Rule Supplement
Module 006 – Lesson | Restore Lesson / Administrator Override
Status: FROZEN ADDENDUM
Proposed SRS Version: v1.1
Scope: Lesson Management / Cancellation Management
1. Frozen Business Rule
A future Lesson that has been manually cancelled by an Administrator may be explicitly restored by an Administrator through Lesson Management.
2. Restore Conditions
•	Restore is permitted only when the Lesson status is Cancelled.
•	The Lesson must have a non-null cancellation_reason, identifying it as a manual cancellation.
•	The Lesson must not be controlled by a School Operational Event (operational_event_id must be null).
•	Past Lessons remain historically protected and cannot be restored.
•	Completed Lessons cannot be restored.
3. Restore Result
When an Administrator confirms Restore Lesson, the Lesson shall be updated as follows:
•	status → Planned
•	chargeable → true
•	cancellation_reason → null
•	operational_event_id → unchanged (and must remain null for a manually restored Lesson)
•	notes → unchanged
4. Generator / Reconciliation Boundary
Lesson Generator / Reconciliation shall NOT automatically restore a manually cancelled Lesson. Manual cancellation remains a protected operational fact. Restoration is an explicit Administrator action.
5. Operational Event Boundary
A Lesson cancelled through a School Operational Event shall not expose a manual Restore Lesson action. Its cancellation remains controlled by the operational event. If the event is later removed or changed, normal Lesson Reconciliation rules apply.
6. UI Requirement
Lesson Management shall provide the following action states:
•	Planned / eligible Lesson → Cancel Lesson
•	Manually Cancelled future Lesson → Restore Lesson
•	Operational-Event Cancelled Lesson → no manual Restore Lesson action
•	Past / Completed Lesson → protected from cancellation or restoration as applicable
7. Audit / Business Intent
Restore Lesson is an explicit administrative override of a previous manual cancellation. It must not be implemented as automatic generator behaviour, because Lesson remains the Operational SSOT and historical operational facts must remain protected.
8. Change Log Entry
Added explicit Administrator Restore Lesson capability for future manually cancelled Lessons. Generator/Reconciliation remains prohibited from automatically reversing manual cancellations.

# CHANGELOG

## [2026-08-10] — Admin Modules & Responsive Layouts

### Overview

Completed the current Admin Management module build, including
responsive layouts, table improvements, Lesson Management controls,
and the Lesson Restore function.

This release is treated as a development checkpoint / Frozen baseline
for the completed Admin modules.

---

## 1. Class Management

### Completed

- Class Management page completed.
- Class form and class list styling updated.
- Navy card / Gold Card Frame visual language applied.
- White / light-gold alternating table rows implemented.
- Hover states added to table rows.
- Status badges retained.
- Edit / Delete actions retained.
- Mobile-responsive layout added.
- Class list table made usable on smaller screens without breaking
  the overall Admin layout.

---

## 2. Class Schedule

### Completed

- Class Schedule form and table updated.
- Class Schedule table redesigned with:
  - Navy sticky table header
  - Gold Card Frame
  - Gold top highlight
  - White / light-gold alternating rows
  - Hover effect
  - Vertical scrolling
- Table layout adjusted for desktop width.
- Mobile-responsive behaviour added.
- Table content protected from severe column compression on mobile.

---

## 3. Academic Calendar

### Completed

- State School Calendar form updated.
- Academic Calendar table updated.
- Sticky table header implemented.
- Fixed vertical scroll area implemented.
- White / light-gold alternating rows implemented.
- Hover effect implemented.
- Navy table header retained.
- Gold Card Frame and Gold Gradient Top Highlight retained.
- Mobile-responsive layout added.

### Class Schedule Summary

- Extracted Class Schedule Summary from `calendar/page.tsx`
  into a dedicated component:

  `components/academicCalendar/ClassScheduleSummary.tsx`

- Desktop summary retains the original 10-column structure:
  - Class
  - Coach
  - First Lesson
  - Second Last Lesson
  - Final Lesson
  - Planned Lessons
  - Week
  - Remaining
  - Re-enrolment Opens
  - Override

- Sticky header implemented.
- Vertical scrolling implemented.
- Mobile layout converted to a card-based presentation.
- Horizontal overflow avoided on mobile.
- Existing summary data and calculation logic unchanged.

---

## 4. School Operational Events

### Completed

- School Operational Event form updated.
- Operational Event table updated.
- Navy header styling implemented.
- Sticky table header implemented.
- Vertical scrolling implemented.
- White / light-gold alternating rows implemented.
- Hover effect implemented.
- Edit / Delete actions retained.
- Mobile-friendly horizontal table handling retained where necessary.

---

## 5. Lesson Management

### Lesson Generator

- Lesson Generator visual layout completed.
- Full-width desktop layout implemented.
- Responsive mobile layout implemented.
- Generation scopes retained:
  - Individual Class
  - Academic Term
  - Academic Year
- Academic Year / Term / Class selection logic retained.
- Generate / Reconcile Lessons function retained.

### Lesson List

- Lesson List expanded to full-width layout.
- Responsive filter layout implemented.
- Filters retained:
  - Academic Year
  - Term
  - Class
  - Status
- Clear Filters retained.
- Lesson table redesigned with:
  - Navy table header
  - Sticky header
  - Fixed scroll area
  - Alternating white / light-gold rows
  - Hover effect
  - Manage action
- Mobile-friendly presentation implemented.
- Cancellation reason dropdown styling corrected for dark-theme Admin UI.

---

## 6. Lesson Restore Function

### Added

Added administrative **Restore Lesson** functionality.

### Purpose

Allows an administrator to restore a lesson that was previously
cancelled by mistake.

Example:

A lesson is accidentally changed to:

- Status: `Cancelled`
- Chargeable: `Non-chargeable`

The administrator can use **Restore Lesson** to return the lesson
to its normal planned state.

### Restore Behaviour

Restore Lesson:

- Changes the lesson status back to `Planned`.
- Restores the lesson to its normal chargeable state.
- Clears the cancellation reason.
- Clears the operational cancellation override associated with
  the manual cancellation where applicable.
- Does not regenerate the lesson.
- Does not create a duplicate lesson.
- Preserves the existing lesson record / lesson date / class relationship.

### Administrative Principle

`Restore Lesson` is an administrative override function.

It is intended for correcting an incorrect manual cancellation,
not for bypassing the normal Lesson Generation / Reconciliation
process.

---

## 7. Responsive Design Standard

The following Admin modules now follow the responsive design requirement:

- Class Management
- Class Schedule
- Academic Calendar
- Lesson Management

### Desktop

- Full-width content where appropriate.
- Navy card structure.
- Gold Card Frame.
- Gold Gradient Top Highlight.
- Sticky table headers.
- Controlled vertical scrolling.

### Mobile

- Forms resize to available screen width.
- Tables avoid destructive column compression.
- Long table content is handled without breaking the page layout.
- Summary tables convert to mobile-friendly card layouts where
  appropriate.
- Controls remain usable on touch screens.

---

## 8. Visual Design Standard

The current Admin visual language remains:

- Navy background
- Navy cards
- Gold Card Frame
- Gold Gradient Top Highlight
- Navy table headers
- White / light-gold alternating table rows
- Gold hover treatment where appropriate
- Blue primary actions
- Red destructive actions
- Status badges

The Gold Gradient Top Highlight must not be removed from completed
Admin cards unless explicitly requested.

---

## 9. Data & Business Logic

No intentional changes were made to the underlying business logic
for:

- Class Schedule
- Academic Calendar
- Operational Events
- Lesson Generation
- Lesson Reconciliation
- Re-enrolment
- Lesson Override
- Class relationships

The responsive and visual refactoring is intended to preserve the
existing SRS-defined behaviour.

---

## 10. Frozen Baseline

This release establishes the current completed Admin modules as a
development checkpoint.

### Frozen modules

- Class
- Class Schedule
- Academic Calendar
- School Operational Events
- Lesson

### Important

Future development should not modify the frozen business rules or
visual language of these completed areas without an explicit change
request.

Any new requirement should be treated as an additive change or a
new SRS amendment rather than an implicit redesign.

# Changelog

## 2026-08-12 — Registration Integration Checkpoint

### Registration Integration — PASS

Completed and verified the Admin Registration → Student / Parent / Enrollment data flow.

#### Student Master
- Student record is created successfully.
- Student Code is automatically generated by the existing database trigger.
- Student Code format confirmed as `STU0001`, `STU0002`, etc.
- Student Master data is linked to the created enrollment.
- Student status is created as `Active`.

#### Family Management
- Family ID is automatically resolved from the parent's email address.
- Parent email is normalised using trim + lowercase.
- Existing family is reused when the same parent email is detected.
- Multiple students using the same parent email correctly share the same Family ID.
- New families receive the next sequential Family ID (`F00XX`).
- Family ID is written to both `students.family_id` and `parents.family_id`.
- Existing imported family data remains compatible with the new registration flow.

#### Parent
- Parent record is created successfully.
- Parent contact information is stored in the `parents` table.
- Parent record is linked to the created Student.
- Family ID is stored on the Parent record.

#### Student Enrollment
- Enrollment record is created successfully.
- Enrollment is linked to the correct Student.
- `class_id` is correctly written to `student_enrolments`.
- Academic Year and Term are correctly stored.
- Join Date is correctly stored.
- Trial status is correctly stored.
- Enrollment status is created as `Active`.
- Payment status is initially `Pending`.

#### Special Request Snapshot
- Special Request data is stored in `student_enrolments.special_request_snapshot`.
- `walk_home`, `ymca_dropoff`, and `classroom_pickup` values were successfully verified.
- When no Special Request is selected, all corresponding values are stored as `false`.
- Student Master `special_request` is not incorrectly populated with the Enrollment snapshot.
- Snapshot behaviour confirmed using real test registrations.

#### Verified Test Records
- `STU0125` — Sync Test
- `STU0126` — Special Request Test
- Family ID matching tested with multiple students using the same parent email.
- Automatic Student Code generation verified.

### Registration Status

**PASS — Admin Registration → Student + Parent + Family + Enrollment**

The Registration module is considered functionally verified for the current
Admin-entry workflow.

### Important Scope Note

The current Registration module is used as an **Admin registration / activation
tool**.

The public parent-facing registration workflow is **not part of the current
production scope** and will be considered as a future module.

### Next Integration Stage

Proceed to integration testing of:

`Student Enrollment → Class → Lesson → Attendance`

The next objective is to verify that Attendance derives the correct daily
student list from the actual enrollment and class data according to the
Frozen SRS business rules.

## 2026-08-18 — Attendance Core & Coach Portal Checkpoint

### Added
- Added Attendance Time Engine with Australia/Brisbane business timezone handling.
- Added Attendance Time Engine automated test coverage for:
  - Before T-30
  - T-30 window
  - Lesson start
  - Lesson in progress
  - Attendance lock
- Added Attendance Reconciliation Engine.
- Added Attendance Runner as the single execution gateway for Attendance reconciliation.
- Added Coach Attendance Portal.
- Added Coach Attendance lesson scoping so coaches only access their assigned classes.
- Added shared Attendance Student List and Quick View integration.
- Added Attendance enrollment snapshot loading for current-term student context.
- Added Coach Attendance audit logging for attendance status changes.
- Added Student Synchronisation Engine.

### Attendance Rules
- Attendance reconciliation inserts only missing Attendance records.
- Existing Attendance records are never deleted or overwritten by reconciliation.
- Trial and Regular students are correctly distinguished.
- New Attendance records default to `Present`.
- Attendance timing is governed centrally by the Attendance Time Engine.
- Automatic reconciliation is permitted during the T-30 window and at lesson start.
- Roll Call is enabled only after the lesson has started.
- Attendance becomes locked at 00:00 Brisbane time on the following day.

### Coach Portal
- Coach Attendance uses the same Attendance UI architecture as Admin Attendance.
- Coach access is restricted to lessons belonging to the current coach.
- Attendance Student List, priority ordering, Quick View and attendance operations are shared with the Admin Attendance architecture.
- Coach attendance changes are recorded in the Attendance audit log.

### Validation
- TypeScript validation: PASS
- Production build: PASS
- Attendance Time Engine tests: PASS
- Attendance Runner: PASS
- Admin Attendance: PASS
- Coach Attendance: PASS
- Make-up type/build validation: PASS
- Git checkpoint created:

  `61caf43 — checkpoint: attendance core and coach portal complete`

### Next
- Begin Business Workflow Integration.
- Parent Leave → Attendance → Make-up Credit → Make-up Booking.
- Continue integration testing without changing the completed Attendance Core.

TODO — Parent Leave Time Gate
Parent Leave submission must be blocked once the selected lesson reaches LESSON_STARTED. The Admin Leave module intentionally retains Super Permission and is not subject to this Time Gate.

## 2026-08-21 — Attendance & Leave Workflow PASS

### Attendance System
- Completed and verified the shared Attendance workflow for both Admin and Coach.
- Admin and Coach now share the same `AttendanceStudentTable` component for Desktop and Mobile layouts.
- Standard attendance states verified:
  - Present
  - Absent
  - Late
  - Leave
- Attendance summary and attendance rate updated correctly.
- Student identity badges verified for:
  - Trial
  - Make-up
  - Leave
  - Holiday
  - Classroom Pickup
  - YMCA Drop-off
  - Walk Home
  - Medical information

### Leave → Attendance Integration
- Completed Leave-to-Attendance synchronization through the shared Leave Attendance Sync engine.
- Submitted Parent Leave correctly appears in Attendance as Leave / Excused.
- Leave records are linked to the corresponding attendance record.
- Leave credit creation and attendance linkage verified.
- Reverse Leave workflow completed and tested.

### Leave → Present Reverse Workflow
- Admin and Coach can reverse a submitted Leave when a student actually attends the lesson.
- Added confirmation protection before reversing Leave:
  - `No, Keep Leave` → student remains on Leave.
  - `Yes, Present` → Leave is reversed and attendance becomes Present.
- Prevents accidental conversion of a legitimate Leave into Present.
- Reverse Leave workflow verified on both Desktop and Mobile.
- Browser-native confirmation was replaced with a MyCHESS-styled confirmation modal.
- Mobile Leave UI simplified to a single Leave action without duplicate Leave labels.
- Desktop Leave UI verified to avoid displaying Leave and Present simultaneously for a submitted Leave student.

### Shared Attendance Architecture
- Admin and Coach Attendance now use the same shared student table component.
- Desktop and Mobile presentation are handled within the shared component.
- This reduces duplicated UI logic and ensures consistent Attendance behaviour across Admin and Coach.

### Leave Records
- Admin Leave Records interface updated and verified.
- Leave record status and attendance relationship tested.
- Leave cancellation / reverse processing groundwork integrated with Attendance and Makeup Credit workflow.

### Makeup / Credit Infrastructure
- Makeup credit creation linked to Leave and Attendance.
- Makeup attendance and booking infrastructure added.
- Attendance reconciliation API added.
- Supporting server-side Supabase utilities added.

### Parent Leave Foundation
- Parent Leave route and navigation foundation added.
- Parent Leave form and table components implemented.
- Parent Leave types and supporting components added.
- Parent Leave workflow is not yet fully frozen and requires a dedicated final review of:
  - UI / VI
  - Desktop / Mobile experience
  - Edit Leave
  - Cancel Leave
  - Future / past lesson restrictions
  - Leave → Attendance synchronization
  - Makeup Credit lifecycle

### Verification Status
- Admin Attendance: PASS
- Coach Attendance: PASS
- Attendance Desktop UI: PASS
- Attendance Mobile UI: PASS
- Leave display in Attendance: PASS
- Leave → Present confirmation: PASS
- Reverse Leave engine: PASS
- Leave → Credit linkage: PASS
- Shared Admin / Coach Attendance component: PASS
- Parent Leave: IN REVIEW