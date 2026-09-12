import { createClient } from "npm:@supabase/supabase-js@2";
import { createApiHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")?.trim();
let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
if (!key) {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  key = keys.service_role || keys["service-role"] || keys.serviceRole;
}
if (!url || !key) {
  throw new Error("Supabase server credentials are not configured.");
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
Deno.serve(createApiHandler(supabase));
