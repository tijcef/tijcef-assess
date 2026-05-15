import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns whether the currently authenticated user has the admin role.
 * Also auto-promotes the first-ever signed-in user to admin so the platform
 * has a usable admin account on day one (bootstrap).
 */
export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Bootstrap: if there are zero admins yet, promote this user.
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) === 0) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      return { isAdmin: true, bootstrapped: true };
    }

    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    return { isAdmin: !!data, bootstrapped: false };
  });
