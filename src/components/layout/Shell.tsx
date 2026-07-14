import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { AssistantFAB } from "./AssistantFAB";

const TOP_BAR_TEXT = "👑 أهلاً بكم في زين للعناية وزينة السيارات — جودة ملكية وعروض حصرية! 👑";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white pb-16 md:pb-0">
      <TopBar text={TOP_BAR_TEXT} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
      <AssistantFAB />
    </div>
  );
}
