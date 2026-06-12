// ===========================================================================
// Supabase admin client (server-side only — uses the service role key).
// Lazily initialised so importing this module during `next build` does not
// require env vars to be present. Bypasses RLS — never import into the browser.
// ===========================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Proxy keeps the `supabase.from(...)` API while deferring real init to runtime.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
