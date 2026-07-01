export type WarrantyStatus = "active" | "expired" | "cancelled";

export const statusLabel: Record<WarrantyStatus, string> = {
  active: "ساري",
  expired: "منتهي",
  cancelled: "ملغي",
};

export const statusColor: Record<WarrantyStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-300",
  expired: "bg-gray-100 text-gray-700 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

export function formatDateAr(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export function computeStatus(expiry: string, current: WarrantyStatus): WarrantyStatus {
  if (current === "cancelled") return "cancelled";
  const now = new Date();
  const e = new Date(expiry);
  return e < now ? "expired" : "active";
}

export function verifyUrl(warrantyNumber: string): string {
  if (typeof window === "undefined") return `/warranty/verify?n=${encodeURIComponent(warrantyNumber)}`;
  return `${window.location.origin}/warranty/verify?n=${encodeURIComponent(warrantyNumber)}`;
}
