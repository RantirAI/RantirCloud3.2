import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, FileText, Settings, Trash2, ChevronDown, Home, Copy, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageSettings() {
  const { currentProject, currentPage, addPage, removePage, setCurrentPage, duplicatePage, setPageSettingsPanel } = useAppBuilderStore();
  const [newPageName, setNewPageName] = useState('');
  const [showAddPage, setShowAddPage] = useState(false);
  const [showAddUtilityPage, setShowAddUtilityPage] = useState(false);
  const [showAddDynamicPage, setShowAddDynamicPage] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    staticPages: true,
    utilityPages: true,
    dynamicPages: true
  });

  if (!currentProject) return null;

  // Separate pages by type
  const staticPages = currentProject.pages.filter(p => !p.settings?.isUtilityPage && !p.settings?.isDynamicPage);
  const utilityPages = currentProject.pages.filter(p => p.settings?.isUtilityPage);
  const dynamicPages = currentProject.pages.filter(p => p.settings?.isDynamicPage);

  const handleAddPage = (type: 'static' | 'utility' | 'dynamic') => {
    if (newPageName.trim()) {
      const isUtility = type === 'utility';
      const isDynamic = type === 'dynamic';
      
      addPage({
        name: newPageName.trim(),
        route: isUtility 
          ? `/${newPageName.trim().toLowerCase().replace(/\s+/g, '-')}`
          : isDynamic 
            ? `/${newPageName.trim().toLowerCase().replace(/\s+/g, '-')}/:id`
            : `/${newPageName.trim().toLowerCase().replace(/\s+/g, '-')}`,
        components: [],
        layout: { type: 'free', config: {} },
        settings: {
          title: newPageName.trim(),
          description: '',
          isUtilityPage: isUtility,
          isDynamicPage: isDynamic,
        },
        parameters: isDynamic ? [{ id: 'param-id', name: 'id', type: 'string', required: true }] : []
      });
      setNewPageName('');
      setShowAddPage(false);
      setShowAddUtilityPage(false);
      setShowAddDynamicPage(false);
    }
  };

  const handleAdd404Page = () => {
    addPage({
      name: '404 Not Found',
      route: '/404',
      components: [],
      layout: { type: 'free', config: {} },
      settings: {
        title: '404 - Page Not Found',
        description: 'The page you are looking for does not exist.',
        isUtilityPage: true,
      },
      parameters: []
    });
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderPageItem = (page: typeof currentProject.pages[0], isPurple: boolean = false) => (
    <div
      key={page.id}
      className={cn(
        "group flex items-center justify-between p-1.5 rounded-md cursor-pointer hover:bg-muted/50 border border-transparent",
        page.id === currentPage && !isPurple && "bg-primary/10 border-primary/20",
        page.id === currentPage && isPurple && "bg-purple-500/10 border-purple-500/20"
      )}
      onClick={() => setCurrentPage(page.id)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {page.settings?.isUtilityPage ? (
          <AlertTriangle className={cn("h-3 w-3 flex-shrink-0", isPurple ? "text-amber-500" : "text-muted-foreground")} />
        ) : page.settings?.isDynamicPage ? (
          <Database className="h-3 w-3 flex-shrink-0 text-purple-500" />
        ) : page.settings?.isHomePage || page.route === '/' ? (
          <Home className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <FileText className={cn("h-3 w-3 flex-shrink-0", isPurple ? "text-purple-500" : "text-muted-foreground")} />
        )}
        <span className={cn("text-xs font-medium truncate", isPurple && "text-purple-600 dark:text-purple-400")}>{page.name}</span>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setPageSettingsPanel(page.id);
          }}
          className="h-5 w-5 p-0"
          title="Page settings"
        >
          <Settings className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            duplicatePage(page.id);
          }}
          className="h-5 w-5 p-0"
          title="Duplicate page"
        >
          <Copy className="h-3 w-3" />
        </Button>
        
        {page.route !== '/' && currentProject.pages.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              removePage(page.id);
            }}
            className="h-5 w-5 p-0"
            title="Delete page"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-0 space-y-2">
          {/* Static Pages */}
          <Collapsible
            open={openSections.staticPages}
            onOpenChange={() => toggleSection('staticPages')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !openSections.staticPages && "rotate-[-90deg]")} />
                  <span className="font-medium text-xs text-foreground">Static Pages</span>
                  <span className="text-[10px] text-muted-foreground">({staticPages.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddPage(!showAddPage);
                  }}
                  className="h-5 w-5 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-2 space-y-1">
                {showAddPage && (
                  <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                    <Input
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      placeholder="Page name"
                      className="h-7 text-xs"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPage('static')}
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleAddPage('static')} className="h-6 text-xs">
                        Add
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddPage(false)} className="h-6 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {staticPages.map((page) => renderPageItem(page))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Utility Pages */}
          <Collapsible
            open={openSections.utilityPages}
            onOpenChange={() => toggleSection('utilityPages')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !openSections.utilityPages && "rotate-[-90deg]")} />
                  <span className="font-medium text-xs text-foreground">Utility Pages</span>
                  <span className="text-[10px] text-muted-foreground">({utilityPages.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddUtilityPage(!showAddUtilityPage);
                  }}
                  className="h-5 w-5 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-2 space-y-1">
                {showAddUtilityPage && (
                  <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                    <Input
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      placeholder="Utility page name"
                      className="h-7 text-xs"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPage('utility')}
                    />
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" onClick={() => handleAddPage('utility')} className="h-6 text-xs">
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleAdd404Page} className="h-6 text-xs">
                        Add 404 Page
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddUtilityPage(false)} className="h-6 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {utilityPages.length === 0 && !showAddUtilityPage && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No utility pages yet. Add a 404 page to get started.</p>
                )}

                {utilityPages.map((page) => renderPageItem(page))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Dynamic Pages */}
          <Collapsible
            open={openSections.dynamicPages}
            onOpenChange={() => toggleSection('dynamicPages')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("h-3 w-3 text-purple-500 transition-transform", !openSections.dynamicPages && "rotate-[-90deg]")} />
                  <span className="font-medium text-xs text-purple-600 dark:text-purple-400">Dynamic Pages</span>
                  <span className="text-[10px] text-purple-500/70">({dynamicPages.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddDynamicPage(!showAddDynamicPage);
                  }}
                  className="h-5 w-5 p-0 text-purple-500 hover:text-purple-600"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-2 space-y-1">
                {showAddDynamicPage && (
                  <div className="space-y-2 p-2 bg-purple-500/10 rounded-md border border-purple-500/20">
                    <Input
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      placeholder="Dynamic page name"
                      className="h-7 text-xs border-purple-500/30 focus-visible:ring-purple-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPage('dynamic')}
                    />
                    <p className="text-[10px] text-purple-500/70">Dynamic pages are bound to database content and include a route parameter.</p>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleAddPage('dynamic')} className="h-6 text-xs bg-purple-600 hover:bg-purple-700">
                        Add
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddDynamicPage(false)} className="h-6 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {dynamicPages.length === 0 && !showAddDynamicPage && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No dynamic pages yet. Create pages that display database content.</p>
                )}

                {dynamicPages.map((page) => renderPageItem(page, true))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
