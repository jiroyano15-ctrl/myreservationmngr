import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export type AppStateBlob = Json;

export const getAppState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_app_state")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      data: (data?.data ?? null) as Json | null,
      updatedAt: (data?.updated_at ?? null) as string | null,
    };
  });

export const saveAppState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { data: Json }) => {
    if (!input || typeof input !== "object" || input.data === undefined || input.data === null) {
      throw new Error("Invalid app state payload");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_app_state")
      .upsert(
        { user_id: userId, data: data.data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
