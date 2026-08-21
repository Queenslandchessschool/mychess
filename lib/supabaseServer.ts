// ======================================================
// MyCHESS Supabase Server Client
//
// Purpose:
// - Server-side / Scheduler database access
// - NEVER exposed to browser
// - Used only by trusted server execution
//
// IMPORTANT:
// - Uses Supabase Service Role Key
// - Service Role Key must NEVER use NEXT_PUBLIC_
// - Service Role Key bypasses RLS
// ======================================================

import { createClient } from "@supabase/supabase-js";


// ======================================================
// Environment
// ======================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;


// ======================================================
// Safety Check
// ======================================================

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY."
  );
}


// ======================================================
// Server Client
//
// This client is SERVER ONLY.
//
// Never import this file into:
// - Client Components
// - Browser code
// - Admin / Coach UI
// ======================================================

export const supabaseServer =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );