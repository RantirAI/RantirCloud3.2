import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ComponentPalette } from './ComponentPalette';
import { LayersPanel } from './LayersPanel';
import { PageSettings } from './PageSettings';
import { PrebuiltComponentPalette } from './PrebuiltComponentPalette';
import { UserComponentLibraryContent } from './UserComponentLibraryContent';
import { AssetsPanel } from './AssetsPanel';
import { Input } from '@/components/ui/input';
import { Component, Layers, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppBuilderSidebarStore } from '@/stores/appBuilderSidebarStore';

interface AppBuilderSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AppBuilderSidebar({ activeTab, onTabChange }: AppBuilderSidebarProps) {
  const { activeTab: storeTab, setActiveTab: setStoreTab } = useAppBuilderSidebarStore();
  const [currentTab, setCurrentTab] = useState(activeTab || storeTab || 'components');
  const [elementsSubTab, setElementsSubTab] = useState<'elements' | 'blocks' | 'components'>('elements');
  const [elementsSearch, setElementsSearch] = useState('');

  // Sync with store when it changes externally
  useEffect(() => {
    if (storeTab && storeTab !== currentTab) {
      setCurrentTab(storeTab);
      onTabChange?.(storeTab);
    }
  }, [storeTab]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setStoreTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
        <div className="flex border-b shrink-0">
          <button
            onClick={() => handleTabChange('components')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium border-b-2 transition-colors",
              currentTab === 'components'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Component className="h-3 w-3" />
            Elements
          </button>
          <button
            onClick={() => handleTabChange('layers')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium border-b-2 transition-colors",
              currentTab === 'layers'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3 w-3" />
            Layers
          </button>
          <button
            onClick={() => handleTabChange('pages')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium border-b-2 transition-colors",
              currentTab === 'pages'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3 w-3" />
            Pages
          </button>
          <button
            onClick={() => handleTabChange('assets')}
            className={cn(
              "flex items-center justify-center py-2 px-3 text-[11px] font-medium border-b-2 transition-colors",
              currentTab === 'assets'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Image className="h-3 w-3" />
          </button>
        </div>

        <TabsContent value="components" className="flex-1 mt-1 min-h-0">
          <div className="h-full flex flex-col">
            {/* Unified search */}
            <div className="p-3 border-b shrink-0">
              <Input
                placeholder="Search elements, blocks, components..."
                value={elementsSearch}
                onChange={(e) => setElementsSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Sub-tabs for Elements, Blocks, Components */}
            <div className="border-b shrink-0">
              <div className="flex">
                <button
                  onClick={() => setElementsSubTab('elements')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                    elementsSubTab === 'elements'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Elements
                </button>
                <button
                  onClick={() => setElementsSubTab('blocks')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                    elementsSubTab === 'blocks'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Blocks
                </button>
                <button
                  onClick={() => setElementsSubTab('components')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                    elementsSubTab === 'components'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Components
                </button>
              </div>
            </div>

            {/* Content based on sub-tab */}
            <div className="flex-1 min-h-0">
              {elementsSubTab === 'elements' && (
                <ComponentPalette searchFilter={elementsSearch} />
              )}
              {elementsSubTab === 'blocks' && (
                <PrebuiltComponentPalette searchFilter={elementsSearch} />
              )}
              {elementsSubTab === 'components' && (
                <UserComponentLibraryContent searchFilter={elementsSearch} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 mt-1 min-h-0">
          <div className="h-full">
            <LayersPanel />
          </div>
        </TabsContent>

        <TabsContent value="pages" className="flex-1 mt-1 min-h-0">
          <div className="h-full">
            <PageSettings />
          </div>
        </TabsContent>

        <TabsContent value="assets" className="flex-1 mt-1 min-h-0">
          <div className="h-full">
            <AssetsPanel searchFilter={elementsSearch} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
