import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, Copy, X, Info, MoreVertical, Globe, Plus } from 'lucide-react';
import { AppPage } from '@/types/appBuilder';
import { Separator } from '@/components/ui/separator';

interface PageSettingsPanelProps {
  pageId: string;
  onClose: () => void;
}

export function PageSettingsPanel({ pageId, onClose }: PageSettingsPanelProps) {
  const { currentProject, updatePage, removePage, duplicatePage } = useAppBuilderStore();
  const [activeTab, setActiveTab] = useState('settings');

  const page = currentProject?.pages.find((p) => p.id === pageId);
  if (!page) return null;

  const handleUpdatePage = (updates: Partial<AppPage>) => {
    updatePage(pageId, updates);
  };

  const handleUpdateSettings = (key: string, value: any) => {
    handleUpdatePage({
      settings: {
        title: page.settings?.title || page.name || '',
        ...(page.settings || {}),
        [key]: value,
      },
    });
  };

  const handleUpdateSeo = (key: string, value: any) => {
    handleUpdatePage({
      settings: {
        title: page.settings?.title || page.name || '',
        ...(page.settings || {}),
        seo: {
          ...(page.settings?.seo || {}),
          [key]: value,
        },
      },
    });
  };

  const handleSetHomePage = (isHome: boolean) => {
    if (isHome && currentProject) {
      currentProject.pages.forEach((p) => {
        if (p.id !== pageId && p.settings.isHomePage) {
          updatePage(p.id, {
            settings: { ...p.settings, isHomePage: false },
          });
        }
      });
    }
    handleUpdateSettings('isHomePage', isHome);
  };

  const handleDelete = () => {
    if (currentProject && currentProject.pages.length > 1) {
      removePage(pageId);
      onClose();
    }
  };

  const handleDuplicate = () => {
    duplicatePage(pageId);
    onClose();
  };

  // Parameters management
  const parameters = (page.settings as any).parameters || [];

  const handleAddParameter = () => {
    const newParams = [...parameters, { name: '', type: 'string', required: false }];
    handleUpdateSettings('parameters', newParams);
  };

  const handleUpdateParameter = (index: number, field: string, value: any) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    handleUpdateSettings('parameters', newParams);
  };

  const handleRemoveParameter = (index: number) => {
    const newParams = parameters.filter((_: any, i: number) => i !== index);
    handleUpdateSettings('parameters', newParams);
  };

  const seoTitle = page.settings.seo?.title || page.settings.title || page.name || 'Untitled';

  // Build route preview with parameters
  const routePreview = parameters.length > 0
    ? `${page.route}${parameters.map((p: any) => `/:${p.name || 'param'}`).join('')}`
    : page.route;

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium">Page Settings</span>
        <div className="flex items-center gap-1">
          {currentProject && currentProject.pages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger 
            value="settings" 
            className="rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:text-primary"
          >
            Settings
          </TabsTrigger>
          <TabsTrigger 
            value="parameters" 
            className="rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:text-primary"
          >
            Parameters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Page Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Page Name</Label>
                <Input
                  className="h-9 bg-muted/50 border-0"
                  value={page.name}
                  onChange={(e) => handleUpdatePage({ name: e.target.value })}
                />
              </div>

              {/* Make Home Page Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isHomePage"
                  checked={page.settings.isHomePage || false}
                  onCheckedChange={(checked) => handleSetHomePage(checked === true)}
                />
                <Label htmlFor="isHomePage" className="text-sm cursor-pointer">
                  Make "{page.name}" the home page
                </Label>
              </div>

              {/* Path */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Path</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">The URL path for this page</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  className="h-9 bg-muted/50 border-0"
                  value={page.route}
                  onChange={(e) => handleUpdatePage({ route: e.target.value })}
                  placeholder="/page-path"
                />
              </div>

              {/* Status Code */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Status Code</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">HTTP status code for this page</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  className="h-9 bg-muted/50 border-0"
                  value={String(page.settings.statusCode || 200)}
                  onChange={(e) => handleUpdateSettings('statusCode', Number(e.target.value))}
                />
              </div>

              {/* Document Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Document Type</Label>
                <Select
                  value={(page.settings as any).documentType || 'html'}
                  onValueChange={(v) => handleUpdateSettings('documentType', v)}
                >
                  <SelectTrigger className="h-9 bg-muted/50 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Search Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Search</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optimize the way this page appears in search engine results pages.
                  </p>
                </div>

                {/* Search Result Preview */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Search Result Preview</Label>
                  <div className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="truncate">https://your-app.com{page.route}</span>
                      <MoreVertical className="h-3.5 w-3.5 ml-auto" />
                    </div>
                    <p className="text-sm text-primary font-medium">{seoTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {page.settings.seo?.description || page.settings.description || ''}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Title</Label>
                  <Input
                    className="h-9 bg-muted/50 border-0"
                    value={page.settings.seo?.title || page.settings.title || ''}
                    onChange={(e) => handleUpdateSeo('title', e.target.value)}
                    placeholder="Untitled"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    className="bg-muted/50 border-0 min-h-[80px] resize-none"
                    value={page.settings.seo?.description || page.settings.description || ''}
                    onChange={(e) => handleUpdateSeo('description', e.target.value)}
                    placeholder="Add a description..."
                  />
                </div>

                {/* Exclude from search */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excludeFromSearch"
                    checked={page.settings.excludeFromSearch || false}
                    onCheckedChange={(checked) => handleUpdateSettings('excludeFromSearch', checked === true)}
                  />
                  <Label htmlFor="excludeFromSearch" className="text-sm cursor-pointer">
                    Exclude this page from search results
                  </Label>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Language</Label>
                  <Input
                    className="h-9 bg-muted/50 border-0"
                    value={page.settings.language || 'en-US'}
                    onChange={(e) => handleUpdateSettings('language', e.target.value)}
                    placeholder="en-US"
                  />
                </div>
              </div>

              <Separator />

              {/* Social Image Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Social Image</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This image appears when you share a link to this page on social media sites. If no image is set here, the Social Image set in the Project Settings will be used. The optimal dimensions for the image are 1200x630 px or larger with a 1.91:1 aspect ratio.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Input
                    className="h-9 bg-muted/50 border-0"
                    value={page.settings.seo?.image || ''}
                    onChange={(e) => handleUpdateSeo('image', e.target.value)}
                    placeholder="https://www.url.com"
                  />
                </div>

                <Button variant="outline" size="sm" className="w-auto">
                  Choose Image From Assets
                </Button>
              </div>

              <Separator />

              {/* Custom Code Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Custom Code</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add custom code snippets to the head or body of this page.
                  </p>
                </div>

                {/* Custom Head Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Custom Head Code</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Code added to the &lt;head&gt; section</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    className="bg-muted/50 border-0 min-h-[100px] resize-none font-mono text-xs"
                    value={(page.settings as any).customHeadCode || ''}
                    onChange={(e) => handleUpdateSettings('customHeadCode', e.target.value)}
                    placeholder="<!-- Add scripts, meta tags, styles... -->"
                  />
                </div>

                {/* Custom Body Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Custom Body Code</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Code added before &lt;/body&gt; closing tag</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    className="bg-muted/50 border-0 min-h-[100px] resize-none font-mono text-xs"
                    value={(page.settings as any).customBodyCode || ''}
                    onChange={(e) => handleUpdateSettings('customBodyCode', e.target.value)}
                    placeholder="<!-- Add tracking scripts, widgets... -->"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="parameters" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">URL Parameters</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define dynamic parameters for this page's URL.
                </p>
              </div>

              {/* Route Preview */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Route Preview</Label>
                <div className="bg-muted/50 rounded-md px-3 py-2 text-sm font-mono">
                  {routePreview}
                </div>
              </div>

              {/* Parameters List */}
              <div className="space-y-2">
                {parameters.map((param: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-card">
                    <Input
                      className="h-8 bg-muted/50 border-0 flex-1"
                      value={param.name}
                      onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                      placeholder="paramName"
                    />
                    <Select
                      value={param.type || 'string'}
                      onValueChange={(v) => handleUpdateParameter(index, 'type', v)}
                    >
                      <SelectTrigger className="h-8 w-24 bg-muted/50 border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={param.required || false}
                        onCheckedChange={(checked) => handleUpdateParameter(index, 'required', checked === true)}
                      />
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveParameter(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleAddParameter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}