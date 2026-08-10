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
