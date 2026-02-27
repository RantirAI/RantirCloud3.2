import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, Outlet } from "react-router-dom";
import { useState, useEffect } from 'react';
import Dashboard from "./pages/Dashboard";
import Flows from "./pages/Flows";
import Tables from "./pages/Tables";
import TableDetail from "./pages/TableDetail";
import AddRecord from "./pages/AddRecord";
import FormView from "./pages/FormView";
import FormSubmit from "./pages/FormSubmit";
import CardsView from "./pages/CardsView";
import Login from "./pages/Login";
import FlowBuilder from "./pages/FlowBuilder";
import AppBuilder from "./pages/AppBuilder";
import Apps from "./pages/Apps";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Databases from "./pages/Databases";
import DatabaseDetail from "./pages/DatabaseDetail";
import DocumentDetail from "./pages/DocumentDetail";
import Documentation from "./pages/Documentation";
import NodeDocumentation from "./pages/NodeDocumentation";
import NodeDevelopmentGuide from "./pages/NodeDevelopmentGuide";

import ReadOnlySpreadsheetView from "./pages/ReadOnlySpreadsheetView";
import ReadOnlyCardsView from "./pages/ReadOnlyCardsView";
import ReadOnlyKanbanView from "./pages/ReadOnlyKanbanView";
import ReadOnlyFormView from "./pages/ReadOnlyFormView";
import { ViewItem } from "./pages/ViewItem";
import { EditItem } from "./pages/EditItem";
import DesignSystem from "./pages/DesignSystem";
import ImportSubscribers from "./pages/ImportSubscribers";
import SuccessPage from "./pages/success";
import CheckoutSuccess from "./pages/checkout-success";
import SelectPlan from "./pages/SelectPlan";
import Onboarding from "./pages/Onboarding";
import AdminBulkInvoices from "./pages/AdminBulkInvoices";
import AcceptInvitation from "./pages/AcceptInvitation";
import DatabaseApiDocs from "./pages/DatabaseApiDocs";
import AIWall from "./pages/AIWall";
import EmbedChat from "./pages/EmbedChat";
import { useAuth } from "@/hooks/useAuth";
import { TabProvider } from "@/contexts/TabContext";
import { useSubscription } from "@/hooks/useSubscription";
import { WorkspaceThemeProvider } from "@/components/WorkspaceThemeProvider";

// Wrapper to force remount when navigation occurs
function TableDetailWrapper() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const location = useLocation();
  // Directly compute key from params and location - this will change when navigation happens
  const key = `table-${id}-${location.pathname}${location.search}`;
  console.log('TableDetailWrapper rendering with key:', key);
  return <TableDetail key={key} />;
}

// Wrapper to force remount when navigation occurs
function DatabaseDetailWrapper() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const location = useLocation();
  // Directly compute key from params and location - this will change when navigation happens  
  const key = `database-${id}-${location.pathname}${location.search}`;
  console.log('DatabaseDetailWrapper rendering with key:', key);
  return <DatabaseDetail key={key} />;
}

// Centralized auth gate - checks ONCE at parent level
function AuthenticatedRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { loading: subLoading } = useSubscription();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Mark as initialized once both auth and subscription have completed their first check
    if (!authLoading && !subLoading && !hasInitialized) {
      setHasInitialized(true);
    }
  }, [authLoading, subLoading, hasInitialized]);

  // Only show loader on FIRST load, not on subsequent navigations
  if (!hasInitialized && (authLoading || subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render child routes via Outlet
  return <Outlet />;
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity
    }
  }
});
const App = () => <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WorkspaceThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TabProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/select-plan" element={<SelectPlan />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/form/:id" element={<FormView />} />
            <Route path="/cards/:id" element={<CardsView />} />
            <Route path="/submit/:id" element={<FormSubmit />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/embed/chat/:flowSlug" element={<EmbedChat />} />
            
            {/* Public read-only views - no auth required */}
            <Route path="/view/spreadsheet/:id" element={<ReadOnlySpreadsheetView />} />
            <Route path="/view/cards/:id" element={<ReadOnlyCardsView />} />
            <Route path="/view/kanban/:id" element={<ReadOnlyKanbanView />} />
            <Route path="/view-item/:itemData" element={<ViewItem />} />
            <Route path="/edit-item/:itemData" element={<EditItem />} />
            {/* Protected routes - wrapped in AuthenticatedRoutes */}
            <Route element={<AuthenticatedRoutes />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="flows" element={<Flows />} />
                <Route path="flows/:id" element={<FlowBuilder />} />
                <Route path="databases" element={<Databases />} />
                <Route path="databases/:id" element={<DatabaseDetailWrapper />} />
                <Route path="databases/:id/docs/:docId" element={<DocumentDetail />} />
                <Route path="tables" element={<Tables />} />
                <Route path="tables/:id" element={<TableDetailWrapper />} />
                <Route path="tables/:id/add" element={<AddRecord />} />
                <Route path="settings" element={<Settings />} />
                <Route path="docs" element={<Documentation />} />
                <Route path="docs/:nodeType" element={<NodeDocumentation />} />
                <Route path="docs/development-guide" element={<NodeDevelopmentGuide />} />
                <Route path="apps" element={<Apps />} />
                <Route path="apps/:id" element={<AppBuilder />} />
                
                <Route path="ai-wall" element={<AIWall />} />
                <Route path="design-system/*" element={<DesignSystem />} />
                <Route path="import-subscribers" element={<ImportSubscribers />} />
                <Route path="success" element={<SuccessPage />} />
                <Route path="admin-bulk-invoices" element={<AdminBulkInvoices />} />
                <Route path="docs/database-api" element={<DatabaseApiDocs />} />
              </Route>
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TabProvider>
      </BrowserRouter>
      </WorkspaceThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>;
export default App;
