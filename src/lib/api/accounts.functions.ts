import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

import { requireSupabaseAuth } from "../../integrations/supabase/auth-middleware";

// -----------------------------------------------------------------------------
// Password helpers (scrypt – no external deps)
// -----------------------------------------------------------------------------
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, salt, derivedHex] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !derivedHex) return false;
    const expected = Buffer.from(derivedHex, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Bootstrap the calling user as `admin` (used by Admin SSO emails)
// -----------------------------------------------------------------------------
export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const userId = context.userId;
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = (user?.user?.email || "").toLowerCase();
    const ALLOWED = new Set([
      "jiroyano15@gmail.com",
      "jeromelpintero@gmail.com",
      "hajime015@gmail.com",
    ]);
    if (!ALLOWED.has(email)) {
      throw new Error("This account is not an authorized administrator.");
    }
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Identity – returns the current user's roles & parent (if any)
// -----------------------------------------------------------------------------
export const getMyAccountContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role, parent_user_id")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role);
    const parent = data?.find((r) => r.parent_user_id)?.parent_user_id ?? null;
    return {
      userId: context.userId,
      roles,
      isAdmin: roles.includes("admin"),
      isSubAccount: roles.includes("sub_account"),
      parentUserId: parent,
    };
  });

// -----------------------------------------------------------------------------
// Admin: register an authenticated user as a sub-account they own
// -----------------------------------------------------------------------------
export const registerSubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");

    const { data: caller } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!caller) throw new Error("Only admins can register sub-accounts.");

    // Look up the target user by email
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    const target = list.users.find(
      (u) => (u.email || "").toLowerCase() === data.email.toLowerCase()
    );
    if (!target) {
      throw new Error(
        "User must sign in with Google at least once before they can be added as a sub-account.",
      );
    }
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: target.id, role: "sub_account", parent_user_id: context.userId },
      { onConflict: "user_id,role" },
    );
    return { ok: true, targetUserId: target.id };
  });

// -----------------------------------------------------------------------------
// Admin: list sub-accounts they own (with co-admin flag)
// -----------------------------------------------------------------------------
export const listSubAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("parent_user_id", context.userId)
      .eq("role", "sub_account");
    const ids = (data ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { subAccounts: [] as Array<{ userId: string; email: string | null; displayName: string | null; isCoAdmin: boolean }> };

    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const users = (list?.users ?? []).filter((u) => ids.includes(u.id));

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .in("user_id", ids);
    const adminSet = new Set((adminRoles ?? []).map((r) => r.user_id));

    return {
      subAccounts: users.map((u) => ({
        userId: u.id,
        email: u.email ?? null,
        displayName:
          (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? null),
        isCoAdmin: adminSet.has(u.id),
      })),
    };
  });

// -----------------------------------------------------------------------------
// Admin: Transfer ownership → promote sub-account to co-admin
// -----------------------------------------------------------------------------
export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ targetUserId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");

    // Caller must be admin
    const { data: caller } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!caller) throw new Error("Only an admin can transfer ownership.");

    // Target must already be a sub-account of this admin
    const { data: sub } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.targetUserId)
      .eq("parent_user_id", context.userId)
      .eq("role", "sub_account")
      .maybeSingle();
    if (!sub) throw new Error("Target user is not one of your sub-accounts.");

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.targetUserId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const revokeCoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ targetUserId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { data: caller } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!caller) throw new Error("Only an admin can revoke co-admin rights.");
    // Don't allow self-revoke (avoid orphaning)
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot revoke your own admin role.");
    }
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.targetUserId)
      .eq("role", "admin");
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Sub-account (or admin): manage their own staff_accounts
// -----------------------------------------------------------------------------
async function assertCanManageStaff(userId: string) {
  const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "sub_account"]);
  if (!data || data.length === 0) {
    throw new Error("Only sub-account holders (or admins) can manage staff.");
  }
}

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanManageStaff(context.userId);
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, username, display_name, created_at")
      .eq("parent_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { staff: data ?? [] };
  });

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      username: z.string().min(3).max(40).regex(/^[a-z0-9_.-]+$/i, "Use letters/numbers/._-"),
      password: z.string().min(6).max(128),
      displayName: z.string().min(1).max(80),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageStaff(context.userId);
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("staff_accounts").insert({
      parent_user_id: context.userId,
      username: data.username.toLowerCase().trim(),
      password_hash: hashPassword(data.password),
      display_name: data.displayName.trim(),
    });
    if (error) {
      if (error.code === "23505") throw new Error("That username is already taken.");
      throw error;
    }
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertCanManageStaff(context.userId);
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("staff_accounts")
      .delete()
      .eq("id", data.id)
      .eq("parent_user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Public: staff login (username + password). Returns parent identity.
// -----------------------------------------------------------------------------
export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("../../integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, parent_user_id, username, display_name, password_hash")
      .eq("username", data.username.toLowerCase().trim())
      .limit(5);
    if (error) throw error;
    const match = (rows ?? []).find((r) => verifyPassword(data.password, r.password_hash));
    if (!match) throw new Error("Invalid staff username or password.");
    return {
      staff: {
        id: match.id,
        username: match.username,
        displayName: match.display_name,
        parentUserId: match.parent_user_id,
      },
    };
  });
