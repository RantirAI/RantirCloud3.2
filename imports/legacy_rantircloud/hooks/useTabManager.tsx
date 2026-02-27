import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { workspaceService } from '@/services/workspaceService';

export interface Tab {
  id: string;
  type: 'database' | 'flow' | 'app' | 'logic';
  name: string;
  isActive: boolean;
  url: string;
  projectId: string;
  isLoading?: boolean;
  workspaceId?: string; // Track which workspace this tab belongs to
}

export function useTabManager() {
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load current workspace and subscribe to changes
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setCurrentWorkspaceId(workspace?.id || null);
    };
    loadWorkspace();
    
    // Listen for workspace switch events
    const handleWorkspaceSwitch = (event: CustomEvent<string>) => {
      setCurrentWorkspaceId(event.detail);
    };
    
    window.addEventListener('workspace-switched', handleWorkspaceSwitch as EventListener);
    
    // Listen for project deletion events to close corresponding tabs
    const handleProjectDeleted = (event: CustomEvent<{ projectId: string }>) => {
      const { projectId } = event.detail;
      setOpenTabs(prev => {
        const tabToClose = prev.find(t => t.projectId === projectId);
        if (!tabToClose) return prev;
        
        const newTabs = prev.filter(t => t.projectId !== projectId);
        
        // If we closed the active tab, navigate to another tab or dashboard
        if (tabToClose.isActive) {
          if (newTabs.length > 0) {
            const lastTab = newTabs[newTabs.length - 1];
            lastTab.isActive = true;
            // Use setTimeout to avoid state update during render
            setTimeout(() => window.location.href = lastTab.url, 0);
          } else {
            setTimeout(() => window.location.href = '/', 0);
          }
        }
        
        return newTabs;
      });
    };
    
    window.addEventListener('project-deleted', handleProjectDeleted as EventListener);
    return () => {
      window.removeEventListener('workspace-switched', handleWorkspaceSwitch as EventListener);
      window.removeEventListener('project-deleted', handleProjectDeleted as EventListener);
    };
  }, []);

  // Close tabs that don't belong to the current workspace when workspace changes
  useEffect(() => {
    if (!currentWorkspaceId) return;
    
    setOpenTabs(prev => {
      const tabsToKeep = prev.filter(tab => !tab.workspaceId || tab.workspaceId === currentWorkspaceId);
      const tabsToClose = prev.filter(tab => tab.workspaceId && tab.workspaceId !== currentWorkspaceId);
      
      // If the active tab was closed, navigate to dashboard
      const activeTabClosed = tabsToClose.some(tab => tab.isActive);
      if (activeTabClosed && tabsToKeep.length === 0) {
        navigate('/');
      } else if (activeTabClosed && tabsToKeep.length > 0) {
        // Activate the last remaining tab
        const lastTab = tabsToKeep[tabsToKeep.length - 1];
        lastTab.isActive = true;
        navigate(lastTab.url);
      }
      
      return tabsToKeep;
    });
  }, [currentWorkspaceId, navigate]);

  // Load tabs from localStorage on mount and filter by current workspace
  useEffect(() => {
    const savedTabs = localStorage.getItem('open-tabs');
    if (savedTabs) {
      try {
        let tabs = JSON.parse(savedTabs);
        // Filter out tabs from other workspaces when loading
        if (currentWorkspaceId) {
          tabs = tabs.filter((tab: Tab) => !tab.workspaceId || tab.workspaceId === currentWorkspaceId);
        }
        setOpenTabs(tabs);
      } catch (error) {
        console.error('Failed to load saved tabs:', error);
      }
    }
  }, [currentWorkspaceId]);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('open-tabs', JSON.stringify(openTabs));
  }, [openTabs]);

  // Update active tab based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    setOpenTabs(prev => prev.map(tab => ({
      ...tab,
      isActive: currentPath === tab.url
    })));
  }, [location.pathname]);

  const openTab = useCallback(async (tab: Omit<Tab, 'isActive'>) => {
    // Check if trying to open a tab from a different workspace
    if (tab.workspaceId && currentWorkspaceId && tab.workspaceId !== currentWorkspaceId) {
      console.warn('Cannot open project from different workspace');
      return;
    }
    
    console.log('useTabManager: openTab called with:', tab);
    setOpenTabs(prev => {
      console.log('useTabManager: current tabs before update:', prev);
      // Check if tab already exists
      const existingTab = prev.find(t => t.id === tab.id);
      if (existingTab) {
        // Just activate it and navigate
        navigate(tab.url);
        return prev.map(t => ({
          ...t,
          isActive: t.id === tab.id
        }));
      }

      // Add new tab and set as active (include workspaceId)
      const newTabs = prev.map(t => ({ ...t, isActive: false }));
      newTabs.push({ 
        ...tab, 
        isActive: true,
        workspaceId: tab.workspaceId || currentWorkspaceId || undefined
      });
      
      // Navigate to the tab
      navigate(tab.url);
      
      return newTabs;
    });
  }, [navigate, currentWorkspaceId]);

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setOpenTabs(prev => {
      const tabToClose = prev.find(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If we closed the active tab, navigate to another tab or dashboard
      if (tabToClose?.isActive) {
        if (newTabs.length > 0) {
          // Activate the last tab
          const lastTab = newTabs[newTabs.length - 1];
          lastTab.isActive = true;
          navigate(lastTab.url);
        } else {
          // Navigate to dashboard if no tabs left
          navigate('/');
        }
      }
      
      return newTabs;
    });
  }, [navigate]);

  const setActiveTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (tab) {
        navigate(tab.url);
        return prev.map(t => ({
          ...t,
          isActive: t.id === tabId
        }));
      }
      return prev;
    });
  }, [navigate]);

  const closeAllTabs = useCallback(() => {
    setOpenTabs([]);
    navigate('/');
  }, [navigate]);

  const updateTabName = useCallback((tabId: string, newName: string) => {
    setOpenTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  }, []);

  return {
    openTabs,
    openTab,
    closeTab,
    setActiveTab,
    closeAllTabs,
    updateTabName
  };
}
