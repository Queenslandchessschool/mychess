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