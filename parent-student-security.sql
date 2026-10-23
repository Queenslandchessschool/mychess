
BEGIN;

-- 1. Protect student records.
CREATE OR REPLACE FUNCTION public.protect_student_parent_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Preserve administrator access.
    IF public.mychess_is_admin() THEN
        RETURN NEW;
    END IF;

    -- Permit trusted database/backend roles.
    IF current_user IN ('postgres', 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Only authenticated parents may update their own child's
    -- permitted profile fields.
    IF current_user <> 'authenticated'
       OR NOT public.mychess_is_parent_of_student(OLD.id)
    THEN
        RAISE EXCEPTION 'Student update is not permitted.'
            USING ERRCODE = '42501';
    END IF;

    -- These fields must never be changed by a parent directly.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.student_code IS DISTINCT FROM OLD.student_code
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.current_level IS DISTINCT FROM OLD.current_level
       OR NEW.current_class IS DISTINCT FROM OLD.current_class
       OR NEW.current_class_id IS DISTINCT FROM OLD.current_class_id
       OR NEW.student_stage IS DISTINCT FROM OLD.student_stage
       OR NEW.family_id IS DISTINCT FROM OLD.family_id
       OR NEW.school_year IS DISTINCT FROM OLD.school_year
       OR NEW.school_class IS DISTINCT FROM OLD.school_class
       OR NEW.is_school_program IS DISTINCT FROM OLD.is_school_program
       OR NEW.medical_information IS DISTINCT FROM OLD.medical_information
       OR NEW.emergency_contact IS DISTINCT FROM OLD.emergency_contact
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.special_request IS DISTINCT FROM OLD.special_request
    THEN
        RAISE EXCEPTION 'Parents cannot modify protected student fields.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Secure parent re-enrolment synchronisation.
CREATE OR REPLACE FUNCTION public.parent_sync_student_after_reenrolment(
    p_student_id uuid,
    p_academic_year integer,
    p_term integer,
    p_class_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_level text;
    v_day text;
    v_campus_label text;
    v_stage text;
BEGIN
    IF auth.uid() IS NULL
       OR NOT public.mychess_is_parent_of_student(p_student_id)
    THEN
        RAISE EXCEPTION 'Not authorised.'
            USING ERRCODE = '42501';
    END IF;

    IF p_term NOT BETWEEN 1 AND 4
       OR p_academic_year < 2020
       OR p_academic_year > 2100
    THEN
        RAISE EXCEPTION 'Invalid academic year or term.';
    END IF;

    -- The class and its target-term schedule must be active.
    SELECT c.level,
           c.day,
           COALESCE(cp.campus_code, cp.short_name, cp.campus_name, '')
      INTO v_level, v_day, v_campus_label
      FROM public.classes c
      LEFT JOIN public.campuses cp ON cp.id = c.campus_id
     WHERE c.id = p_class_id
       AND c.status = 'Active'
       AND EXISTS (
           SELECT 1
             FROM public.class_schedule cs
            WHERE cs.class_id = c.id
              AND cs.academic_year = p_academic_year
              AND cs.term = p_term
              AND cs.status = 'Active'
       );

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected class or target-term schedule is unavailable.';
    END IF;

    -- Require an active, formal, pending-payment enrolment.
    IF NOT EXISTS (
        SELECT 1
          FROM public.student_enrolments e
         WHERE e.student_id = p_student_id
           AND e.class_id = p_class_id
           AND e.academic_year = p_academic_year
           AND e.term = p_term
           AND e.status = 'Active'
           AND e.is_trial = false
           AND e.payment_status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'Matching formal enrolment not found.';
    END IF;

    -- Require the matching submission from this logged-in parent.
    IF NOT EXISTS (
        SELECT 1
          FROM public.re_enrolment_submissions r
         WHERE r.student_id = p_student_id
           AND r.academic_year = p_academic_year
           AND r.term = p_term
           AND r.selected_class_id = p_class_id
           AND r.status = 'Submitted'
           AND r.submission_source = 'Parent'
           AND r.submitted_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Matching parent submission not found.';
    END IF;

    -- Preserve the existing stage rule for the target term.
    SELECT CASE
             WHEN EXISTS (
                 SELECT 1
                   FROM public.student_enrolments e
                  WHERE e.student_id = p_student_id
                    AND e.academic_year = p_academic_year
                    AND e.term = p_term
                    AND e.status = 'Active'
                    AND e.is_trial = true
             ) THEN 'Trial'
             ELSE 'Regular'
           END
      INTO v_stage;

    UPDATE public.students
       SET current_level = v_level,
           current_class = NULLIF(
               concat_ws(
                   ' | ',
                   NULLIF(btrim(v_campus_label), ''),
                   NULLIF(btrim(v_day), ''),
                   NULLIF(btrim(v_level), '')
               ),
               ''
           ),
           current_class_id = p_class_id,
           student_stage = v_stage
     WHERE id = p_student_id;
END;
$$;

-- Restrict access to the synchronisation function.
ALTER FUNCTION public.parent_sync_student_after_reenrolment(
    uuid, integer, integer, uuid
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.parent_sync_student_after_reenrolment(
    uuid, integer, integer, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.parent_sync_student_after_reenrolment(
    uuid, integer, integer, uuid
) TO authenticated;

-- 3. Install the protection trigger.
DROP TRIGGER IF EXISTS trg_protect_student_parent_updates
ON public.students;

CREATE TRIGGER trg_protect_student_parent_updates
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.protect_student_parent_updates();

COMMIT;
