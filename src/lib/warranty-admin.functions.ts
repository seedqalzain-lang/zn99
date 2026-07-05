import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "branch_staff" }),
  ]);
  if (!isAdmin && !isStaff) throw new Error("Forbidden");
  return { isAdmin: !!isAdmin, isStaff: !!isStaff };
}

export const adminListWarranties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("warranties")
      .select("id, warranty_number, activation_date, expiry_date, status, vin, customers(full_name, phone), warranty_brands(name), film_types(name), branches(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("id, full_name, phone, email, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminOverviewStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const [c, w, wa, we, l] = await Promise.all([
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("warranties").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("warranties").select("id", { count: "exact", head: true }).eq("status", "active").gte("expiry_date", today),
      supabaseAdmin.from("warranties").select("id", { count: "exact", head: true }).lt("expiry_date", today),
      supabaseAdmin.from("warranties").select("id, warranty_number, created_at, status, expiry_date").order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      stats: { customers: c.count ?? 0, warranties: w.count ?? 0, active: wa.count ?? 0, expired: we.count ?? 0 },
      latest: l.data ?? [],
    };
  });

export const adminListSimple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: "warranty_brands" | "film_types" | "branches" }) => {
    if (!["warranty_brands", "film_types", "branches"].includes(input.table)) throw new Error("Bad table");
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from(data.table).select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

type MutOp =
  | { op: "warranty_approve"; id: string }
  | { op: "warranty_cancel"; id: string }
  | { op: "warranty_extend"; id: string; expiry_date: string }
  | { op: "warranty_delete"; id: string }
  | { op: "customer_insert"; full_name: string; phone: string }
  | { op: "customer_update"; id: string; full_name: string; phone: string }
  | { op: "customer_delete"; id: string }
  | { op: "simple_insert"; table: "warranty_brands" | "film_types" | "branches"; values: Record<string, unknown> }
  | { op: "simple_update"; table: "warranty_brands" | "film_types" | "branches"; id: string; values: Record<string, unknown> }
  | { op: "simple_toggle"; table: "warranty_brands" | "film_types" | "branches"; id: string; is_active: boolean }
  | { op: "simple_delete"; table: "warranty_brands" | "film_types" | "branches"; id: string };

export const adminMutate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MutOp) => input)
  .handler(async ({ context, data }) => {
    const { isAdmin } = await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowedTables = ["warranty_brands", "film_types", "branches"] as const;

    switch (data.op) {
      case "warranty_approve":
        return (await supabaseAdmin.from("warranties").update({ status: "active" }).eq("id", data.id)).error?.message ?? null;
      case "warranty_cancel":
        return (await supabaseAdmin.from("warranties").update({ status: "cancelled" }).eq("id", data.id)).error?.message ?? null;
      case "warranty_extend":
        return (await supabaseAdmin.from("warranties").update({ expiry_date: data.expiry_date, status: "active" }).eq("id", data.id)).error?.message ?? null;
      case "warranty_delete":
        if (!isAdmin) throw new Error("Admin only");
        return (await supabaseAdmin.from("warranties").delete().eq("id", data.id)).error?.message ?? null;
      case "customer_insert":
        return (await supabaseAdmin.from("customers").insert({ full_name: data.full_name, phone: data.phone })).error?.message ?? null;
      case "customer_update":
        return (await supabaseAdmin.from("customers").update({ full_name: data.full_name, phone: data.phone }).eq("id", data.id)).error?.message ?? null;
      case "customer_delete":
        if (!isAdmin) throw new Error("Admin only");
        return (await supabaseAdmin.from("customers").delete().eq("id", data.id)).error?.message ?? null;
      case "simple_insert":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (await supabaseAdmin.from(data.table).insert(data.values as never)).error?.message ?? null;
      case "simple_update":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (await supabaseAdmin.from(data.table).update(data.values as never).eq("id", data.id)).error?.message ?? null;
      case "simple_toggle":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (await supabaseAdmin.from(data.table).update({ is_active: data.is_active } as never).eq("id", data.id)).error?.message ?? null;
      case "simple_delete":
        if (!isAdmin) throw new Error("Admin only");
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (await supabaseAdmin.from(data.table).delete().eq("id", data.id)).error?.message ?? null;
    }
  });
