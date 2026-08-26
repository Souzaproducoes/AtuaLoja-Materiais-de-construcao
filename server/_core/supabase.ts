import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Server-side Supabase client with service role key.
 * Use this for admin operations (listing users, verifying JWTs, etc.).
 * Returns null if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceKey) return null;
  _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}

/**
 * Check if Supabase Auth is configured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}
