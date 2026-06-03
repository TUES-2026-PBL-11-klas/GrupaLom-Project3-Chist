import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/nav/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBridge } from "@/components/toasts/NotificationBridge";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="relative min-h-screen">
        <div className="ambient-orb-tl" aria-hidden="true" />
        <div className="ambient-orb-br" aria-hidden="true" />
        <Navbar />
        <div className="relative z-[1]">{children}</div>
        <Toaster theme="dark" position="top-right" richColors />
        <NotificationBridge />
      </div>
    </AppProvider>
  );
}
