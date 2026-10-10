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
      console.error("Duplicate check role lookup failed:", roleError);
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

    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Student name and parent email are required." },
        { status: 400 }
      );
    }

    const { data: parents, error: parentError } =
      await supabaseServer
        .from("parents")
        .select("student_id")
        .ilike("email", email);

    if (parentError) {
      console.error("Duplicate check parent lookup failed:", parentError);
      return NextResponse.json(
        { error: "Unable to check for duplicate registration." },
        { status: 500 }
      );
    }

    const studentIds = [
      ...new Set(
        (parents ?? [])
          .map((parent) => parent.student_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (studentIds.length === 0) {
      return NextResponse.json({ duplicate: null });
    }

    const { data: students, error: studentError } =
      await supabaseServer
        .from("students")
        .select("id, first_name, last_name, student_code")
        .in("id", studentIds);

    if (studentError) {
      console.error("Duplicate check student lookup failed:", studentError);
      return NextResponse.json(
        { error: "Unable to check for duplicate registration." },
        { status: 500 }
      );
    }

    const normalizedFirstName = firstName.toLowerCase();
    const normalizedLastName = lastName.toLowerCase();

    const duplicate = (students ?? []).find(
      (student) =>
        student.first_name?.trim().toLowerCase() === normalizedFirstName &&
        student.last_name?.trim().toLowerCase() === normalizedLastName
    );

    return NextResponse.json({
      duplicate: duplicate
        ? {
            first_name: duplicate.first_name,
            last_name: duplicate.last_name,
            student_code: duplicate.student_code,
          }
        : null,
    });
  } catch (error) {
    console.error("Duplicate registration check failed:", error);
    return NextResponse.json(
      { error: "Duplicate registration check failed." },
      { status: 500 }
    );
  }
}