import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { formatDateAr, statusLabel, statusColor, computeStatus, type WarrantyStatus } from "@/lib/warranty-utils";
import { Loader2, Users, ShieldCheck, Package, Layers, Search, Trash2, Ban, RefreshCw, Building2 } from "lucide-react";

export const Route = createFileRoute("/warranty/admin")({
  component: AdminPage,
});

type Tab = "overview" | "warranties" | "customers" | "brands" | "films" | "branches";

function AdminPage() {
  const { user, loading, isAdmin, isStaff } = useWarrantyAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/warranty/auth" }); return; }
    if (!isAdmin && !isStaff) { navigate({ to: "/warranty/dashboard" }); return; }
  }, [user, loading, isAdmin, isStaff, navigate]);

  if (loading || !user) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>;
  if (!isAdmin && !isStaff) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "نظرة عامة", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "warranties", label: "الضمانات", icon: <Package className="w-4 h-4" /> },
    { id: "customers", label: "العملاء", icon: <Users className="w-4 h-4" /> },
    { id: "brands", label: "الماركات", icon: <Layers className="w-4 h-4" /> },
    { id: "films", label: "أنواع اللاصق", icon: <Layers className="w-4 h-4" /> },
    { id: "branches", label: "الفروع", icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap font-medium transition ${tab === t.id ? "bg-amber-500 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "warranties" && <WarrantiesTab />}
      {tab === "customers" && <CustomersTab />}
      {tab === "brands" && <SimpleCrud table="warranty_brands" title="الماركات" fields={[{ k: "name", l: "الاسم" }, { k: "logo_url", l: "رابط الشعار" }]} />}
      {tab === "films" && <SimpleCrud table="film_types" title="أنواع اللاصق" fields={[{ k: "name", l: "الاسم" }, { k: "warranty_months", l: "مدة الضمان (شهر)", type: "number" }, { k: "description", l: "الوصف" }]} />}
      {tab === "branches" && <SimpleCrud table="branches" title="الفروع" fields={[{ k: "name", l: "الاسم" }, { k: "address", l: "العنوان" }, { k: "phone", l: "الجوال" }]} />}
    </div>
  );
}

/* ================= Overview ================= */
function Overview() {
  const [stats, setStats] = useState<{ customers: number; warranties: number; active: number; expired: number } | null>(null);
  const [latest, setLatest] = useState<Array<{ id: string; warranty_number: string; created_at: string; status: WarrantyStatus; expiry_date: string }>>([]);
  useEffect(() => {
    (async () => {
      const [c, w, wa, we, l] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("warranties").select("id", { count: "exact", head: true }),
        supabase.from("warranties").select("id", { count: "exact", head: true }).eq("status", "active").gte("expiry_date", new Date().toISOString().slice(0, 10)),
        supabase.from("warranties").select("id", { count: "exact", head: true }).lt("expiry_date", new Date().toISOString().slice(0, 10)),
        supabase.from("warranties").select("id, warranty_number, created_at, status, expiry_date").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({ customers: c.count ?? 0, warranties: w.count ?? 0, active: wa.count ?? 0, expired: we.count ?? 0 });
      setLatest((l.data as never) ?? []);
    })();
  }, []);
  if (!stats) return <Loader />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard color="bg-blue-500" label="إجمالي العملاء" value={stats.customers} />
        <StatCard color="bg-slate-700" label="إجمالي الضمانات" value={stats.warranties} />
        <StatCard color="bg-green-500" label="ضمانات سارية" value={stats.active} />
        <StatCard color="bg-gray-500" label="ضمانات منتهية" value={stats.expired} />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="font-bold mb-3">أحدث الضمانات</h3>
        <div className="space-y-2 text-sm">
          {latest.map((r) => {
            const s = computeStatus(r.expiry_date, r.status);
            return (
              <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="font-mono">{r.warranty_number}</span>
                <span className="text-slate-500 text-xs">{formatDateAr(r.created_at)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor[s]}`}>{statusLabel[s]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className={`${color} text-white rounded-2xl p-4 shadow`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
    </div>
  );
}

/* ================= Warranties Tab ================= */
type WarrantyRow = {
  id: string;
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  customers: { full_name: string; phone: string } | null;
  warranty_brands: { name: string } | null;
  film_types: { name: string } | null;
  branches: { name: string } | null;
};

function WarrantiesTab() {
  const [rows, setRows] = useState<WarrantyRow[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | WarrantyStatus>("all");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("warranties")
      .select("id, warranty_number, activation_date, expiry_date, status, vin, customers(full_name, phone), warranty_brands(name), film_types(name), branches(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as unknown as WarrantyRow[]) ?? []);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const s = computeStatus(r.expiry_date, r.status);
      if (filter !== "all" && s !== filter) return false;
      if (!query) return true;
      return (
        r.warranty_number.toLowerCase().includes(query) ||
        (r.customers?.full_name ?? "").toLowerCase().includes(query) ||
        (r.customers?.phone ?? "").includes(query) ||
        (r.vin ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, q, filter]);

  async function cancel(id: string) {
    if (!confirm("إلغاء الضمان؟")) return;
    await supabase.from("warranties").update({ status: "cancelled" }).eq("id", id);
    load();
  }
  async function extend(id: string, current: string) {
    const months = Number(prompt("عدد الأشهر للتمديد:", "12") ?? 0);
    if (!months || months < 1) return;
    const d = new Date(current); d.setMonth(d.getMonth() + months);
    await supabase.from("warranties").update({ expiry_date: d.toISOString().slice(0, 10), status: "active" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("حذف الضمان نهائيًا؟")) return;
    await supabase.from("warranties").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم/عميل/جوال/هيكل..."
            className="w-full pr-10 pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:border-amber-500" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as never)} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
          <option value="all">كل الحالات</option>
          <option value="active">سارية</option>
          <option value="expired">منتهية</option>
          <option value="cancelled">ملغية</option>
        </select>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs">
              <tr>
                <th className="p-2 text-right">الرقم</th>
                <th className="p-2 text-right">العميل</th>
                <th className="p-2 text-right">الماركة/النوع</th>
                <th className="p-2 text-right">التفعيل</th>
                <th className="p-2 text-right">الانتهاء</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = computeStatus(r.expiry_date, r.status);
                return (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-2 font-mono text-xs">{r.warranty_number}</td>
                    <td className="p-2">{r.customers?.full_name}<div className="text-xs text-slate-500">{r.customers?.phone}</div></td>
                    <td className="p-2 text-xs">{r.warranty_brands?.name ?? "-"} / {r.film_types?.name ?? "-"}</td>
                    <td className="p-2 text-xs">{formatDateAr(r.activation_date)}</td>
                    <td className="p-2 text-xs">{formatDateAr(r.expiry_date)}</td>
                    <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[s]}`}>{statusLabel[s]}</span></td>
                    <td className="p-2 whitespace-nowrap">
                      <button onClick={() => extend(r.id, r.expiry_date)} className="p-1 hover:bg-slate-100 rounded" title="تمديد"><RefreshCw className="w-4 h-4 text-blue-600" /></button>
                      <button onClick={() => cancel(r.id)} className="p-1 hover:bg-slate-100 rounded" title="إلغاء"><Ban className="w-4 h-4 text-orange-600" /></button>
                      <button onClick={() => remove(r.id)} className="p-1 hover:bg-slate-100 rounded" title="حذف"><Trash2 className="w-4 h-4 text-red-600" /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد ضمانات</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= Customers Tab ================= */
type CustomerRow = { id: string; full_name: string; phone: string; email: string | null; created_at: string };
function CustomersTab() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase.from("customers").select("id, full_name, phone, email, created_at").order("created_at", { ascending: false }).limit(300);
    setRows((data as CustomerRow[]) ?? []);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  async function addManual() {
    const name = prompt("اسم العميل:") ?? ""; if (!name.trim()) return;
    const phone = prompt("رقم الجوال:") ?? ""; if (!phone.trim()) return;
    const { error } = await supabase.from("customers").insert({ full_name: name.trim(), phone: phone.trim() });
    if (error) alert(error.message); else load();
  }
  async function edit(r: CustomerRow) {
    const name = prompt("اسم العميل:", r.full_name) ?? r.full_name;
    const phone = prompt("رقم الجوال:", r.phone) ?? r.phone;
    await supabase.from("customers").update({ full_name: name, phone }).eq("id", r.id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("حذف العميل؟")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) alert(error.message); else load();
  }

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase(); if (!t) return true;
    return r.full_name.toLowerCase().includes(t) || r.phone.includes(t) || (r.email ?? "").toLowerCase().includes(t);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:border-amber-500" />
        </div>
        <button onClick={addManual} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">+ عميل جديد</button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs"><tr>
              <th className="p-2 text-right">الاسم</th><th className="p-2 text-right">الجوال</th><th className="p-2 text-right">البريد</th><th className="p-2 text-right">التسجيل</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2 font-mono text-xs">{r.phone}</td>
                  <td className="p-2 text-xs">{r.email ?? "-"}</td>
                  <td className="p-2 text-xs">{formatDateAr(r.created_at)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => edit(r)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 mr-1">تعديل</button>
                    <button onClick={() => remove(r.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">حذف</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد عملاء</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= Generic Simple CRUD ================= */
type Field = { k: string; l: string; type?: "text" | "number" };
function SimpleCrud({ table, title, fields }: { table: "warranty_brands" | "film_types" | "branches"; title: string; fields: Field[] }) {
  const [rows, setRows] = useState<Array<Record<string, unknown> & { id: string; is_active?: boolean }>>([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    const { data } = await supabase.from(table).select("*").order("sort_order");
    setRows((data as never) ?? []);
    setBusy(false);
  };
  useEffect(() => { load(); }, [table]);

  async function addRow() {
    const rec: Record<string, unknown> = {};
    for (const f of fields) {
      const v = prompt(f.l) ?? "";
      if (!v) continue;
      rec[f.k] = f.type === "number" ? Number(v) : v;
    }
    if (!rec.name) return;
    const { error } = await supabase.from(table).insert(rec as never);
    if (error) alert(error.message); else load();
  }
  async function editRow(r: Record<string, unknown> & { id: string }) {
    const rec: Record<string, unknown> = {};
    for (const f of fields) {
      const cur = String(r[f.k] ?? "");
      const v = prompt(f.l, cur) ?? cur;
      rec[f.k] = f.type === "number" ? Number(v) : v;
    }
    await supabase.from(table).update(rec as never).eq("id", r.id);
    load();
  }
  async function toggle(r: { id: string; is_active?: boolean }) {
    await supabase.from(table).update({ is_active: !r.is_active } as never).eq("id", r.id);
    load();
  }
  async function del(id: string) {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) alert(error.message); else load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={addRow} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">+ إضافة</button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs"><tr>
              {fields.map((f) => <th key={f.k} className="p-2 text-right">{f.l}</th>)}
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                  {fields.map((f) => <td key={f.k} className="p-2">{String(r[f.k] ?? "-")}</td>)}
                  <td className="p-2">
                    <button onClick={() => toggle(r)} className={`text-xs px-2 py-0.5 rounded-full border ${r.is_active ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}`}>
                      {r.is_active ? "مفعّل" : "متوقف"}
                    </button>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => editRow(r)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 mr-1">تعديل</button>
                    <button onClick={() => del(r.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">حذف</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={fields.length + 2} className="p-8 text-center text-slate-500">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Loader() { return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></div>; }
