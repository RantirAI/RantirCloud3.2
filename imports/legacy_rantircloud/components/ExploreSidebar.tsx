import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Table2, LayoutGrid, Kanban, PanelTop, Database as DatabaseIcon, FileText, Folder, FolderOpen } from "lucide-react";
import { databaseService, DatabaseProject } from "@/services/databaseService";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { documentService, Document, DocumentFolder } from "@/services/documentService";
import { useDatabaseStore } from "@/stores/databaseStore";
import { supabase } from "@/integrations/supabase/client";

interface ExploreSidebarProps {
  collapsed: boolean;
  className?: string;
  currentDatabaseId?: string; // Add prop to filter by current database
}

interface DatabaseWithTables extends DatabaseProject {
  tables: TableProject[];
  docs: Document[];
  folders: DocumentFolder[];
}

export function ExploreSidebar({ collapsed, className, currentDatabaseId }: ExploreSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { documentsRefreshTrigger, tablesRefreshTrigger } = useDatabaseStore();
  const [databases, setDatabases] = useState<DatabaseWithTables[]>([]);
  const [standaloneTables, setStandaloneTables] = useState<TableProject[]>([]);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentDatabase, setCurrentDatabase] = useState<DatabaseProject | null>(null);

  // Auto-expand all databases and tables after data is loaded
  useEffect(() => {
    const allDatabaseIds = databases.map(db => db.id);
    const allTableIds = databases.flatMap(db => db.tables.map(t => t.id));
    setExpandedDatabases(new Set(allDatabaseIds));
    setExpandedTables(new Set(allTableIds));
  }, [databases]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      // If we have a currentDatabaseId, only show tables from that database
      if (currentDatabaseId) {
        const [tablesData, databaseData, docsData, foldersData] = await Promise.all([
          tableService.getUserTableProjects(user.id, currentDatabaseId),
          databaseService.getDatabase(currentDatabaseId),
          documentService.getDatabaseDocuments(currentDatabaseId),
          documentService.getDatabaseFolders(currentDatabaseId)
        ]);
        
        setCurrentDatabase(databaseData);
        
        // Parse tables data
        const parsedTables = tablesData.map((table: any) => {
          const defaultSchema = { id: table.id, name: table.name, fields: [] };
          return {
            ...table,
            schema: safeParseJson(table.schema, defaultSchema),
            records: safeParseJson(table.records, [])
          } as TableProject;
        });
        
        setDatabases([{
          ...databaseData,
          tables: parsedTables,
          docs: docsData,
          folders: foldersData
        }]);
        setStandaloneTables([]);
        setExpandedDatabases(new Set([currentDatabaseId])); // Auto-expand current database
      } else {
        // Original logic for showing all databases and tables
        const [databasesData, allTables, allDocs] = await Promise.all([
          databaseService.getUserDatabases(user.id),
          tableService.getUserTableProjects(user.id),
          Promise.resolve([]) // Docs will be fetched per database
        ]);

        // Group tables by database
        const databaseMap = new Map<string, TableProject[]>();
        const standalone: TableProject[] = [];

        // Parse all tables data first
        const parsedAllTables = allTables.map((table: any) => {
          const defaultSchema = { id: table.id, name: table.name, fields: [] };
          return {
            ...table,
            schema: safeParseJson(table.schema, defaultSchema),
            records: safeParseJson(table.records, [])
          } as TableProject;
        });

        parsedAllTables.forEach(table => {
          if (table.database_id) {
            if (!databaseMap.has(table.database_id)) {
              databaseMap.set(table.database_id, []);
            }
            databaseMap.get(table.database_id)!.push(table);
          } else {
            standalone.push(table);
          }
        });

        // Create databases with tables and fetch docs for each
        const databasesWithContent = await Promise.all(
          databasesData.map(async (db) => {
            const [docs, folders] = await Promise.all([
              documentService.getDatabaseDocuments(db.id),
              documentService.getDatabaseFolders(db.id)
            ]);
            return {
              ...db,
              tables: databaseMap.get(db.id) || [],
              docs: docs || [],
              folders: folders || []
            };
          })
        );

        setDatabases(databasesWithContent);
        setStandaloneTables(standalone);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [user, currentDatabaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, documentsRefreshTrigger, tablesRefreshTrigger]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!currentDatabaseId) return;

    const channel = supabase
      .channel(`database-sidebar-${currentDatabaseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents', filter: `database_id=eq.${currentDatabaseId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'table_projects', filter: `database_id=eq.${currentDatabaseId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDatabaseId, fetchData]);

  const toggleDatabase = (databaseId: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(databaseId)) {
      newExpanded.delete(databaseId);
    } else {
      newExpanded.add(databaseId);
    }
    setExpandedDatabases(newExpanded);
  };

  const toggleTable = (tableId: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedTables(newExpanded);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleViewSelect = (tableId: string, view: string) => {
    // Force a full page reload to ensure data refreshes
    window.location.href = `/tables/${tableId}?view=${view}`;
  };

  const isActiveView = (tableId: string, view: string) => {
    if (currentTableId !== tableId) return false;
    const urlParams = new URLSearchParams(location.search);
    const currentView = urlParams.get('view') || 'spreadsheet';
    return currentView === view;
  };

  const getViewIcon = (view: string) => {
    switch (view) {
      case 'spreadsheet': return Table2;
      case 'gallery': return LayoutGrid;
      case 'kanban': return Kanban;
      case 'form': return PanelTop;
      default: return Table2;
    }
  };

  const currentPath = location.pathname;
  const isTablePage = currentPath.includes('/tables/');
  const currentTableId = isTablePage ? currentPath.split('/tables/')[1]?.split('?')[0] : null;
  const isDocPage = currentPath.includes('/docs/');
  const currentDocId = isDocPage ? currentPath.split('/docs/')[1] : null;

  const buildFolderTree = (folders: DocumentFolder[], parentId: string | null = null): DocumentFolder[] => {
    return folders.filter(f => f.parent_folder_id === parentId).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFolderDocuments = (docs: Document[], folderId: string): Document[] => {
    return docs.filter(doc => doc.folder_id === folderId);
  };

  const renderFolderTree = (folders: DocumentFolder[], docs: Document[], level: number = 0) => {
    const rootFolders = buildFolderTree(folders, null);
    
    return (
      <>
        {rootFolders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const folderDocs = getFolderDocuments(docs, folder.id);
          const subfolders = buildFolderTree(folders, folder.id);
          
          return (
            <div key={folder.id} className="space-y-0.5">
              <div className="pl-3" style={{ paddingLeft: `${level * 12 + 12}px` }}>
                <button
                  className="w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  )}
                  {folder.icon && <span className="mr-1">{folder.icon}</span>}
                  <span className="truncate">{folder.name}</span>
                </button>
              </div>
              
              {isExpanded && (
                <div className="space-y-0.5">
                  {subfolders.length > 0 && renderFolderTree(folders, docs, level + 1)}
                  {folderDocs.map((doc) => (
                    <div key={doc.id} className="pl-3" style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}>
                      <button
                        className={`w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                          currentDocId === doc.id ? 'bg-accent font-medium' : ''
                        }`}
                        onClick={() => navigate(`/databases/${doc.database_id}/docs/${doc.id}`)}
                      >
                        {doc.icon ? (
                          <span className="mr-1.5">{doc.icon}</span>
                        ) : (
                          <FileText className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        )}
                        <span className="truncate">{doc.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  if (collapsed) {
    return (
      <div className="w-0 transition-all duration-300 overflow-hidden">
      </div>
    );
  }

  return (
    <div className={`w-64 border-r bg-background transition-all duration-300 ${className || ''}`}>
      <div className="flex flex-col h-full">
        {/* Database Header - compact */}
        {currentDatabase && (
          <div className="px-2 py-1.5 border-b max-w-[200px]">
            <div className="flex items-center gap-1.5">
              <DatabaseIcon className="h-3 w-3 flex-shrink-0" style={{ color: currentDatabase.color || "#3B82F6" }} />
              <span className="text-xs font-medium truncate" title={currentDatabase.name}>
                {currentDatabase.name.length > 64 ? `${currentDatabase.name.substring(0, 64)}...` : currentDatabase.name}
              </span>
            </div>
          </div>
        )}
        
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto p-1.5 space-y-0.5">
            {/* EXPLORE Header */}
            {!currentDatabaseId && (
              <div className="px-1.5 py-1 mb-2">
                <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                  EXPLORE
                </h3>
              </div>
            )}
            
            {/* Standalone Tables */}
            {!currentDatabaseId && standaloneTables.length > 0 && (
              <div className="space-y-0.5">
                <div className="px-1.5 py-0.5">
                  <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                    STANDALONE TABLES
                  </h3>
                </div>
                {standaloneTables.map((table) => (
                  <div key={table.id} className="space-y-0.5">
                    <div className="pl-3">
                      <button
                      className={`w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                        currentTableId === table.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => toggleTable(table.id)}
                      >
                        {expandedTables.has(table.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        )}
                        <Table2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <span className={`truncate ${currentTableId === table.id ? 'font-semibold' : ''}`}>{table.name}</span>
                      </button>
                    </div>
                    
                    {expandedTables.has(table.id) && (
                      <div className="pl-6 space-y-0.5">
                        <div className="px-1.5 py-0.5">
                          <h4 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                            VIEWS
                          </h4>
                        </div>
                        {['spreadsheet', 'gallery', 'kanban', 'form'].map((view) => {
                          const ViewIcon = getViewIcon(view);
                          const isActive = isActiveView(table.id, view);
                          return (
                            <div key={view} className="pl-3">
                              <button
                                className={`w-full flex items-center h-6 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                                  isActive ? 'bg-accent text-primary font-medium' : ''
                                }`}
                                onClick={() => handleViewSelect(table.id, view)}
                              >
                                <ViewIcon className={`h-3.5 w-3.5 mr-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="truncate">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Databases with Items */}
            {!currentDatabaseId && databases.map((database) => (
              <div key={database.id} className="space-y-0.5">
                <button
                  className="w-full flex items-center h-7 text-xs max-w-[200px] hover:bg-accent/50 rounded-sm px-2 transition-colors"
                  onClick={() => toggleDatabase(database.id)}
                >
                  {expandedDatabases.has(database.id) ? (
                    <ChevronDown className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
                    style={{ backgroundColor: database.color || '#3B82F6' }}
                  />
                  <span className="truncate" title={database.name}>
                    {database.name.length > 64 ? `${database.name.substring(0, 64)}...` : database.name}
                  </span>
                </button>
                
                {expandedDatabases.has(database.id) && (database.tables.length > 0 || (database.docs && database.docs.length > 0) || (database.folders && database.folders.length > 0)) && (
                  <div className="pl-3 space-y-0.5">
                    <div className="px-1.5 py-0.5">
                      <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                        TABLES
                      </h3>
                    </div>
                    
                    {/* Tables */}
                    {database.tables.map((table) => (
                      <div key={table.id} className="space-y-0.5">
                        <div className="pl-3">
                          <button
                            className="w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors"
                            onClick={() => toggleTable(table.id)}
                          >
                            {expandedTables.has(table.id) ? (
                              <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            )}
                            <Table2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <span className={`truncate ${currentTableId === table.id ? 'font-semibold' : ''}`}>{table.name}</span>
                          </button>
                        </div>
                        
                        {expandedTables.has(table.id) && (
                          <div className="pl-6 space-y-0.5">
                            <div className="px-1.5 py-0.5">
                              <h4 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                                VIEWS
                              </h4>
                            </div>
                            {['spreadsheet', 'gallery', 'kanban', 'form'].map((view) => {
                              const ViewIcon = getViewIcon(view);
                              const isActive = isActiveView(table.id, view);
                              return (
                                <div key={view} className="pl-3">
                                  <button
                                    className={`w-full flex items-center h-6 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                                      isActive ? 'bg-accent text-primary font-medium' : ''
                                    }`}
                                    onClick={() => handleViewSelect(table.id, view)}
                                  >
                                    <ViewIcon className={`h-3.5 w-3.5 mr-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <span className="truncate">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Documents Section */}
                    {((database.docs && database.docs.length > 0) || (database.folders && database.folders.length > 0)) && (
                      <>
                        <div className="px-1.5 py-0.5 mt-2">
                          <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                            DOCUMENTS
                          </h3>
                        </div>
                        
                        {/* Folder tree */}
                        {database.folders && database.folders.length > 0 && renderFolderTree(database.folders, database.docs)}
                        
                        {/* Root level docs (no folder) */}
                        {database.docs.filter(doc => !doc.folder_id).map((doc) => (
                          <div key={doc.id} className="pl-3">
                            <button
                              className={`w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                                currentDocId === doc.id ? 'bg-accent font-medium' : ''
                              }`}
                              onClick={() => navigate(`/databases/${database.id}/docs/${doc.id}`)}
                            >
                              {doc.icon ? (
                                <span className="mr-1.5">{doc.icon}</span>
                              ) : (
                                <FileText className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              )}
                              <span className="truncate">{doc.title}</span>
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Current database items - when currentDatabaseId is set */}
            {currentDatabaseId && databases.map((database) => (
              <div key={`current-${database.id}`} className="space-y-0.5">
                <div className="px-1.5 py-0.5">
                  <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                    TABLES
                  </h3>
                </div>
                
                {/* Tables */}
                {database.tables.map((table) => (
                  <div key={table.id} className="space-y-0.5">
                    <div className="pl-3">
                      <button
                        className="w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors"
                        onClick={() => toggleTable(table.id)}
                      >
                        {expandedTables.has(table.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        )}
                        <Table2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <span className={`truncate ${currentTableId === table.id ? 'font-semibold' : ''}`}>{table.name}</span>
                      </button>
                    </div>
                    
                    {expandedTables.has(table.id) && (
                      <div className="pl-6 space-y-0.5">
                        <div className="px-1.5 py-0.5">
                          <h4 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                            VIEWS
                          </h4>
                        </div>
                        {['spreadsheet', 'gallery', 'kanban', 'form'].map((view) => {
                          const ViewIcon = getViewIcon(view);
                          const isActive = isActiveView(table.id, view);
                          return (
                            <div key={view} className="pl-3">
                              <button
                                className={`w-full flex items-center h-6 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                                  isActive ? 'bg-accent text-primary font-medium' : ''
                                }`}
                                onClick={() => handleViewSelect(table.id, view)}
                              >
                                <ViewIcon className={`h-3.5 w-3.5 mr-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="truncate">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Documents Section */}
                {((database.docs && database.docs.length > 0) || (database.folders && database.folders.length > 0)) && (
                  <>
                    <div className="px-1.5 py-0.5 mt-2">
                      <h3 className="text-xs font-inconsolata uppercase text-muted-foreground tracking-wide">
                        DOCUMENTS
                      </h3>
                    </div>
                    
                    {/* Folder tree */}
                    {database.folders && database.folders.length > 0 && renderFolderTree(database.folders, database.docs)}
                    
                    {/* Root level docs */}
                    {database.docs.filter(doc => !doc.folder_id).map((doc) => (
                      <div key={doc.id} className="pl-3">
                        <button
                          className={`w-full flex items-center h-7 text-xs hover:bg-accent/50 rounded-sm px-2 transition-colors ${
                            currentDocId === doc.id ? 'bg-accent font-medium' : ''
                          }`}
                          onClick={() => navigate(`/databases/${database.id}/docs/${doc.id}`)}
                        >
                          {doc.icon ? (
                            <span className="mr-1.5">{doc.icon}</span>
                          ) : (
                            <FileText className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          )}
                          <span className="truncate">{doc.title}</span>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}