
import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FullCompactSidebar } from "@/components/FullCompactSidebar";
import { CompactSidebar } from "@/components/CompactSidebar";
import { Header } from "@/components/Header";
import Footer from "./Footer";
import { UnifiedAISidebar } from "@/components/UnifiedAISidebar";
import { useAISidebarStore } from "@/stores/aiSidebarStore";
import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { cn } from "@/lib/utils";

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { isOpen: isAISidebarOpen } = useAISidebarStore();
  const { headerVisible } = useDashboardLayoutStore();
  
  // Check if we're on the dashboard route
  const isDashboardRoute = location.pathname === '/';
  
  // Check if current route needs compact UI (no AI sidebar on these pages)
  const isCompactRoute = (
    location.pathname === '/flows' ||
    location.pathname === '/databases' ||
    location.pathname === '/apps' ||
    location.pathname === '/cloud' ||
    location.pathname === '/settings' ||
    location.pathname === '/docs' ||
    location.pathname.startsWith('/docs/')
  );
  // Check if it's a detail page that needs the tiny sidebar
  const isDetailPage = (
    (location.pathname.startsWith('/tables/') && location.pathname.length > 8) ||
    (location.pathname.startsWith('/databases/') && location.pathname.length > 11) ||
    (location.pathname.startsWith('/flows/') && location.pathname.length > 7) ||
    (location.pathname.startsWith('/apps/') && location.pathname.length > 5) ||
    (location.pathname.startsWith('/cloud/') && location.pathname.length > 7)
  );

  // Auto-collapse sidebar on detail pages for better spreadsheet/flow experience
  useEffect(() => {
    setSidebarCollapsed(isDetailPage);
  }, [isDetailPage]);

  // Extract context info for AI sidebar
  const getContextInfo = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'databases' && pathParts[1]) {
      return { pageContext: 'database' as const, contextId: pathParts[1], contextData: { activeDatabaseId: pathParts[1] } };
    }
    if (pathParts[0] === 'tables' && pathParts[1]) {
      // For tables, pass activeTableId so UnifiedAISidebar can use spreadsheet-ai-actions
      return { pageContext: 'database' as const, contextId: pathParts[1], contextData: { activeTableId: pathParts[1] } };
    }
    if (pathParts[0] === 'flows' && pathParts[1]) {
      return { pageContext: 'flow' as const, contextId: pathParts[1], contextData: undefined };
    }
    if (pathParts[0] === 'apps' && pathParts[1]) {
      return { pageContext: 'app' as const, contextId: pathParts[1], contextData: undefined };
    }
    return null;
  };

  const contextInfo = getContextInfo();

  // Dashboard has its own layout with toggle controls
  if (isDashboardRoute) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-background">
        <div className={cn(
          "transition-all duration-300",
          headerVisible ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
        )}>
          <Header />
        </div>
        <div className={cn(
          "flex flex-1 transition-all duration-300",
          headerVisible ? "pt-12" : "pt-0"
        )}>
          <main className="flex-1" style={{ backgroundColor: 'hsl(var(--rc-bg))' }}>
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Show header on all routes
  const showHeader = true;

  return (
    <div
      className={cn(
        "flex flex-col font-sans bg-background",
        // Detail pages (flows/apps/tables/cloud) must never page-scroll.
        // They manage scrolling internally (canvas, side panels, etc.).
        isDetailPage ? "h-screen overflow-hidden" : "min-h-screen"
      )}
    >
      {showHeader && <Header />}
      <div className={cn(
        "flex flex-1 transition-all duration-300",
        isDetailPage && "min-h-0 overflow-hidden",
        showHeader && headerVisible ? "pt-11" : "pt-0"
      )}>
        {isDetailPage ? (
          <>
            <CompactSidebar headerCollapsed={!headerVisible} />
            {contextInfo && (
              <UnifiedAISidebar
                pageContext={contextInfo.pageContext}
                contextId={contextInfo.contextId}
                contextData={contextInfo.contextData}
              />
            )}
            <div 
              className={cn(
                "flex-1 flex flex-col transition-all duration-300 bg-zinc-100 dark:bg-zinc-900 relative",
                "min-h-0 overflow-hidden",
                isAISidebarOpen ? "pl-[360px]" : "pl-[48px]"
              )}
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex-1 min-h-0 overflow-hidden p-2 pt-2">
                <div className="h-full bg-background rounded-lg border shadow-md overflow-hidden">
                  <Outlet />
                </div>
              </div>
            </div>
          </>
        ) : isCompactRoute ? (
          <div className="flex-1 flex min-h-screen bg-zinc-100 dark:bg-zinc-900">
            <main className="flex-1 bg-zinc-100 dark:bg-zinc-900">
              <Outlet />
            </main>
          </div>
        ) : (
          <div className="flex flex-1 w-full">
            <div className="flex-1 relative overflow-hidden flex flex-col bg-[#FAFAFA] dark:bg-zinc-950">
              <div className="flex-1 pt-2 pr-2">
                <div className="bg-white dark:bg-zinc-900 rounded-lg h-full overflow-auto">
                  <Outlet />
                </div>
              </div>
              <Footer />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
