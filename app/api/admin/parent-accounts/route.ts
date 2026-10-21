
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

const EXCLUDED_TEST_EMAILS = new Set([
  "peterxing@yahoo.com",
  "sinku@163.com",
]);

const PAGE_SIZE = 1000;
const MAX_BATCH_SIZE = 10;
const CREATE_CONFIRMATION = "CREATE_PARENT_ACCOUNTS";

type ParentRow = {
  email: string | null;
  mobile: string | null;
  family_id: string | null;
};

type RoleRow = {
  auth_user_id: string;
  role: string;
};

type Candidate = {
  email: string;
  mobile: string;
  familyId: string;
};

type AuthMatch = {
  id: string;
  role?: string;
};

type Preflight = {
  totalFormalEmails: number;
  counts: Record<string, number>;
  candidates: Candidate[];
};

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      ),
    };
  }

  const { data: roleRecord, error: roleError } =
    await supabaseServer
      .from("user_roles")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (roleError) {
    console.error("Parent account role lookup failed:", roleError);
    return {
      error: NextResponse.json(
        { error: "Unable to verify administrator access." },
        { status: 500 }
      ),
    };
  }

  if (roleRecord?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

async function loadAllParents(): Promise<ParentRow[]> {
  const rows: ParentRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabaseServer
      .from("parents")
      .select("email, mobile, family_id")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error("Unable to read parent records.");

    rows.push(...(data ?? []));

    if ((data ?? []).length < PAGE_SIZE) break;
  }

  return rows;
}

async function loadAllRoles(): Promise<RoleRow[]> {
  const rows: RoleRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabaseServer
      .from("user_roles")
      .select("auth_user_id, role")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error("Unable to read user roles.");

    rows.push(...(data ?? []));

    if ((data ?? []).length < PAGE_SIZE) break;
  }

  return rows;
}

async function loadAllAuthUsers(): Promise<
  Array<{ id: string; email?: string }>
> {
  const users: Array<{ id: string; email?: string }> = [];

  for (let page = 1; ; page += 1) {
    const { data, error } =
      await supabaseServer.auth.admin.listUsers({
        page,
        perPage: PAGE_SIZE,
      });

    if (error) throw new Error("Unable to inspect Auth users.");

    users.push(...data.users);

    if (data.users.length < PAGE_SIZE) break;
  }

  return users;
}

async function buildPreflight(): Promise<Preflight> {
  const [parents, roles, authUsers] = await Promise.all([
    loadAllParents(),
    loadAllRoles(),
    loadAllAuthUsers(),
  ]);

  const grouped = new Map<
    string,
    { mobiles: Set<string>; familyIds: Set<string> }
  >();

  for (const parent of parents) {
    const email = parent.email?.trim().toLowerCase();

    if (!email || EXCLUDED_TEST_EMAILS.has(email)) continue;

    let group = grouped.get(email);

    if (!group) {
      group = {
        mobiles: new Set<string>(),
        familyIds: new Set<string>(),
      };
      grouped.set(email, group);
    }

    const mobile = parent.mobile?.trim() ?? "";
    if (mobile) group.mobiles.add(mobile);

    const familyId = parent.family_id?.trim() ?? "";
    if (familyId) group.familyIds.add(familyId);
  }

  const roleByUserId = new Map(
    roles.map((record) => [record.auth_user_id, record.role])
  );

  const authByEmail = new Map<string, AuthMatch[]>();

  for (const user of authUsers) {
    const email = user.email?.trim().toLowerCase();
    if (!email) continue;

    const matches = authByEmail.get(email) ?? [];
    matches.push({
      id: user.id,
      role: roleByUserId.get(user.id),
    });
    authByEmail.set(email, matches);
  }

  const counts: Record<string, number> = {};
  const candidates: Candidate[] = [];

  for (const [email, group] of grouped) {
    const matches = authByEmail.get(email) ?? [];
    let status: string;

    if (
      group.mobiles.size !== 1 ||
      group.familyIds.size !== 1
    ) {
      status = "DATA_CONFLICT";
    } else if (matches.length > 1) {
      status = "DUPLICATE_AUTH_EMAIL";
    } else if (matches.length === 1) {
      status =
        matches[0].role === "parent"
          ? "EXISTING_PARENT_ACCOUNT"
          : "EXISTING_ACCOUNT_ROLE_REVIEW";
    } else {
      status = "MISSING_AUTH_ACCOUNT";
      candidates.push({
        email,
        mobile: [...group.mobiles][0],
        familyId: [...group.familyIds][0],
      });
    }

    counts[status] = (counts[status] ?? 0) + 1;
  }

  candidates.sort((a, b) => a.email.localeCompare(b.email));

  return {
    totalFormalEmails: grouped.size,
    counts,
    candidates,
  };
}

function publicSummary(preflight: Preflight) {
  return {
    totalFormalEmails: preflight.totalFormalEmails,
    counts: preflight.counts,
  };
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const preflight = await buildPreflight();

    return NextResponse.json({
      mode: "READ_ONLY_PREFLIGHT",
      ...publicSummary(preflight),
      message:
        "Read-only check. No accounts created, passwords changed, or emails sent.",
    });
  } catch (error) {
    console.error("Parent account preflight failed:", error);

    return NextResponse.json(
      { error: "Unable to complete parent account preflight." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if ("error" in auth) return auth.error;

  let body: {
    mode?: unknown;
    confirmPhrase?: unknown;
    limit?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request body is required." },
      { status: 400 }
    );
  }

  if (body.mode === "preflight") {
    try {
      const preflight = await buildPreflight();

      return NextResponse.json({
        mode: "READ_ONLY_PREFLIGHT",
        ...publicSummary(preflight),
        message: "No accounts created and no passwords changed.",
      });
    } catch (error) {
      console.error("Parent account preflight failed:", error);

      return NextResponse.json(
        { error: "Unable to complete parent account preflight." },
        { status: 500 }
      );
    }
  }

  if (
    body.mode !== "create" ||
    body.confirmPhrase !== CREATE_CONFIRMATION
  ) {
    return NextResponse.json(
      {
        error: "Creation requires mode=create and the exact confirmation phrase.",
      },
      { status: 400 }
    );
  }

  const requestedLimit =
    typeof body.limit === "number" && Number.isInteger(body.limit)
      ? body.limit
      : MAX_BATCH_SIZE;

  if (requestedLimit < 1 || requestedLimit > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: "Batch limit must be between 1 and 5." },
      { status: 400 }
    );
  }

  try {
    const preflight = await buildPreflight();
    const batch = preflight.candidates.slice(0, requestedLimit);

    let created = 0;
    let failed = 0;
    let skipped = 0;

    for (const candidate of batch) {
      const digits = candidate.mobile.replace(/\D/g, "");

      if (digits.length < 4) {
        failed += 1;
        continue;
      }

      const initialPassword = `Mychess${digits.slice(-4)}`;

      const { data: createdUser, error: createError } =
        await supabaseServer.auth.admin.createUser({
          email: candidate.email,
          password: initialPassword,
          email_confirm: true,
        });

      if (createError || !createdUser.user) {
        // Do not alter an existing Auth account.
        skipped += 1;
        continue;
      }

      const { error: roleInsertError } = await supabaseServer
        .from("user_roles")
        .insert({
          auth_user_id: createdUser.user.id,
          role: "parent",
        });

      if (roleInsertError) {
        console.error(
          "Parent role assignment failed for newly created account:",
          createdUser.user.id
        );

        const { error: rollbackError } =
          await supabaseServer.auth.admin.deleteUser(
            createdUser.user.id
          );

        if (rollbackError) {
          console.error(
            "Rollback of newly created Auth user failed:",
            createdUser.user.id
          );
        }

        failed += 1;
        continue;
      }

      created += 1;
    }

    const updated = await buildPreflight();

    return NextResponse.json({
      mode: "BATCH_COMPLETE",
      batchSize: batch.length,
      created,
      skipped,
      failed,
      remainingMissing:
        updated.counts.MISSING_AUTH_ACCOUNT ?? 0,
      message:
        "Batch finished. No passwords were returned and no emails were sent.",
    });
  } catch (error) {
    console.error("Parent account batch creation failed:", error);

    return NextResponse.json(
      { error: "Unable to complete the parent account batch." },
      { status: 500 }
    );
  }
}
