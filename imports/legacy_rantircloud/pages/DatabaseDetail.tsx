import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTab } from "@/contexts/TabContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ArrowUp, ArrowDown, Trash2, Eye, ArrowLeft, Pencil, Plug, Workflow, HardDrive, Grid3X3, LayoutGrid, Table2, Smartphone, Menu, Activity, Users, Settings, ChevronDown, FileText } from "lucide-react";
import { DriveTabContent } from "@/components/drive/DriveTabContent";
import { driveService } from "@/services/driveService";
import { documentService } from "@/services/documentService";
import { ExploreSidebar } from "@/components/ExploreSidebar";
import { ActivityPanel } from "@/components/ActivityPanel";
import { databaseService, DatabaseProject } from "@/services/databaseService";
import { workspaceService } from "@/services/workspaceService";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { flowService } from "@/services/flowService";
import { toast } from "@/components/ui/sonner";
import { TableSchemaEditor } from "@/components/TableSchemaEditor";
import { DatabaseIntegrationsDialog } from "@/components/DatabaseIntegrationsDialog";
import { DatabaseIcon as DatabaseIconComponent } from "@/components/DatabaseIcon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ColorPicker } from "@/components/ColorPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionService, SubscriptionPlan, UserSubscription } from "@/services/subscriptionService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedTableList } from "@/components/OptimizedDatabaseDetail";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { Database as DatabaseIcon } from "lucide-react";
import { DocsTabContent } from "@/components/docs/DocsTabContent";
import { CreateDocumentModal, DocumentSize } from "@/components/docs/CreateDocumentModal";
type SortDirection = "asc" | "desc";
type ViewType = "list" | "grid";
export default function DatabaseDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const { openTab } = useTab();
  const [database, setDatabase] = useState<DatabaseProject | null>(null);
  const [tables, setTables] = useState<TableProject[]>([]);
  const [connectedFlows, setConnectedFlows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewType, setViewType] = useState<ViewType>("list");
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState(false);
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDatabase, setIsEditingDatabase] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("#3B82F6");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [documentsCount, setDocumentsCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [driveFilesCount, setDriveFilesCount] = useState(0);
  const driveTabRef = useRef<{ openUploadModal: () => void }>(null);
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);

  // Subscription state
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState({
    totalMembers: 0,
    signupsLast30Days: 0,
    oneTimePlans: 0,
    activeTrialing: 0,
    paidMembers: 0,
    freeMembers: 0
  });
  
  const isFetchingFlows = useRef(false);

  const fetchConnectedFlows = useCallback(async (databaseId: string) => {
    if (!user || isFetchingFlows.current) return;
    
    isFetchingFlows.current = true;
    
    try {
      // Optimized single query to get flows with data-table nodes for this database
      const { data: flowDataEntries, error: flowDataError } = await supabase
        .from("flow_data")
        .select(`
          id,
          flow_project_id,
          nodes,
          flow_projects!inner(id, name, description, user_id)
        `)
        .eq('flow_projects.user_id', user.id)
        .order('version', { ascending: false });

      if (flowDataError) throw flowDataError;

      const connectedFlowProjects = [];
      const processedProjects = new Set();

      // Process flows efficiently - only check latest version of each project
      for (const entry of flowDataEntries || []) {
        if (processedProjects.has(entry.flow_project_id)) continue;
        processedProjects.add(entry.flow_project_id);

        try {
          const nodes = Array.isArray(entry.nodes) ? entry.nodes : JSON.parse(entry.nodes as string);
          
          // Check if any nodes are data-table nodes with this database selected
          const hasConnectedDataNode = nodes?.some((node: any) => {
            return node.data?.type === 'data-table' && node.data?.inputs?.database_id === databaseId;
          });
          
          if (hasConnectedDataNode) {
            connectedFlowProjects.push(entry.flow_projects);
          }
        } catch (error) {
          // Skip flows that can't be parsed
          console.warn(`Could not parse flow data for project ${entry.flow_project_id}:`, error);
        }
      }
      
      setConnectedFlows(connectedFlowProjects);
    } catch (error) {
      console.error("Failed to fetch connected flows:", error);
      setConnectedFlows([]); // Set empty array on error
    } finally {
      isFetchingFlows.current = false;
    }
  }, [user]);

  const calculateSubscriptionMetrics = useCallback(async (tablesData: TableProject[]) => {
    // Move heavy calculations to background to avoid blocking UI
    setTimeout(async () => {
      try {
        // Limit processing to avoid performance issues
        const maxRecordsToProcess = 1000;
        let totalProcessed = 0;
        
        const allUserRegistrations = [];
        
        for (const table of tablesData) {
          if (totalProcessed >= maxRecordsToProcess) break;
          
          const tableRecords = (table.records || [])
            .filter(record => record.type === 'user-registration' || record.signupSource === 'form')
            .slice(0, maxRecordsToProcess - totalProcessed);
            
          allUserRegistrations.push(...tableRecords);
          totalProcessed += tableRecords.length;
        }

        // Calculate metrics efficiently
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const metrics = allUserRegistrations.reduce((acc, user) => {
          const createdDate = new Date(user.createdAt || user.created_at);
          
          if (createdDate >= last30Days) {
            acc.signupsLast30Days++;
          }
          
          if (user.selectedPlan && user.selectedPlan.price > 0) {
            acc.paidMembers++;
          } else {
            acc.freeMembers++;
          }
          
          return acc;
        }, {
          totalMembers: allUserRegistrations.length,
          signupsLast30Days: 0,
          oneTimePlans: 0,
          activeTrialing: 0,
          paidMembers: 0,
          freeMembers: 0
        });

        setSubscriptionMetrics(metrics);

        // Set user subscriptions (limit to prevent UI issues)
        const limitedUserSubs = allUserRegistrations.slice(0, 100).map(user => ({
          id: user.id,
          user_id: user.email || user.id,
          plan_id: user.selectedPlan?.id || null,
          plan: user.selectedPlan,
          status: 'active' as any,
          started_at: user.createdAt || user.created_at,
          expires_at: null,
          created_at: user.createdAt || user.created_at,
          updated_at: user.updated_at
        }));
        
        setUserSubscriptions(limitedUserSubs);
      } catch (error) {
        console.error("Failed to calculate subscription metrics:", error);
      }
    }, 100); // Small delay to let UI render first
  }, []);

  const fetchDatabase = useCallback(async () => {
    if (!id || !user) return;
    try {
      setIsLoading(true);
      
      // First check if project belongs to current workspace
      const currentWorkspace = await workspaceService.getCurrentWorkspace();
      const dbData = await databaseService.getDatabase(id);
      
      // Check if database belongs to current workspace
      // Fail-safe: if database has workspace_id but we can't determine current workspace, deny access
      if (dbData?.workspace_id) {
        if (!currentWorkspace?.id) {
          console.warn('Cannot validate workspace access - current workspace not determined');
          toast.error("Access denied", {
            description: "Unable to verify workspace access"
          });
          navigate('/');
          return;
        }
        if (dbData.workspace_id !== currentWorkspace.id) {
          console.warn('Database does not belong to current workspace, redirecting to dashboard');
          toast.error("Access denied", {
            description: "This database belongs to a different workspace"
          });
          navigate('/');
          return;
        }
      }
      
      // Fetch tables after workspace validation
      const tablesData = await tableService.getUserTableProjects(user.id, id);
      
      setDatabase(dbData);
      setEditName(dbData.name);
      setEditDescription(dbData.description || "");
      setEditColor(dbData.color || "#3B82F6");

      // Open tab for this database
      openTab({
        id: `database-${dbData.id}`,
        type: 'database',
        name: dbData.name,
        url: `/databases/${dbData.id}`,
        projectId: dbData.id,
        workspaceId: dbData.workspace_id || undefined
      });
      
      const parsedTables = tablesData.map((table: any) => {
        const defaultSchema = {
          id: table.id,
          name: table.name,
          fields: []
        };
        const schema = safeParseJson(table.schema, defaultSchema);
        const records = safeParseJson(table.records, []);
        return {
          ...table,
          schema,
          records
        };
      });
      setTables(parsedTables);

      // Fetch connected flows, calculate metrics, and fetch counts in background
      Promise.allSettled([
        fetchConnectedFlows(id),
        calculateSubscriptionMetrics(parsedTables),
        fetchCounts(id)
      ]).catch(error => console.error("Background operations failed:", error));
    } catch (error: any) {
      toast.error(error.message || "Failed to load database");
    } finally {
      setIsLoading(false);
    }
  }, [id, user, fetchConnectedFlows, calculateSubscriptionMetrics]);

  useEffect(() => {
    if (user && id) {
      console.log('DatabaseDetail - Navigation detected, clearing state and fetching for id:', id);
      // Clear state before fetching new data
      setDatabase(null);
      setTables([]);
      setConnectedFlows([]);
      setIsLoading(true);
      fetchDatabase();
    }
  }, [user, id, fetchDatabase]);
  
  const fetchCounts = useCallback(async (databaseId: string) => {
    try {
      const [docs, driveCount] = await Promise.all([
        documentService.getDatabaseDocuments(databaseId),
        driveService.getFileCount(databaseId)
      ]);
      
      setDocumentsCount(docs.length);
      setDriveFilesCount(driveCount);
      
      // Count users from tables
      const userCount = tables.reduce((acc, t) => 
        acc + (t.records?.filter((r: any) => r.type === 'user-registration' || r.signupSource === 'form')?.length || 0), 0
      );
      setUsersCount(userCount);
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  }, [tables]);
  
  // Memoized filtered and sorted data for better performance
  const tableData = useMemo(() => {
    return tables
      .filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const aValue = a[sortBy] as string;
        const bValue = b[sortBy] as string;
        if (sortDirection === "asc") {
          return aValue < bValue ? -1 : 1;
        } else {
          return aValue > bValue ? -1 : 1;
        }
      });
  }, [tables, search, sortBy, sortDirection]);
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };
  const SortIcon = ({
    column
  }: {
    column: string;
  }) => {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };
  const handleCreateTable = async (schema: {
    name: string;
    fields: any[];
  }) => {
    if (!user || !id) return;
    try {
      const newProject = await tableService.createTableProject({
        name: schema.name,
        description: `Table in ${database?.name || "database"}`,
        user_id: user.id,
        schema: {
          id: crypto.randomUUID(),
          name: schema.name,
          fields: schema.fields
        },
        records: [],
        database_id: id
      });
      setTables([...tables, newProject]);
      toast.success("Table project created");
      setIsSchemaEditorOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create table project");
    }
  };
  const handleDeleteTable = async () => {
    if (!deletingId) return;
    try {
      await tableService.deleteTableProject(deletingId);
      setTables(tables.filter(item => item.id !== deletingId));
      toast.success("Table project deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete table project");
    } finally {
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  };
  const confirmDeleteTable = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };
  
  const handleCreateDocumentConfirm = async (name: string, size: DocumentSize) => {
    if (!id) return;
    try {
      const newDoc = await documentService.createDocument({
        database_id: id,
        title: name,
        width_mode: size === 'slides-16-9' || size === 'slides-4-3' || size.startsWith('slides-') ? 'full' : 'narrow',
        page_size: size,
      });
      setActiveTab("docs");
      toast.success('Document created');
      // Refresh docs count and trigger DocsTabContent refresh
      await fetchCounts(id);
      // Force re-render by updating a timestamp
      setDocumentsCount(prev => prev + 1);
    } catch (error: any) {
      toast.error('Failed to create document: ' + error.message);
    }
  };

  const handleUpdateDatabase = async () => {
    if (!id || !editName.trim()) return;
    try {
      const updatedDatabase = await databaseService.updateDatabase(id, {
        name: editName,
        description: editDescription || undefined,
        color: editColor
      });
      setDatabase(updatedDatabase);
      setIsEditingDatabase(false);
      toast.success("Database updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update database");
    }
  };

  // New function to handle opening the integrations dialog
  const handleOpenIntegrationsDialog = () => {
    setIsIntegrationsDialogOpen(true);
  };
  const databaseColor = database?.color || '#3B82F6';
  if (loading || isLoading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <WhirlpoolLoader size="lg" icon={<DatabaseIcon className="h-7 w-7" />} message="Loading database..." />
      </div>
    );
  }
  if (!database) {
    return <div className="p-8 text-center">
        <p className="mb-4">Database not found</p>
        <Button onClick={() => navigate("/databases")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Databases
        </Button>
      </div>;
  }
  const renderTablesList = () => (
    <div className="space-y-4">
      <OptimizedTableList 
        tables={tableData} 
        viewType={viewType}
        databaseColor={databaseColor}
        isLoading={isLoading}
        onDeleteTable={confirmDeleteTable}
      />
    </div>
  );
  return <div className="flex h-full bg-background">
      {/* Explore Sidebar */}
      <ExploreSidebar collapsed={sidebarCollapsed} className="flex-shrink-0" currentDatabaseId={id} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          {/* Tab System Container with styling */}
          <div className="h-full bg-background border rounded-lg overflow-hidden flex flex-col">
            
            {/* Database Header */}
            <div className="bg-muted/30 dark:bg-muted/20 border-b px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: databaseColor }}
                  >
                    <DatabaseIconComponent color="#ffffff" className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-xl font-light text-foreground">{database.name}</h1>
                    {database.description && (
                      <p className="text-sm text-muted-foreground max-w-2xl">
                        {database.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Table2 className="h-3 w-3" />
                    {tables.length} {tables.length === 1 ? 'Table' : 'Tables'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    {documentsCount} Docs
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    {usersCount} Users
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <HardDrive className="h-3 w-3" />
                    {driveFilesCount} Files
                  </Badge>
                  <div className="h-6 w-px bg-border mx-1" />
                  <Button variant="outline" size="sm" onClick={() => setIsEditingDatabase(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenIntegrationsDialog}>
                    <Plug className="h-4 w-4 mr-2" />
                    Integrations
                  </Button>
                </div>
              </div>
            </div>

            {/* Custom Tab Navigation */}
            <div className="bg-background border-b">
              <div className="flex h-12">
                {/* Tab Navigation */}
                <div className="flex flex-1">
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`group flex items-center h-full text-sm font-medium transition-all border-r border-border ${
                      activeTab === "activity" 
                        ? "bg-muted/50 text-foreground px-6" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 px-6"
                    }`}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Activity
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    onMouseEnter={(e) => e.currentTarget.dataset.hover = "true"}
                    onMouseLeave={(e) => delete e.currentTarget.dataset.hover}
                    className={`group flex items-center h-full text-sm font-medium transition-all border-r border-border ${
                      activeTab === "tables" 
                        ? "bg-muted/50 text-foreground px-6" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 px-4 hover:px-6"
                    }`}
                  >
                    <Table2 className="h-4 w-4 mr-2" />
                    Tables
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSchemaEditorOpen(true);
                      }}
                      className={`ml-2 opacity-0 group-hover:opacity-100 group-data-[hover=true]:opacity-100 transition-opacity ${
                        activeTab === "tables" ? "opacity-100" : ""
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </button>
                  <button
                    onClick={() => setActiveTab("users")}
                    onMouseEnter={(e) => e.currentTarget.dataset.hover = "true"}
                    onMouseLeave={(e) => delete e.currentTarget.dataset.hover}
                    className={`group flex items-center h-full text-sm font-medium transition-all border-r border-border ${
                      activeTab === "users" 
                        ? "bg-muted/50 text-foreground px-6" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 px-4 hover:px-6"
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("User registration coming soon");
                      }}
                      className={`ml-2 opacity-0 group-hover:opacity-100 group-data-[hover=true]:opacity-100 transition-opacity ${
                        activeTab === "users" ? "opacity-100" : ""
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </button>
                  <button
                    onClick={() => setActiveTab("drive")}
                    onMouseEnter={(e) => e.currentTarget.dataset.hover = "true"}
                    onMouseLeave={(e) => delete e.currentTarget.dataset.hover}
                    className={`group flex items-center h-full text-sm font-medium transition-all border-r border-border ${
                      activeTab === "drive" 
                        ? "bg-muted/50 text-foreground px-6" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 px-4 hover:px-6"
                    }`}
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Drive
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        driveTabRef.current?.openUploadModal();
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 group-data-[hover=true]:opacity-100 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </button>
                  <button
                    onClick={() => setActiveTab("docs")}
                    onMouseEnter={(e) => e.currentTarget.dataset.hover = "true"}
                    onMouseLeave={(e) => delete e.currentTarget.dataset.hover}
                    className={`group flex items-center h-full text-sm font-medium transition-all border-r border-border ${
                      activeTab === "docs" 
                        ? "bg-muted/50 text-foreground px-6" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 px-4 hover:px-6"
                    }`}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Docs
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreateDocModalOpen(true);
                      }}
                      className={`ml-2 opacity-0 group-hover:opacity-100 group-data-[hover=true]:opacity-100 transition-opacity ${
                        activeTab === "docs" ? "opacity-100" : ""
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto bg-background">
              {activeTab === "activity" && (
                <div className="p-6 space-y-6 h-full overflow-auto">
                  {/* Subscription Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-muted-foreground">Total Members</CardDescription>
                        <CardTitle className="text-2xl text-foreground">{subscriptionMetrics.totalMembers}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">0% vs last month</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-muted-foreground">Signups (last 30 days)</CardDescription>
                        <CardTitle className="text-2xl text-foreground">{subscriptionMetrics.signupsLast30Days}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">0% vs previous 30 days</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-muted-foreground">Active Trialing</CardDescription>
                        <CardTitle className="text-2xl text-foreground">{subscriptionMetrics.activeTrialing}</CardTitle>
                      </CardHeader>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-muted-foreground">Paid Members</CardDescription>
                        <CardTitle className="text-2xl text-green-600 dark:text-green-400">${subscriptionMetrics.paidMembers}</CardTitle>
                      </CardHeader>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-muted-foreground">Free Members</CardDescription>
                        <CardTitle className="text-2xl text-foreground">{subscriptionMetrics.freeMembers}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Activity Panel */}
                  <div className="bg-card border-border border rounded-lg p-4">
                    <ActivityPanel />
                  </div>
                </div>
              )}

              {activeTab === "tables" && (
                <div className="p-6 space-y-4 h-full overflow-auto">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Tables</h2>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1 max-w-sm">
                        <Input placeholder="Search tables..." className="pl-3 text-base" value={search} onChange={e => setSearch(e.target.value)} />
                      </div>
                      <Tabs value={viewType} onValueChange={(val) => setViewType(val as ViewType)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="list" className="flex items-center gap-1 text-sm px-3 py-1">
                            <Table2 className="h-3 w-3" /> Table
                          </TabsTrigger>
                          <TabsTrigger value="grid" className="flex items-center gap-1 text-sm px-3 py-1">
                            <LayoutGrid className="h-3 w-3" /> Grid
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  {renderTablesList()}
                </div>
              )}

              {activeTab === "users" && (
                <div className="p-6 h-full overflow-auto">
                  <h2 className="text-lg font-semibold">Users</h2>
                  <p className="text-muted-foreground">User management coming soon...</p>
                </div>
              )}

              {activeTab === "drive" && id && (
                <div className="h-full overflow-auto">
                  <DriveTabContent ref={driveTabRef} databaseId={id} />
                </div>
              )}

              {activeTab === "docs" && id && (
                <DocsTabContent
                  key={documentsCount}
                  databaseId={id}
                  databaseColor={databaseColor}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Schema Editor Dialog */}
      {isSchemaEditorOpen && <TableSchemaEditor isOpen={isSchemaEditorOpen} onClose={() => setIsSchemaEditorOpen(false)} onSave={handleCreateTable} />}

      {/* Integrations Dialog */}
      {isIntegrationsDialogOpen && id && <DatabaseIntegrationsDialog isOpen={isIntegrationsDialogOpen} onClose={() => setIsIntegrationsDialogOpen(false)} databaseId={id} />}

      {/* Edit Database Dialog */}
      <Dialog open={isEditingDatabase} onOpenChange={setIsEditingDatabase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Database</DialogTitle>
            <DialogDescription>
              Update database information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 px-[16px]">
            <div className="grid gap-2">
              <label htmlFor="name">Name</label>
              <Input id="name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description">Description</label>
              <Input id="description" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <ColorPicker value={editColor} onChange={setEditColor} label="Database Color" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingDatabase(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDatabase} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this table project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTable}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Document Modal */}
      <CreateDocumentModal
        open={isCreateDocModalOpen}
        onOpenChange={setIsCreateDocModalOpen}
        onConfirm={handleCreateDocumentConfirm}
      />
    </div>;
}