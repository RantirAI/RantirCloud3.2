import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogContentInner } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Upload, Link as LinkIcon, FileArchive, Clipboard, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { 
  parseClipboardContent, 
  getClipboardSummary,
  ParsedClipboardData,
  ClipboardSourceType 
} from '@/lib/clipboardParser';
import { inspectPasteEvent, inspectClipboardAsync, getBestClipboardContent } from '@/lib/clipboardInspector';
import { convertClipboardToComponents, getConversionSummary, UnifiedConversionResult } from '@/lib/converters';

// Import icons
import webflowIcon from '@/assets/icons/webflow-icon.png';
import figmaIcon from '@/assets/icons/figma-icon.jpg';
import framerIcon from '@/assets/icons/framer-icon.png';
import wordpressIcon from '@/assets/icons/wordpress-icon.png';
import shopifyIcon from '@/assets/icons/shopify-icon.png';
import githubIcon from '@/assets/icons/github-icon.jpg';

interface ImportOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportSource = 'webflow' | 'figma' | 'framer' | 'wordpress' | 'shopify' | 'github' | 'zip';

interface ImportSourceConfig {
  id: ImportSource;
  name: string;
  icon: string;
  options: ('code' | 'zip' | 'link')[];
}

const codeImportSources: ImportSourceConfig[] = [
  { id: 'webflow', name: 'Webflow', icon: webflowIcon, options: ['code', 'zip'] },
  { id: 'figma', name: 'Figma', icon: figmaIcon, options: ['code', 'zip'] },
  { id: 'framer', name: 'Framer', icon: framerIcon, options: ['code', 'zip'] },
];

const linkImportSources: ImportSourceConfig[] = [
  { id: 'wordpress', name: 'WordPress', icon: wordpressIcon, options: ['link', 'zip'] },
  { id: 'shopify', name: 'Shopify', icon: shopifyIcon, options: ['link', 'zip'] },
  { id: 'github', name: 'GitHub', icon: githubIcon, options: ['link', 'zip'] },
];

export function ImportOptionsModal({ open, onOpenChange }: ImportOptionsModalProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [importTab, setImportTab] = useState<'code' | 'link' | 'zip'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedClipboardData | null>(null);
  const [conversionResult, setConversionResult] = useState<UnifiedConversionResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Parse clipboard content when code input changes
  useEffect(() => {
    if (codeInput.trim()) {
      setIsParsing(true);
      const timeout = setTimeout(() => {
        const result = parseClipboardContent(codeInput);
        setParsedData(result);
        if (result.isValid) {
          const conversion = convertClipboardToComponents(result);
          setConversionResult(conversion);
        } else {
          setConversionResult(null);
        }
        setIsParsing(false);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setParsedData(null);
      setConversionResult(null);
    }
  }, [codeInput]);

  const handleSelectSource = (source: ImportSource) => {
    setSelectedSource(source);
    // Set default tab based on source type
    const config = [...codeImportSources, ...linkImportSources].find(s => s.id === source);
    if (config) {
      setImportTab(config.options[0]);
    }
  };

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const inspection = await inspectClipboardAsync();
      if (inspection.error) {
        toast.error(inspection.error.message);
        return;
      }
      const content = getBestClipboardContent(inspection);
      if (content) {
        setCodeInput(content);
        toast.success('Pasted from clipboard');
      } else {
        toast.error('No content in clipboard');
      }
    } catch (error) {
      toast.error('Failed to read clipboard');
    }
  }, []);

  const handleImport = () => {
    if (!selectedSource) return;
    
    if (importTab === 'code' && codeInput.trim()) {
      if (parsedData?.isValid) {
        toast.success(`Importing ${getClipboardSummary(parsedData).description} from ${selectedSource}...`);
      } else {
        toast.success(`Importing from ${selectedSource} code...`);
      }
      // Handle code import
    } else if (importTab === 'link' && linkInput.trim()) {
      toast.success(`Importing from ${selectedSource} link...`);
      // Handle link import
    } else if (importTab === 'zip') {
      // Trigger file upload
      document.getElementById('zip-upload-input')?.click();
    }
    
    onOpenChange(false);
    setSelectedSource(null);
    setCodeInput('');
    setLinkInput('');
    setParsedData(null);
  };

  const handleZipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Uploading ${file.name}...`);
      // Handle zip upload
    }
    e.target.value = '';
  };

  const getSourceMatchIcon = (): React.ReactNode => {
    if (!parsedData || !selectedSource) return null;
    
    const sourceMap: Record<ClipboardSourceType, ImportSource[]> = {
      webflow: ['webflow'],
      figma: ['figma'],
      framer: ['framer'],
      html: ['webflow', 'figma', 'framer'],
      unknown: []
    };
    
    const matchingSources = sourceMap[parsedData.source] || [];
    const isMatch = matchingSources.includes(selectedSource);
    
    if (parsedData.isValid && isMatch) {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    } else if (parsedData.isValid && !isMatch && parsedData.source !== 'unknown') {
      return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
    }
    return null;
  };

  const getSelectedConfig = () => {
    return [...codeImportSources, ...linkImportSources].find(s => s.id === selectedSource);
  };

  const renderSourceButton = (source: ImportSourceConfig) => (
    <button
      key={source.id}
      onClick={() => handleSelectSource(source.id)}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
        "hover:border-primary hover:bg-primary/5",
        selectedSource === source.id && "border-primary bg-primary/10"
      )}
    >
      <img 
        src={source.icon} 
        alt={source.name} 
        className="w-8 h-8 rounded-md object-cover"
      />
      <span className="text-[10px] text-muted-foreground">{source.name}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-1.5">
            <FileArchive className="h-3.5 w-3.5" />
            Import
          </DialogTitle>
        </DialogHeader>
        <DialogContentInner className="p-3 gap-3">
          {!selectedSource ? (
            <div className="space-y-3">
              {/* Code import sources */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Paste code or upload</p>
                <div className="flex gap-2">
                  {codeImportSources.map(renderSourceButton)}
                </div>
              </div>
              
              {/* Link import sources */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Import via link or upload</p>
                <div className="flex gap-2">
                  {linkImportSources.map(renderSourceButton)}
                  <button
                    onClick={() => handleSelectSource('zip')}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      "hover:border-primary hover:bg-primary/5",
                      selectedSource === 'zip' && "border-primary bg-primary/10"
                    )}
                  >
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <FileArchive className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">ZIP</span>
                  </button>
                </div>
              </div>
            </div>
          ) : selectedSource === 'zip' ? (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedSource(null)}
              >
                ← Back
              </Button>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <FileArchive className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-2">Drop your ZIP file here</p>
                <Button size="sm" className="h-7 text-xs" onClick={() => document.getElementById('zip-upload-input')?.click()}>
                  <Upload className="h-3 w-3 mr-1" />
                  Choose File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedSource(null)}
                >
                  ← Back
                </Button>
                <div className="flex items-center gap-1.5">
                  <img 
                    src={getSelectedConfig()?.icon} 
                    alt={getSelectedConfig()?.name} 
                    className="w-5 h-5 rounded object-cover"
                  />
                  <span className="text-xs font-medium">{getSelectedConfig()?.name}</span>
                </div>
              </div>
              
              <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)}>
                <TabsList className="h-7 w-full">
                  {getSelectedConfig()?.options.includes('code') && (
                    <TabsTrigger value="code" className="text-xs h-6 flex-1">
                      <Code2 className="h-3 w-3 mr-1" />
                      Paste Code
                    </TabsTrigger>
                  )}
                  {getSelectedConfig()?.options.includes('link') && (
                    <TabsTrigger value="link" className="text-xs h-6 flex-1">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Link
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="zip" className="text-xs h-6 flex-1">
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="code" className="mt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Paste your code</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={handlePasteFromClipboard}
                      >
                        <Clipboard className="h-3 w-3" />
                        Paste
                      </Button>
                    </div>
                    <div className="relative">
                      <Textarea 
                        className="w-full min-h-[120px] max-h-[300px] text-xs p-3 rounded-lg resize-y font-mono"
                        placeholder={`Copy from ${getSelectedConfig()?.name} and paste here...\n\nWebflow: Select elements → Right-click → Copy\nFigma: Select layers → Cmd/Ctrl+C\nFramer: Select components → Cmd/Ctrl+C`}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        onPaste={(e) => {
                          // Allow native paste to work
                          const text = e.clipboardData.getData('text/plain');
                          if (text) {
                            e.preventDefault();
                            setCodeInput(text);
                          }
                        }}
                      />
                      {isParsing && (
                        <div className="absolute top-2 right-2">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Parsed data feedback */}
                    {parsedData && codeInput.trim() && (
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-xs",
                        parsedData.isValid 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      )}>
                        {getSourceMatchIcon()}
                        <span>
                          {parsedData.isValid ? (
                            <>
                              Detected: <strong className="capitalize">{parsedData.source}</strong>
                              {' • '}
                              {getClipboardSummary(parsedData).description}
                            </>
                          ) : (
                            parsedData.error || 'Unable to parse clipboard data'
                          )}
                        </span>
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      className="w-full h-7 text-xs" 
                      onClick={handleImport} 
                      disabled={!codeInput.trim()}
                    >
                      {parsedData?.isValid ? (
                        <>Import {getClipboardSummary(parsedData).nodeCount} Elements</>
                      ) : (
                        'Import Code'
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Enter URL</Label>
                    <Input 
                      className="h-8 text-xs"
                      placeholder="https://..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                    />
                    <Button size="sm" className="w-full h-7 text-xs" onClick={handleImport} disabled={!linkInput.trim()}>
                      Import from URL
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="zip" className="mt-2">
                  <div className="border-2 border-dashed rounded-lg p-3 text-center">
                    <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground mb-1.5">Drop ZIP file here</p>
                    <Button size="sm" className="h-6 text-xs" onClick={() => document.getElementById('zip-upload-input')?.click()}>
                      Choose File
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <input
            id="zip-upload-input"
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleZipUpload}
          />
        </DialogContentInner>
      </DialogContent>
    </Dialog>
  );
}
