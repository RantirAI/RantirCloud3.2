import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

function SectionHeader({ title, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 cursor-pointer border-b border-border/50">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        </div>
      </div>
    </CollapsibleTrigger>
  );
}

export function BodyDataSettingsTab() {
  const { currentProject, currentPage, updatePageBodyProperties } = useAppBuilderStore();
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pageMeta: true,
    openGraph: true,
    pageSettings: true,
  });

  if (!currentProject || !currentPage) return null;

  const pageData = currentProject.pages.find(p => p.id === currentPage);
  const bodyProps = pageData?.bodyProperties || {};

  const handlePropertyChange = (property: string, value: any) => {
    updatePageBodyProperties(currentPage, {
      ...bodyProps,
      [property]: value
    });
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/50">
        {/* Page Meta Section */}
        <Collapsible open={openSections.pageMeta} onOpenChange={() => toggleSection('pageMeta')}>
          <SectionHeader title="Page Meta" isOpen={openSections.pageMeta} onToggle={() => toggleSection('pageMeta')} />
          <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Page Title</Label>
                <Input
                  value={bodyProps.pageTitle || pageData?.name || ''}
                  onChange={(e) => handlePropertyChange('pageTitle', e.target.value)}
                  placeholder="Page title for SEO"
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</Label>
                <textarea
                  value={bodyProps.metaDescription || ''}
                  onChange={(e) => handlePropertyChange('metaDescription', e.target.value)}
                  placeholder="Description for search engines..."
                  className="w-full h-16 px-2 py-1.5 text-xs border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Open Graph Section */}
        <Collapsible open={openSections.openGraph} onOpenChange={() => toggleSection('openGraph')}>
          <SectionHeader title="Open Graph" isOpen={openSections.openGraph} onToggle={() => toggleSection('openGraph')} />
          <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">OG Title</Label>
                <Input
                  value={bodyProps.ogTitle || ''}
                  onChange={(e) => handlePropertyChange('ogTitle', e.target.value)}
                  placeholder="Social sharing title"
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">OG Description</Label>
                <Input
                  value={bodyProps.ogDescription || ''}
                  onChange={(e) => handlePropertyChange('ogDescription', e.target.value)}
                  placeholder="Social sharing description"
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">OG Image URL</Label>
                <Input
                  value={bodyProps.ogImage || ''}
                  onChange={(e) => handlePropertyChange('ogImage', e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Page Settings Section */}
        <Collapsible open={openSections.pageSettings} onOpenChange={() => toggleSection('pageSettings')}>
          <SectionHeader title="Page Settings" isOpen={openSections.pageSettings} onToggle={() => toggleSection('pageSettings')} />
          <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Page Slug</Label>
                <Input
                  value={bodyProps.slug || pageData?.name?.toLowerCase().replace(/\s+/g, '-') || ''}
                  onChange={(e) => handlePropertyChange('slug', e.target.value)}
                  placeholder="page-url-slug"
                  className="h-7 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">URL-friendly identifier for this page</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Canonical URL</Label>
                <Input
                  value={bodyProps.canonicalUrl || ''}
                  onChange={(e) => handlePropertyChange('canonicalUrl', e.target.value)}
                  placeholder="https://example.com/page"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
