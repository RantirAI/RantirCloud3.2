import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
// Monaco types are inferred from @monaco-editor/react
// JSZip imported dynamically in handleDownloadAll
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { useUserComponents } from '@/hooks/useUserComponent';
import { generateReactCode, generateCSS, generateProject, GeneratedFile } from '@/lib/reactCodeGenerator';
import { parseJSXToComponents, ParseError } from '@/lib/jsxToComponents';
import { parseCSSToClasses, CSSParseError } from '@/lib/cssToClasses';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Download, FileCode, FileText, Folder, ChevronRight, ChevronDown, Check, AlertCircle, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface FileTreeItemProps {
  file: GeneratedFile;
  isSelected: boolean;
  onSelect: () => void;
}

// React/JSX Icon (React atomic logo)
const ReactIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="2.5" fill="#61DAFB" />
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" />
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(120 12 12)" />
  </svg>
);

// CSS Icon (CSS3 shield style)
const CSSIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 3L5.5 19L12 21L18.5 19L20 3H4Z" fill="#A855F7" fillOpacity="0.15" stroke="#A855F7" strokeWidth="1.5" strokeLinejoin="round" />
    <text x="12" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#A855F7" fontFamily="system-ui">{`{}`}</text>
  </svg>
);

function FileTreeItem({ file, isSelected, onSelect }: FileTreeItemProps) {
  const icon = file.language === 'tsx' ? (
    <FileCode className="h-4 w-4 text-blue-500" />
  ) : file.language === 'css' ? (
    <FileText className="h-4 w-4 text-purple-500" />
  ) : (
    <FileText className="h-4 w-4 text-muted-foreground" />
  );

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
    >
      {icon}
      <span className="truncate">{file.name}</span>
    </button>
  );
}

interface FolderTreeProps {
  files: GeneratedFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

function FolderTree({ files, selectedFile, onSelectFile }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/pages', 'src/components', 'src/components/user']));

  const fileTree = useMemo(() => {
    const tree: Record<string, GeneratedFile[]> = {};
    
    // First pass: add all file parent folders
    files.forEach(file => {
      const parts = file.path.split('/');
      const folder = parts.slice(0, -1).join('/') || 'root';
      if (!tree[folder]) tree[folder] = [];
      tree[folder].push(file);
    });
    
    // Second pass: ensure all intermediate parent folders exist
    // This is needed so folders like 'src/components' appear even if they only contain subfolders
    const allFolders = Object.keys(tree);
    allFolders.forEach(folder => {
      if (folder === 'root') return;
      const parts = folder.split('/');
      // Add all parent paths
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/');
        if (!tree[parentPath]) {
          tree[parentPath] = [];
        }
      }
    });
    
    return tree;
  }, [files]);

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  // Check if a folder should be visible (all parent folders must be expanded)
  const isFolderVisible = (folder: string): boolean => {
    if (folder === 'root') return true;
    const parts = folder.split('/');
    // Check all parent paths are expanded
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/');
      if (!expandedFolders.has(parentPath)) {
        return false;
      }
    }
    return true;
  };

  // Sort folders: real folders first (alphabetically), then 'root' (config files) last
  const folders = Object.keys(fileTree).sort((a, b) => {
    if (a === 'root') return 1;  // root goes last
    if (b === 'root') return -1; // root goes last
    return a.localeCompare(b);   // alphabetical for the rest
  });

  return (
    <div className="py-2">
      {folders.map(folder => {
        // Skip rendering if any parent folder is collapsed
        if (!isFolderVisible(folder)) return null;
        
        const isExpanded = expandedFolders.has(folder);
        const folderFiles = fileTree[folder];
        const depth = folder.split('/').length - 1;

        return (
          <div key={folder}>
            {folder !== 'root' && (
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Folder className="h-4 w-4 text-yellow-500" />
                <span>{folder.split('/').pop()}</span>
              </button>
            )}
            {(folder === 'root' || isExpanded) && folderFiles.length > 0 && (
              <div style={{ paddingLeft: folder === 'root' ? 0 : `${(depth + 1) * 12}px` }}>
                {folderFiles.map(file => (
                  <FileTreeItem
                    key={file.path}
                    file={file}
                    isSelected={selectedFile === file.path}
                    onSelect={() => onSelectFile(file.path)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CodePreview() {
  const { currentProject, currentPage, updatePage } = useAppBuilderStore();
  const { classes, updateClass, addClass } = useClassStore();
  const { components: userComponents } = useUserComponents(currentProject?.id);
  const { theme, resolvedTheme } = useTheme();
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'project'>('current');
  
  // Editing state for JSX
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState<string>('');
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  // Editing state for CSS
  const [editedCSS, setEditedCSS] = useState<string>('');
  const [cssParseErrors, setCSSParseErrors] = useState<CSSParseError[]>([]);
  const [isCSSdirty, setIsCSSdirty] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'jsx' | 'css'>('jsx');

  // Editing state for Project files
  const [editedProjectFiles, setEditedProjectFiles] = useState<Map<string, string>>(new Map());
  const [isProjectFileDirty, setIsProjectFileDirty] = useState(false);
  const [projectCSSErrors, setProjectCSSErrors] = useState<CSSParseError[]>([]);

  // Use resolvedTheme with fallback, check both for dark mode
  const editorTheme = (resolvedTheme === 'dark' || theme === 'dark') ? 'vs-dark' : 'vs';

  // Dynamically update Monaco theme when theme changes
  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.setTheme(editorTheme);
    });
  }, [editorTheme]);

  // Generate code for current page
  const currentPageData = useMemo(() => {
    if (!currentProject || !currentPage) return null;
    return currentProject.pages.find(p => p.id === currentPage);
  }, [currentProject, currentPage]);

  const currentPageCode = useMemo(() => {
    if (!currentPageData) return '';
    return generateReactCode(currentPageData.components, classes, currentPageData.name);
  }, [currentPageData, classes]);

  const currentPageCSS = useMemo(() => {
    return generateCSS(classes);
  }, [classes]);

  // Sync edited code when canvas changes (if not dirty)
  useEffect(() => {
    if (!isDirty && currentPageCode) {
      setEditedCode(currentPageCode);
    }
  }, [currentPageCode, isDirty]);

  // Initialize edited code
  useEffect(() => {
    if (currentPageCode && !editedCode) {
      setEditedCode(currentPageCode);
    }
  }, [currentPageCode, editedCode]);

  // Generate full project
  const { config: designSystemConfig } = useDesignSystemStore();
  const generatedProject = useMemo(() => {
    if (!currentProject) return null;
    return generateProject(currentProject.pages, classes, userComponents, designSystemConfig || undefined);
  }, [currentProject, classes, userComponents, designSystemConfig]);

  // Get selected file content
  const selectedFile = useMemo(() => {
    if (!generatedProject || !selectedFilePath) return null;
    return generatedProject.files.find(f => f.path === selectedFilePath);
  }, [generatedProject, selectedFilePath]);

  // Auto-select first file if none selected
  useEffect(() => {
    if (generatedProject && !selectedFilePath) {
      setSelectedFilePath(generatedProject.entryPoint);
    }
  }, [generatedProject, selectedFilePath]);

  // Parse and sync code to canvas
  const syncCodeToCanvas = useCallback((code: string) => {
    const result = parseJSXToComponents(code);
    
    if (!result.success || result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    
    setParseErrors([]);
    
    if (result.components.length > 0 && currentPage) {
      // Update canvas with parsed components
      updatePage(currentPage, { components: result.components });
      setIsDirty(false);
      toast.success('Code synced to canvas');
    }
  }, [currentPage, updatePage]);

  // Code change handler (no auto-save)
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!value) return;
    setEditedCode(value);
    setIsDirty(true);
  }, []);

  // Manual sync button
  const handleManualSync = useCallback(() => {
    syncCodeToCanvas(editedCode);
  }, [editedCode, syncCodeToCanvas]);

  // Reset to canvas state
  const handleReset = useCallback(() => {
    setEditedCode(currentPageCode);
    setIsDirty(false);
    setParseErrors([]);
  }, [currentPageCode]);

  // CSS editing handlers
  useEffect(() => {
    if (!isCSSdirty && currentPageCSS) {
      setEditedCSS(currentPageCSS);
    }
  }, [currentPageCSS, isCSSdirty]);

  const handleCSSChange = useCallback((value: string | undefined) => {
    if (!value) return;
    setEditedCSS(value);
    setIsCSSdirty(true);
  }, []);

  const handleCSSSync = useCallback(() => {
    const result = parseCSSToClasses(editedCSS);
    
    if (result.errors.length > 0) {
      setCSSParseErrors(result.errors);
      return;
    }
    
    setCSSParseErrors([]);
    
    // Update classes in classStore
    result.classUpdates.forEach((styles, className) => {
      const existingClass = classes.find(c => c.name === className);
      if (existingClass) {
        updateClass(existingClass.id, {
          styles: { ...existingClass.styles, ...styles }
        });
      }
    });
    
    setIsCSSdirty(false);
    toast.success('CSS changes applied to classes');
  }, [editedCSS, classes, updateClass]);

  const handleCSSReset = useCallback(() => {
    setEditedCSS(currentPageCSS);
    setIsCSSdirty(false);
    setCSSParseErrors([]);
  }, [currentPageCSS]);

  // Project file editing handlers
  const handleProjectFileChange = useCallback((value: string | undefined) => {
    if (!value || !selectedFilePath) return;
    
    setEditedProjectFiles(prev => {
      const next = new Map(prev);
      next.set(selectedFilePath, value);
      return next;
    });
    setIsProjectFileDirty(true);
  }, [selectedFilePath]);

  const handleProjectCSSSync = useCallback(async () => {
    // Find CSS file content from edited project files
    const cssPath = Array.from(editedProjectFiles.keys()).find(p => p.endsWith('.css'));
    const cssContent = cssPath ? editedProjectFiles.get(cssPath) : null;
    
    if (!cssContent) {
      toast.error('No CSS changes to apply');
      return;
    }
    
    const result = parseCSSToClasses(cssContent);
    
    if (result.errors.length > 0) {
      setProjectCSSErrors(result.errors);
      toast.error(`CSS parse errors: ${result.errors.map(e => e.message).join(', ')}`);
      return;
    }
    
    setProjectCSSErrors([]);
    
    // Track how many classes were updated/created
    let updatedCount = 0;
    let createdCount = 0;
    
    // Update or create classes in classStore
    for (const [className, parsedStyles] of result.classUpdates) {
      const existingClass = classes.find(c => c.name === className);
      
      if (existingClass) {
        console.log('[CSS Sync] Updating class:', className, {
          existingStyles: existingClass.styles,
          parsedStyles: parsedStyles,
          mergedStyles: { ...existingClass.styles, ...parsedStyles }
        });
        
        // Merge parsed flat styles into existing class styles
        updateClass(existingClass.id, {
          styles: { ...existingClass.styles, ...parsedStyles }
        });
        updatedCount++;
      } else {
        // CREATE new class if it doesn't exist
        console.log('[CSS Sync] Creating new class:', className, parsedStyles);
        try {
          await addClass(className, parsedStyles, false);
          createdCount++;
        } catch (err) {
          console.error('[CSS Sync] Failed to create class:', className, err);
        }
      }
    }
    
    // Mark as not dirty - editor will show regenerated CSS from updated classes
    setIsProjectFileDirty(false);
    // Clear edits so editor falls back to regenerated content
    setEditedProjectFiles(new Map());
    
    // Show appropriate toast message
    const messages: string[] = [];
    if (updatedCount > 0) messages.push(`Updated ${updatedCount} class(es)`);
    if (createdCount > 0) messages.push(`Created ${createdCount} new class(es)`);
    
    if (messages.length > 0) {
      toast.success(messages.join(', '));
    } else {
      toast.info('No classes found in CSS');
    }
  }, [editedProjectFiles, classes, updateClass, addClass]);

  const handleProjectFileReset = useCallback(() => {
    setEditedProjectFiles(new Map());
    setIsProjectFileDirty(false);
    setProjectCSSErrors([]);
  }, []);

  /**
   * Maps a project file path to a page ID
   * e.g., "src/pages/Home.tsx" → finds page with name "Home"
   */
  const findPageIdByFilePath = useCallback((filePath: string): string | null => {
    if (!currentProject || !filePath.startsWith('src/pages/') || !filePath.endsWith('.tsx')) {
      return null;
    }
    
    // Extract component name from path: "src/pages/Home.tsx" → "Home"
    const fileName = filePath.replace('src/pages/', '').replace('.tsx', '');
    
    // Find matching page by comparing sanitized names
    const page = currentProject.pages.find(p => {
      // Sanitize page name using same logic as reactCodeGenerator
      const sanitizedName = p.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
      
      const finalName = /^[A-Z]/.test(sanitizedName) ? sanitizedName : 'Page' + sanitizedName;
      return (finalName || 'Page') === fileName;
    });
    
    return page?.id || null;
  }, [currentProject]);

  const handleProjectJSXSync = useCallback(() => {
    if (!selectedFilePath || !selectedFilePath.endsWith('.tsx')) {
      toast.error('No TSX file selected');
      return;
    }
    
    // Get edited content for this file
    const editedContent = editedProjectFiles.get(selectedFilePath);
    if (!editedContent) {
      toast.error('No changes to apply');
      return;
    }
    
    // Check if this is a page file
    if (!selectedFilePath.startsWith('src/pages/')) {
      toast.info('Only page files can be synced to canvas. Component files sync is not yet supported.');
      return;
    }
    
    // Find the corresponding page
    const pageId = findPageIdByFilePath(selectedFilePath);
    if (!pageId) {
      toast.error('Could not find matching page for this file');
      return;
    }
    
    // Parse the JSX
    const result = parseJSXToComponents(editedContent);
    
    if (!result.success || result.errors.length > 0) {
      // Show parse errors
      setProjectCSSErrors(result.errors.map(e => ({
        line: e.line,
        column: e.column,
        message: e.message
      })));
      toast.error(`JSX parse errors: ${result.errors.map(e => e.message).join(', ')}`);
      return;
    }
    
    setProjectCSSErrors([]);
    
    if (result.components.length > 0) {
      // Update the page with parsed components
      updatePage(pageId, { components: result.components });
      
      // Clear dirty state
      setIsProjectFileDirty(false);
      setEditedProjectFiles(prev => {
        const next = new Map(prev);
        next.delete(selectedFilePath);
        return next;
      });
      
      toast.success('JSX synced to canvas');
    } else {
      toast.warning('No components found in JSX');
    }
  }, [selectedFilePath, editedProjectFiles, findPageIdByFilePath, updatePage]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (!generatedProject) return;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const projectName = currentProject?.name?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'project';
      
      // Add all files to the zip
      generatedProject.files.forEach(file => {
        zip.file(file.path, file.content);
      });
      
      // Generate the zip file with proper MIME type
      const blob = await zip.generateAsync({ 
        type: 'blob',
        mimeType: 'application/zip'
      });
      
      // Download the zip
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      a.type = 'application/zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Project downloaded as ZIP');
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      toast.error('Failed to create ZIP file');
    }
  };

  // Tab management
  const handleOpenFile = useCallback((path: string) => {
    setSelectedFilePath(path);
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
  }, [openTabs]);

  const handleCloseTab = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t !== path);
      if (selectedFilePath === path && newTabs.length > 0) {
        setSelectedFilePath(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        setSelectedFilePath(null);
      }
      return newTabs;
    });
  }, [selectedFilePath]);

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No project loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'project')} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="current" className="text-xs px-3 py-1">
              Current Page
            </TabsTrigger>
            <TabsTrigger value="project" className="text-xs px-3 py-1">
              Full Project
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            {/* Edit Mode Toggle */}
            {(activeTab === 'current' || activeTab === 'project') && (
              <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-muted/50">
                <Switch
                  id="edit-mode"
                  checked={isEditMode}
                  onCheckedChange={setIsEditMode}
                />
                <Label htmlFor="edit-mode" className="text-xs flex items-center gap-1 cursor-pointer font-medium">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Label>
              </div>
            )}
            
            {/* Sync/Reset buttons when dirty */}
            {isEditMode && (isDirty || isCSSdirty || isProjectFileDirty) && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (activeTab === 'current') {
                      activeSubTab === 'jsx' ? handleManualSync() : handleCSSSync();
                    } else if (activeTab === 'project') {
                      if (selectedFilePath?.endsWith('.css')) {
                        handleProjectCSSSync();
                      } else if (selectedFilePath?.endsWith('.tsx')) {
                        handleProjectJSXSync();
                      } else {
                        toast.info('This file type cannot be synced to canvas');
                      }
                    }
                  }}
                  className="h-7 text-xs"
                >
                  Apply Changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeTab === 'current') {
                      activeSubTab === 'jsx' ? handleReset() : handleCSSReset();
                    } else {
                      handleProjectFileReset();
                    }
                  }}
                  className="h-7 text-xs"
                >
                  Reset
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(
                activeTab === 'current' 
                  ? (isEditMode ? editedCode : currentPageCode)
                  : (selectedFile?.content || '')
              )}
              className="h-7 px-2"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeTab === 'current') {
                  handleDownload(`${currentPageData?.name || 'page'}.tsx`, isEditMode ? editedCode : currentPageCode);
                } else if (selectedFile) {
                  handleDownload(selectedFile.name, selectedFile.content);
                }
              }}
              className="h-7 px-2"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            {activeTab === 'project' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="h-7 text-xs"
              >
                Download All
              </Button>
            )}
          </div>
        </div>

        {/* Parse Errors Banner - JSX */}
        {isEditMode && activeSubTab === 'jsx' && parseErrors.length > 0 && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive">
              <p className="font-medium">Syntax errors detected:</p>
              <ul className="mt-1 space-y-0.5">
                {parseErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
                {parseErrors.length > 3 && (
                  <li>...and {parseErrors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Parse Errors Banner - CSS */}
        {isEditMode && activeSubTab === 'css' && cssParseErrors.length > 0 && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive">
              <p className="font-medium">CSS syntax errors:</p>
              <ul className="mt-1 space-y-0.5">
                {cssParseErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
                {cssParseErrors.length > 3 && (
                  <li>...and {cssParseErrors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Parse Errors Banner - Project CSS/JSX */}
        {isEditMode && activeTab === 'project' && projectCSSErrors.length > 0 && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive">
              <p className="font-medium">{selectedFilePath?.endsWith('.css') ? 'CSS' : 'JSX'} syntax errors:</p>
              <ul className="mt-1 space-y-0.5">
                {projectCSSErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
                {projectCSSErrors.length > 3 && (
                  <li>...and {projectCSSErrors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <TabsContent value="current" className="flex-1 m-0 flex-col min-h-0 data-[state=active]:flex data-[state=inactive]:hidden">
          <Tabs 
            defaultValue="jsx" 
            className="flex-1 flex flex-col"
            onValueChange={(v) => setActiveSubTab(v as 'jsx' | 'css')}
          >
            <div className="border-b px-4">
              <TabsList className="h-8 bg-transparent">
                <TabsTrigger value="jsx" className="text-xs data-[state=active]:bg-muted gap-1.5">
                  <ReactIcon className="h-3.5 w-3.5" />
                  JSX
                </TabsTrigger>
                <TabsTrigger value="css" className="text-xs data-[state=active]:bg-muted gap-1.5">
                  <CSSIcon className="h-3.5 w-3.5" />
                  CSS
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="jsx" className="flex-1 m-0 min-h-0">
              <Editor
                key={`jsx-${editorTheme}`}
                height="100%"
                language="typescript"
                value={isEditMode ? editedCode : currentPageCode}
                onChange={isEditMode ? handleCodeChange : undefined}
                theme={editorTheme}
                options={{
                  readOnly: !isEditMode,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  folding: true,
                  automaticLayout: true,
                }}
              />
            </TabsContent>
            
            <TabsContent value="css" className="flex-1 m-0 min-h-0">
              <Editor
                key={`css-${editorTheme}`}
                height="100%"
                language="css"
                value={isEditMode ? editedCSS : currentPageCSS}
                onChange={isEditMode ? handleCSSChange : undefined}
                theme={editorTheme}
                options={{
                  readOnly: !isEditMode,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  folding: true,
                  automaticLayout: true,
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="project" className="flex-1 m-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex-1 flex min-h-0">
            {/* File Tree */}
            <div className="w-48 border-r bg-muted/30 flex-shrink-0 flex flex-col">
              <div className="px-3 py-2 border-b shrink-0">
                <span className="text-xs font-medium text-muted-foreground uppercase">Files</span>
              </div>
              <ScrollArea className="flex-1">
                {generatedProject && (
                  <FolderTree
                    files={generatedProject.files}
                    selectedFile={selectedFilePath}
                    onSelectFile={handleOpenFile}
                  />
                )}
              </ScrollArea>
            </div>
            
            {/* Code Editor with Tabs */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              {/* Tab Bar */}
              {openTabs.length > 0 && (
                <div className="flex items-center border-b bg-muted/20 overflow-x-auto">
                  {openTabs.map(tabPath => {
                    const file = generatedProject?.files.find(f => f.path === tabPath);
                    const fileName = file?.name || tabPath.split('/').pop() || tabPath;
                    const isActive = selectedFilePath === tabPath;
                    return (
                      <button
                        key={tabPath}
                        onClick={() => setSelectedFilePath(tabPath)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r shrink-0 transition-colors",
                          isActive 
                            ? "bg-background text-foreground" 
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        <span>{fileName}</span>
                        <X 
                          className="h-3 w-3 ml-1 hover:text-foreground" 
                          onClick={(e) => handleCloseTab(tabPath, e)}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Editor */}
              <div className="flex-1 min-h-0">
                {selectedFile ? (
                  <Editor
                    key={`project-${selectedFilePath}-${editorTheme}`}
                    height="100%"
                    language={selectedFile.language === 'tsx' ? 'typescript' : selectedFile.language}
                    value={editedProjectFiles.get(selectedFilePath!) || selectedFile.content}
                    onChange={isEditMode ? handleProjectFileChange : undefined}
                    theme={editorTheme}
                    options={{
                      readOnly: !isEditMode,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      folding: true,
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a file to view</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
