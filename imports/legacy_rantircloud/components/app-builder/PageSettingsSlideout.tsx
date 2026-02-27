import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Trash2, Copy, Plus, X, ChevronDown, Lock, Search, Code, Globe } from 'lucide-react';
import { PageParameter, AppPage } from '@/types/appBuilder';
import Editor from '@monaco-editor/react';

interface PageSettingsSlideoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
}

export function PageSettingsSlideout({ open, onOpenChange, pageId }: PageSettingsSlideoutProps) {
  const { currentProject, updatePage, removePage, duplicatePage } = useAppBuilderStore();
  const [activeTab, setActiveTab] = useState('settings');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    password: false,
    seo: false,
    customCode: false,
  });
  const [newParameter, setNewParameter] = useState<Partial<PageParameter>>({
    name: '',
    type: 'string',
    required: false,
    description: '',
  });

  const page = currentProject?.pages.find((p) => p.id === pageId);
  if (!page) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleUpdatePage = (updates: Partial<AppPage>) => {
    updatePage(pageId, updates);
  };

  const handleUpdateSettings = (key: string, value: any) => {
    handleUpdatePage({
      settings: {
        ...page.settings,
        [key]: value,
      },
    });
  };

  const handleUpdateSeo = (key: string, value: any) => {
    handleUpdatePage({
      settings: {
        ...page.settings,
        seo: {
          ...page.settings.seo,
          [key]: value,
        },
      },
    });
  };

  const handleSetHomePage = (isHome: boolean) => {
    if (isHome && currentProject) {
      // Remove isHomePage from all other pages
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

  const handleAddParameter = () => {
    if (!newParameter.name?.trim()) return;

    const parameter: PageParameter = {
      id: `param-${Date.now()}`,
      name: newParameter.name.trim(),
      type: newParameter.type as 'string' | 'number' | 'boolean' | 'object',
      required: newParameter.required || false,
      defaultValue: newParameter.defaultValue,
      description: newParameter.description?.trim() || '',
    };

    handleUpdatePage({
      parameters: [...(page.parameters || []), parameter],
    });

    setNewParameter({
      name: '',
      type: 'string',
      required: false,
      description: '',
    });
  };

  const handleRemoveParameter = (parameterId: string) => {
    handleUpdatePage({
      parameters: (page.parameters || []).filter((p) => p.id !== parameterId),
    });
  };

  const handleDelete = () => {
    if (currentProject && currentProject.pages.length > 1) {
      removePage(pageId);
      onOpenChange(false);
    }
  };

  const handleDuplicate = () => {
    duplicatePage(pageId);
    onOpenChange(false);
  };

  // Build route preview with parameters
  const routePreview = (() => {
    let route = page.route;
    if (page.parameters && page.parameters.length > 0) {
      const paramParts = page.parameters.map((p) => `:${p.name}${p.required ? '' : '?'}`);
      route = `${route}/${paramParts.join('/')}`;
    }
    return route;
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <SheetTitle className="text-lg">Page Settings</SheetTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDuplicate}
              title="Duplicate page"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {currentProject && currentProject.pages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
                title="Delete page"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border/50 rounded-none gap-0">
            <TabsTrigger 
              value="settings" 
              className="flex-1 px-3 py-2 text-xs font-medium rounded-none border-0 shadow-none text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="parameters"
              className="flex-1 px-3 py-2 text-xs font-medium rounded-none border-0 shadow-none text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              Parameters
              {page.parameters && page.parameters.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                  {page.parameters.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 px-4 py-4 space-y-2">
            {/* General Section */}
            <Collapsible
              open={expandedSections.general}
              onOpenChange={() => toggleSection('general')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  General
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.general ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="pageName">Page Name</Label>
                  <Input
                    id="pageName"
                    className="h-7 text-xs"
                    value={page.name}
                    onChange={(e) => handleUpdatePage({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pageRoute">Path</Label>
                  <Input
                    id="pageRoute"
                    className="h-7 text-xs"
                    value={page.route}
                    onChange={(e) => handleUpdatePage({ route: e.target.value })}
                    placeholder="/page-path"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="isHomePage" className="cursor-pointer text-[10px]">
                    Make this the home page
                  </Label>
                  <Switch
                    id="isHomePage"
                    className="scale-90"
                    checked={page.settings.isHomePage || false}
                    onCheckedChange={handleSetHomePage}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="statusCode">Status Code</Label>
                  <Select
                    value={String(page.settings.statusCode || 200)}
                    onValueChange={(v) => handleUpdateSettings('statusCode', Number(v))}
                  >
                    <SelectTrigger id="statusCode" className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200" className="text-xs">200 - OK</SelectItem>
                      <SelectItem value="301" className="text-xs">301 - Permanent Redirect</SelectItem>
                      <SelectItem value="302" className="text-xs">302 - Temporary Redirect</SelectItem>
                      <SelectItem value="404" className="text-xs">404 - Not Found</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Password Protection Section */}
            <Collapsible
              open={expandedSections.password}
              onOpenChange={() => toggleSection('password')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password Protection
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.password ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="passwordProtected" className="cursor-pointer text-[10px]">
                    Password Protect Page
                  </Label>
                  <Switch
                    id="passwordProtected"
                    className="scale-90"
                    checked={page.settings.passwordProtected || false}
                    onCheckedChange={(v) => handleUpdateSettings('passwordProtected', v)}
                  />
                </div>
                {page.settings.passwordProtected && (
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      className="h-7 text-xs"
                      type="password"
                      placeholder="Enter page password"
                      value={page.settings.passwordHash || ''}
                      onChange={(e) => handleUpdateSettings('passwordHash', e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Visitors will need this password to access the page.
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* SEO Section */}
            <Collapsible
              open={expandedSections.seo}
              onOpenChange={() => toggleSection('seo')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Search (SEO)
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.seo ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="seoTitle">Title</Label>
                  <Input
                    id="seoTitle"
                    className="h-7 text-xs"
                    value={page.settings.seo?.title || page.settings.title || ''}
                    onChange={(e) => handleUpdateSeo('title', e.target.value)}
                    placeholder="Page title for search engines"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="seoDescription">Description</Label>
                  <Textarea
                    id="seoDescription"
                    className="text-xs min-h-[60px]"
                    value={page.settings.seo?.description || page.settings.description || ''}
                    onChange={(e) => handleUpdateSeo('description', e.target.value)}
                    placeholder="Page description for search engines"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="excludeFromSearch" className="cursor-pointer text-[10px]">
                    Exclude from search results
                  </Label>
                  <Switch
                    id="excludeFromSearch"
                    className="scale-90"
                    checked={page.settings.excludeFromSearch || false}
                    onCheckedChange={(v) => handleUpdateSettings('excludeFromSearch', v)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={page.settings.language || 'en'}
                    onValueChange={(v) => handleUpdateSettings('language', v)}
                  >
                    <SelectTrigger id="language" className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" className="text-xs">English</SelectItem>
                      <SelectItem value="es" className="text-xs">Spanish</SelectItem>
                      <SelectItem value="fr" className="text-xs">French</SelectItem>
                      <SelectItem value="de" className="text-xs">German</SelectItem>
                      <SelectItem value="pt" className="text-xs">Portuguese</SelectItem>
                      <SelectItem value="zh" className="text-xs">Chinese</SelectItem>
                      <SelectItem value="ja" className="text-xs">Japanese</SelectItem>
                      <SelectItem value="ko" className="text-xs">Korean</SelectItem>
                      <SelectItem value="ar" className="text-xs">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="socialImage">Social Image URL</Label>
                  <Input
                    id="socialImage"
                    className="h-7 text-xs"
                    value={page.settings.seo?.image || ''}
                    onChange={(e) => handleUpdateSeo('image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Custom Code Section */}
            <Collapsible
              open={expandedSections.customCode}
              onOpenChange={() => toggleSection('customCode')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  Custom Code
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.customCode ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>Custom Head Code</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Add custom code to the &lt;head&gt; section of this page.
                  </p>
                  <div className="border rounded-md overflow-hidden h-[120px]">
                    <Editor
                      height="120px"
                      defaultLanguage="html"
                      value={page.settings.customHeadCode || ''}
                      onChange={(value) => handleUpdateSettings('customHeadCode', value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 11,
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Custom Body Code</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Add custom code before &lt;/body&gt; of this page.
                  </p>
                  <div className="border rounded-md overflow-hidden h-[120px]">
                    <Editor
                      height="120px"
                      defaultLanguage="html"
                      value={page.settings.customBodyCode || ''}
                      onChange={(value) => handleUpdateSettings('customBodyCode', value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 11,
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-3 mt-3">
            {/* Existing Parameters */}
            {page.parameters && page.parameters.length > 0 ? (
              <div className="space-y-2">
                <Label>URL Parameters</Label>
                {page.parameters.map((param) => (
                  <div
                    key={param.id}
                    className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-medium">:{param.name}</code>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {param.type}
                        </Badge>
                        {param.required && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            Required
                          </Badge>
                        )}
                      </div>
                      {param.description && (
                        <p className="text-[10px] text-muted-foreground mt-1">{param.description}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleRemoveParameter(param.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs">No parameters defined</p>
                <p className="text-[10px] mt-1">Add URL parameters like :userId or :slug</p>
              </div>
            )}

            {/* Add New Parameter */}
            <div className="space-y-2 border-t pt-3">
              <Label>Add Parameter</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Name</Label>
                  <Input
                    className="h-7 text-xs"
                    value={newParameter.name || ''}
                    onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                    placeholder="userId"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Type</Label>
                  <Select
                    value={newParameter.type}
                    onValueChange={(value) =>
                      setNewParameter({ ...newParameter, type: value as any })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string" className="text-xs">String</SelectItem>
                      <SelectItem value="number" className="text-xs">Number</SelectItem>
                      <SelectItem value="boolean" className="text-xs">Boolean</SelectItem>
                      <SelectItem value="object" className="text-xs">Object</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Description (optional)</Label>
                <Textarea
                  className="text-xs min-h-[50px]"
                  value={newParameter.description || ''}
                  onChange={(e) =>
                    setNewParameter({ ...newParameter, description: e.target.value })
                  }
                  placeholder="Describe what this parameter is for"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2 py-1">
                <Switch
                  id="paramRequired"
                  className="scale-90"
                  checked={newParameter.required || false}
                  onCheckedChange={(v) => setNewParameter({ ...newParameter, required: v })}
                />
                <Label htmlFor="paramRequired" className="text-[10px] cursor-pointer">
                  Required parameter
                </Label>
              </div>
              <Button
                onClick={handleAddParameter}
                disabled={!newParameter.name?.trim()}
                className="w-full h-7 text-xs"
                size="sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Parameter
              </Button>
            </div>

            {/* Route Preview */}
            {page.parameters && page.parameters.length > 0 && (
              <div className="border-t pt-3 space-y-1">
                <Label>Route Preview</Label>
                <code className="block p-2 bg-muted rounded-lg text-xs break-all">
                  {routePreview}
                </code>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
