
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
      console.error("Refresh payment amount role lookup failed:", roleError);
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

    let body: { submissionId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        { status: 400 }
      );
    }

    const submissionId =
      typeof body.submissionId === "string"
        ? body.submissionId.trim()
        : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        submissionId
      )
    ) {
      return NextResponse.json(
        { error: "A valid submission ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer.rpc(
      "admin_refresh_reenrolment_payment_amount",
      { p_submission_id: submissionId }
    );

    if (error) {
      console.error("Refresh payment amount failed:", error);
      const message = error.message ?? "";

      if (
        message.includes("Only Submitted re-enrolments") ||
        message.includes("payment status is no longer Pending") ||
        message.includes("changed while refreshing")
      ) {
        return NextResponse.json(
          {
            error:
              "This re-enrolment is no longer awaiting payment. Reload the page and check its status.",
          },
          { status: 409 }
        );
      }

      if (
        message.includes("not found") ||
        message.includes("could not be found")
      ) {
        return NextResponse.json(
          { error: message },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to refresh the payment amount. Please check the server logs.",
        },
        { status: 500 }
      );
    }

    if (!data || data.success !== true) {
      return NextResponse.json(
        { error: "The payment amount refresh was not confirmed." },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Refresh payment amount API error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while refreshing the amount.",
      },
      { status: 500 }
    );
  }
}
