import { useState, useEffect } from "react";
import { Search, CheckCircle2, Plus } from "lucide-react";
import { stripHtml } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { BotpressIntegration, IntegrationCategory } from "@/types/integration";
import { IntegrationDialog } from "./IntegrationDialog";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { integrationsService } from "@/services/integrationsService";
import { useUserNodeInstallations } from "@/hooks/useUserNodeInstallations";
import { toast } from "sonner";
import { HubSpotIcon } from "@/components/flow/icons/HubSpotIcon";
import { deduplicateIntegrations, getIntegrationKey } from "@/utils/integrationDeduplication";
import { LogoIcon } from "./flow/LogoIcon";

const categories: IntegrationCategory[] = [
  "All",
  "Productivity",
  "Channels",
  "Automation",
  "Development",
  "Support",
  "Analytics", 
  "Business Operations",
  "LLMs / Gen AI"
];

interface IntegrationItemProps {
  integration: any;
  onInstall: (integration: any) => void;
  onUninstall: (integration: any) => void;
  isInstalled: boolean;
}

const IntegrationItem = ({ integration, onInstall, onUninstall, isInstalled }: IntegrationItemProps) => (
  <div className="p-4 border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer">
    <div className="flex items-start space-x-3">
       <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
         <LogoIcon icon={integration.icon || "/placeholder.svg"} alt={integration.name} size="lg" />
       </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center">
            {integration.name}
            {isInstalled && (
              <span className="ml-2 text-green-500">
                <CheckCircle2 size={14} />
              </span>
            )}
          </h3>
          <span className="text-xs text-muted-foreground">by {integration.provider}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {stripHtml(integration.description)}
        </p>
      </div>
    </div>
    <div className="mt-3 flex gap-2">
      {isInstalled ? (
        <button 
          className="flex-1 bg-destructive text-destructive-foreground text-xs px-3 py-1.5 rounded hover:bg-destructive/90 transition-colors"
          onClick={() => onUninstall(integration)}
        >
          Uninstall
        </button>
      ) : (
        <button 
          className="flex-1 bg-primary text-white text-xs px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
          onClick={() => onInstall(integration)}
          disabled={!integration.isCompleted}
        >
          {integration.isCompleted ? 'Install' : 'Coming Soon'}
        </button>
      )}
    </div>
  </div>
);

export function IntegrationsPanel({ onAddIntegration }: { onAddIntegration: (integration: BotpressIntegration) => void }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>("All");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [optimisticUserIntegrations, setOptimisticUserIntegrations] = useState<any[]>([]);
  
  const {
    installedNodeTypes,
    installNode,
    uninstallNode,
    refreshInstallations,
  } = useUserNodeInstallations();

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
        
        // Ask FlowBuilder to refresh and ensure palette/canvas update
        if (typeof window !== 'undefined') {
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
        
        // Ask FlowBuilder to refresh and ensure palette/canvas update
        if (typeof window !== 'undefined') {
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

  const handleInstallIntegration = (integration: BotpressIntegration) => {
    onAddIntegration(integration);
  };

  const filteredIntegrations = (availableIntegrations || [])
    .filter((integration) => {
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
      return matchesSearch;
    })
    .filter((integration) => (searchQuery ? true : selectedCategory === 'All' || integration.category === selectedCategory));

  return (
    <div className="w-64 border-r bg-white flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Integrations</h3>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-8" 
            placeholder="Search installed..." 
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
      <div className="overflow-x-auto whitespace-nowrap p-4 border-b">
        {categories.map(category => (
          <button
            key={category}
            className={`mr-2 px-3 py-1 text-xs rounded-full ${
              selectedCategory === category 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {integrationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading integrations...</div>
            </div>
          ) : filteredIntegrations.length > 0 ? (
            filteredIntegrations.map(integration => (
              <IntegrationItem
                key={getIntegrationKey(integration)}
                integration={integration}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                isInstalled={isIntegrationInstalled(integration)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No integrations found matching your criteria
            </div>
          )}
        </div>
      </ScrollArea>
      
      <IntegrationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onInstallIntegration={handleInstallIntegration}
      />
    </div>
  );
}
