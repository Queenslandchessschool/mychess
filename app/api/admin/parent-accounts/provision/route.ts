
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

  let body: { enrollmentId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request body is required." },
      { status: 400 }
    );
  }

  if (
    typeof body.enrollmentId !== "string" ||
    !body.enrollmentId.trim()
  ) {
    return NextResponse.json(
      { error: "A valid enrollment ID is required." },
      { status: 400 }
    );
  }

  try {
    const { data: enrollment, error: enrollmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select("id, student_id, is_trial")
        .eq("id", body.enrollmentId)
        .maybeSingle();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found." },
        { status: 404 }
      );
    }

    if (enrollment.is_trial) {
      return NextResponse.json({
        status: "TRIAL_SKIPPED",
        message: "Trial registrations do not create parent accounts.",
      });
    }

    const { data: student, error: studentError } =
      await supabaseServer
        .from("students")
        .select("id")
        .eq("id", enrollment.student_id)
        .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    const { data: parentRows, error: parentError } =
      await supabaseServer
        .from("parents")
        .select("email, mobile")
        .eq("student_id", student.id);

    if (parentError) {
      return NextResponse.json(
        { error: "Unable to read parent records." },
        { status: 500 }
      );
    }

    const emailSet = new Set(
      (parentRows ?? [])
        .map((parent) => parent.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    );

    if (emailSet.size !== 1) {
      return NextResponse.json(
        {
          error:
            "Parent email is missing or ambiguous. No account was created.",
        },
        { status: 409 }
      );
    }

    const email = [...emailSet][0];

    let existingUser:
      | { id: string; email?: string }
      | undefined;

    for (let page = 1; ; page += 1) {
      const { data, error: listError } =
        await supabaseServer.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (listError) {
        return NextResponse.json(
          { error: "Unable to check existing Auth accounts." },
          { status: 500 }
        );
      }

      existingUser = data.users.find(
        (item) => item.email?.trim().toLowerCase() === email
      );

      if (existingUser || data.users.length < 1000) {
        break;
      }
    }


    if (existingUser) {
      const { data: existingRole, error: existingRoleError } =
        await supabaseServer
          .from("user_roles")
          .select("role")
          .eq("auth_user_id", existingUser.id)
          .maybeSingle();

      if (existingRoleError) {
        return NextResponse.json(
          { error: "Unable to verify the existing account role." },
          { status: 500 }
        );
      }

      if (existingRole?.role === "parent") {
        return NextResponse.json({
          status: "EXISTING_PARENT_ACCOUNT",
          message: "The parent account already exists. No changes made.",
        });
      }

      return NextResponse.json(
        {
          status: "EXISTING_ACCOUNT_ROLE_REVIEW",
          message:
            "An account already exists, but its role needs administrator review. No changes made.",
        },
        { status: 409 }
      );
    }

    const mobiles = new Set(
      (parentRows ?? [])
        .map((parent) => parent.mobile?.trim() ?? "")
        .filter(Boolean)
    );

    if (mobiles.size !== 1) {
      return NextResponse.json(
        {
          error:
            "Parent mobile number is missing or ambiguous. No account was created.",
        },
        { status: 409 }
      );
    }

    const digits = [...mobiles][0].replace(/\D/g, "");

    if (digits.length < 4) {
      return NextResponse.json(
        {
          error:
            "Parent mobile number has fewer than four digits. No account was created.",
        },
        { status: 409 }
      );
    }

    const { data: created, error: createError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password: `Mychess${digits.slice(-4)}`,
        email_confirm: true,
      });

    if (createError || !created.user) {
      console.error("Automatic parent account creation failed.");
      return NextResponse.json(
        { error: "Unable to create the parent account." },
        { status: 500 }
      );
    }

    const { error: roleInsertError } = await supabaseServer
      .from("user_roles")
      .insert({
        auth_user_id: created.user.id,
        role: "parent",
      });

    if (roleInsertError) {
      console.error(
        "Automatic parent role assignment failed:",
        created.user.id
      );

      const { error: rollbackError } =
        await supabaseServer.auth.admin.deleteUser(
          created.user.id
        );

      if (rollbackError) {
        console.error(
          "Automatic parent account rollback failed:",
          created.user.id
        );
      }

      return NextResponse.json(
        {
          error:
            "Parent role assignment failed. Please check the account status before retrying.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "CREATED",
      message: "Parent account created successfully.",
    });
  } catch (error) {
    console.error("Automatic parent provisioning failed:", error);

    return NextResponse.json(
      { error: "Unexpected error during parent account provisioning." },
      { status: 500 }
    );
  }
}
