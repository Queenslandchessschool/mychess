# MyCHESS Email Automation Integration Specification



Project: MyCHESS

Organization: Queensland Chess School

Status: Draft v1.0



## 1. Purpose



This document defines how MyCHESS business events connect to the Central Email Template Service and automated email delivery system.



All future email automation must follow:



Business Event

-> Recipient Selection

-> Central Email Template

-> Dynamic Variables

-> Email Sending

-> Email Audit Log



Email communication must not directly change business state.



## 2. Frozen Email Matrix



### 2.1 Re-enrolment Opening Email



Business Event:

Final Lesson + 1 Calendar Day



Trigger Time:

08:00 Australia/Brisbane



Recipients:

All parents with current-term enrolled students.



Purpose:

Officially announce that re-enrolment is open.

Include term-end thanks and holiday camp information.



Template:

REENROLMENT\_OPENING



Required Data:

\- Parent name

\- Parent email

\- Student name

\- Current academic term

\- Next academic term

\- Re-enrolment portal URL

\- Holiday camp information, if applicable



### 2.2 Re-enrolment Reminder



Business Event:

First Lesson - 7 Calendar Days



Trigger Time:

Based on the configured business rule.



Recipients:

Parents who have not completed re-enrolment.



Purpose:

Remind eligible parents to complete re-enrolment.



Template:

REENROLMENT\_REMINDER



Required Data:

\- Parent name

\- Parent email

\- Student name

\- Current academic term

\- Next academic term

\- First lesson date

\- Re-enrolment portal URL



Recipient Exclusion:

Parents who have completed re-enrolment must not receive this reminder.



### 2.3 Class Reminder



Business Event:

First Lesson Eve



Trigger Time:

12:30 Australia/Brisbane



Recipients:

All parents of students enrolled in the relevant class for the new academic term.



Purpose:

Provide class preparation and special arrangement information.



Template:

CLASS\_REMINDER



Required Data:

\- Parent name

\- Parent email

\- Student name

\- Academic term

\- First lesson date

\- Special requests

\- Class information



## 3. Common Integration Requirements



Every automated email event must define:



1\. Business event

2\. Trigger date and time

3\. Recipient selection logic

4\. Required database data

5\. Template name

6\. Dynamic variables

7\. Duplicate prevention

8\. API security

9\. Email audit logging

10\. UAT acceptance criteria



## 4. Scheduler Requirements



\- Timezone: Australia/Brisbane

\- Scheduler must support the frozen Email Matrix.

\- Production scheduling must be explicitly configured.

\- Scheduler execution must be secure.

\- Each automated event must be traceable.

\- Repeated scheduler execution must not send duplicate emails.

\- The scheduler must not rely only on a manually callable API route.



## 5. Security Requirements



\- Automated email API routes must use appropriate authentication.

\- Production cron requests must be verified.

\- Secrets must be stored in environment variables.

\- Sensitive data must not be exposed in client-side code.

\- Manual testing and production automation must be distinguishable.



## 6. Deduplication Requirements



Each automated email event must have a defined deduplication strategy.



The system must prevent duplicate emails caused by:



\- Repeated scheduler execution

\- API retries

\- Deployment retries

\- Manual execution of the same event



Deduplication must be based on the relevant business event, recipient, and applicable academic term or class.



## 7. Email Audit Requirements



Every automated email attempt must be recorded in the central email audit log.



The audit record should include:



\- Trigger source

\- Trigger time

\- Business event

\- Template name

\- Recipient email

\- Student ID, where applicable

\- Parent ID, where applicable

\- Enrollment ID, where applicable

\- Dynamic data used

\- Sending status

\- Message ID, if available

\- Error message, if applicable



## 8. Current Implementation Status



The following email routes currently exist:



\- /api/email/reenrolment-opening

\- /api/email/reenrolment-reminder

\- /api/email/class-reminder



The routes currently support manual API execution.



Before production automation, each route requires verification of:



\- Production authentication

\- Scheduler integration

\- Recipient selection

\- Date and time calculation

\- Duplicate prevention

\- Audit logging

\- Error handling

\- UAT validation



Existing PASS functionality must not be changed unless a confirmed bug or explicitly approved requirement exists.



## 9. Implementation Sequence



### Phase 1: Specification



\- Confirm business event definitions.

\- Confirm recipient rules.

\- Confirm required variables.

\- Confirm deduplication approach.

\- Confirm scheduler requirements.



### Phase 2: Integration



\- Connect business events to email routes.

\- Implement secure scheduler execution.

\- Implement recipient selection.

\- Implement duplicate prevention.

\- Confirm audit logging.



### Phase 3: UAT



\- Test each frozen Email Matrix event.

\- Test correct recipient selection.

\- Test date and time boundaries.

\- Test completed re-enrolment exclusion.

\- Test duplicate execution.

\- Test failed email handling.

\- Confirm email content and links.



### Phase 4: Production Activation



\- Configure production environment variables.

\- Configure production scheduler.

\- Perform controlled production verification.

\- Enable automatic email delivery only after UAT PASS.



## 10. Change Control



This document supports the frozen Email Matrix.



Any change to business timing, recipient rules, template variables, or email purpose must be:



1\. Explicitly documented.

2\. Reviewed against the frozen requirements.

3\. Approved before implementation.

4\. Tested before production activation.



Do not redesign or modify already-PASS modules without a confirmed bug or explicit approval.

