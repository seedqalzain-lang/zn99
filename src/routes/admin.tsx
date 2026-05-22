import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Lock, LogOut } from "lucide-react";

const ADMIN_PASSWORD = "zain20267731";
const SESSION_KEY = "mycar_admin_session";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة التحكم — MY CAR" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword("");
  };

  if (!authed) {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="card-clean p-8 text-center">
            <Lock className="w-10 h-10 text-[var(--color-gold)] mx-auto" />
            <h1 className="text-2xl font-black mt-4">لوحة التحكم</h1>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">أدخل كلمة المرور للمتابعة</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn-gold w-full">دخول</button>
            </form>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <button onClick={logout} className="btn-outline">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
        <p className="text-[var(--color-ink-soft)] mt-2">مرحباً احمد النود — هذه نسخة أولية من لوحة التحكم.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {["إدارة المنتجات", "إدارة الأقسام", "إدارة المحافظ", "إدارة المحتوى", "إدارة الخدمات", "الطلبات الواردة"].map((t) => (
            <div key={t} className="card-clean p-5">
              <h3 className="font-bold">{t}</h3>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">قريباً في المرحلة الثانية — إضافة وتعديل وحذف مباشرة من هذه اللوحة.</p>
              <span className="inline-block mt-3 text-xs bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-2 py-1 rounded-full">قيد التطوير</span>
            </div>
          ))}
        </div>

        <div className="card-clean p-5 mt-6 bg-[var(--color-surface)]">
          <h3 className="font-bold">معلومة تقنية</h3>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            الموقع الآن متصل بقاعدة بيانات سحابية تحفظ المنتجات والأقسام والخدمات والمحافظ. في المرحلة الثانية سنفتح لك الإدارة الكاملة لإضافة وتعديل وحذف أي محتوى مباشرة من هنا، مع رفع الصور إلى التخزين السحابي — كل التغييرات ستظهر فوراً لجميع زوار الموقع.
          </p>
        </div>
      </div>
    </Shell>
  );
}
