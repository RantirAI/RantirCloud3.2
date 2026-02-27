import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Check, FileCode, FileText, Package, FolderInput } from 'lucide-react';
import { toast } from 'sonner';
import { AIWallVariant } from '@/stores/aiWallStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { syncAllComponentClasses } from '@/lib/classSync';
import {
  generateHTMLExport,
  generateReactExport,
  generateHTMLZip,
  generateReactZip,
  downloadBlob,
  copyToClipboard,
} from '@/lib/aiWallExporter';

interface AIWallExportDialogProps {
  variant: AIWallVariant | null;
  open: boolean;
  onClose: () => void;
}

export function AIWallExportDialog({ variant, open, onClose }: AIWallExportDialogProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const components = useMemo(() => {
    if (!variant) return [];
    return variant.components.map((c: any) => c.data || c);
  }, [variant]);

  const safeName = useMemo(() => {
    if (!variant) return 'design';
    return (variant.name || 'design').replace(/\s+/g, '-').toLowerCase();
  }, [variant]);

  const componentName = useMemo(() => {
    if (!variant) return 'AIWallDesign';
    return (variant.name || 'AIWallDesign')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('') || 'AIWallDesign';
  }, [variant]);

  const htmlCode = useMemo(
    () => (components.length > 0 ? generateHTMLExport(components, variant?.name || 'Design') : ''),
    [components, variant]
  );

  const reactCode = useMemo(
    () => (components.length > 0 ? generateReactExport(components, componentName) : ''),
    [components, componentName]
  );

  const handleCopy = async (code: string, tab: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedTab(tab);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedTab(null), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadZip = async (format: 'html' | 'react') => {
    if (components.length === 0) return;
    setIsDownloading(true);
    try {
      const blob = format === 'html'
        ? await generateHTMLZip(components, variant?.name || 'Design')
        : await generateReactZip(components, variant?.name || 'Design');
      downloadBlob(blob, `${safeName}-${format}.zip`);
      toast.success(`Downloaded ${format.toUpperCase()} ZIP`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate ZIP');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLoadIntoProject = async () => {
    const { currentProject, currentPage, addComponentsBatch } = useAppBuilderStore.getState();
    if (!currentProject || !currentPage) {
      toast.error('No project is currently open. Open a project first.');
      return;
    }
    if (components.length === 0) {
      toast.error('This design has no components to load.');
      return;
    }
    // Sync semantic class names before adding to canvas (matches AI Builder pipeline)
    await syncAllComponentClasses(components);
    addComponentsBatch(components, false);
    toast.success(`Loaded "${variant?.name}" into your project!`);
    onClose();
  };

  if (!variant) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Export Design — {variant.name}
          </DialogTitle>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              Copy the code, download as ZIP, or load directly into your project.
            </p>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              onClick={handleLoadIntoProject}
            >
              <FolderInput className="w-3 h-3" />
              Load into Project
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="html" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3">
            <TabsList className="h-9">
              <TabsTrigger value="html" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="react" className="gap-1.5 text-xs">
                <FileCode className="w-3.5 h-3.5" />
                React
              </TabsTrigger>
            </TabsList>
          </div>

          {/* HTML Tab */}
          <TabsContent value="html" className="flex-1 flex flex-col min-h-0 px-6 pb-4 mt-0">
            <div className="flex items-center justify-between py-3">
              <span className="text-xs text-muted-foreground">
                Single HTML file with inline styles — paste into Builder Import or use standalone.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleCopy(htmlCode, 'html')}
                >
                  {copiedTab === 'html' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedTab === 'html' ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleDownloadZip('html')}
                  disabled={isDownloading}
                >
                  <Download className="w-3 h-3" />
                  ZIP
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
              <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                {htmlCode}
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* React Tab */}
          <TabsContent value="react" className="flex-1 flex flex-col min-h-0 px-6 pb-4 mt-0">
            <div className="flex items-center justify-between py-3">
              <span className="text-xs text-muted-foreground">
                React component (TSX) with inline styles — import via Builder or use in any React project.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleCopy(reactCode, 'react')}
                >
                  {copiedTab === 'react' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedTab === 'react' ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleDownloadZip('react')}
                  disabled={isDownloading}
                >
                  <Download className="w-3 h-3" />
                  ZIP
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
              <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                {reactCode}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
