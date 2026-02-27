import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/compact/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Plus, ExternalLink, Workflow, ArrowRight, LayoutList, Table, Network, Grid3X3, Search, Sparkles, FileCode, Zap, Loader2, PanelLeftClose, PanelLeft, Maximize2, Minimize2, Settings, LogOut, ChevronDown, Building2, Cloud, LayoutGrid, List, Paperclip, X, FileText, Image as ImageIcon, Link2, LayoutDashboard } from "lucide-react";
import { EmptyProjectsState } from "@/components/dashboard/EmptyProjectsState";
import { ProjectCategoryCards, ProjectCategory } from "@/components/dashboard/ProjectCategoryCards";
import { CategoryPromptSuggestions } from "@/components/dashboard/CategoryPromptSuggestions";
import { integrationsService, NodeIntegration } from "@/services/integrationsService";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import Lottie from "lottie-react";
import generatingAnimation from "@/assets/generating-loader.json";
import "@/components/WhirlpoolLoader.css";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { databaseService } from "@/services/databaseService";
import { tableService } from "@/services/tableService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/compact/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ColorPicker } from "@/components/ColorPicker";
import { SearchModal } from "@/components/SearchModal";
import { workspaceService, type Workspace } from "@/services/workspaceService";
import { ProjectGenerationResults } from "@/components/ProjectGenerationResults";
import { projectGenerationService, type AvailableNodeType } from "@/services/projectGenerationService";
import { nodeRegistry } from "@/lib/node-registry";
import { driveService } from "@/services/driveService";
import { documentService } from "@/services/documentService";
import { convertSectionsToLexical } from "@/utils/lexicalConverter";
import { generateMediaForSections, sectionsNeedMediaGeneration } from "@/utils/mediaGenerationService";
import { ActivityPanel } from "@/components/ActivityPanel";
import { ChangelogPopup } from "@/components/ChangelogPopup";
import { NewProjectModal, NewProjectType } from "@/components/dashboard/NewProjectModal";
import { CommunityPluginsModal } from "@/components/CommunityPluginsModal";

import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { useAISidebarStore } from "@/stores/aiSidebarStore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { sidebarsVisible, headerVisible, toggleSidebars, toggleHeader, showAll } = useDashboardLayoutStore();
  const { addInitialPromptToConversation } = useAISidebarStore();
  const [databases, setDatabases] = useState<any[]>([]);
  const [recentTables, setRecentTables] = useState<any[]>([]);
  const [recentFlows, setRecentFlows] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  
  
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewDatabaseOpen, setIsNewDatabaseOpen] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [newDatabaseDescription, setNewDatabaseDescription] = useState("");
  const [newDatabaseColor, setNewDatabaseColor] = useState("#3B82F6");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
  const [mainTextareaValue, setMainTextareaValue] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<any[]>([]);
  const [projectsViewMode, setProjectsViewMode] = useState<'list' | 'grid'>('list');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [installedIntegrations, setInstalledIntegrations] = useState<NodeIntegration[]>([]);
  const [detectedIntegrations, setDetectedIntegrations] = useState<NodeIntegration[]>([]);
  const [integrationSearchQuery, setIntegrationSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [showCommunityPlugins, setShowCommunityPlugins] = useState(false);

  const toggleProjectType = (type: string) => {
    setSelectedProjectTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Auto-select database when files are attached
  const handleFileAttachment = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setAttachedFiles(prev => [...prev, ...fileArray]);
    
    // Auto-select database type when files are attached
    if (!selectedProjectTypes.includes('database')) {
      setSelectedProjectTypes(prev => [...prev, 'database']);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Check if prompt contains document keywords - use word boundary to avoid false positives
  const containsDocumentKeywords = (text: string): boolean => {
    const keywords = ['doc', 'document', 'documents', 'report', 'reports', 'write', 'draft', 'article'];
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
  };

  // Check if prompt contains table keywords
  const containsTableKeywords = (text: string): boolean => {
    const keywords = ['table', 'tables', 'spreadsheet', 'sheet', 'collection', 'collections'];
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
  };

  // Check if prompt contains media keywords (image, chart, video)
  const containsMediaKeywords = (text: string): { hasImage: boolean; hasChart: boolean; hasVideo: boolean } => {
    const lowerText = text.toLowerCase();
    const matchWord = (keyword: string) => new RegExp(`\\b${keyword}\\b`, 'i').test(lowerText);
    
    const imageKeywords = ['image', 'picture', 'photo', 'illustration', 'diagram', 'infographic', 'visual'];
    const chartKeywords = ['chart', 'graph', 'visualization', 'visualize', 'statistics', 'data viz', 'bar chart', 'pie chart', 'line chart'];
    const videoKeywords = ['video', 'animation', 'motion', 'explainer', 'animated', 'clip'];
    
    return {
      hasImage: imageKeywords.some(matchWord),
      hasChart: chartKeywords.some(matchWord),
      hasVideo: videoKeywords.some(matchWord)
    };
  };

  // Import smart naming utility - using inline import to avoid circular dependencies
  const extractProjectName = (text: string): string | null => {
    // Use the shared smart naming logic
    const { extractSmartProjectName } = require('@/utils/projectNaming');
    const name = extractSmartProjectName(text);
    return name !== 'New Project' ? name : null;
  };

  

  // Auto-detect project types from keywords
  const detectProjectTypes = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    const detected: string[] = [];
    
    // Database keywords - more specific to avoid false positives
    const databaseKeywords = ['database', 'document', 'documents', 'cms', 'collections', 'tables', 'records', 'storage', 'report', 'data'];
    if (databaseKeywords.some(kw => {
      // Use word boundary check for short keywords
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerText);
    })) {
      detected.push('database');
    }
    
    // Flow keywords - use word boundary for short keywords like "flow"
    const flowKeywords = ['logic flows', 'logic flow', 'workflow', 'workflows', 'automation', 'automate', 'connect to', 'integration', 'timetable', 'schedule'];
    const flowBoundaryKeywords = ['flow', 'flows'];
    if (flowKeywords.some(kw => lowerText.includes(kw)) || 
        flowBoundaryKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lowerText))) {
      detected.push('flow');
    }
    
    // App keywords - use word boundary for short keywords
    const appKeywords = ['ai app', 'website', 'web app', 'application', 'frontend', 'interface', 'landing page'];
    const appBoundaryKeywords = ['site', 'ui'];
    if (appKeywords.some(kw => lowerText.includes(kw)) ||
        appBoundaryKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lowerText))) {
      detected.push('app');
    }
    
    return detected;
  };

  // Detect integrations mentioned in prompt
  const detectIntegrations = useMemo(() => {
    if (!mainTextareaValue.trim() || installedIntegrations.length === 0) return [];
    
    const lowerText = mainTextareaValue.toLowerCase();
    const flowKeywords = ['logic', 'flow', 'workflow', 'connect', 'automation', 'automate'];
    const hasFlowContext = flowKeywords.some(kw => lowerText.includes(kw));
    
    if (!hasFlowContext) return [];
    
    return installedIntegrations.filter(integration => {
      const integrationName = integration.name.toLowerCase();
      return lowerText.includes(integrationName);
    });
  }, [mainTextareaValue, installedIntegrations]);

  // Update detected integrations when prompt changes
  useEffect(() => {
    setDetectedIntegrations(detectIntegrations);
    
    // Auto-select flow type when integrations are detected
    if (detectIntegrations.length > 0 && !selectedProjectTypes.includes('flow')) {
      setSelectedProjectTypes(prev => [...prev, 'flow']);
    }
  }, [detectIntegrations]);

  // Load installed integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      if (!user) return;
      try {
        const nodeIntegrations = await integrationsService.getUserNodeIntegrations(user.id);
        setInstalledIntegrations(nodeIntegrations);
      } catch (error) {
        console.error('Failed to load integrations:', error);
      }
    };
    loadIntegrations();
  }, [user]);

  // Update project types when textarea changes
  useEffect(() => {
    if (mainTextareaValue.trim()) {
      const detected = detectProjectTypes(mainTextareaValue);
      if (detected.length > 0) {
        setSelectedProjectTypes(prev => {
          const newTypes = [...prev];
          detected.forEach(type => {
            if (!newTypes.includes(type)) {
              newTypes.push(type);
            }
          });
          return newTypes;
        });
      }
    }
  }, [mainTextareaValue]);

  const handleGenerate = async () => {
    if (!mainTextareaValue.trim() && attachedFiles.length === 0) {
      toast.error("Please enter a description or attach files");
      return;
    }
    if (selectedProjectTypes.length === 0) {
      toast.error("Please select at least one project type");
      return;
    }
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setIsGenerating(true);
    
    try {
      const hasAttachments = attachedFiles.length > 0;
      const shouldGenerateDocument = containsDocumentKeywords(mainTextareaValue);

      const projectTypesToGenerate = (() => {
        const types = [...selectedProjectTypes];
        // Documents + attachments live inside a database, so ensure we create one.
        if ((hasAttachments || shouldGenerateDocument) && !types.includes('database')) {
          types.push('database');
        }
        return types;
      })();

      toast.loading(`Generating ${projectTypesToGenerate.join(", ")}...`, {
        id: 'generation-toast'
      });

      // Convert installed integrations to the format expected by the service
      const integrationsForGeneration = installedIntegrations.map(i => ({
        id: i.id,
        name: i.name,
        nodeType: i.nodeType || i.id,
        category: i.category,
        description: i.description
      }));

      // Get ALL available node types from registry for AI context (including those requiring installation)
      // Match Search Modal format with installation status markers for accurate integration detection
      const allNodeTypesForAI = nodeRegistry.getAllNodeTypesForAI();
      const userInstalledTypes = await integrationsService.getUserInstalledNodeTypes(user.id);

      const availableNodeTypes: AvailableNodeType[] = allNodeTypesForAI.map(p => ({
        type: p.type,
        name: p.name,
        description: p.description || p.name,
        category: p.category,
        requiresInstallation: p.requiresInstallation || false,
        isInstalled: !p.requiresInstallation || userInstalledTypes.includes(p.type)
      }));

      const [createdProjects] = await Promise.all([
        projectGenerationService.handleFullGeneration(
          mainTextareaValue,
          projectTypesToGenerate,
          user.id,
          integrationsForGeneration,
          availableNodeTypes
        ),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

      // Modify app project URLs to include autoBuild param for AI site generation
      const resultsWithAutoBuild = createdProjects.map(project => {
        if (project.type === 'app') {
          return {
            ...project,
            url: `/apps/${project.id}?autoBuild=${encodeURIComponent(mainTextareaValue)}`
          };
        }
        return project;
      });
      
      setGenerationResults(resultsWithAutoBuild);

      const createdDatabase = createdProjects.find(p => p.type === 'database');

      // Upload attachments into the generated database (if any)
      if (createdDatabase && hasAttachments) {
        toast.loading(`Uploading ${attachedFiles.length} file(s)...`, {
          id: 'upload-toast'
        });

        for (const file of attachedFiles) {
          await driveService.uploadFile(createdDatabase.id, file);
        }

        toast.success(`Uploaded ${attachedFiles.length} file(s) to database`, {
          id: 'upload-toast'
        });
      }

      // Generate document into the generated database (if requested)
      if (createdDatabase && shouldGenerateDocument) {
        toast.loading('Generating document with AI...', { id: 'doc-toast' });

        try {
          const { data: aiResponse, error: aiError } = await supabase.functions.invoke('database-ai-actions', {
            body: {
              prompt: mainTextareaValue,
              databaseId: createdDatabase.id,
              userId: user.id,
              existingTables: [],
              existingDocuments: []
            }
          });

          if (aiError) throw aiError;

          if (aiResponse?.action === 'create_document' && aiResponse?.document) {
            let sections = aiResponse.document.sections || [];
            
            // Generate images/videos for sections that have prompts
            if (sectionsNeedMediaGeneration(sections)) {
              toast.loading('Generating images and media...', { id: 'doc-toast' });
              sections = await generateMediaForSections(sections, {
                databaseId: createdDatabase.id,
                userId: user.id
              });
            }
            
            const lexicalContent = convertSectionsToLexical(sections);

            await documentService.createDocument({
              database_id: createdDatabase.id,
              title: aiResponse.document.title || mainTextareaValue.slice(0, 100).trim(),
              content: lexicalContent
            });

            toast.success('AI document created!', { id: 'doc-toast' });
          } else {
            // Fallback: AI returned a non-document action
            const docTitle = extractProjectName(mainTextareaValue) || mainTextareaValue.slice(0, 100).trim() || 'Generated Document';
            const fallbackSections = [
              { type: 'heading', level: 1, content: docTitle },
              { type: 'paragraph', content: `This document was created based on your request: "${mainTextareaValue}"` },
              { type: 'heading', level: 2, content: 'Overview' },
              { type: 'paragraph', content: 'Add your content here.' }
            ];

            const lexicalContent = convertSectionsToLexical(fallbackSections);

            await documentService.createDocument({
              database_id: createdDatabase.id,
              title: docTitle,
              content: lexicalContent
            });

            toast.success('Document created!', { id: 'doc-toast' });
          }
        } catch (docError) {
          console.error('Error generating AI document:', docError);

          // Last-resort fallback: create a basic document so the user still gets something usable.
          const docTitle = extractProjectName(mainTextareaValue) || mainTextareaValue.slice(0, 100).trim() || 'Generated Document';
          const basicSections = [
            { type: 'heading', level: 1, content: docTitle },
            { type: 'paragraph', content: 'Document content goes here.' }
          ];

          try {
            const lexicalContent = convertSectionsToLexical(basicSections);
            await documentService.createDocument({
              database_id: createdDatabase.id,
              title: docTitle,
              content: lexicalContent
            });
            toast.success('Document created!', { id: 'doc-toast' });
          } catch (fallbackError) {
            console.error('Even fallback document creation failed:', fallbackError);
            toast.error('Failed to create document', { id: 'doc-toast' });
          }
        }
      }

      toast.success(
        `Successfully created ${createdProjects.length} project${createdProjects.length > 1 ? 's' : ''}!`,
        { id: 'generation-toast' }
      );

      // Save initial prompt to AI assistant conversation - single conversation with ALL created project types
      if (mainTextareaValue.trim() && createdProjects.length > 0) {
        // Use DETECTED project types (not just created) to ensure all badges show correctly
        const allProjectTypes = projectTypesToGenerate.join(',');
        // Use the first project's ID as the context
        const firstProject = createdProjects[0];
        
        // Get actual node types used if flow was created
        let actualUsedIntegrations: string[] = [];
        const createdFlow = createdProjects.find(p => p.type === 'flow');
        
        if (createdFlow && allProjectTypes.includes('flow')) {
          try {
            // Query the flow_data to get actual nodes used
            const { data: flowData } = await supabase
              .from('flow_data')
              .select('nodes')
              .eq('flow_project_id', createdFlow.id)
              .order('version', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (flowData?.nodes && Array.isArray(flowData.nodes)) {
              // Extract unique node types from the flow
              const nodeTypes = (flowData.nodes as any[])
                .map((node: any) => node.data?.type)
                .filter(Boolean)
                .filter((type: string, idx: number, arr: string[]) => arr.indexOf(type) === idx);
              actualUsedIntegrations = nodeTypes.slice(0, 10);
            }
          } catch (err) {
            console.error('Error fetching flow nodes for chat history:', err);
          }
        }
        
        console.log('Dashboard saving conversation - types:', allProjectTypes, 'integrations:', actualUsedIntegrations);
        await addInitialPromptToConversation(allProjectTypes, firstProject.id, mainTextareaValue, user.id, actualUsedIntegrations, []);
      }

      setMainTextareaValue("");
      setSelectedProjectTypes([]);
      setAttachedFiles([]);

      await loadData();

      if (createdDatabase && (hasAttachments || shouldGenerateDocument)) {
        navigate(`/databases/${createdDatabase.id}`);
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error.message}`, {
        id: 'generation-toast'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);

      // Load current workspace FIRST - this determines all subsequent queries
      const workspace = await workspaceService.getCurrentWorkspace();
      setCurrentWorkspace(workspace);
      const workspaceId = workspace?.id || null;


      // Load databases - filtered by workspace
      const databasesData = await databaseService.getUserDatabases(user.id, workspaceId);
      setDatabases(databasesData);

      // Load recent tables - filtered by workspace
      const tablesData = await tableService.getUserTableProjects(user.id, undefined, workspaceId);
      const sortedTables = tablesData.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 3);
      setRecentTables(sortedTables);

      // Load recent flow projects - when workspace is set, show ALL workspace flows (for team members)
      let flowQuery = supabase.from("flow_projects").select("*");
      if (workspaceId) {
        flowQuery = flowQuery.eq("workspace_id", workspaceId);
      } else {
        flowQuery = flowQuery.eq("user_id", user.id);
      }
      const { data: flowsData, error } = await flowQuery.order("updated_at", { ascending: false }).limit(3);
      if (error) throw error;
      setRecentFlows(flowsData || []);

      // Load recent app projects - when workspace is set, show ALL workspace apps (for team members)
      let appQuery = supabase.from("app_projects").select("*");
      if (workspaceId) {
        appQuery = appQuery.eq("workspace_id", workspaceId);
      } else {
        appQuery = appQuery.eq("user_id", user.id);
      }
      const { data: appsData, error: appError } = await appQuery.order("updated_at", { ascending: false }).limit(3);
      if (appError) throw appError;
      setRecentApps(appsData || []);


      // Load recent searches - when workspace is set, show ALL workspace searches (for team members)
      let searchQuery = supabase.from("user_searches").select("*");
      if (workspaceId) {
        searchQuery = searchQuery.eq("workspace_id", workspaceId);
      } else {
        searchQuery = searchQuery.eq("user_id", user.id);
      }
      const { data: searchesData, error: searchError } = await searchQuery.order("created_at", { ascending: false }).limit(3);
      if (searchError) throw searchError;
      setRecentSearches(searchesData || []);
    } catch (error) {
      console.error("Failed to load data", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateDatabase = async () => {
    if (!user || !newDatabaseName.trim()) return;
    try {
      const newDatabase = await databaseService.createDatabase({
        name: newDatabaseName,
        description: newDatabaseDescription || undefined,
        color: newDatabaseColor,
        user_id: user.id
      });
      setDatabases([...databases, newDatabase]);
      toast.success("Database created");
      setIsNewDatabaseOpen(false);
      setNewDatabaseName("");
      setNewDatabaseDescription("");
      setNewDatabaseColor("#3B82F6");
    } catch (error: any) {
      toast.error(error.message || "Failed to create database");
    }
  };
  const handleCreateFlow = () => {
    navigate("/flows");
  };

  const handleCreateNewProject = async (type: NewProjectType, projectName: string, projectColor: string, projectDescription: string) => {
    if (!user) return;
    try {
      const workspace = await workspaceService.getCurrentWorkspace();
      if (type === 'database') {
        const newDb = await databaseService.createDatabase({
          name: projectName,
          description: projectDescription || undefined,
          color: projectColor,
          user_id: user.id
        });
        toast.success("Database created");
        navigate(`/databases/${newDb.id}`);
      } else if (type === 'flow') {
        const { data, error } = await supabase
          .from("flow_projects")
          .insert({ user_id: user.id, name: projectName, description: projectDescription, workspace_id: workspace?.id || null })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          toast.success("Flow created");
          navigate(`/flows/${data.id}`);
        }
      } else if (type === 'website') {
        const { data, error } = await supabase
          .from("app_projects")
          .insert({ user_id: user.id, name: projectName, description: projectDescription, workspace_id: workspace?.id || null, pages: [] })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          toast.success("App project created");
          navigate(`/apps/${data.id}`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create project");
    }
  };
  if (loading || isLoading) {
    return (
      <div className="ui-compact bg-rc-bg min-h-screen">
        <div className="max-w-[1200px] mx-auto p-4 pt-20">
          <div className="flex items-center justify-center h-32">
            <WhirlpoolLoader 
              size="lg" 
              icon={
                <svg width="40" height="33" viewBox="0 0 168 139" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                  <path d="M52.75 5.74902L113.095 5.74902C122.663 5.74902 131.004 7.40502 138.119 10.717C145.233 13.9064 150.753 18.445 154.679 24.333C158.604 30.221 160.567 37.0904 160.567 44.941C160.567 52.669 158.604 59.477 154.679 65.365C150.753 71.1304 145.233 75.669 138.119 78.981C131.004 82.1704 122.663 83.765 113.095 83.765H86.4649L70 62.973H112.359C119.105 62.973 124.257 61.4397 127.815 58.373C131.495 55.1837 133.335 50.7677 133.335 45.125C133.335 39.3597 131.556 35.005 127.999 32.061C124.441 28.9944 119.228 27.461 112.359 27.461H64.25L52.75 5.74902ZM128.551 138.229L75.3747 69.413H105.367L166.823 138.229H128.551Z" fill="currentColor"/>
                  <path d="M103.35 34.9194L73.9598 49.9307C66.3613 53.806 62.1104 62.1537 63.5785 70.5898L69.0868 103.736L54.0755 74.3462C50.2002 66.7477 41.8525 62.4968 33.4164 63.9649L0.269827 69.4732L29.66 54.4619C37.2585 50.5865 41.5094 42.2389 40.0413 33.8027L34.533 0.656222L49.5443 30.0464C53.4196 37.6449 61.7673 41.8958 70.2035 40.4277L103.35 34.9194Z" fill="currentColor"/>
                </svg>
              } 
              message="Loading..." 
            />
          </div>
        </div>
      </div>
    );
  }

  // Get user's first name or fallback to email
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  
  // Reusable logo dropdown content for dashboard mini menu
  const DashboardLogoDropdownContent = () => (
    <DropdownMenuContent align="start" className="w-[480px] grid grid-cols-2 gap-0 p-0 z-[2100] bg-zinc-900 border border-zinc-700/50 shadow-lg rounded-lg mt-2">
      {/* File Column */}
      <div className="bg-zinc-900 text-white p-2 border-r border-zinc-700/50">
          <div className="text-xs text-zinc-300 mb-2 px-2 font-medium">Explore</div>
        <div className="space-y-1">
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <LayoutDashboard className="h-3 w-3" />
              Dashboard
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Plus className="h-3 w-3" />
              New Project
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Settings className="h-3 w-3" />
              Settings
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://www.rantir.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer"
            >
              Support
            </a>
          </DropdownMenuItem>
        </div>
      </div>
      {/* Explore Rantir Column */}
      <div className="bg-zinc-900 text-white p-3">
        <div className="text-xs text-zinc-400 mb-2 px-2 font-medium">Explore Rantir</div>
        <div className="space-y-1">
          <DropdownMenuItem asChild>
            <a href="https://www.rantir.com/about" target="_blank" rel="noopener noreferrer" className="block px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer">
              About Rantir
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="https://www.rantir.com/cloud" target="_blank" rel="noopener noreferrer" className="block px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer">
              Rantir Cloud
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="https://www.rantir.com/pricing" target="_blank" rel="noopener noreferrer" className="block px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer">
              All Access Pass & Pricing
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/docs/database-api')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              API Documentation
            </button>
          </DropdownMenuItem>
          
          {/* Logout */}
          <div className="border-t border-zinc-700/50 mt-2 pt-2">
            <DropdownMenuItem asChild>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-zinc-300 rounded-md transition-all duration-150
                  bg-zinc-800/60 border border-zinc-600/40
                  shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
                  hover:bg-zinc-700/70 hover:text-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]
                  active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[0.5px]
                  cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
            </DropdownMenuItem>
          </div>
        </div>
      </div>
    </DropdownMenuContent>
  );

  return (
    <div className="ui-compact bg-rc-bg min-h-screen relative">
      {/* Floating controls when everything is hidden - matching Header minimal state */}
      {(!sidebarsVisible || !headerVisible) && (
        <div className="fixed top-2 left-2 z-[2100]">
          <div className="flex items-center gap-0 bg-zinc-800 border border-zinc-600 rounded-lg overflow-hidden">
            {/* Rantir Logo with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors border-r border-zinc-600">
                  <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <path d="M6.11853 1.40381L12.6928 1.40381C13.7352 1.40381 14.644 1.58422 15.4191 1.94505C16.1942 2.29251 16.7956 2.78698 17.2232 3.42845C17.6509 4.06992 17.8647 4.81831 17.8647 5.6736C17.8647 6.51553 17.6509 7.25723 17.2232 7.89871C16.7956 8.52681 16.1942 9.02128 15.4191 9.38211C14.644 9.72957 13.7352 9.9033 12.6928 9.9033H9.79162L7.99784 7.63811H12.6126C13.3477 7.63811 13.9089 7.47106 14.2965 7.13696C14.6974 6.78949 14.8979 6.30839 14.8979 5.69365C14.8979 5.06554 14.7041 4.59112 14.3165 4.27038C13.929 3.93628 13.361 3.76923 12.6126 3.76923H7.3714L6.11853 1.40381ZM14.3767 15.8369L8.58339 8.33972H11.8509L18.5462 15.8369H14.3767Z" fill="white" />
                    <path d="M10.393 4.15933L7.54689 5.61303C6.81105 5.98832 6.39939 6.7967 6.54156 7.61367L7.07498 10.8236L5.62128 7.97743C5.24599 7.24159 4.43761 6.82993 3.62064 6.9721L0.410719 7.50553L3.25688 6.05183C3.99272 5.67654 4.40438 4.86815 4.26221 4.05119L3.72878 0.841264L5.18248 3.68743C5.55777 4.42326 6.36616 4.83492 7.18312 4.69276L10.393 4.15933Z" fill="white" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DashboardLogoDropdownContent />
            </DropdownMenu>
            {/* Restore button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={showAll}
                    className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <PanelLeft className="h-3.5 w-3.5 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expand navigation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      <div className={cn(
        "flex w-full p-4 gap-4 transition-all duration-300",
        !headerVisible && "pt-8"
      )}>
        {/* Left Sidebar - Original Design */}
        <div className={cn(
          "w-56 flex-shrink-0 flex flex-col transition-all duration-300 h-[94vh] sticky top-12 overflow-y-auto",
          sidebarsVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full w-0 overflow-hidden p-0"
        )}>
          {/* Projects sections */}
          <div className="flex-1 space-y-0.5">
            {/* Show empty state if no projects, otherwise show project lists */}
            {databases.length === 0 && recentFlows.length === 0 && recentApps.length === 0 ? (
              <div className="space-y-3">
                <EmptyProjectsState />
                <Button 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => setIsNewProjectModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  New Project
                </Button>
              </div>
            ) : (
              <>
                {/* Databases */}
                {databases.length > 0 && (
                  <div className="mt-2 group">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 py-1.5 font-medium">
                      <span>Databases</span>
                      <Link 
                        to="/databases" 
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px] normal-case"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-0.5">
                      {databases.slice(0, 3).map((db) => (
                        <Link
                          key={db.id}
                          to={`/databases/${db.id}`}
                          className="flex items-center px-1 rounded text-[13px] text-muted-foreground hover:text-foreground transition-colors h-[32px]"
                        >
                          <Database className="h-4 w-4 shrink-0 mr-2 text-yellow-600" />
                          <span className="truncate">{db.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flows */}
                {recentFlows.length > 0 && (
                  <div className="mt-2 group">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 py-1.5 font-medium">
                      <span>Flows</span>
                      <Link 
                        to="/flows" 
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px] normal-case"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-0.5">
                      {recentFlows.slice(0, 3).map((flow) => (
                        <Link
                          key={flow.id}
                          to={`/flows/${flow.id}`}
                          className="flex items-center px-1 rounded text-[13px] text-muted-foreground hover:text-foreground transition-colors h-[32px]"
                        >
                          <Network className="h-4 w-4 shrink-0 mr-2 text-purple-600" />
                          <span className="truncate">{flow.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apps */}
                {recentApps.length > 0 && (
                  <div className="mt-2 group">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 py-1.5 font-medium">
                      <span>Apps</span>
                      <Link 
                        to="/apps" 
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px] normal-case"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-0.5">
                      {recentApps.slice(0, 3).map((app) => (
                        <Link
                          key={app.id}
                          to={`/apps/${app.id}`}
                          className="flex items-center px-1 rounded text-[13px] text-muted-foreground hover:text-foreground transition-colors h-[32px]"
                        >
                          <Grid3X3 className="h-4 w-4 shrink-0 mr-2 text-blue-600" />
                          <span className="truncate">{app.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

          {/* Plan Usage Stats */}
          <div className="mt-auto pt-4 space-y-3">
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current Plan Usage</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Storage</span>
                  <span className="text-[11px] text-foreground font-medium">{(databases.length * 0.1).toFixed(2)}/6GB</span>
                </div>
                <div className="w-full bg-border rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full" 
                    style={{ width: `${Math.min((databases.length * 0.1 / 6) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Logic Flows</span>
                  <span className="text-[11px] text-foreground font-medium">{recentFlows.length}/10</span>
                </div>
                <div className="w-full bg-border rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full" 
                    style={{ width: `${Math.min((recentFlows.length / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Applications</span>
                  <span className="text-[11px] text-foreground font-medium">{recentApps.length}/5</span>
                </div>
                <div className="w-full bg-border rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full" 
                    style={{ width: `${Math.min((recentApps.length / 5) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Databases</span>
                  <span className="text-[11px] text-foreground font-medium">{databases.length * 100}/1M records</span>
                </div>
                <div className="w-full bg-border rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full" 
                    style={{ width: `${Math.min((databases.length * 100 / 1000000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              
              <div className="pt-1 border-t border-border">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">resets in 2 weeks</span>
                  <Link to="/settings?tab=billing" className="text-primary hover:underline">Manage</Link>
                </div>
              </div>
            </div>
          </div>

          {/* User section */}
          <div className="pt-3 mt-3 border-t border-border space-y-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 px-1 py-2 rounded text-[13px] hover:bg-muted/50 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                      {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content - Center */}
        <div className="flex-1 flex justify-center min-w-0 transition-all duration-300">
          <div className="w-full max-w-[960px] space-y-4">
          {/* Header with dot grid background */}
          <div className="dot-grid-bg p-6 rounded-lg mb-4" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <div className="flex items-center gap-4 mb-4">
              {currentWorkspace?.icon_url ? (
                <img 
                  src={currentWorkspace.icon_url} 
                  alt={currentWorkspace.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 font-semibold">
                  {currentWorkspace?.name?.substring(0, 2).toUpperCase() || 'MW'}
                </div>
              )}
              <div>
                <h2 className="text-sm font-medium text-foreground">{currentWorkspace?.name || 'My Workspace'}</h2>
                <p className="text-xs text-muted-foreground">{currentWorkspace?.description || 'Personal workspace'}</p>
              </div>
            </div>
            <h1 className="text-4xl font-tiempos font-light text-foreground mb-2">Build Software not Websites</h1>
            <p className="text-muted-foreground">
              Explore your content and generate agents & coded interfaces for personalized AI.
            </p>
          </div>

          {/* Enhanced generate form */}
          <div className="dashboard-card p-4">
            <div className="space-y-4">
              {/* Project Category Cards */}
              <ProjectCategoryCards 
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
              
                <div className="relative border border-border bg-muted/30 rounded-lg overflow-hidden">
                {/* Attached files and detected integrations preview */}
                {(attachedFiles.length > 0 || detectedIntegrations.length > 0) && (
                  <div className="flex flex-wrap gap-2 p-2 border-b border-border">
                    {/* Attached files */}
                    {attachedFiles.map((file, index) => (
                      <div 
                        key={`file-${index}`}
                        className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
                      >
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <FileText className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {/* Detected integrations */}
                    {detectedIntegrations.map((integration) => (
                      <div 
                        key={`integration-${integration.id}`}
                        className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md text-xs border border-purple-200 dark:border-purple-700"
                      >
                        {integration.icon ? (
                          <img src={integration.icon} alt="" className="h-3 w-3 rounded-sm" />
                        ) : (
                          <Network className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        )}
                        <span className="text-purple-700 dark:text-purple-300">{integration.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Scrollable textarea container */}
                <div className="max-h-[200px] overflow-y-auto">
                  <Textarea 
                    placeholder="Describe what you want to build or search for..." 
                    className="min-h-[80px] text-sm px-3 py-2 pb-14 border-0 bg-transparent resize-none focus-visible:ring-0 rounded-none"
                    value={mainTextareaValue}
                    onChange={(e) => setMainTextareaValue(e.target.value)}
                  />
                </div>
                
                {/* Hidden file input */}
                <input
                  type="file"
                  id="dashboard-file-input"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
                  onChange={(e) => handleFileAttachment(e.target.files)}
                />
                
                {/* Buttons with blur overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-muted/80 via-muted/60 to-transparent backdrop-blur-sm">
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs rounded-full"
                      onClick={() => document.getElementById('dashboard-file-input')?.click()}
                    >
                      <Paperclip className="h-3 w-3 mr-1" />
                      Attach
                    </Button>
                    <DropdownMenu onOpenChange={(open) => !open && setIntegrationSearchQuery("")}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-full">
                          <Link2 className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background z-50 w-64" align="start">
                        {installedIntegrations.length > 0 ? (
                          <>
                            {/* Search input */}
                            <div className="p-2 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  placeholder="Search integrations..."
                                  value={integrationSearchQuery}
                                  onChange={(e) => setIntegrationSearchQuery(e.target.value)}
                                  className="h-7 pl-7 text-xs"
                                />
                              </div>
                            </div>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Installed Integrations
                            </div>
                            <div className="max-h-[240px] overflow-y-auto">
                              {installedIntegrations
                                .filter(integration => 
                                  integration.name.toLowerCase().includes(integrationSearchQuery.toLowerCase())
                                )
                                .map((integration) => (
                                <DropdownMenuItem 
                                  key={integration.id}
                                  onClick={() => {
                                    const currentText = mainTextareaValue.trim();
                                    const flowPrefix = currentText.toLowerCase().includes('flow') || currentText.toLowerCase().includes('logic') 
                                      ? '' 
                                      : 'Create a logic flow with ';
                                    setMainTextareaValue(prev => prev + (prev ? ' ' : flowPrefix) + integration.name);
                                    setIntegrationSearchQuery("");
                                  }}
                                >
                                  {integration.icon ? (
                                    <img src={integration.icon} alt="" className="h-4 w-4 mr-2 rounded-sm" />
                                  ) : (
                                    <Network className="h-4 w-4 mr-2" />
                                  )}
                                  {integration.name}
                                </DropdownMenuItem>
                              ))}
                              {installedIntegrations.filter(integration => 
                                integration.name.toLowerCase().includes(integrationSearchQuery.toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                  No matching integrations
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="px-3 py-4 text-center">
                            <Network className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground mb-2">No integrations installed</p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs"
                              onClick={() => navigate('/flows')}
                            >
                              Browse Integrations
                            </Button>
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border hover:border-primary/50 bg-gradient-to-b from-muted/50 to-transparent hover:from-primary/10 transition-all duration-300"
                      onClick={() => setIsSearchModalOpen(true)}
                    >
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span className="text-xs font-medium text-foreground">AI Search</span>
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                        selectedProjectTypes.includes('database')
                          ? 'bg-gradient-to-b from-orange-100 to-orange-50 dark:from-orange-400/20 dark:to-orange-400/10 border-orange-200 dark:border-orange-400/30'
                          : 'border-border hover:border-orange-200'
                      }`}
                      onClick={() => toggleProjectType('database')}
                    >
                      <Database className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                        selectedProjectTypes.includes('database') ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-xs font-medium overflow-hidden transition-all duration-300 ${
                        selectedProjectTypes.includes('database') 
                          ? 'max-w-[60px] opacity-100 text-orange-600 dark:text-orange-400' 
                          : 'max-w-0 opacity-0'
                      }`}>
                        Database
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                        selectedProjectTypes.includes('flow')
                          ? 'bg-gradient-to-b from-purple-100 to-purple-50 dark:from-purple-400/20 dark:to-purple-400/10 border-purple-200 dark:border-purple-400/30'
                          : 'border-border hover:border-purple-200'
                      }`}
                      onClick={() => toggleProjectType('flow')}
                    >
                      <Network className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                        selectedProjectTypes.includes('flow') ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-xs font-medium overflow-hidden transition-all duration-300 ${
                        selectedProjectTypes.includes('flow') 
                          ? 'max-w-[40px] opacity-100 text-purple-600 dark:text-purple-400' 
                          : 'max-w-0 opacity-0'
                      }`}>
                        Logic
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                        selectedProjectTypes.includes('app')
                          ? 'bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-400/20 dark:to-blue-400/10 border-blue-200 dark:border-blue-400/30'
                          : 'border-border hover:border-blue-200'
                      }`}
                      onClick={() => toggleProjectType('app')}
                    >
                      <Sparkles className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                        selectedProjectTypes.includes('app') ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-xs font-medium overflow-hidden transition-all duration-300 ${
                        selectedProjectTypes.includes('app') 
                          ? 'max-w-[40px] opacity-100 text-blue-600 dark:text-blue-400' 
                          : 'max-w-0 opacity-0'
                      }`}>
                        AI App
                      </span>
                    </button>
                    <Button 
                      className="btn-primary rounded-full h-7 px-3 text-xs" 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-1.5" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Generation Results */}
          <ProjectGenerationResults 
            results={generationResults}
            onClear={() => setGenerationResults([])}
          />

          {/* Recent Searches - only show when there are searches */}
          {recentSearches.length > 0 && (
          <div className="dashboard-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-light font-sans">Recent Searches</h2>
              <button 
                onClick={() => setIsSearchModalOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                Start New Search
              </button>
            </div>
            <div className="dashboard-table">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Query</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSearches.map((search) => (
                    <tr key={search.id}>
                      <td className="py-1.5 px-3 text-xs">{search.search_query}</td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground">
                        {new Date(search.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Recent Projects - All types */}
          <div className="dashboard-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-light font-sans">Recent Projects</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="New Project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setProjectsViewMode('list')}
                  className={cn(
                    "p-1 rounded transition-colors",
                    projectsViewMode === 'list' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setProjectsViewMode('grid')}
                  className={cn(
                    "p-1 rounded transition-colors",
                    projectsViewMode === 'grid' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            {(() => {
              // Combine all projects with type info and sort by updated_at
              const allProjects = [
                ...databases.map(db => ({ ...db, projectType: 'database', icon: Database, color: 'text-yellow-600', path: `/databases/${db.id}` })),
                ...recentFlows.map(flow => ({ ...flow, projectType: 'flow', icon: Network, color: 'text-purple-600', path: `/flows/${flow.id}` })),
                ...recentApps.map(app => ({ ...app, projectType: 'app', icon: Grid3X3, color: 'text-blue-600', path: `/apps/${app.id}` })),
              ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8);
              
              if (allProjects.length === 0) {
                return (
                  <div className="py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground mb-2">No projects yet</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/databases')}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Project
                      </Button>
                    </div>
                  </div>
                );
              }

              if (projectsViewMode === 'grid') {
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {allProjects.map((project) => {
                      const Icon = project.icon;
                      return (
                        <Link
                          key={`${project.projectType}-${project.id}`}
                          to={project.path}
                          className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors"
                        >
                          <Icon className={cn("h-5 w-5 mb-2", project.color)} />
                          <p className="text-xs font-medium truncate">{project.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{project.projectType}</p>
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div className="dashboard-table">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Name</th>
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProjects.map((project) => {
                        const Icon = project.icon;
                        return (
                          <tr key={`${project.projectType}-${project.id}`}>
                            <td className="py-1.5 px-3 text-[13px]">
                              <Link to={project.path} className="flex items-center gap-2 hover:text-primary">
                                <Icon className={cn("h-4 w-4", project.color)} />
                                <span className="truncate">{project.name}</span>
                              </Link>
                            </td>
                            <td className="py-1.5 px-3 text-[13px] text-muted-foreground capitalize">
                              {project.projectType}
                            </td>
                            <td className="py-1.5 px-3 text-[13px] text-muted-foreground">
                              {new Date(project.updated_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Activity Panel & Changelog */}
        <div className={cn(
          "w-64 flex-shrink-0 space-y-4 transition-all duration-300 h-[94vh] sticky top-12 overflow-y-auto",
          sidebarsVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full w-0 overflow-hidden p-0"
        )}>
          {/* Category Prompt Suggestions - show when category is selected */}
          {selectedCategory && (
            <div className="dashboard-card p-4">
              <CategoryPromptSuggestions 
                category={selectedCategory}
                onSelectPrompt={setMainTextareaValue}
              />
            </div>
          )}

          {/* Activity Panel - show when no category selected */}
          {!selectedCategory && (
            <div className="dashboard-card p-4">
              <ActivityPanel />
            </div>
          )}

          {/* Changelog */}
          <div className="dashboard-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-light font-sans">Changelog</h2>
              <a 
                href="https://rantir.com/blog" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View all
              </a>
            </div>
            <div className="space-y-3">
              <div>
                <a 
                  href="https://rantir.com/blog" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <img 
                    src="/lovable-uploads/9bbe6d3f-5405-4ba5-a66e-13377b09ca3e.png" 
                    alt="Explore RantirLogic's 2.2.1 update - Blog Post"
                    className="w-full rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                  />
                </a>
                <div className="mt-2">
                  <h3 className="text-xs font-medium text-foreground mb-1">Explore RantirLogic's 2.2.1 update</h3>
                  <a 
                    href="https://rantir.com/blog" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View Changelog
                  </a>
                </div>
              </div>
              <div>
                <a 
                  href="https://rantir.com/blog" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <img 
                    src="/lovable-uploads/48707529-2389-4353-afa3-7e9840615ebd.png" 
                    alt="AI Agent Integration - Blog Post"
                    className="w-full rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                  />
                </a>
                <div className="mt-2">
                  <h3 className="text-xs font-medium text-foreground mb-1">RantirData adds pages in 2.2.1</h3>
                  <a 
                    href="https://rantir.com/blog" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View Changelog
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isNewDatabaseOpen} onOpenChange={setIsNewDatabaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Database</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 px-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newDatabaseName} onChange={e => setNewDatabaseName(e.target.value)} placeholder="Database name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDatabaseOpen(false)}>Cancel</Button>
            <Button className="btn-primary" onClick={handleCreateDatabase} disabled={!newDatabaseName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} activateAISearch={true} />
      
      <NewProjectModal
        open={isNewProjectModalOpen}
        onOpenChange={setIsNewProjectModalOpen}
        onCreateProject={handleCreateNewProject}
        onOpenPlugins={() => setShowCommunityPlugins(true)}
      />

      <CommunityPluginsModal
        open={showCommunityPlugins}
        onOpenChange={setShowCommunityPlugins}
      />

      {/* Changelog Popup - hidden when generating */}
      <ChangelogPopup hide={isGenerating} />
    </div>
  );
}