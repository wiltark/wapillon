"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar, { SidebarProvider } from "./Sidebar";
import MobileNav from "./MobileNav";
import Icon from "./Icon";
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
        <Icon name="Logo" size={32} className="animate-pulse text-accent" />
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
      {/*
        `.wap-shell` takes its left margin from --sb-w, the same variable that
        sizes the sidebar, so the two cannot drift apart. No inline margin here:
        it would outrank the media queries and push the page on phones, where
        the sidebar is an overlay.
      */}
      <div className="wap-shell min-h-screen pb-16 transition-[margin] duration-200 ease-out md:pb-0">
        {children}
      </div>
      <MobileNav />
    </SidebarProvider>
  );
}
