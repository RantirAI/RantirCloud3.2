import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { integrationsService } from "@/services/integrationsService";
import { supabase } from "@/integrations/supabase/client";
import { BotpressIntegration } from "@/types/integration";
import { useFlowStore } from "@/lib/flow-store";
import { stripHtml } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ArrowLeft, ExternalLink, Check, Plus, Download, Clock } from "lucide-react";
import { SnowflakeIcon } from "@/components/flow/icons/SnowflakeIcon";
import { toast } from "sonner";
import { useUserNodeInstallations } from "@/hooks/useUserNodeInstallations";
import { deduplicateIntegrations, getIntegrationKey } from "@/utils/integrationDeduplication";

interface IntegrationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationsDialog({ isOpen, onClose }: IntegrationsDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [detailIntegration, setDetailIntegration] = useState<BotpressIntegration | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [optimisticUserIntegrations, setOptimisticUserIntegrations] = useState<any[]>([]);
  
  const {
    installedNodeTypes,
    installNode,
    uninstallNode,
    refreshInstallations,
  } = useUserNodeInstallations();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["integration-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch available integrations (combine general and node integrations)
  const { data: availableIntegrations, isLoading: integrationsLoading, refetch: refetchAvailable } = useQuery({
    queryKey: ["available-integrations", installedNodeTypes],
    queryFn: async () => {
      const [general, nodes] = await Promise.all([
        integrationsService.getAvailableIntegrations(),
        integrationsService.getAvailableNodeIntegrations()
      ]);
      
      // Combine and mark with installation status
      const combined = [
        ...general.map(g => ({ ...g, requiresInstallation: false, nodeType: null })),
        ...nodes.map(n => ({ 
          ...n, 
          isInstalled: installedNodeTypes.includes(n.nodeType),
          nodeType: n.nodeType 
        }))
      ];
      
      // Apply smart deduplication
      return deduplicateIntegrations(combined);
    },
  });

  // Fetch user's installed integrations 
  const { data: userIntegrations, refetch: refetchUserIntegrations } = useQuery({
    queryKey: ["user-integrations", user?.id, installedNodeTypes],
    queryFn: async () => {
      if (!user) return [];
      
      const [general, nodes] = await Promise.all([
        integrationsService.getUserIntegrations(user.id),
        integrationsService.getUserNodeIntegrations(user.id)
      ]);
      
      // Apply deduplication to installed integrations as well
      return deduplicateIntegrations([...general, ...nodes]);
    },
    enabled: !!user,
  });

  // Update optimistic state when real data changes
  useEffect(() => {
    if (userIntegrations) {
      setOptimisticUserIntegrations(userIntegrations);
    }
  }, [userIntegrations]);

  const categoryOptions = [
    "All",
    ...(categories?.map(cat => cat.name) || [])
  ];

  // Get integrations based on active tab
  const getDisplayIntegrations = () => {
    if (activeTab === "installed") {
      // For "My Installed" tab, use optimistic state for immediate UI updates
      return optimisticUserIntegrations || [];
    }
    return availableIntegrations || [];
  };

  // Filter integrations (case-insensitive, tokenized; when searching, ignore category filter)
  const filteredIntegrations = getDisplayIntegrations().filter((integration) => {
    if (!integration) return false;

    const normalize = (v: any) => (v ?? '').toString().toLowerCase().trim();
    const q = normalize(searchQuery);
    const haystack = [
      (integration as any).name,
      (integration as any).description,
      (integration as any).category,
      (integration as any).provider,
      (integration as any).nodeType,
      (integration as any).integration_id,
    ]
      .filter(Boolean)
      .map(normalize)
      .join(' ');

    const matchesSearch = q === '' || q.split(/\s+/).every((term) => haystack.includes(term));

    // If there is a search query, search across all categories; otherwise respect selectedCategory
    const matchesCategory =
      q !== '' ? true : selectedCategory === 'All' || (integration as any).category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Check if integration is installed
  const isIntegrationInstalled = (integration: any) => {
    if (integration.nodeType) {
      return installedNodeTypes.includes(integration.nodeType) || 
             optimisticUserIntegrations.some(ui => ui.id === integration.id);
    }
    return optimisticUserIntegrations?.some(ui => ui.id === integration.id) || false;
  };

  const handleInstall = async (integration: any) => {
    if (!user) {
      toast.error("Please log in to install integrations");
      return;
    }

    // Check if integration is completed
    if (!integration.isCompleted) {
      toast.info(`${integration.name} is coming soon! Stay tuned for updates.`);
      return;
    }

    try {
      if (integration.nodeType) {
        // Handle node integration - OPTIMISTIC UPDATE
        const optimisticUpdate = {
          ...integration,
          isInstalled: true
        };
        
        // Update UI immediately
        setOptimisticUserIntegrations(prev => [...prev, optimisticUpdate]);
        
        await installNode(integration.id);
        toast.success(`${integration.name} node installed successfully!`);
        
        // Refresh to ensure consistency
        await Promise.all([
          refetchUserIntegrations(),
          refreshInstallations(),
          refetchAvailable()
        ]);
        
        // Ask FlowBuilder to refresh the whole workflow (canvas + palette)
        if (typeof window !== 'undefined' && !useFlowStore.getState().isFlowRunning) {
          window.dispatchEvent(new CustomEvent('flowRefreshRequested', {
            detail: { reason: 'node-install', nodeId: integration.id }
          }));
        }
      } else {
        // Handle general integration  
        await integrationsService.installIntegration(user.id, integration.id);
        toast.success(`${integration.name} installed successfully!`);
        await refetchUserIntegrations();
      }
    } catch (error) {
      console.error("Error installing integration:", error);
      toast.error(`Failed to install ${integration.name}`);
    }
  };

  const handleUninstall = async (integration: any) => {
    if (!user) {
      toast.error("Please log in to uninstall integrations");
      return;
    }

    try {
      if (integration.nodeType) {
        // Handle node integration - OPTIMISTIC UPDATE
        // Update UI immediately
        setOptimisticUserIntegrations(prev => prev.filter(item => item.id !== integration.id));
        
        await uninstallNode(integration.id);
        toast.success(`${integration.name} node uninstalled successfully!`);
        
        // Refresh to ensure consistency
        await Promise.all([
          refetchUserIntegrations(),
          refreshInstallations(),
          refetchAvailable()
        ]);
        
        // Ask FlowBuilder to refresh the whole workflow (canvas + palette)
        if (typeof window !== 'undefined' && !useFlowStore.getState().isFlowRunning) {
          window.dispatchEvent(new CustomEvent('flowRefreshRequested', {
            detail: { reason: 'node-uninstall', nodeId: integration.id }
          }));
        }
      } else {
        // Handle general integration
        await integrationsService.uninstallIntegration(user.id, integration.id);
        toast.success(`${integration.name} uninstalled successfully!`);
        await refetchUserIntegrations();
      }
    } catch (error) {
      console.error("Error uninstalling integration:", error);
      toast.error(`Failed to uninstall ${integration.name}`);
    }
  };

  const showDetailView = (integration: BotpressIntegration) => {
    setDetailIntegration(integration);
  };

  const backToList = () => {
    setDetailIntegration(null);
  };

  // Helper function to render integration icon
  const renderIntegrationIcon = (integration: any, className: string = "w-6 h-6") => {
    // Special case for Snowflake integration to use the custom icon component
    if (integration.integration_id === 'snowflake' || integration.name === 'Snowflake') {
      return <SnowflakeIcon className={className} />;
    }
    
    // Use the integration's icon URL from database if available
    if (integration.icon && integration.icon !== '/placeholder.svg') {
      // Base64 SVGs with currentColor need inline rendering to inherit CSS color
      if (integration.icon.startsWith('data:image/svg+xml;base64,')) {
        try {
          const svgContent = atob(integration.icon.replace('data:image/svg+xml;base64,', ''));
          if (svgContent.includes('currentColor')) {
            return (
              <span
                className={`${className} inline-flex items-center justify-center text-foreground`}
                dangerouslySetInnerHTML={{ __html: svgContent.replace(/<svg/, '<svg width="100%" height="100%"') }}
              />
            );
          }
        } catch { /* fall through */ }
      }
      // Check if icon needs inversion on dark mode (dark icons on transparent bg)
      const needsInvert = /typeform/i.test(integration.icon) || /typeform/i.test(integration.name || '');
      return (
        <img 
          src={integration.icon} 
          alt={integration.name || ""} 
          className={`transition-opacity duration-500 object-contain opacity-100 ${needsInvert ? 'dark:invert' : ''} ${className}`}
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
      );
    }
    
    // Default fallback icon
    return (
      <svg fill="none" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">   
        <path d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z" fill="#f97316"/>
      </svg>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detailIntegration && (
              <Button variant="ghost" size="sm" onClick={backToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {detailIntegration ? detailIntegration.name : "Integrations"}
          </DialogTitle>
        </DialogHeader>

        {detailIntegration ? (
          // Detail View
          <div className="px-6 pb-6 pt-2 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                {renderIntegrationIcon(detailIntegration, "w-14 h-14")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{detailIntegration.name}</h3>
                  <Badge variant="secondary">{detailIntegration.category}</Badge>
                  {!detailIntegration.isCompleted && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Coming Soon
                    </Badge>
                  )}
                  {isIntegrationInstalled(detailIntegration) && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Installed
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                  {stripHtml(detailIntegration.description)}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <span>Provider: Rantir</span>
                  {detailIntegration.version && (
                    <span>• Version: {detailIntegration.version}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Only show install/uninstall buttons for integrations that require installation */}
              {(detailIntegration as any).requiresInstallation !== false ? (
                isIntegrationInstalled(detailIntegration) ? (
                  <Button variant="destructive" onClick={() => handleUninstall(detailIntegration)}>
                    Uninstall
                  </Button>
                ) : detailIntegration.isCompleted ? (
                  <Button onClick={() => handleInstall(detailIntegration)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Install
                  </Button>
                ) : (
                  <Button disabled>
                    <Clock className="h-4 w-4 mr-1" />
                    Coming Soon
                  </Button>
                )
              ) : (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Check className="h-3 w-3 mr-1" />
                  Built-in Node
                </Badge>
              )}
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-1" />
                Documentation
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-base">Integration Details</h4>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {(detailIntegration as any).nodeType 
                    ? "This integration will be available as a node in your flow builder once installed."
                    : "This integration provides additional functionality and services."
                  }
                </div>
                <div className="pt-3 border-t">
                  <h5 className="font-medium mb-2">Integration Type</h5>
                  <div className="text-sm text-muted-foreground">
                    Category: {detailIntegration.category}
                    {(detailIntegration as any).nodeType && (
                      <span> • Node Type: {(detailIntegration as any).nodeType}</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Version: {detailIntegration.version || 'Latest'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // List View with Tabs
          <div className="px-6 pb-6 space-y-4">
            <div className="mt-2">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "all"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground opacity-60 hover:opacity-100"
                  }`}
                >
                  All Integrations
                </button>
                <button
                  onClick={() => setActiveTab("installed")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "installed"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground opacity-60 hover:opacity-100"
                  }`}
                >
                  My Installed
                  {optimisticUserIntegrations && optimisticUserIntegrations.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {optimisticUserIntegrations.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
              
              {activeTab === "all" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pt-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Search integrations..."
                        value={searchQuery}
                        autoFocus
                        onChange={(e) => {
                          const v = e.target.value;
                          setSearchQuery(v);
                          if (v && selectedCategory !== 'All') setSelectedCategory('All');
                        }}
                        onInput={(e) => {
                          const v = (e.target as HTMLInputElement).value;
                          setSearchQuery(v);
                          if (v && selectedCategory !== 'All') setSelectedCategory('All');
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                      <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-8">
                        {categoryOptions.slice(0, 8).map((category) => (
                          <TabsTrigger key={category} value={category} className="text-xs px-2 py-1 h-6">
                            {category}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {categoryOptions.slice(0, 8).map((category) => (
                        <TabsContent key={category} value={category} className="mt-2">
                          <ScrollArea className="h-96">
                            {integrationsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="text-muted-foreground">Loading integrations...</div>
                              </div>
                            ) : filteredIntegrations.length === 0 ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                  <p className="text-muted-foreground">No integrations found in {category}</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Try selecting a different category or adjusting your search
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {filteredIntegrations.map((integration) => (
                                   <div
                                     key={getIntegrationKey(integration)}
                                     className={`border rounded-lg p-3 transition-shadow cursor-pointer ${
                                       integration.isCompleted ? 'hover:shadow-md' : 'opacity-60 cursor-not-allowed'
                                     }`}
                                     onClick={() => integration.isCompleted ? showDetailView(integration) : null}
                                   >
                                    <div className="flex items-start gap-3">
                                       <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                         {renderIntegrationIcon(integration)}
                                       </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h3 className="text-sm font-medium truncate">{integration.name}</h3>
                                          {(integration as any).nodeType && (
                                            <Badge variant="outline" className="text-xs">Node</Badge>
                                          )}
                                          {!integration.isCompleted && (
                                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                              <Clock className="h-3 w-3 mr-1" />
                                              Coming Soon
                                            </Badge>
                                          )}
                          {isIntegrationInstalled(integration) && (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Installed
                            </Badge>
                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                          {stripHtml(integration.description)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </div>
              )}
              
              {activeTab === "installed" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pt-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Search installed integrations..."
                        value={searchQuery}
                        autoFocus
                        onChange={(e) => {
                          const v = e.target.value;
                          setSearchQuery(v);
                          if (v && selectedCategory !== 'All') setSelectedCategory('All');
                        }}
                        onInput={(e) => {
                          const v = (e.target as HTMLInputElement).value;
                          setSearchQuery(v);
                          if (v && selectedCategory !== 'All') setSelectedCategory('All');
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <ScrollArea className="h-96">
                      {!optimisticUserIntegrations || optimisticUserIntegrations.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No integrations installed yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Install integrations from the "All Integrations" tab to get started
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {filteredIntegrations.map((integration) => (
                             <div
                               key={getIntegrationKey(integration)}
                               className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                               onClick={() => showDetailView(integration)}
                             >
                              <div className="flex items-start gap-3">
                                 <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                   {renderIntegrationIcon(integration)}
                                 </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium truncate">{integration.name}</h3>
                                    {(integration as any).nodeType && (
                                      <Badge variant="outline" className="text-xs">Node</Badge>
                                    )}
                                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                      <Check className="h-3 w-3 mr-1" />
                                      Installed
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {stripHtml(integration.description)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}