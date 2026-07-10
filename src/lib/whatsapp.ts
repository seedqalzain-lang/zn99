export const WHATSAPP_NUMBER = "967780687704";
export const SALES_PHONE = "773144403";
export const DEV_PHONE = "780687704";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
