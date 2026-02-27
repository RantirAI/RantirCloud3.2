import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Settings, Trash2, Copy, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSettingsSlideout } from './PageSettingsSlideout';

export function PageManager() {
  const { currentProject, currentPage, addPage, removePage, setCurrentPage, duplicatePage } = useAppBuilderStore();
  const [newPageName, setNewPageName] = useState('');
  const [showAddPage, setShowAddPage] = useState(false);
  const [selectedPageForSettings, setSelectedPageForSettings] = useState<string | null>(null);

  if (!currentProject) return null;

  const handleAddPage = () => {
    if (newPageName.trim()) {
      addPage({
        name: newPageName.trim(),
        route: `/${newPageName.trim().toLowerCase().replace(/\s+/g, '-')}`,
        components: [],
        layout: { type: 'free', config: {} },
        settings: {
          title: newPageName.trim(),
          description: ''
        },
        parameters: []
      });
      setNewPageName('');
      setShowAddPage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPage();
    } else if (e.key === 'Escape') {
      setShowAddPage(false);
      setNewPageName('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pages</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddPage(!showAddPage)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Page
        </Button>
      </div>

      {showAddPage && (
        <div className="flex gap-2">
          <Input
            placeholder="Page name"
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            onKeyDown={handleKeyPress}
            autoFocus
          />
          <Button size="sm" onClick={handleAddPage}>
            Add
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setShowAddPage(false);
              setNewPageName('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {currentProject.pages.map((page) => (
          <div
            key={page.id}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
              page.id === currentPage
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-accent border-border"
            )}
            onClick={() => setCurrentPage(page.id)}
          >
            {page.settings.isHomePage ? (
              <Home className="h-4 w-4 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{page.name}</span>
            <span className="text-xs opacity-70">{page.route}</span>
            {page.parameters && page.parameters.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {page.parameters.length} param{page.parameters.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPageForSettings(page.id);
                }}
                title="Page settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicatePage(page.id);
                }}
                title="Duplicate page"
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              {currentProject.pages.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(page.id);
                  }}
                  title="Delete page"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentProject.pages.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No pages yet. Add your first page to get started.
        </div>
      )}

      {/* Page Settings Slideout */}
      {selectedPageForSettings && (
        <PageSettingsSlideout
          open={!!selectedPageForSettings}
          onOpenChange={(open) => {
            if (!open) setSelectedPageForSettings(null);
          }}
          pageId={selectedPageForSettings}
        />
      )}
    </div>
  );
}
