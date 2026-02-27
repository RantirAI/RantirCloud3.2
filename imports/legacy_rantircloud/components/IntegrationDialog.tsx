import { useState } from "react";
import { ArrowLeft, X, CheckCircle2, Search } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BotpressIntegration, IntegrationCategory } from "@/types/integration";
import { integrationsService } from "@/services/integrationsService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useFlowStore } from "@/lib/flow-store";
import { LogoIcon } from "@/components/flow/LogoIcon";

interface IntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallIntegration: (integration: BotpressIntegration) => void;
}

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

export function IntegrationDialog({ 
  isOpen, 
  onClose, 
  onInstallIntegration 
}: IntegrationDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>("All");
  const [detailIntegration, setDetailIntegration] = useState<BotpressIntegration | null>(null);
  
  const { data: availableIntegrations = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['availableIntegrations'],
    queryFn: () => integrationsService.getAvailableIntegrations(),
  });

  const { data: userIntegrations = [], isLoading: isLoadingUser } = useQuery({
    queryKey: ['userIntegrations', user?.id],
    queryFn: () => user?.id ? integrationsService.getUserIntegrations(user.id) : [],
    enabled: !!user?.id,
  });

  const integrations = availableIntegrations.map(integration => {
    const isInstalled = userIntegrations.some(userInt => userInt.id === integration.id);
    return {
      ...integration,
      isInstalled
    };
  });
  
  const filteredIntegrations = integrations.filter((integration) => {
    if (!integration) return false;
    const normalize = (v: any) => (v ?? '').toString().toLowerCase().trim();
    const q = normalize(searchQuery);
    const haystack = [
      (integration as any).name,
      (integration as any).description,
      (integration as any).category,
      (integration as any).provider,
      (integration as any).integration_id,
    ]
      .filter(Boolean)
      .map(normalize)
      .join(' ');

    const matchesSearch = q === '' || q.split(/\s+/).every((term) => haystack.includes(term));
    const matchesCategory = q !== '' ? true : selectedCategory === 'All' || (integration as any).category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (integration: BotpressIntegration) => {
    if (!user?.id) {
      toast.error("You need to be logged in to install integrations");
      return;
    }
    
    try {
      await integrationsService.installIntegration(user.id, integration.id);
      toast.success(`Integration "${integration.name}" installed successfully`);
      onInstallIntegration({
        ...integration,
        isInstalled: true
      });
    } catch (error) {
      console.error("Error installing integration:", error);
      toast.error("Failed to install integration");
    }
  };

  const handleUninstall = async (integration: BotpressIntegration) => {
    if (!user?.id) {
      toast.error("You need to be logged in to uninstall integrations");
      return;
    }
    
    try {
      await integrationsService.uninstallIntegration(user.id, integration.id);
      toast.success(`Integration "${integration.name}" uninstalled successfully`);
      onInstallIntegration({
        ...integration,
        isInstalled: false
      });
    } catch (error) {
      console.error("Error uninstalling integration:", error);
      toast.error("Failed to uninstall integration");
    }
  };

  const showDetailView = (integration: BotpressIntegration) => {
    setDetailIntegration(integration);
  };

  const backToList = () => {
    setDetailIntegration(null);
  };

  const isLoading = isLoadingAvailable || isLoadingUser;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] max-h-[800px] flex flex-col overflow-hidden p-0">
        {detailIntegration ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center p-4 border-b">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mr-2" 
                onClick={backToList}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <DialogTitle className="flex-1">Integration Details</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <div className="flex items-start mb-6">
                <div className="w-16 h-16 rounded-md border bg-background flex items-center justify-center overflow-hidden mr-4 flex-shrink-0">
                  <LogoIcon icon={detailIntegration.icon} alt={detailIntegration.name} size="lg" className="w-12 h-12" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {detailIntegration.name}
                      {detailIntegration.isInstalled && (
                        <CheckCircle2 className="text-green-500 h-4 w-4" />
                      )}
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full ml-2">
                        {detailIntegration.version || "1.0"}
                      </span>
                    </h3>
                    {!detailIntegration.isInstalled ? (
                      <Button 
                        onClick={() => handleInstall(detailIntegration)}
                        className="ml-auto"
                      >
                        Install
                      </Button>
                    ) : (
                      <div className="ml-auto flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleUninstall(detailIntegration)}
                        >
                          Uninstall
                        </Button>
                        <Button 
                          variant="outline" 
                          disabled
                        >
                          Installed
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <span>by Rantir Core Community</span>
                    <span className="mx-2">•</span>
                    <span className="bg-secondary/50 px-2 py-0.5 rounded text-xs">{detailIntegration.category}</span>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    {detailIntegration.description}
                  </p>
                  
                  <div className="mt-8">
                    <h4 className="text-lg font-medium mb-3">About this integration</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {detailIntegration.description}
                    </p>
                    
                    <div className="prose prose-sm max-w-none">
                      <p>
                        Integrate {detailIntegration.name} with your Rantir Core chatbots to extend functionality and 
                        provide a better experience for your users. This integration allows seamless connection 
                        between your bots and {detailIntegration.name}'s powerful features.
                      </p>
                      
                      <h5 className="text-base font-medium mt-4 mb-2">Key Features</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Easy setup and configuration</li>
                        <li>Seamless integration with your existing bots</li>
                        <li>Enhanced capabilities through {detailIntegration.name}'s API</li>
                        <li>Improved user experience and engagement</li>
                      </ul>
                      
                      <h5 className="text-base font-medium mt-4 mb-2">Requirements</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>A Botpress account</li>
                        <li>A {detailIntegration.name} account</li>
                        <li>API credentials for {detailIntegration.name}</li>
                      </ul>
                    </div>
                    
                    {detailIntegration.isInstalled && (
                      <div className="mt-8 border-t pt-6">
                        <h4 className="text-lg font-medium mb-3">Configuration</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configure your integration settings below:
                        </p>
                        <div className="bg-secondary/20 rounded-md p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            MCP (Managed Configuration Panel) Coming Soon
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Find an Integration</DialogTitle>
              <DialogDescription>
                Supercharge your bot with ready-to-use integrations.
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative px-6 py-3 border-b">
              <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10" 
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
            
            <div className="flex overflow-x-auto whitespace-nowrap px-6 py-3 border-b gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-3 py-1 text-xs rounded-full ${
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
            
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {filteredIntegrations.length > 0 ? (
                    filteredIntegrations.map((integration) => (
                      <div 
                        key={integration.id} 
                        className="border rounded-md p-4 bg-background hover:bg-secondary/20 transition-colors cursor-pointer flex flex-col"
                      >
                        <div className="flex items-start mb-3">
                          <div className="w-10 h-10 rounded overflow-hidden border bg-background flex-shrink-0 flex items-center justify-center mr-3">
                            <LogoIcon icon={integration.icon} alt={integration.name} size="md" className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-sm flex items-center">
                                {integration.name}
                                {integration.isInstalled && (
                                  <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-green-500" />
                                )}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">by Rantir Core Community</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                          {integration.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => showDetailView(integration)}
                          >
                            View details
                          </Button>
                          {!integration.isInstalled ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleInstall(integration)}
                            >
                              Install
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleUninstall(integration)}
                              >
                                Uninstall
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled
                              >
                                Installed
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-muted-foreground mb-2">No integrations found matching your criteria</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("All");
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
