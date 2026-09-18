"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar, { SidebarProvider } from "./Sidebar";
import MobileNav from "./MobileNav";
import Papicon from "./Papicon";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Papicon name="Butterfly" size={32} className="animate-pulse text-accent" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <div className="min-h-screen pb-16 transition-all duration-300 md:pb-0 md:ml-[72px] lg:ml-[260px]">
        {children}
      </div>
      <MobileNav />
    </SidebarProvider>
  );
}
