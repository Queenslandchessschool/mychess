// ======================================================
// MyCHESS Current User
//
// Universal Authentication Identity Resolver
//
// Purpose:
// - Resolve the currently authenticated Supabase user
// - Determine the user's MyCHESS role
// - Resolve Coach identity when applicable
// - Resolve Parent Family identity when applicable
//
// Roles:
// - admin
// - coach
// - parent
//
// Parent Identity:
// - Auth email
// - lower(trim(email))
// - parents.email
// - family_id
//
// Coach Identity:
// - Auth user ID
// - coaches.auth_user_id
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";

// ======================================================
// Types
// ======================================================

export type MyChessRole =
  | "admin"
  | "coach"
  | "parent";

export interface CurrentUser {
  userId: string;
  email: string;
  role: MyChessRole;

  coachId: string | null;
  familyId: string | null;
}

// ======================================================
// Get Current User
// ======================================================

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // ====================================================
  // 1. Get authenticated Supabase user
  // ====================================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "CURRENT USER → AUTH USER ERROR:",
      userError
    );

    return null;
  }

  if (!user) {
    return null;
  }

  const email = user.email?.trim().toLowerCase();

  if (!email) {
    console.error(
      "CURRENT USER → AUTH USER HAS NO EMAIL"
    );

    return null;
  }

  // ====================================================
  // 2. Get MyCHESS Role
  // ====================================================

  const {
    data: roleRecord,
    error: roleError,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (roleError) {
    console.error(
      "CURRENT USER → ROLE ERROR:",
      roleError
    );

    return null;
  }

  if (!roleRecord) {
    console.error(
      "CURRENT USER → NO ROLE FOUND:",
      user.id
    );

    return null;
  }

  const role = roleRecord.role as MyChessRole;

  // ====================================================
  // 3. Admin
  // ====================================================

  if (role === "admin") {
    return {
      userId: user.id,
      email,
      role: "admin",
      coachId: null,
      familyId: null,
    };
  }

  // ====================================================
  // 4. Coach
  //
  // Auth User
  //     ↓
  // coaches.auth_user_id
  // ====================================================

  if (role === "coach") {
    const {
      data: coach,
      error: coachError,
    } = await supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (coachError) {
      console.error(
        "CURRENT USER → COACH ERROR:",
        coachError
      );

      return null;
    }

    if (!coach) {
      console.error(
        "CURRENT USER → COACH RECORD NOT FOUND:",
        user.id
      );

      return null;
    }

    return {
      userId: user.id,
      email,
      role: "coach",
      coachId: coach.id,
      familyId: null,
    };
  }

  // ====================================================
  // 5. Parent
  //
  // Auth User email
  //     ↓
  // lower(trim(email))
  //     ↓
  // parents.email
  //     ↓
  // family_id
  // ====================================================

  if (role === "parent") {
    const {
      data: parent,
      error: parentError,
    } = await supabase
      .from("parents")
      .select("family_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (parentError) {
      console.error(
        "CURRENT USER → PARENT ERROR:",
        parentError
      );

      return null;
    }

    if (!parent?.family_id) {
      console.error(
        "CURRENT USER → FAMILY NOT FOUND:",
        email
      );

      return null;
    }

    return {
      userId: user.id,
      email,
      role: "parent",
      coachId: null,
      familyId: parent.family_id,
    };
  }

  // ====================================================
  // 6. Unknown Role
  // ====================================================

  console.error(
    "CURRENT USER → UNKNOWN ROLE:",
    role
  );

  return null;
}