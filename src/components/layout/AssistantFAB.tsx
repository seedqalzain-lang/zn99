import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AssistantFAB() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/assistant")) return null;

  return (
    <Link
      to="/assistant"
      aria-label="المساعد الذكي"
      className="fixed z-40 bottom-20 md:bottom-6 left-4 md:left-6 flex items-center gap-2 bg-gradient-to-l from-amber-500 to-yellow-500 text-white font-bold px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-transform"
    >
      <Sparkles className="w-5 h-5" />
      <span className="hidden sm:inline text-sm">المساعد الذكي</span>
    </Link>
  );
}
