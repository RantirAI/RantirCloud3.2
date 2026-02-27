import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppProject, AppPage } from '@/types/appBuilder';
import { toast } from 'sonner';

interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
  checkPageAccess: (page: AppPage) => boolean;
  redirectToLogin: (pageId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  project: AppProject;
  currentPage?: AppPage;
  onNavigate?: (pageId: string) => void;
}

export function AuthProvider({ children, project, currentPage, onNavigate }: AuthProviderProps) {
  const { user, session, loading } = useAuth();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  const isAuthenticated = !!user && !!session;

  const checkPageAccess = (page: AppPage): boolean => {
    // If page doesn't require auth, allow access
    if (!page.settings?.requireAuth) {
      return true;
    }

    // If page requires auth and user is not authenticated, deny access
    if (page.settings.requireAuth && !isAuthenticated) {
      return false;
    }

    // If page has role restrictions, check user roles
    if (page.settings.allowedRoles && page.settings.allowedRoles.length > 0) {
      // TODO: Implement role checking when role system is added
      // For now, just check if user is authenticated
      return isAuthenticated;
    }

    return true;
  };

  const redirectToLogin = (pageId: string) => {
    if (!currentPage) return;

    const redirectPage = currentPage.settings?.redirectOnUnauth;
    if (redirectPage && onNavigate) {
      const loginPage = project.pages.find(p => p.id === redirectPage);
      if (loginPage) {
        onNavigate(redirectPage);
        toast.error('Please log in to access this page');
      } else {
        toast.error('Authentication required but no login page configured');
      }
    } else {
      toast.error('Authentication required');
    }
  };

  // Check page access when page changes or auth state changes
  useEffect(() => {
    if (loading || !currentPage) return;

    const hasAccess = checkPageAccess(currentPage);
    
    if (!hasAccess && !redirectAttempted) {
      setRedirectAttempted(true);
      redirectToLogin(currentPage.id);
    } else if (hasAccess) {
      setRedirectAttempted(false);
    }
  }, [currentPage, isAuthenticated, loading, redirectAttempted]);

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated,
    checkPageAccess,
    redirectToLogin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}