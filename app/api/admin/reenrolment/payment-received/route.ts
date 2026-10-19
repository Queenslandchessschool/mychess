
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
    /*
     * 1. Authenticate the request.
     */
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

    /*
     * 2. Verify the user's Admin role.
     */
    const { data: roleRecord, error: roleError } =
      await supabaseServer
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Re-enrolment payment role lookup failed:",
        roleError
      );

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

    /*
     * 3. Validate the request body.
     */
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
        { error: "A valid Re-enrolment submission ID is required." },
        { status: 400 }
      );
    }

    /*
     * 4. Execute all payment-related database changes
     * through the single PostgreSQL transaction function.
     */
    const { data: transactionResult, error: transactionError } =
      await supabaseServer.rpc(
        "admin_complete_reenrolment_payment",
        {
          p_submission_id: submissionId,
        }
      );

    if (transactionError) {
      console.error(
        "Re-enrolment payment transaction failed:",
        transactionError
      );

      return NextResponse.json(
        {
          error:
            transactionError.message ||
            "Unable to complete the Re-enrolment payment transaction.",
        },
        { status: 409 }
      );
    }

    if (
      !transactionResult ||
      transactionResult.success !== true ||
      typeof transactionResult.enrollmentId !== "string"
    ) {
      console.error(
        "Re-enrolment payment transaction returned an unexpected result:",
        transactionResult
      );

      return NextResponse.json(
        {
          error:
            "The payment transaction did not return a valid success result. Verify the database records before retrying.",
        },
        { status: 500 }
      );
    }

    /*
     * 5. Send the confirmation email only after the RPC
     * has completed successfully.
     *
     * The email endpoint must also enforce Admin authentication.
     * Email failure must not undo the committed transaction.
     */
    let emailWarning: string | null = null;

    try {
      const emailResponse = await fetch(
        new URL(
          "/api/email/payment-received-place-confirmed",
          request.url
        ),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollmentId: transactionResult.enrollmentId,
          }),
          cache: "no-store",
        }
      );

      let emailResult: { error?: string } = {};

      try {
        emailResult = await emailResponse.json();
      } catch {
        // Keep the committed payment successful if the email
        // endpoint does not return valid JSON.
      }

      if (!emailResponse.ok) {
        emailWarning =
          emailResult.error ||
          "Payment completed, but the confirmation email could not be sent.";
      }
    } catch (emailError) {
      console.error(
        "Re-enrolment payment confirmation email failed:",
        emailError
      );

      emailWarning =
        "Payment completed, but the confirmation email could not be sent.";
    }

    /*
     * 6. Return transaction success independently of email status.
     */
    return NextResponse.json({
      success: true,
      transaction: transactionResult,
      emailSent: emailWarning === null,
      emailWarning,
    });
  } catch (error) {
    console.error(
      "Re-enrolment Payment Received API exception:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing Payment Received.",
      },
      { status: 500 }
    );
  }
}
