import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

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

export function BodyActionsTab() {
  const { currentProject, currentPage, updatePageBodyProperties } = useAppBuilderStore();
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pageLoad: true,
    visibility: true,
    analytics: false,
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
        {/* Page Load Actions Section */}
        <Collapsible open={openSections.pageLoad} onOpenChange={() => toggleSection('pageLoad')}>
          <SectionHeader title="Page Load Actions" isOpen={openSections.pageLoad} onToggle={() => toggleSection('pageLoad')} />
          <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">On Page Load</Label>
                <Select
                  value={bodyProps.onLoadAction || 'none'}
                  onValueChange={(value) => handlePropertyChange('onLoadAction', value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No action</SelectItem>
                    <SelectItem value="redirect">Redirect to URL</SelectItem>
                    <SelectItem value="scroll">Scroll to element</SelectItem>
                    <SelectItem value="custom">Custom JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bodyProps.onLoadAction === 'redirect' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Redirect URL</Label>
                  <Input
                    value={bodyProps.redirectUrl || ''}
                    onChange={(e) => handlePropertyChange('redirectUrl', e.target.value)}
                    placeholder="https://example.com or /page"
                    className="h-7 text-xs"
                  />
                </div>
              )}

              {bodyProps.onLoadAction === 'scroll' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scroll Target</Label>
                  <Input
                    value={bodyProps.scrollTarget || ''}
                    onChange={(e) => handlePropertyChange('scrollTarget', e.target.value)}
                    placeholder="section-id"
                    className="h-7 text-xs"
                  />
                </div>
              )}

              {bodyProps.onLoadAction === 'custom' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom Script</Label>
                  <textarea
                    value={bodyProps.onLoadScript || ''}
                    onChange={(e) => handlePropertyChange('onLoadScript', e.target.value)}
                    placeholder="// JavaScript to run on page load..."
                    className="w-full h-24 px-2 py-1.5 text-xs font-mono border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-muted/50"
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Page Visibility Section */}
        <Collapsible open={openSections.visibility} onOpenChange={() => toggleSection('visibility')}>
          <SectionHeader title="Page Visibility" isOpen={openSections.visibility} onToggle={() => toggleSection('visibility')} />
          <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Access Control</Label>
                <Select
                  value={bodyProps.accessControl || 'public'}
                  onValueChange={(value) => handlePropertyChange('accessControl', value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="authenticated">Authenticated Users Only</SelectItem>
                    <SelectItem value="role-based">Role-based Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bodyProps.accessControl === 'role-based' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Allowed Roles</Label>
                  <Input
                    value={bodyProps.allowedRoles || ''}
                    onChange={(e) => handlePropertyChange('allowedRoles', e.target.value)}
                    placeholder="admin, editor, viewer"
                    className="h-7 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated list of roles</p>
                </div>
              )}

              {(bodyProps.accessControl === 'authenticated' || bodyProps.accessControl === 'role-based') && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Redirect if Unauthorized</Label>
                  <Input
                    value={bodyProps.unauthorizedRedirect || ''}
                    onChange={(e) => handlePropertyChange('unauthorizedRedirect', e.target.value)}
                    placeholder="/login"
                    className="h-7 text-xs"
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Analytics Section */}
        <Collapsible open={openSections.analytics} onOpenChange={() => toggleSection('analytics')}>
          <SectionHeader title="Analytics & Tracking" isOpen={openSections.analytics} onToggle={() => toggleSection('analytics')} />
          <CollapsibleContent>
            <div className="p-3 bg-card">
              <div className="p-2 rounded-md bg-muted/50 border border-dashed border-border">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Page-level analytics can be configured in project settings for consistent tracking across all pages.
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
