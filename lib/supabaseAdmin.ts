import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY client. Never import this into a "use client" component —
// the service role key must never reach the browser. It bypasses Row
// Level Security, which is required for trusted background operations
// like settling a bidding round (declaring a winner, deducting treasury,
// transferring item ownership) that aren't tied to a specific logged-in
// user's permissions.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
