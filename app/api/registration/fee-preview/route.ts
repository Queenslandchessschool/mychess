
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { data: roleRecord, error: roleError } =
      await supabaseServer
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error("Fee preview role lookup failed:", roleError);
      return NextResponse.json(
        { error: "Unable to verify administrator access." },
        { status: 500 }
      );
    }

    if (roleRecord?.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const classId = String(body.classId ?? "").trim();
    const academicYear = Number(body.academicYear);
    const term = Number(body.term);
    const joinDate = String(body.joinDate ?? "").trim();

    if (
      !classId ||
      !Number.isInteger(academicYear) ||
      !Number.isInteger(term) ||
      term < 1 ||
      term > 4
    ) {
      return NextResponse.json(
        { error: "Valid class, academic year and term are required." },
        { status: 400 }
      );
    }

    const { data: tuitionConfig, error: tuitionError } =
      await supabaseServer
        .from("tuition_configurations")
        .select(
          "standard_tuition, single_lesson_fee, total_lessons"
        )
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("class_id", classId)
        .maybeSingle();

    if (tuitionError) {
      throw tuitionError;
    }

    if (!tuitionConfig) {
      return NextResponse.json(
        { error: "Tuition configuration could not be found for the selected class and term." },
        { status: 404 }
      );
    }

    const { data: lessons, error: lessonsError } =
      await supabaseServer
        .from("lessons")
        .select("id, lesson_date, status, chargeable")
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .order("lesson_date", { ascending: true });

    if (lessonsError) {
      throw lessonsError;
    }

    const validLessons = (lessons ?? []).filter(
      (lesson) => Boolean(lesson.lesson_date)
    );

    const remainingLessons = validLessons.filter(
      (lesson) =>
        ["Planned", "Completed", "Cancelled"].includes(lesson.status) &&
        lesson.status !== "Cancelled" &&
        (!joinDate || lesson.lesson_date >= joinDate)
    );

    const chargeableLessonsBeforeJoinDate =
      (lessons ?? []).filter(
        (lesson) =>
          lesson.chargeable === true &&
          Boolean(joinDate) &&
          Boolean(lesson.lesson_date) &&
          lesson.lesson_date < joinDate
      );

    const nonChargeableLessons =
      (lessons ?? []).filter(
        (lesson) => lesson.chargeable === false
      );

    const standardTuition = Number(
      tuitionConfig.standard_tuition ?? 0
    );

    const singleLessonFee = Number(
      tuitionConfig.single_lesson_fee ?? 0
    );

    const applicableStandardTuition = Math.max(
      0,
      standardTuition -
        nonChargeableLessons.length * singleLessonFee
    );

    const amountPayable = Math.max(
      0,
      applicableStandardTuition -
        chargeableLessonsBeforeJoinDate.length *
          singleLessonFee
    );

    return NextResponse.json({
      remainingLessons: remainingLessons.length,
      tuitionFee: amountPayable,
    });
  } catch (error) {
    console.error("Registration fee preview failed:", error);

    return NextResponse.json(
      { error: "Unable to load lesson and tuition preview." },
      { status: 500 }
    );
  }
}
