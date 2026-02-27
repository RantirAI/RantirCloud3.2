
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flowService } from "@/services/flowService";
import { toast } from "sonner";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { Workflow } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTab } from "@/contexts/TabContext";
import { ReactFlowProvider } from '@xyflow/react';
import { FlowWrapper } from "@/components/flow/FlowWrapper";
import { databaseService } from "@/services/databaseService";
import { nodeRegistry } from "@/lib/node-registry";
import { registerAllNodes } from "@/lib/register-nodes";
import { useUserNodeInstallations } from "@/hooks/useUserNodeInstallations";
import { useFlowStore } from "@/lib/flow-store";
import { workspaceService } from "@/services/workspaceService";

// Use the global type declarations from the globals.d.ts file
// No need to redeclare here as it's already defined in src/types/globals.d.ts

const FlowBuilder = () => {
  const [projectName, setProjectName] = useState<string>("Untitled Flow");
  const { id: flowProjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openTab, updateTabName } = useTab();
  const [flowData, setFlowData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadRef = useRef(false);
  const lastRefreshAtRef = useRef<number>(0);
  
  // Get user's node installations
  const { installedNodeTypes, isLoading: installationsLoading, refreshInstallations } = useUserNodeInstallations();

  // Register nodes conditionally based on user installations
  useEffect(() => {
    if (installationsLoading) {
      console.log("Waiting for user installations to load...");
      return;
    }
    
    // Register all nodes first
    registerAllNodes();
    
    // Then apply conditional registration based on user installations
    nodeRegistry.registerConditionally(installedNodeTypes);
    
    const availableNodes = nodeRegistry.getAllPlugins().map(p => p.type);
    console.log("FlowBuilder: Available nodes after conditional registration:", availableNodes);
    
    // Make nodeRegistry globally available for components that need it
    if (typeof window !== 'undefined') {
      // Initialize global objects
      window.flow = { nodeRegistry };
      
      // Initialize Webflow cache
      if (!window.webflowCache) {
        window.webflowCache = {
          sites: new Map(),
          collections: new Map(),
          items: new Map()
        };
      }
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.flow) {
        delete window.flow.nodeRegistry;
      }
    };
  }, [installedNodeTypes, installationsLoading]);

  // Workflow refresh helper - ONLY used for explicit user actions, never automatic
  const refreshWorkflow = useCallback(async () => {
    if (!flowProjectId) return;

    try {
      console.log('FlowBuilder: Manual refresh requested...');
      await refreshInstallations();
      const latestInstalled = (typeof window !== 'undefined' && window.flowUserNodeInstallations)
        ? window.flowUserNodeInstallations.installedNodeTypes
        : installedNodeTypes;
      registerAllNodes();
      nodeRegistry.registerConditionally(latestInstalled);

      const latestData = await flowService.getLatestFlowData(flowProjectId);
      setFlowData(latestData);
      lastRefreshAtRef.current = Date.now();
      console.log('FlowBuilder: Manual refresh complete');
    } catch (e) {
      console.error('FlowBuilder: refresh failed', e);
    }
  }, [flowProjectId, installedNodeTypes, refreshInstallations]);

  // Listen for node installation events from AI sidebar
  useEffect(() => {
    const handleInstallationsUpdated = (event: CustomEvent) => {
      const { installedNodeTypes: newInstalled } = event.detail;
      console.log('FlowBuilder: Detected new installations:', newInstalled);
      registerAllNodes();
      nodeRegistry.registerConditionally(newInstalled);
    };
    
    window.addEventListener('nodeInstallationsUpdated', handleInstallationsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('nodeInstallationsUpdated', handleInstallationsUpdated as EventListener);
    };
  }, []);

  // Pre-fetch databases when flow builder loads to ensure they're available
  useEffect(() => {
    if (user?.id) {
      console.log("Pre-fetching databases for user:", user.id);
      
      // Reset any stale flags
      if (typeof window !== 'undefined') {
        window.fetchingDatabases = false;
      }
      
      databaseService.getUserDatabases(user.id)
        .then(databases => {
          console.log("Pre-fetched databases in FlowBuilder:", databases);
          
          // Store in window cache
          if (typeof window !== 'undefined') {
            if (!window.flowDatabases) {
              window.flowDatabases = {};
            }
            window.flowDatabases[user.id] = databases;
            
            // Reset any stale loading flags
            window.fetchingDatabases = false;
          }
        })
        .catch(err => {
          console.error("Error pre-fetching databases:", err);
          if (typeof window !== 'undefined') {
            window.fetchingDatabases = false;
          }
        });
    }
  }, [user]);

  useEffect(() => {
    if (!flowProjectId || !user) {
      if (!user) {
        console.log("User not authenticated yet, waiting...");
        return;
      }

      toast.error("Error", {
        description: "No flow project ID provided"
      });
      setIsLoading(false);
      return;
    }

    console.log("Loading flow data for project:", flowProjectId);
    setIsLoading(true);
    
    // First check if project belongs to current workspace
    const validateAndLoad = async () => {
      try {
        const currentWorkspace = await workspaceService.getCurrentWorkspace();
        const project = await flowService.getFlowProject(flowProjectId);
        
        // Check if project belongs to current workspace
        // Fail-safe: if project has workspace_id but we can't determine current workspace, deny access
        if (project?.workspace_id) {
          if (!currentWorkspace?.id) {
            console.warn('Cannot validate workspace access - current workspace not determined');
            toast.error("Access denied", {
              description: "Unable to verify workspace access"
            });
            navigate('/');
            return null;
          }
          if (project.workspace_id !== currentWorkspace.id) {
            console.warn('Flow project does not belong to current workspace, redirecting to dashboard');
            toast.error("Access denied", {
              description: "This flow belongs to a different workspace"
            });
            navigate('/');
            return null;
          }
        }
        
        if (project?.name) {
          setProjectName(project.name);
          
          // Open tab for this flow
          console.log('FlowBuilder: Opening tab for flow project:', project);
          openTab({
            id: `flow-${project.id}`,
            type: 'flow',
            name: project.name,
            url: `/flows/${project.id}`,
            projectId: project.id,
            workspaceId: project.workspace_id || undefined
          });
        }
        
        return project;
      } catch (err) {
        console.error("Error loading flow project:", err);
        throw err;
      }
    };
    
    validateAndLoad()
      .then((project) => {
        if (!project) return null;
        
        return flowService.getLatestFlowData(flowProjectId);
      })
      .then((data) => {
        if (data) {
          console.log("Flow data loaded successfully:", data);
          setFlowData(data);
          hasInitialLoadRef.current = true;
        }
      })
      .catch((err) => {
        console.error("Error loading flow data:", err);
        toast.error("Error", {
          description: "Error loading flow data"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [flowProjectId, user]);

  if (!hasInitialLoadRef.current && (isLoading || installationsLoading)) {
    return (
      <div className="flex items-center justify-center h-full font-sans">
        <WhirlpoolLoader 
          size="lg" 
          icon={<Workflow className="h-7 w-7" />} 
          message={installationsLoading ? "Loading user integrations..." : "Loading flow data..."}
        />
      </div>
    );
  }

  const handleProjectNameChange = (newName: string) => {
    setProjectName(newName);
    // Update the tab name as well
    if (flowProjectId) {
      updateTabName(`flow-${flowProjectId}`, newName);
    }
  };

  return (
    <ReactFlowProvider>
      <FlowWrapper 
        flowProjectId={flowProjectId}
        projectName={projectName}
        flowData={flowData}
        onProjectNameChange={handleProjectNameChange}
      />
    </ReactFlowProvider>
  );
};

export default FlowBuilder;
