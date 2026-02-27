import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowUp, ArrowDown, Trash2, Eye, ArrowLeft, Pencil, Globe, Database, Workflow, HardDrive, Grid3X3, LayoutGrid, Smartphone, Menu, Activity, Users, Settings, Settings2, ChevronDown, Save, ExternalLink, MessageSquare } from "lucide-react";
import { ExploreSidebar } from "@/components/ExploreSidebar";
import { TableViews } from "@/components/TableViews";
import { RevoGridSpreadsheet } from "@/components/sheets/RevoGridSpreadsheet";
import { KanbanView } from "@/components/KanbanView";
import { FormBuilder } from "@/components/FormBuilder";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { ViewSettings } from "@/types/viewTypes";
import { debounce } from "lodash";
import { databaseService, DatabaseProject } from "@/services/databaseService";
import { useTableProjectAutosave } from "@/hooks/useTableProjectAutosave";
import { toast } from "@/components/ui/sonner";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableSchemaEditor } from "@/components/TableSchemaEditor";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GatedContentDialog } from "@/components/subscription/GatedContentDialog";
import { WebhooksDevDialog } from "@/components/subscription/WebhooksDevDialog";
import { EventLogsDialog } from "@/components/subscription/EventLogsDialog";
import { PreviewShareDialog } from "@/components/PreviewShareDialog";
import { AddRecordModal } from "@/components/AddRecordModal";
import { DataChatPanel } from "@/components/DataChatPanel";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader.tsx";
import "@/components/WhirlpoolLoader.css";
import { Table2 as TableIcon } from "lucide-react";
import { generateRecordId } from "@/utils/generateRecordId";

export default function TableDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [project, setProject] = useState<TableProject | null>(null);
  const [database, setDatabase] = useState<DatabaseProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'gallery') return 'cards';
    if (viewParam === 'kanban') return 'kanban';  
    if (viewParam === 'form') return 'form';
    if (viewParam === 'chat') return 'chat';
    return 'spreadsheet';
  });
  const [isGatedContentOpen, setIsGatedContentOpen] = useState(false);
  const [isWebhooksOpen, setIsWebhooksOpen] = useState(false);
  const [isEventLogsOpen, setIsEventLogsOpen] = useState(false);
  const [isPreviewShareOpen, setIsPreviewShareOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  // Get current view from URL or default to 'spreadsheet'
  const currentView = searchParams.get('view') || 'spreadsheet';
  
  // Update activeTab when URL search params change
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'gallery') setActiveTab('cards');
    else if (viewParam === 'kanban') setActiveTab('kanban');
    else if (viewParam === 'form') setActiveTab('form');
    else if (viewParam === 'chat') setActiveTab('chat');
    else setActiveTab('spreadsheet');
  }, [location.search]); // Only depend on location.search to trigger on URL param changes

  
  // Reset state when ID changes - force complete refresh
  useEffect(() => {
    console.log('TableDetail - Navigation detected. ID:', id);
    console.log('TableDetail - Clearing all state and forcing reload');
    setProject(null);
    setDatabase(null);
    setIsLoading(true);
    setHasUnsavedChanges(false);
    setIsAddRecordModalOpen(false);
  }, [id]); // Only reset on ID change, not view change

  // Define fetchData function
  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    
    try {
      setIsLoading(true);
      console.log('TableDetail fetchData - starting fetch for id:', id);
      
      // Fetch table project
      const tableData = await tableService.getTableProject(id);
      console.log('TableDetail fetchData - raw tableData:', tableData);
      
      if (!tableData) {
        toast.error("Table project not found");
        navigate("/tables");
        return;
      }

      // Parse the schema and records safely
      const defaultSchema = {
        id: tableData.id,
        name: tableData.name,
        fields: []
      };
      
      const schema = safeParseJson(tableData.schema, defaultSchema);
      const rawRecords = safeParseJson(tableData.records, []);
      
      // Ensure all records have unique IDs to avoid cross-row updates
      const seenIds = new Set<string>();
      let recordsChanged = false;
      const records = rawRecords.map((record: any) => {
        let id = record.id as string | undefined;
        if (!id || seenIds.has(id)) {
          // Generate a new 5-digit sequential ID for missing or duplicate IDs
          id = generateRecordId(rawRecords);
          recordsChanged = true;
          console.warn('TableDetail fetchData - fixing missing/duplicate record id:', record.id, '->', id);
        }
        seenIds.add(id);
        return { ...record, id };
      });
      
      // If we fixed any IDs, persist the corrected records back to the project
      if (recordsChanged) {
        try {
          console.log('TableDetail fetchData - persisting fixed record IDs');
          await tableService.updateTableProject(id, { schema, records });
        } catch (e) {
          console.warn('TableDetail fetchData - failed to persist fixed record IDs:', e);
        }
      }
      
      console.log('TableDetail fetchData - parsed schema:', schema);
      console.log('TableDetail fetchData - parsed records:', records);
      
      const parsedProject = {
        ...tableData,
        schema,
        records
      };
      
      console.log('TableDetail fetchData - final parsedProject:', parsedProject);
      setProject(parsedProject);

      // Fetch database if table belongs to one
      if (tableData.database_id) {
        try {
          const databaseData = await databaseService.getDatabase(tableData.database_id);
          setDatabase(databaseData);
        } catch (error) {
          console.warn("Could not fetch database:", error);
        }
      }
    } catch (error: any) {
      console.error('TableDetail fetchData - error:', error);
      toast.error(error.message || "Failed to load table project");
      navigate("/tables");
    } finally {
      setIsLoading(false);
    }
  }, [id, user, navigate]);

  // Fetch data when user or ID changes
  useEffect(() => {
    console.log('TableDetail useEffect triggered - fetching data for id:', id, 'view:', searchParams.get('view'));
    fetchData();
  }, [id, fetchData]); // Removed searchParams to prevent refetch on view change

  // Listen for table project updates from UnifiedAISidebar
  useEffect(() => {
    const handleTableUpdate = async (event: CustomEvent<{ tableId: string }>) => {
      if (event.detail.tableId === id) {
        console.log('[TableDetail] Received table-project-updated event, clearing cache and refreshing...');
        // Clear cache before fetching to ensure fresh data
        const { clearTableCache } = await import('@/services/tableService');
        clearTableCache(id);
        fetchData();
      }
    };

    window.addEventListener('table-project-updated', handleTableUpdate as EventListener);
    return () => {
      window.removeEventListener('table-project-updated', handleTableUpdate as EventListener);
    };
  }, [id, fetchData]);

  const updateView = (view: string) => {
    // Preserve all existing params while updating view
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', view);
    setSearchParams(newParams, { replace: true });
  };

  const updateProject = (updates: Partial<TableProject>) => {
    if (!project) return;
    
    const updatedProject = { ...project, ...updates };
    setProject(updatedProject);
    setHasUnsavedChanges(true);
  };

  // Debounced view settings save
  const debouncedSaveViewSettings = debounce(async (tableProjectId: string, viewType: string, settings: ViewSettings) => {
    try {
      await tableService.updateViewSettings(tableProjectId, viewType, settings);
      toast.success("View settings saved");
    } catch (error: any) {
      toast.error("Failed to save view settings: " + error.message);
    }
  }, 1000);

  const handleViewSettingsChange = (viewType: string, settings: ViewSettings) => {
    if (!project) return;
    
    // Update local state immediately
    const updatedViewSettings = {
      ...project.view_settings,
      [viewType]: settings
    };
    
    const updatedProject = {
      ...project,
      view_settings: updatedViewSettings
    };
    
    setProject(updatedProject);
    
    // Save to database with debounce
    debouncedSaveViewSettings(project.id, viewType, settings);
  };

  const handleAddRecord = async (record: any) => {
    if (!project) return;
    
    try {
      console.log('TableDetail handleAddRecord - adding record:', record);
      console.log('TableDetail handleAddRecord - existing records count:', project.records.length);
      
      const newRecord = await tableService.addRecord(project.id, record, project.records);
      console.log('TableDetail handleAddRecord - new record created:', newRecord);
      
      // Update local state instead of refetching to avoid reload
      setProject({
        ...project,
        records: [...project.records, newRecord]
      });
      toast.success("Record added successfully");
    } catch (error: any) {
      console.error('TableDetail handleAddRecord - error:', error);
      toast.error(error.message || "Failed to add record");
    }
  };

  const handleSaveChanges = async () => {
    if (!project || !hasUnsavedChanges) return;
    
    try {
      await tableService.updateTableProject(project.id, {
        schema: project.schema,
        records: project.records
      });
      setHasUnsavedChanges(false);
      toast.success("Changes saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    }
  };

  const handleExport = () => {
    if (!project) return;
    
    // Convert records to CSV format
    const fields = project.schema.fields;
    const headers = fields.map(f => f.name);
    const csvData = [
      headers.join(','),
      ...project.records.map(record => 
        fields.map(field => {
          const value = record[field.name] || record[field.id] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Table exported successfully");
  };

  const handleLinkTable = () => {
    if (!project || !database) return;
    
    // Copy shareable link to clipboard
    const shareUrl = `${window.location.origin}/tables/${project.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Table link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <WhirlpoolLoader size="lg" icon={<TableIcon className="h-7 w-7" />} message="Loading table..." />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8">Table project not found</div>;
  }

  const databaseColor = database?.color || '#3B82F6';

  const viewOptions = [
    { value: 'spreadsheet', label: 'Spreadsheet' },
    { value: 'table', label: 'Cards' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'form', label: 'Form' }
  ];

  const getViewName = () => {
    switch (currentView) {
      case "spreadsheet": return "Spreadsheet";
      case "table": return "Grid";
      case "gallery": return "Cards";
      case "kanban": return "Kanban";
      case "form": return "Form Builder";
      default: return currentView;
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      
      {/* Explore Sidebar - filtered to show only tables from this database */}
      <ExploreSidebar 
        collapsed={sidebarCollapsed}
        className="flex-shrink-0"
        currentDatabaseId={database?.id}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Header with faded background */}
        <div className="border-b" style={{
          backgroundColor: `${databaseColor}1A`
        }}>
          <div className="px-6 py-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="h-8 w-8 p-0 focus:outline-none focus:ring-0">
                  <Menu className="h-4 w-4" />
                </Button>
                
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate("/databases")} className="cursor-pointer hover:text-foreground">
                        Databases
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    {database && (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink onClick={() => navigate(`/databases/${database.id}`)} className="cursor-pointer hover:text-foreground">
                            {database.name}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                      </>
                    )}
                    <BreadcrumbItem>
                      <span className="font-bold text-foreground">{project.name}</span>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              
              {/* Action Buttons moved to breadcrumb area */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsGatedContentOpen(true)}
                  className="bg-background hover:bg-muted border-border"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Gated Content
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsWebhooksOpen(true)}
                  className="bg-background hover:bg-muted border-border"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Webhooks & Dev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEventLogsOpen(true)}
                  className="bg-background hover:bg-muted border-border"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Event Logs
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  className="bg-background hover:bg-muted border-border"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLinkTable}
                  className="bg-background hover:bg-muted border-border"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Link Table
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsSchemaEditorOpen(true)}
                  className="bg-background hover:bg-muted border-border"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Schema
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                  className={`bg-background hover:bg-muted border-border ${hasUnsavedChanges ? "text-primary" : ""}`}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden pt-2">
          {/* Tab System Container with styling - same as database page */}
          <div className="h-full bg-background dark:bg-card border overflow-hidden flex flex-col mx-2 mb-2 rounded-lg">
            {/* Custom Tab Navigation */}
            <div className="bg-background dark:bg-card border-b rounded-t-lg">
              <div className="flex h-12">
                {/* Tab Navigation */}
                <div className="flex flex-1">
                  <button
                    onClick={() => {
                      setActiveTab("spreadsheet");
                      updateView("spreadsheet");
                    }}
                    className={`flex items-center px-6 h-full text-sm font-medium border-r transition-colors first:rounded-tl-lg ${
                      activeTab === "spreadsheet" 
                        ? "bg-muted/30 text-foreground border-b-2" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                    style={{
                      borderBottomColor: activeTab === "spreadsheet" ? databaseColor : 'transparent'
                    }}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Spreadsheet
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("cards");
                      updateView("gallery");
                    }}
                    className={`flex items-center px-6 h-full text-sm font-medium border-r transition-colors ${
                      activeTab === "cards" 
                        ? "bg-muted/30 text-foreground border-b-2" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                    style={{
                      borderBottomColor: activeTab === "cards" ? databaseColor : 'transparent'
                    }}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Cards
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("kanban");
                      updateView("kanban");
                    }}
                    className={`flex items-center px-6 h-full text-sm font-medium border-r transition-colors ${
                      activeTab === "kanban" 
                        ? "bg-muted/30 text-foreground border-b-2" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                    style={{
                      borderBottomColor: activeTab === "kanban" ? databaseColor : 'transparent'
                    }}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Kanban
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("form");
                      updateView("form");
                    }}
                    className={`flex items-center px-6 h-full text-sm font-medium border-r transition-colors ${
                      activeTab === "form" 
                        ? "bg-muted/30 text-foreground border-b-2" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                    style={{
                      borderBottomColor: activeTab === "form" ? databaseColor : 'transparent'
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Form Builder
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      updateView("chat");
                    }}
                    className={`flex items-center px-6 h-full text-sm font-medium transition-colors ${
                      activeTab === "chat" 
                        ? "bg-muted/30 text-foreground border-b-2" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                    style={{
                      borderBottomColor: activeTab === "chat" ? databaseColor : 'transparent'
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Main View Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === 'spreadsheet' && (
                <RevoGridSpreadsheet
                  tableData={project.records || []}
                  tableSchema={{ fields: project.schema.fields }}
                  tableProjectId={project.id}
                  tableName={project.name}
                  recordCount={project.records?.length || 0}
                  onViewJSON={() => {
                    const jsonData = JSON.stringify(project.records || [], null, 2);
                    navigator.clipboard.writeText(jsonData);
                    toast.success("JSON data copied to clipboard");
                  }}
                  onShareEmbed={() => setIsPreviewShareOpen(true)}
                  onOpenAddRecordModal={() => setIsAddRecordModalOpen(true)}
                  onUpdate={async (recordId, updates) => {
                    try {
                      // Update in database
                      await tableService.updateRecord(project.id, recordId, updates, project.records);
                      
                      // Update local state immediately without refetching
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.map(r => 
                          r.id === recordId ? { ...r, ...updates } : r
                        )
                      }));
                    } catch (error: any) {
                      toast.error(error.message || "Failed to update record");
                      // Refresh on error to ensure consistency
                      await fetchData();
                    }
                  }}
                  onDelete={async (recordId) => {
                    try {
                      console.log('TableDetail - deleting record:', recordId);
                      await tableService.deleteRecord(project.id, recordId, project.records);
                      
                      // Update local state immediately
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.filter(r => r.id !== recordId)
                      }));
                      
                      toast.success("Record deleted successfully");
                    } catch (error: any) {
                      console.error('TableDetail - delete error:', error);
                      toast.error(error.message || "Failed to delete record");
                      await fetchData();
                    }
                  }}
                  onSave={async (record) => {
                    try {
                      await handleAddRecord(record);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to add record");
                    }
                  }}
                  onSchemaChange={async (fields) => {
                    try {
                      await tableService.updateTableProject(project.id, {
                        schema: { ...project.schema, fields }
                      });
                      
                      // Update local state immediately
                      setProject(prev => ({
                        ...prev!,
                        schema: { ...prev!.schema, fields }
                      }));
                      
                      toast.success("Schema updated successfully");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to update schema");
                      await fetchData();
                    }
                  }}
                />
              )}
              
              {activeTab === 'cards' && (
                <TableViews
                  tableData={project.records || []}
                  tableSchema={{ fields: project.schema.fields }}
                  onUpdate={async (recordId, updates) => {
                    try {
                      await tableService.updateRecord(project.id, recordId, updates, project.records);
                      await fetchData(); // Refresh data to ensure consistency
                      toast.success("Record updated successfully");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to update record");
                    }
                  }}
                  onDelete={async (recordId) => {
                    try {
                      console.log('TableDetail - deleting record from cards view:', recordId);
                      await tableService.deleteRecord(project.id, recordId, project.records);
                      console.log('TableDetail - delete successful, refreshing data');
                      await fetchData(); // Refresh data to ensure consistency
                      toast.success("Record deleted successfully");
                    } catch (error: any) {
                      console.error('TableDetail - delete error:', error);
                      toast.error(error.message || "Failed to delete record");
                    }
                  }}
                  onSave={handleAddRecord}
                  initialView="gallery"
                  tableProjectId={project.id}
                  viewSettings={project.view_settings}
                  onViewSettingsChange={handleViewSettingsChange}
                />
              )}
              
              {activeTab === 'kanban' && (
                <KanbanView
                  tableData={project.records || []}
                  tableSchema={{ fields: project.schema.fields }}
                  onUpdate={async (recordId, updates) => {
                    try {
                      await tableService.updateRecord(project.id, recordId, updates, project.records);
                      await fetchData(); // Refresh data to ensure consistency
                      toast.success("Record updated successfully");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to update record");
                    }
                  }}
                  onDelete={async (recordId) => {
                    try {
                      console.log('TableDetail - deleting record from kanban view:', recordId);
                      await tableService.deleteRecord(project.id, recordId, project.records);
                      console.log('TableDetail - delete successful, refreshing data');
                      await fetchData(); // Refresh data to ensure consistency
                      toast.success("Record deleted successfully");
                    } catch (error: any) {
                      console.error('TableDetail - delete error:', error);
                      toast.error(error.message || "Failed to delete record");
                    }
                  }}
                  onSave={handleAddRecord}
                  settings={project.view_settings?.kanban}
                  onOpenSettings={() => {
                    const defaultKanbanSettings = {
                      type: 'kanban' as const,
                      visibleFields: project.schema.fields.map(f => f.id),
                      showTypeIcons: true,
                      showImages: true,
                      kanbanImageDisplay: 'cover' as const
                    };
                    handleViewSettingsChange('kanban', project.view_settings?.kanban || defaultKanbanSettings);
                  }}
                />
              )}
              
              {activeTab === 'form' && (
                <FormBuilder
                  tableSchema={project.schema}
                  tableId={project.id}
                  formConfig={project.formConfig || {
                    title: project.name,
                    description: project.description || "",
                    primaryColor: databaseColor,
                    submitButtonText: "Submit",
                    style: "default",
                    theme: "light",
                    redirectUrl: "",
                    inputBorderRadius: "6",
                    buttonBorderRadius: "6",
                    formPadding: "24",
                    fieldGap: "24",
                    fontFamily: "inconsolata",
                    titleFont: "inter",
                    descriptionFont: "inter",
                    allCaps: false
                  }}
                  onSaveFormConfig={async (config) => {
                    try {
                      await tableService.updateTableProject(id!, { 
                        formConfig: config,
                        schema: {
                          ...project.schema,
                          fields: config.fields || project.schema.fields
                        }
                      });
                      // Refresh the project data
                      const updatedProject = await tableService.getTableProject(id!);
                      setProject(updatedProject);
                      toast.success("Form configuration saved successfully!");
                    } catch (error) {
                      console.error("Error saving form config:", error);
                      toast.error("Failed to save form configuration");
                    }
                  }}
                />
              )}

              {activeTab === 'chat' && (
                <div className="h-full flex">
                  <DataChatPanel
                    tableProjectId={project.id}
                    tableName={project.name}
                    tableSchema={{ fields: project.schema.fields }}
                    tableData={project.records || []}
                    isOpen={true}
                    onClose={() => {}}
                    // AI Action Callbacks
                    onAddRecord={async (record) => {
                      const newRecord = await tableService.addRecord(project.id, record, project.records);
                      setProject(prev => ({
                        ...prev!,
                        records: [...prev!.records, newRecord]
                      }));
                    }}
                    onAddRecords={async (records) => {
                      let currentRecords = [...project.records];
                      for (const record of records) {
                        const newRecord = await tableService.addRecord(project.id, record, currentRecords);
                        currentRecords.push(newRecord);
                      }
                      setProject(prev => ({
                        ...prev!,
                        records: currentRecords
                      }));
                    }}
                    onUpdateRecord={async (recordId, updates) => {
                      await tableService.updateRecord(project.id, recordId, updates, project.records);
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.map(r => 
                          r.id === recordId ? { ...r, ...updates } : r
                        )
                      }));
                    }}
                    onUpdateRecords={async (recordIds, updates) => {
                      for (const recordId of recordIds) {
                        await tableService.updateRecord(project.id, recordId, updates, project.records);
                      }
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.map(r => 
                          recordIds.includes(r.id) ? { ...r, ...updates } : r
                        )
                      }));
                    }}
                    onDeleteRecord={async (recordId) => {
                      await tableService.deleteRecord(project.id, recordId, project.records);
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.filter(r => r.id !== recordId)
                      }));
                    }}
                    onDeleteRecords={async (recordIds) => {
                      for (const recordId of recordIds) {
                        await tableService.deleteRecord(project.id, recordId, project.records);
                      }
                      setProject(prev => ({
                        ...prev!,
                        records: prev!.records.filter(r => !recordIds.includes(r.id))
                      }));
                    }}
                    onAddColumn={async (column) => {
                      const updatedFields = [...project.schema.fields, column];
                      await tableService.updateTableProject(project.id, {
                        schema: { ...project.schema, fields: updatedFields }
                      });
                      setProject(prev => ({
                        ...prev!,
                        schema: { ...prev!.schema, fields: updatedFields }
                      }));
                    }}
                    onUpdateColumn={async (columnName, updates) => {
                      const updatedFields = project.schema.fields.map(f => 
                        f.name === columnName ? { ...f, ...updates } : f
                      );
                      await tableService.updateTableProject(project.id, {
                        schema: { ...project.schema, fields: updatedFields }
                      });
                      setProject(prev => ({
                        ...prev!,
                        schema: { ...prev!.schema, fields: updatedFields }
                      }));
                    }}
                    onDeleteColumn={async (columnName) => {
                      const updatedFields = project.schema.fields.filter(f => f.name !== columnName);
                      // Also remove the column data from all records
                      const updatedRecords = project.records.map(r => {
                        const { [columnName]: _, ...rest } = r;
                        return { ...rest, id: r.id } as typeof r;
                      });
                      await tableService.updateTableProject(project.id, {
                        schema: { ...project.schema, fields: updatedFields },
                        records: updatedRecords
                      });
                      setProject(prev => ({
                        ...prev!,
                        schema: { ...prev!.schema, fields: updatedFields },
                        records: updatedRecords
                      }));
                    }}
                    onClearData={async () => {
                      await tableService.updateTableProject(project.id, {
                        records: []
                      });
                      setProject(prev => ({
                        ...prev!,
                        records: []
                      }));
                    }}
                    onRefresh={fetchData}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schema Editor */}
      <TableSchemaEditor
        isOpen={isSchemaEditorOpen}
        onClose={() => setIsSchemaEditorOpen(false)}
        onSave={async (schema) => {
          console.log('Saving schema:', schema);
          try {
            const updatedSchema = { ...schema, id: project.schema.id };
            await tableService.updateTableProject(project.id, { 
              schema: updatedSchema 
            });
            updateProject({ schema: updatedSchema });
            // Refresh data to ensure all views get updated field names
            await fetchData();
            toast.success("Schema updated successfully");
            setIsSchemaEditorOpen(false);
          } catch (error: any) {
            console.error('Failed to save schema:', error);
            toast.error("Failed to save schema: " + error.message);
          }
        }}
        initialData={{
          ...project.schema,
          fields: project.schema.fields.map(field => {
            console.log('Field being passed to editor:', {
              name: field.name,
              type: field.type,
              system: field.system,
              disabled: Boolean(field.system)
            });
            return field;
          })
        }}
      />

      {/* Gated Content Dialog */}
      <GatedContentDialog
        isOpen={isGatedContentOpen}
        onClose={() => setIsGatedContentOpen(false)}
        tableId={project.id}
        project={project}
        onUpdate={updateProject}
      />

      {/* Webhooks & Dev Dialog */}
      <WebhooksDevDialog
        isOpen={isWebhooksOpen}
        onClose={() => setIsWebhooksOpen(false)}
        tableProjectId={project.id}
      />

      {/* Event Logs Dialog */}
      <EventLogsDialog
        isOpen={isEventLogsOpen}
        onClose={() => setIsEventLogsOpen(false)}
        tableProjectId={project.id}
      />

      {/* Preview & Share Dialog */}
      <PreviewShareDialog
        isOpen={isPreviewShareOpen}
        onClose={() => setIsPreviewShareOpen(false)}
        tableId={project.id}
        tableName={project.name}
        databaseColor={databaseColor}
      />

      {/* Add Record Modal */}
      <AddRecordModal
        isOpen={isAddRecordModalOpen}
        onClose={() => setIsAddRecordModalOpen(false)}
        onSave={handleAddRecord}
        tableFields={project.schema.fields}
      />
    </div>
  );
}
