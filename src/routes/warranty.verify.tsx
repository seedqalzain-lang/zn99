import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyWarranty } from "@/lib/warranty-public.functions";
import { statusLabel, statusColor, formatDateAr, computeStatus, type WarrantyStatus } from "@/lib/warranty-utils";
import { Search, ShieldCheck, ShieldX, Loader2 } from "lucide-react";

export const Route = createFileRoute("/warranty/verify")({
  component: VerifyPage,
});


type Result = {
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  customer_name: string;
  brand_name: string | null;
  film_type_name: string | null;
  branch_name: string | null;
};

function VerifyPage() {
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("n") ?? "" : "";
  const [num, setNum] = useState(initial);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function doSearch(value: string) {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setError(null); setResult(null); setNotFound(false);
    try {
      const rows = (await verifyWarranty({ data: { num: v } })) as unknown as Result[];
      const row = rows?.[0];
      if (!row) { setNotFound(true); return; }
      setResult({ ...row, status: computeStatus(row.expiry_date, row.status) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally { setBusy(false); }
  }

  useEffect(() => { if (initial) doSearch(initial); /* eslint-disable-next-line */ }, []);


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Search className="w-6 h-6 text-amber-500" /> التحقق من الضمان
        </h1>
        <p className="text-sm text-slate-500 mb-5">أدخل رقم الضمان (مثل TM-2025-000123).</p>
        <form onSubmit={(e) => { e.preventDefault(); doSearch(num); }} className="flex gap-2">
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="رقم الضمان"
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500"
          />
          <button disabled={busy} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </button>
        </form>
        {error && <div className="mt-4 text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
      </div>

      {notFound && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-red-200 text-center">
          <ShieldX className="w-16 h-16 mx-auto text-red-500 mb-3" />
          <h3 className="text-xl font-bold text-red-700">لا يوجد ضمان بهذا الرقم</h3>
          <p className="text-sm text-slate-500 mt-1">تأكد من الرقم أو تواصل مع تاج الملوك.</p>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className={`p-5 flex items-center gap-3 ${result.status === "active" ? "bg-green-500" : result.status === "cancelled" ? "bg-red-500" : "bg-gray-500"} text-white`}>
            <ShieldCheck className="w-10 h-10" />
            <div>
              <div className="text-xs opacity-90">حالة الضمان</div>
              <div className="text-2xl font-bold">{statusLabel[result.status]}</div>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Row label="رقم الضمان" value={result.warranty_number} />
            <Row label="العميل" value={result.customer_name} />
            <Row label="الماركة" value={result.brand_name ?? "-"} />
            <Row label="نوع اللاصق" value={result.film_type_name ?? "-"} />
            <Row label="تاريخ التفعيل" value={formatDateAr(result.activation_date)} />
            <Row label="تاريخ الانتهاء" value={formatDateAr(result.expiry_date)} />
            <Row label="الفرع" value={result.branch_name ?? "-"} />
            <Row label="رقم الهيكل" value={result.vin ?? "-"} />
          </div>
          <div className={`px-5 pb-5 -mt-1`}>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColor[result.status]}`}>
              {statusLabel[result.status]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
