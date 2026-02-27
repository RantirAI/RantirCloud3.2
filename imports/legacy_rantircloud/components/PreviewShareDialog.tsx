import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, ExternalLink, Table2, LayoutGrid, Grid3X3, Settings, Sun, Moon } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface PreviewShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  databaseColor?: string;
}

export function PreviewShareDialog({ isOpen, onClose, tableId, tableName, databaseColor = '#3B82F6' }: PreviewShareDialogProps) {
  const [copied, setCopied] = useState<string>("");
  const [viewThemes, setViewThemes] = useState<{[key: string]: 'light' | 'dark'}>({
    table: 'light',
    cards: 'light', 
    kanban: 'light',
    form: 'light'
  });
  const [showIds, setShowIds] = useState<{[key: string]: boolean}>({
    table: false,
    cards: false,
    kanban: false,
    form: false
  });

  const baseUrl = `${window.location.origin}`;
  
  const links = {
    table: `${baseUrl}/view/spreadsheet/${tableId}?theme=${viewThemes.table}&showId=${showIds.table}`,
    cards: `${baseUrl}/view/cards/${tableId}?theme=${viewThemes.cards}&showId=${showIds.cards}`,
    kanban: `${baseUrl}/view/kanban/${tableId}?theme=${viewThemes.kanban}&showId=${showIds.kanban}`,
    form: `${baseUrl}/view/form/${tableId}`
  };

  const embeds = {
    table: `<iframe
  src="${baseUrl}/view/spreadsheet/${tableId}?theme=${viewThemes.table}&showId=${showIds.table}"
  width="100%"
  height="600"
  style="border:none;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)"
  title="${tableName} - Table View"
></iframe>`,
    cards: `<iframe
  src="${baseUrl}/view/cards/${tableId}?theme=${viewThemes.cards}&showId=${showIds.cards}"
  width="100%"
  height="600"
  style="border:none;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)"
  title="${tableName} - Cards View"
></iframe>`,
    kanban: `<iframe
  src="${baseUrl}/view/kanban/${tableId}?theme=${viewThemes.kanban}&showId=${showIds.kanban}"
  width="100%"
  height="600"
  style="border:none;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)"
  title="${tableName} - Kanban View"
></iframe>`,
    form: `<iframe
  src="${baseUrl}/view/form/${tableId}?background=ffffff&opacity=1"
  width="100%"
  height="600"
  style="border:none;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)"
  title="${tableName} - Form"
></iframe>`
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(""), 2000);
        toast.success(`${type} copied to clipboard`);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const viewTypes = [
    { id: 'table', name: 'Table View', icon: Table2, description: 'Spreadsheet-style data view' },
    { id: 'cards', name: 'Cards View', icon: LayoutGrid, description: 'Card-based layout' },
    { id: 'kanban', name: 'Kanban View', icon: Grid3X3, description: 'Kanban board layout' },
    { id: 'form', name: 'Form View', icon: Settings, description: 'Form for data collection' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Share & Embed</DialogTitle>
        </DialogHeader>
        
        <div className="w-full">
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {viewTypes.map(view => {
              const Icon = view.icon;
              return (
                <TabsTrigger 
                  key={view.id} 
                  value={view.id} 
                  className="text-sm font-medium"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {view.name.split(' ')[0]}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {viewTypes.map(view => (
            <TabsContent key={view.id} value={view.id} className="space-y-4">
              <div className="text-center border-b pb-3">
                <h3 className="font-semibold">{view.name}</h3>
                <p className="text-sm text-muted-foreground">{view.description}</p>
                
                {/* Theme Switch - Only for non-form views */}
                {view.id !== 'form' && (
                  <>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <Sun className="h-4 w-4" />
                      <Switch
                        checked={viewThemes[view.id as keyof typeof viewThemes] === 'dark'}
                        onCheckedChange={(checked) => {
                          setViewThemes(prev => ({
                            ...prev,
                            [view.id]: checked ? 'dark' : 'light'
                          }));
                        }}
                      />
                      <Moon className="h-4 w-4" />
                      <span className="text-xs text-muted-foreground ml-2">
                        {viewThemes[view.id as keyof typeof viewThemes] === 'dark' ? 'Dark' : 'Light'} theme
                      </span>
                    </div>
                    
                    {/* Show ID Switch */}
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">Show ID</span>
                      <Switch
                        checked={showIds[view.id as keyof typeof showIds]}
                        onCheckedChange={(checked) => {
                          setShowIds(prev => ({
                            ...prev,
                            [view.id]: checked
                          }));
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {showIds[view.id as keyof typeof showIds] ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Share Link */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Share Link</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={links[view.id as keyof typeof links]}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(links[view.id as keyof typeof links], `${view.name} Link`)}
                    >
                      {copied === `${view.name} Link` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(links[view.id as keyof typeof links], '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Open in new tab
                  </Button>
                </div>

                {/* Embed Code */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Embed Code</Label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={embeds[view.id as keyof typeof embeds]}
                      readOnly
                      className="flex-1 text-xs p-2 border rounded resize-none h-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => copyToClipboard(embeds[view.id as keyof typeof embeds], `${view.name} Embed`)}
                    >
                      {copied === `${view.name} Embed` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste this code into your website HTML to embed this view.
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}