import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, Upload, Link as LinkIcon, FileArchive, X, ArrowLeft, Clipboard, CheckCircle2, AlertCircle, Loader2, Info, FileCode, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { 
  parseClipboardContent, 
  getClipboardSummary, 
  ParsedClipboardData, 
  ClipboardSourceType 
} from '@/lib/clipboardParser';
import { 
  inspectPasteEvent, 
  inspectClipboardAsync, 
  getBestClipboardContent,
  ClipboardInspection
} from '@/lib/clipboardInspector';
import { 
  convertClipboardToComponents, 
  getConversionSummary,
  UnifiedConversionResult,
  convertReactZipToComponents,
  getReactZipConversionStats,
  convertHTMLToComponents,
  convertReactFileToComponents
} from '@/lib/converters';
import JSZip from 'jszip';

// Import icons
import webflowIcon from '@/assets/icons/webflow-icon.png';
import figmaIcon from '@/assets/icons/figma-icon.jpg';
import framerIcon from '@/assets/icons/framer-icon.png';
import wordpressIcon from '@/assets/icons/wordpress-icon.png';
import shopifyIcon from '@/assets/icons/shopify-icon.png';
import githubIcon from '@/assets/icons/github-icon.jpg';
import htmlIcon from '@/assets/icons/html-icon.jpg';
import reactIcon from '@/assets/icons/react-icon.jpg';

type ImportSource = 'webflow' | 'figma' | 'framer' | 'wordpress' | 'shopify' | 'github' | 'html' | 'react' | 'zip';

interface ImportSourceConfig {
  id: ImportSource;
  name: string;
  icon: string;
  options: ('code' | 'zip' | 'link')[];
}

interface ClipboardError {
  message: string;
  type: 'permission' | 'empty' | 'parse' | 'format' | 'unknown';
}

const codeImportSources: ImportSourceConfig[] = [
  { id: 'webflow', name: 'Webflow', icon: webflowIcon, options: ['code', 'zip'] },
  { id: 'figma', name: 'Figma', icon: figmaIcon, options: ['code', 'zip'] },
  { id: 'framer', name: 'Framer', icon: framerIcon, options: ['code', 'zip'] },
  { id: 'html', name: 'HTML', icon: htmlIcon, options: ['code', 'zip'] },
  { id: 'react', name: 'React', icon: reactIcon, options: ['zip'] },
];

const linkImportSources: ImportSourceConfig[] = [
  { id: 'wordpress', name: 'WordPress', icon: wordpressIcon, options: ['link', 'zip'] },
  { id: 'shopify', name: 'Shopify', icon: shopifyIcon, options: ['link', 'zip'] },
  { id: 'github', name: 'GitHub', icon: githubIcon, options: ['link', 'zip'] },
];

export function ImportPanel() {
  const { toggleImportPanel, addComponentsBatch, currentPage, currentProject, updatePageBodyProperties } = useAppBuilderStore();
  const { addClass } = useClassStore();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [importTab, setImportTab] = useState<'code' | 'link' | 'zip'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedClipboardData | null>(null);
  const [conversionResult, setConversionResult] = useState<UnifiedConversionResult | null>(null);
  const [clipboardError, setClipboardError] = useState<ClipboardError | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [clipboardInspection, setClipboardInspection] = useState<ClipboardInspection | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingCSSVariables, setPendingCSSVariables] = useState<Record<string, string> | null>(null);
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [importMode, setImportMode] = useState<'custom-theme' | 'content-only' | 'replace-theme'>('content-only');
  // Parse clipboard content when codeInput changes
  useEffect(() => {
    if (!codeInput.trim()) {
      setParsedData(null);
      setConversionResult(null);
      setClipboardError(null);
      return;
    }

    setIsParsing(true);
    setClipboardError(null);

    // Debounce parsing
    const timer = setTimeout(() => {
      try {
        const parsed = parseClipboardContent(codeInput);
        setParsedData(parsed);
        
        if (!parsed.isValid && parsed.error) {
          setClipboardError({
            message: parsed.error,
            type: 'parse'
          });
          setConversionResult(null);
        } else if (parsed.isValid) {
          // Try to convert the parsed data
          const result = convertClipboardToComponents(parsed);
          setConversionResult(result);
          
          if (!result.success && result.error) {
            setClipboardError({
              message: result.error,
              type: 'parse'
            });
          }
        }
      } catch (error) {
        setClipboardError({
          message: error instanceof Error ? error.message : 'Failed to parse clipboard content',
          type: 'unknown'
        });
        setParsedData(null);
        setConversionResult(null);
      } finally {
        setIsParsing(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [codeInput]);

  // Handle paste event using clipboard inspector pattern
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setClipboardError(null);
    
    // Use clipboard inspector for detailed analysis
    const inspection = inspectPasteEvent(e.nativeEvent);
    setClipboardInspection(inspection);
    
    if (inspection.error) {
      setClipboardError({
        message: inspection.error.message,
        type: inspection.error.type as ClipboardError['type']
      });
      return;
    }
    
    // Get best content from inspection
    const content = getBestClipboardContent(inspection);
    if (content) {
      setCodeInput(content);
    } else {
      setClipboardError({
        message: 'Clipboard is empty or contains unsupported content',
        type: 'empty'
      });
    }
  }, []);

  // Programmatic clipboard read using async inspector
  const handlePasteButton = useCallback(async () => {
    setClipboardError(null);
    setIsParsing(true);

    try {
      const inspection = await inspectClipboardAsync();
      setClipboardInspection(inspection);
      
      if (inspection.error) {
        setClipboardError({
          message: inspection.error.message,
          type: inspection.error.type as ClipboardError['type']
        });
        return;
      }
      
      const content = getBestClipboardContent(inspection);
      if (content) {
        setCodeInput(content);
      } else {
        setClipboardError({
          message: 'Clipboard is empty',
          type: 'empty'
        });
      }
    } catch (error) {
      console.error('Clipboard read error:', error);
      setClipboardError({
        message: 'Failed to read clipboard. Try using Ctrl/Cmd+V instead.',
        type: 'unknown'
      });
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Check if detected source matches selected source
  const getSourceMatchStatus = (): 'match' | 'mismatch' | 'unknown' => {
    if (!parsedData || !selectedSource) return 'unknown';
    
    const sourceMap: Record<ClipboardSourceType, ImportSource[]> = {
      'webflow': ['webflow'],
      'figma': ['figma'],
      'framer': ['framer'],
      'html': ['webflow', 'figma', 'framer', 'wordpress', 'shopify', 'github', 'html'],
      'unknown': []
    };

    if (parsedData.source === 'unknown') return 'unknown';
    
    const matchingSources = sourceMap[parsedData.source];
    return matchingSources.includes(selectedSource) ? 'match' : 'mismatch';
  };

  const handleSelectSource = (source: ImportSource) => {
    setSelectedSource(source);
    const config = [...codeImportSources, ...linkImportSources].find(s => s.id === source);
    if (config) {
      setImportTab(config.options[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedSource) return;
    
    if (importTab === 'code' && codeInput.trim() && conversionResult?.success) {
      setIsConverting(true);
      
      try {
        // Add style classes first
        for (const styleClass of conversionResult.styleClasses) {
          await addClass(styleClass.name, styleClass.styles, false);
        }
        
        // Apply body styles to the page body if present
        if (conversionResult.bodyStyles && Object.keys(conversionResult.bodyStyles).length > 0 && currentPage) {
          await addClass('body', conversionResult.bodyStyles, false);
          const page = currentProject?.pages.find(p => p.id === currentPage);
          const currentBodyProps = page?.bodyProperties || {};
          const currentAppliedClasses = currentBodyProps.appliedClasses || [];
          const newAppliedClasses = currentAppliedClasses.includes('body') 
            ? currentAppliedClasses 
            : [...currentAppliedClasses, 'body'];
          updatePageBodyProperties(currentPage, {
            ...currentBodyProps,
            appliedClasses: newAppliedClasses,
            activeClass: 'body',
          });
        }
        
        // Add components to the canvas
        if (conversionResult.components.length > 0 && currentPage) {
          addComponentsBatch(conversionResult.components, false);
        }
        
        // Handle theme based on importMode - only for /apps projects
        const cssVars = conversionResult.cssVariables;
        if (cssVars && Object.keys(cssVars).length > 0 && importMode !== 'content-only' && currentProject?.id) {
          try {
            const { useDesignSystemStore } = await import('@/stores/designSystemStore');
            const dsStore = useDesignSystemStore.getState();
            
            // Ensure design system is loaded for current app project
            if (!dsStore.config) {
              await dsStore.loadDesignSystem(currentProject.id);
            }
            
            // Wait a tick for state to settle
            await new Promise(r => setTimeout(r, 50));
            
            const freshState = useDesignSystemStore.getState();
            if (freshState.config) {
              freshState.importCSSVariables(cssVars);
              toast.success(
                importMode === 'replace-theme' 
                  ? `Replaced project theme with ${Object.keys(cssVars).length} imported variables`
                  : `Created custom theme with ${Object.keys(cssVars).length} tokens`,
                { description: 'Open Design System panel to view and edit' }
              );
            } else {
              console.warn('[ImportPanel] Design system config not available for project:', currentProject.id);
              toast.warning('Could not load design system — theme was not imported');
            }
          } catch (error) {
            console.error('[ImportPanel] Theme import error:', error);
            toast.error('Failed to import theme tokens');
          }
        }
        
        const bodyStylesMsg = conversionResult.bodyStyles && Object.keys(conversionResult.bodyStyles).length > 0
          ? ' (body styles applied)'
          : '';
        toast.success(
          `Imported ${conversionResult.stats.totalComponents} components and ${conversionResult.stats.totalStyles} styles from ${selectedSource}${bodyStylesMsg}`
        );
      } catch (error) {
        toast.error('Failed to import components', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsConverting(false);
      }
    } else if (importTab === 'link' && linkInput.trim()) {
      toast.success(`Importing from ${selectedSource} link...`);
    } else if (importTab === 'zip') {
      document.getElementById('import-file-upload')?.click();
    }
    
    setSelectedSource(null);
    setCodeInput('');
    setLinkInput('');
    setConversionResult(null);
    setParsedData(null);
    setClipboardInspection(null);
    setImportMode('content-only');
  };

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = '';
      return;
    }
    
    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith('.zip');
    const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isReactFile = fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || fileName.endsWith('.js');
    
    setIsConverting(true);
    
    try {
      // Handle React imports (ZIP or single files)
      if (selectedSource === 'react') {
        if (isZip) {
          const result = await convertReactZipToComponents(file);
          const stats = getReactZipConversionStats(result);
          
          for (const styleClass of result.styleClasses) {
            await addClass(styleClass.name, styleClass.styles, false);
          }
          
          if (result.components.length > 0 && currentPage) {
            addComponentsBatch(result.components, false);
            toast.success(
              `Imported ${stats.totalComponents} components and ${stats.totalStyles} styles from React project`,
              { description: result.warnings.length > 0 ? `${result.warnings.filter(w => !w.startsWith('Extracted')).length} warning(s)` : undefined }
            );
          } else {
            toast.warning('No components found in the React project', { description: result.warnings.join(', ') });
          }
        } else if (isReactFile) {
          // Handle single React file (.tsx, .jsx, .js)
          const content = await file.text();
          const result = convertReactFileToComponents(content);
          
          if (result.components.length > 0 || result.styleClasses.length > 0) {
            for (const styleClass of result.styleClasses) {
              await addClass(styleClass.name, styleClass.styles, false);
            }
            if (result.components.length > 0 && currentPage) {
              addComponentsBatch(result.components, false);
              toast.success(
                `Imported ${result.components.length} components and ${result.styleClasses.length} styles from React file`,
                { description: result.warnings.filter(w => !w.startsWith('Extracted')).length > 0 ? `${result.warnings.filter(w => !w.startsWith('Extracted')).length} warning(s)` : undefined }
              );
            }
          } else {
            toast.warning('No components found in React file', { description: result.warnings.join(', ') });
          }
        } else {
          toast.error('Please upload a .zip, .tsx, .jsx, or .js file for React import');
        }
      }
      // Handle HTML imports (single file or ZIP)
      else if (selectedSource === 'html') {
        if (isHtml) {
          const content = await file.text();
          const result = convertHTMLToComponents(content);
          
          for (const styleClass of result.styleClasses) {
            await addClass(styleClass.name, styleClass.styles, false);
          }
          
          // Store CSS variables for optional theme creation (don't auto-import)
          if (result.cssVariables && Object.keys(result.cssVariables).length > 0) {
            setPendingCSSVariables(result.cssVariables);
          }
          
          // Apply body styles if present
          if (result.bodyStyles && Object.keys(result.bodyStyles).length > 0 && currentPage) {
            await addClass('body', result.bodyStyles, false);
            
            const page = currentProject?.pages.find(p => p.id === currentPage);
            const currentBodyProps = page?.bodyProperties || {};
            const currentAppliedClasses = currentBodyProps.appliedClasses || [];
            
            const newAppliedClasses = currentAppliedClasses.includes('body') 
              ? currentAppliedClasses 
              : [...currentAppliedClasses, 'body'];
            
            updatePageBodyProperties(currentPage, {
              ...currentBodyProps,
              appliedClasses: newAppliedClasses,
              activeClass: 'body',
            });
          }
          
          if (result.components.length > 0 && currentPage) {
            addComponentsBatch(result.components, false);
            const bodyStylesMsg = result.bodyStyles && Object.keys(result.bodyStyles).length > 0
              ? ' (body styles applied)'
              : '';
            const dsMsg = result.cssVariables && Object.keys(result.cssVariables).length > 0
              ? ' + design tokens'
              : '';
            toast.success(
              `Imported ${result.components.length} components and ${result.styleClasses.length} styles from HTML${bodyStylesMsg}${dsMsg}`,
              { description: result.warnings.length > 0 ? `${result.warnings.length} warning(s)` : undefined }
            );
          } else {
            toast.warning('No components found in HTML file', { description: result.warnings.join(', ') });
          }
        } else if (isZip) {
          // Extract HTML from ZIP
          const zip = await JSZip.loadAsync(file);
          const htmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.html') || f.endsWith('.htm'));
          
          if (htmlFiles.length === 0) {
            toast.error('No HTML files found in ZIP');
          } else {
            // Process first HTML file (usually index.html)
            const mainHtml = htmlFiles.find(f => f.includes('index')) || htmlFiles[0];
            const content = await zip.files[mainHtml].async('string');
            const result = convertHTMLToComponents(content);
            
            for (const styleClass of result.styleClasses) {
              await addClass(styleClass.name, styleClass.styles, false);
            }
            
            // Store CSS variables for optional theme creation (don't auto-import)
            if (result.cssVariables && Object.keys(result.cssVariables).length > 0) {
              setPendingCSSVariables(result.cssVariables);
            }
            
            // Apply body styles if present
            if (result.bodyStyles && Object.keys(result.bodyStyles).length > 0 && currentPage) {
              await addClass('body', result.bodyStyles, false);
              
              const page = currentProject?.pages.find(p => p.id === currentPage);
              const currentBodyProps = page?.bodyProperties || {};
              const currentAppliedClasses = currentBodyProps.appliedClasses || [];
              
              const newAppliedClasses = currentAppliedClasses.includes('body') 
                ? currentAppliedClasses 
                : [...currentAppliedClasses, 'body'];
              
              updatePageBodyProperties(currentPage, {
                ...currentBodyProps,
                appliedClasses: newAppliedClasses,
                activeClass: 'body',
              });
            }
            
            if (result.components.length > 0 && currentPage) {
              addComponentsBatch(result.components, false);
              const bodyStylesMsg = result.bodyStyles && Object.keys(result.bodyStyles).length > 0
                ? ' (body styles applied)'
                : '';
              toast.success(
                `Imported ${result.components.length} components and ${result.styleClasses.length} styles from ${mainHtml}${bodyStylesMsg}`,
                { description: result.warnings.length > 0 ? `${result.warnings.length} warning(s)` : undefined }
              );
            }
          }
        } else {
          toast.error('Please upload a .html, .htm, or .zip file for HTML import');
        }
      }
      // Generic ZIP handling
      else if (isZip) {
        toast.success(`Uploading ${file.name}...`);
      }
    } catch (error) {
      toast.error('Failed to import file', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsConverting(false);
      setSelectedSource(null);
    }
    
    e.target.value = '';
  };

  // Theme import is now handled inline in handleImport via importMode state

  // Categorize pending CSS variables for preview
  const getPendingVariablesSummary = () => {
    if (!pendingCSSVariables) return { colors: 0, fonts: 0, spacing: 0, other: 0 };
    return categorizeVarsSummary(pendingCSSVariables);
  };

  const getPendingVariablesSummary2 = (vars: Record<string, string>) => {
    return categorizeVarsSummary(vars);
  };

  const categorizeVarsSummary = (vars: Record<string, string>) => {
    let colors = 0, fonts = 0, spacing = 0, other = 0;
    for (const varName of Object.keys(vars)) {
      const clean = varName.replace(/^--/, '');
      if (/^(bg|text|border|color|accent|brand|surface)/.test(clean)) colors++;
      else if (/^font/.test(clean)) fonts++;
      else if (/^(spacing|gap|section-gap|grid-gap|radius|max-width)/.test(clean)) spacing++;
      else if (/^(h\d|body|display|label)-(size|weight|line-height)/.test(clean)) fonts++;
      else other++;
    }
    return { colors, fonts, spacing, other };
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
        className="w-7 h-7 rounded-md object-cover"
      />
      <span className="text-[9px] text-muted-foreground">{source.name}</span>
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2">
          <FileArchive className="h-4 w-4" />
          Import
        </span>
        <button 
          onClick={toggleImportPanel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
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
                <div className="flex gap-2 flex-wrap">
                  {linkImportSources.map(renderSourceButton)}
                  <button
                    onClick={() => handleSelectSource('zip')}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      "hover:border-primary hover:bg-primary/5",
                      selectedSource === 'zip' && "border-primary bg-primary/10"
                    )}
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <FileArchive className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9px] text-muted-foreground">ZIP</span>
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
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <FileArchive className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground mb-2">Drop your ZIP file here</p>
                <Button size="sm" className="h-6 text-xs" onClick={() => document.getElementById('import-zip-upload')?.click()}>
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
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-1.5">
                  <img 
                    src={getSelectedConfig()?.icon} 
                    alt={getSelectedConfig()?.name} 
                    className="w-4 h-4 rounded object-cover"
                  />
                  <span className="text-xs font-medium">{getSelectedConfig()?.name}</span>
                </div>
              </div>
              
              <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)}>
                <TabsList className="h-7 w-full">
                  {getSelectedConfig()?.options.includes('code') && (
                    <TabsTrigger value="code" className="text-[10px] h-6 flex-1">
                      <Code2 className="h-3 w-3 mr-1" />
                      Code
                    </TabsTrigger>
                  )}
                  {getSelectedConfig()?.options.includes('link') && (
                    <TabsTrigger value="link" className="text-[10px] h-6 flex-1">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Link
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="zip" className="text-[10px] h-6 flex-1">
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="code" className="mt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px]">Paste your code</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 px-2 text-[10px] gap-1"
                        onClick={handlePasteButton}
                        disabled={isParsing}
                      >
                        {isParsing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Clipboard className="h-3 w-3" />
                        )}
                        Paste
                      </Button>
                    </div>
                    <div className="relative">
                      <Textarea 
                        ref={textareaRef}
                        className="w-full min-h-[100px] max-h-[200px] text-xs p-2 rounded border bg-muted/30 resize-y font-mono"
                        placeholder={`Copy from ${getSelectedConfig()?.name} and paste here (Ctrl/Cmd+V)...\n\nWebflow: Select elements → Right-click → Copy\nFigma: Select layers → Cmd/Ctrl+C\nFramer: Select components → Cmd/Ctrl+C`}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        onPaste={handlePaste}
                      />
                      {isParsing && (
                        <div className="absolute top-2 right-2">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Error Display */}
                    {clipboardError && (
                      <div className="flex items-start gap-1.5 p-2 rounded-md text-[10px] bg-destructive/10 text-destructive border border-destructive/20">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{clipboardError.message}</span>
                      </div>
                    )}
                    
                    {/* Parsed Data Feedback */}
                    {parsedData && !clipboardError && (
                      <div className={cn(
                        "flex items-center gap-1.5 p-2 rounded-md text-[10px]",
                        getSourceMatchStatus() === 'match' 
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : getSourceMatchStatus() === 'mismatch'
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {getSourceMatchStatus() === 'match' ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : getSourceMatchStatus() === 'mismatch' ? (
                          <AlertCircle className="h-3 w-3 shrink-0" />
                        ) : null}
                        <span>
                          {parsedData.source !== 'unknown' 
                            ? `Detected: ${parsedData.source} • ${getClipboardSummary(parsedData).description}`
                            : 'Unknown format - will try to parse as HTML'
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* Conversion Preview */}
                    {conversionResult?.success && (
                      <div className="flex items-start gap-1.5 p-2 rounded-md text-[10px] bg-primary/5 text-primary border border-primary/20">
                        <Info className="h-3 w-3 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Ready to import:</span>
                          <span>{getConversionSummary(conversionResult)}</span>
                          {conversionResult.warnings.length > 0 && (
                            <span className="text-amber-600">{conversionResult.warnings.length} warning(s)</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detected CSS variables preview */}
                    {conversionResult?.success && conversionResult?.cssVariables && Object.keys(conversionResult.cssVariables).length > 0 && (() => {
                      const vars = conversionResult.cssVariables!;
                      const colorVars = Object.entries(vars).filter(([k]) => /^--(bg|text|border|color|accent|brand|surface)/.test(k));
                      const summary = getPendingVariablesSummary2(vars);
                      return (
                        <div className="rounded-md border border-border p-2 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Palette className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-medium">{Object.keys(vars).length} :root variables detected</span>
                          </div>
                          {colorVars.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {colorVars.slice(0, 8).map(([name, value]) => (
                                <div key={name} className="w-4 h-4 rounded border border-border" style={{ backgroundColor: value }} title={`${name}: ${value}`} />
                              ))}
                              {colorVars.length > 8 && <span className="text-[8px] text-muted-foreground self-center">+{colorVars.length - 8}</span>}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {summary.colors > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{summary.colors} colors</span>}
                            {summary.fonts > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{summary.fonts} fonts</span>}
                            {summary.spacing > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{summary.spacing} spacing</span>}
                            {summary.other > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{summary.other} other</span>}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Theme Import Mode - always show for HTML source */}
                    {(selectedSource === 'html' || selectedSource === 'webflow' || selectedSource === 'figma' || selectedSource === 'framer') && (
                      <div className="rounded-md border border-border p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-medium">Root Theme Handling</span>
                        </div>
                        
                        <div className="space-y-1">
                          <button
                            onClick={() => setImportMode('custom-theme')}
                            className={cn(
                              "w-full text-left p-1.5 rounded border transition-all text-[10px]",
                              importMode === 'custom-theme' 
                                ? "border-primary bg-primary/5" 
                                : "border-transparent hover:border-border hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", importMode === 'custom-theme' ? "border-primary bg-primary" : "border-muted-foreground")} />
                              <span className="font-medium">Create Custom Theme</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 ml-[18px]">
                              Import :root variables as a new Design System theme.
                            </p>
                          </button>
                          
                          <button
                            onClick={() => setImportMode('content-only')}
                            className={cn(
                              "w-full text-left p-1.5 rounded border transition-all text-[10px]",
                              importMode === 'content-only' 
                                ? "border-primary bg-primary/5" 
                                : "border-transparent hover:border-border hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", importMode === 'content-only' ? "border-primary bg-primary" : "border-muted-foreground")} />
                              <span className="font-medium">Content Only (Skip Theme)</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 ml-[18px]">
                              Skip :root — import CSS classes &amp; content into existing theme.
                            </p>
                          </button>
                          
                          <button
                            onClick={() => setImportMode('replace-theme')}
                            className={cn(
                              "w-full text-left p-1.5 rounded border transition-all text-[10px]",
                              importMode === 'replace-theme' 
                                ? "border-amber-500 bg-amber-500/5" 
                                : "border-transparent hover:border-border hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", importMode === 'replace-theme' ? "border-amber-500 bg-amber-500" : "border-muted-foreground")} />
                              <span className="font-medium">Replace Project Theme</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 ml-[18px]">
                              Override current project theme with imported :root.
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 ml-[18px]">
                              <AlertCircle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                              <span className="text-[8px] text-amber-500">Caution: Beta — will change entire project design</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      className="w-full h-6 text-xs" 
                      onClick={handleImport} 
                      disabled={!codeInput.trim() || !!clipboardError || !conversionResult?.success || isConverting}
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Importing...
                        </>
                      ) : conversionResult?.success ? (
                        `Import ${conversionResult.stats.totalComponents} Elements`
                      ) : (
                        'Import Code'
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="mt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px]">Enter URL</Label>
                    <Input 
                      className="h-7 text-xs"
                      placeholder="https://..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                    />
                    <Button size="sm" className="w-full h-6 text-xs" onClick={handleImport} disabled={!linkInput.trim()}>
                      Import from URL
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="zip" className="mt-2">
                  <div className="border-2 border-dashed rounded-lg p-3 text-center">
                    <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground mb-1">
                      {selectedSource === 'html' ? 'Drop .html or .zip file' : 
                       selectedSource === 'react' ? 'Drop .js, .tsx, .jsx or .zip file' : 
                       'Drop ZIP file here'}
                    </p>
                    <Button 
                      size="sm" 
                      className="h-5 text-[10px]" 
                      onClick={() => document.getElementById('import-file-upload')?.click()}
                      disabled={isConverting}
                    >
                      {isConverting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Choose File
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          
          
          <input
            id="import-file-upload"
            type="file"
            accept={
              selectedSource === 'html' ? '.html,.htm,.zip' : 
              selectedSource === 'react' ? '.tsx,.jsx,.js,.zip' : 
              '.zip'
            }
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
