import { useState, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ChartNode } from './nodes/ChartNode';
import { ImageNode } from './nodes/ImageNode';
import { VideoNode } from './nodes/VideoNode';
import { documentService, Document } from '@/services/documentService';
import { useDocumentAutosave } from '@/hooks/useDocumentAutosave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { EditorState } from 'lexical';
import { FloatingToolbar } from './FloatingToolbar';
import { BottomToolbar } from './BottomToolbar';
import { InsertNodeMenu } from './InsertNodeMenu';
import { InsertPlugin } from './InsertPlugin';
import { DocumentSettingsModal } from './DocumentSettingsModal';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import './DocumentPrintStyles.css';

interface DocumentEditorProps {
  documentId: string;
  databaseId: string;
  onDelete: () => void;
  onUpdate: () => void;
}

type WidthMode = 'narrow' | 'full';

const theme = {
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
  paragraph: 'mb-4 text-base leading-relaxed',
  heading: {
    h1: 'text-4xl font-bold mb-4 mt-8',
    h2: 'text-3xl font-bold mb-3 mt-6',
    h3: 'text-2xl font-bold mb-2 mt-4',
  },
  list: {
    ol: 'list-decimal ml-6 mb-4 space-y-1',
    ul: 'list-disc ml-6 mb-4 space-y-1',
  },
  quote: 'border-l-4 border-primary pl-4 italic mb-4 text-muted-foreground',
  code: 'bg-muted p-4 rounded-md font-mono text-sm mb-4 block',
  link: 'text-primary underline hover:text-primary/80',
};

export function DocumentEditor({ documentId, databaseId, onDelete, onUpdate }: DocumentEditorProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorState, setEditorState] = useState<any>(null);
  const [widthMode, setWidthMode] = useState<WidthMode>('narrow');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  const { queueSave, forceSave, isSaving, lastSaved } = useDocumentAutosave({
    documentId,
  });

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Auto-resize title textarea on mount and when title changes
  useEffect(() => {
    const textareas = window.document.querySelectorAll('textarea[placeholder="Untitled"]');
    textareas.forEach((textarea) => {
      const element = textarea as HTMLTextAreaElement;
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    });
  }, [title, document, showPrintView]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await documentService.getDocument(documentId);
      setDocument(doc);
      setTitle(doc.title);
      setEditorState(doc.content);
      setWidthMode((doc.width_mode as 'narrow' | 'full') || 'narrow');
    } catch (error: any) {
      toast.error('Failed to load document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    queueSave({ title: newTitle });
  };

  const handleContentChange = (editorState: EditorState) => {
    const json = editorState.toJSON();
    queueSave({ content: json });
  };

  const handleUpdateSettings = async (updates: Partial<Document>) => {
    try {
      await documentService.updateDocument(documentId, updates);
      setDocument(prev => prev ? { ...prev, ...updates } : null);
      if (updates.title) {
        setTitle(updates.title);
      }
      if (updates.width_mode) {
        setWidthMode(updates.width_mode as 'narrow' | 'full');
      }
      onUpdate(); // Refresh the document list to show updated title
    } catch (error: any) {
      toast.error('Failed to update settings: ' + error.message);
      throw error;
    }
  };

  const handleDuplicate = async () => {
    try {
      await documentService.duplicateDocument(documentId);
      toast.success('Document duplicated');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to duplicate: ' + error.message);
    }
  };

  const handleToggleWidth = () => {
    const newMode = widthMode === 'narrow' ? 'full' : 'narrow';
    setWidthMode(newMode);
    queueSave({ width_mode: newMode });
  };

  // Ensure export uses Print View with correct @page size, then restore the previous view
  const handleExport = () => {
    const prev = showPrintView;

    const restore = () => {
      window.removeEventListener('afterprint', restore);
      setShowPrintView(prev);
    };

    window.addEventListener('afterprint', restore);

    if (!prev) {
      setShowPrintView(true);
      // Give the DOM a moment to render print view before printing
      setTimeout(() => {
        window.print();
        // Fallback for browsers not firing afterprint reliably
        setTimeout(() => restore(), 500);
      }, 75);
    } else {
      window.print();
      setTimeout(() => restore(), 500);
    }
  };

  // Sanitize Lexical editor state to fix missing required properties
  const sanitizeEditorState = (state: any): any => {
    if (!state || typeof state !== 'object') return state;

    const sanitizeNode = (node: any): any => {
      if (!node || typeof node !== 'object') return node;

      const sanitized = { ...node };

      // Ensure version is set
      if (sanitized.version === undefined) {
        sanitized.version = 1;
      }

      // Ensure format is set (use empty string for block nodes, 0 for text)
      if (sanitized.format === undefined) {
        sanitized.format = sanitized.type === 'text' ? 0 : '';
      }

      // Ensure direction is set for block nodes
      if (['paragraph', 'heading', 'list', 'listitem', 'quote', 'code', 'root'].includes(sanitized.type)) {
        if (sanitized.direction === undefined) {
          sanitized.direction = 'ltr';
        }
        if (sanitized.indent === undefined) {
          sanitized.indent = 0;
        }
      }

      // Fix listitem specific properties
      if (sanitized.type === 'listitem') {
        if (sanitized.value === undefined) {
          sanitized.value = 1;
        }
        // Ensure indent is a valid non-negative integer
        if (typeof sanitized.indent !== 'number' || sanitized.indent < 0) {
          sanitized.indent = 0;
        }
      }

      // Fix text node specific properties
      if (sanitized.type === 'text') {
        if (sanitized.detail === undefined) {
          sanitized.detail = 0;
        }
        if (sanitized.mode === undefined) {
          sanitized.mode = 'normal';
        }
        if (sanitized.style === undefined) {
          sanitized.style = '';
        }
      }

      // Recursively sanitize children
      if (Array.isArray(sanitized.children)) {
        sanitized.children = sanitized.children.map(sanitizeNode);
      }

      return sanitized;
    };

    return {
      ...state,
      root: sanitizeNode(state.root)
    };
  };

  const hasValidEditorState = editorState && typeof editorState === 'object' && 'root' in editorState;
  const sanitizedEditorState = hasValidEditorState ? sanitizeEditorState(editorState) : null;
  
  const initialConfig = {
    namespace: 'DocumentEditor',
    theme,
    onError: (error: Error) => {
      console.error(error);
      // Don't show toast for every error during initial load
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      ChartNode,
      ImageNode,
      VideoNode,
    ],
    editorState: sanitizedEditorState ? JSON.stringify(sanitizedEditorState) : undefined,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Document not found</div>
      </div>
    );
  }

  // Get page dimensions based on document page size
  const getPageDimensions = () => {
    const pageSize = document.page_size || 'a4';
    switch (pageSize) {
      case 'letter':
        return { width: '816px', height: '1056px' }; // 8.5 x 11 inches at 96 DPI
      case 'slides-16-9':
        return { width: '1280px', height: '720px' }; // 16:9 aspect ratio
      case 'slides-4-3':
        return { width: '1024px', height: '768px' }; // 4:3 aspect ratio
      case 'a4':
      default:
        return { width: '794px', height: '1123px' }; // A4 at 96 DPI
    }
  };

  const pageDimensions = getPageDimensions();
  const containerClass = widthMode === 'narrow' ? 'max-w-3xl mx-auto' : 'max-w-full';

  // Create a unique key based on documentId and content to force remount when document changes
  const editorKey = `${documentId}-${hasValidEditorState ? 'loaded' : 'empty'}`;

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-background">
      <LexicalComposer key={editorKey} initialConfig={initialConfig}>
        {/* Editor Area */}
        <div className="flex-1 overflow-auto pb-24 pt-12 print:pt-0">
          {showPrintView ? (
            // Print View - Multi-page layout with dotted background
            <div className="relative bg-muted/30 py-12 print:bg-white print:py-0" style={{
              backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}>
              <style>{`
                @media print {
                  @page {
                    margin: 0.5in;
                    size: ${document.page_size === 'letter' ? '8.5in 11in' : 
                           document.page_size === 'slides-16-9' ? '16in 9in' :
                           document.page_size === 'slides-4-3' ? '12in 9in' : 'A4'};
                  }
                  .print-page {
                    page-break-after: always;
                    break-after: page;
                  }
                  .print-page:last-child {
                    page-break-after: auto;
                    break-after: auto;
                  }
                }
              `}</style>
              <div className="flex flex-col items-center gap-8 print:gap-0">
                {/* Page 1 */}
                <div
                  className="bg-white shadow-lg print:shadow-none print-page print:h-auto print:w-auto"
                  style={{
                    width: pageDimensions.width,
                    minHeight: pageDimensions.height,
                  }}
                >
                  {/* Header Image - Full width, no padding */}
                  {document.header_content && (
                    <div className="h-24 w-full overflow-hidden">
                      <img 
                        src={document.header_content} 
                        alt="Header" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-12 print:p-8">
                    {/* Cover Image */}
                    {document.cover_image && (
                      <div className="mb-8 -mx-12 print:-mx-8 h-60 overflow-hidden">
                        <img 
                          src={document.cover_image} 
                          alt="Cover" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Logo */}
                    {document.logo && (
                      <div className="mb-6">
                        <img 
                          src={document.logo} 
                          alt="Logo" 
                          className="h-12 object-contain"
                        />
                      </div>
                    )}

                    {/* Icon + Title */}
                    <div className="flex items-start gap-3 mb-8">
                      {document.icon && (
                        <div className="text-5xl leading-none mt-1 print:text-4xl">
                          {document.icon}
                        </div>
                      )}
                      <textarea
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        onBlur={() => forceSave()}
                        className="flex-1 text-[40px] print:text-[32px] font-bold resize-none overflow-hidden leading-tight outline-none bg-transparent"
                        placeholder="Untitled"
                        rows={1}
                        style={{
                          minHeight: '1.2em',
                          height: 'auto',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          boxShadow: 'none'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    </div>

                    {/* Editor Content */}
                    <div className="relative">
                      <RichTextPlugin
                        contentEditable={
                          <ContentEditable className="min-h-[400px] print:min-h-0 outline-none prose prose-sm max-w-none focus:outline-none [&_*]:text-black print:text-sm" />
                        }
                        placeholder={<div className="absolute top-0 left-0 text-muted-foreground pointer-events-none">Start writing...</div>}
                        ErrorBoundary={LexicalErrorBoundary}
                      />
                      <InsertPlugin />
                    </div>

                    {/* Page break indicator for preview */}
                    <div className="page-break-indicator print:hidden"></div>
                  </div>
                </div>

                {/* Additional pages if content is long */}
                <div
                  className="bg-white shadow-lg print:shadow-none print-page print:h-auto print:w-auto"
                  style={{
                    width: pageDimensions.width,
                    minHeight: pageDimensions.height,
                  }}
                >
                  {/* Header Image on subsequent pages */}
                  {document.header_content && (
                    <div className="h-24 w-full overflow-hidden">
                      <img 
                        src={document.header_content} 
                        alt="Header" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-12 print:p-8">
                    {/* Continued content placeholder */}
                    <div className="text-muted-foreground text-sm italic">
                      Additional content will appear here when document is longer...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Normal Edit View
            <div className={cn('w-full px-8 py-12 pt-0 relative', containerClass)}>
              {/* Header Image */}
              {document.header_content && (
                <div className="mb-6 -mx-8 h-24 overflow-hidden rounded-t-lg">
                  <img 
                    src={document.header_content} 
                    alt="Header" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Cover Image */}
              {document.cover_image && (
                <div className="mb-8 -mx-8 h-60 overflow-hidden rounded-lg">
                  <img 
                    src={document.cover_image} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Logo */}
              {document.logo && (
                <div className="mb-6">
                  <img 
                    src={document.logo} 
                    alt="Logo" 
                    className="h-12 object-contain"
                  />
                </div>
              )}

              {/* Icon + Title */}
              <div className="flex items-start gap-3 mb-8">
                {document.icon && (
                  <div className="text-5xl leading-none mt-1">
                    {document.icon}
                  </div>
                )}
                <textarea
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => forceSave()}
                  className="flex-1 text-[40px] font-bold resize-none overflow-hidden leading-tight outline-none bg-transparent"
                  placeholder="Untitled"
                  rows={1}
                  style={{
                    minHeight: '1.2em',
                    height: 'auto',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    boxShadow: 'none'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>

              {/* Editor Content */}
              <div className="relative">
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable className="min-h-[400px] outline-none prose prose-sm max-w-none relative" />
                  }
                  placeholder={<div className="absolute top-0 left-0 text-muted-foreground pointer-events-none">Start writing...</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <InsertPlugin />
              </div>
            </div>
          )}
        </div>

        {/* Plugins */}
        <OnChangePlugin onChange={handleContentChange} />
        <HistoryPlugin />
        <ListPlugin />
        
        {/* Toolbars */}
        <FloatingToolbar />
        <div className="no-print">
          <BottomToolbar 
            onSettings={() => setShowSettingsModal(true)}
            onSave={() => forceSave()}
            onDuplicate={handleDuplicate}
            onTogglePrintView={() => setShowPrintView(!showPrintView)}
            onToggleWidth={handleToggleWidth}
            onExport={handleExport}
            isSaving={isSaving}
            showPrintView={showPrintView}
            widthMode={widthMode}
          />
        </div>

        {/* Insert Menu */}
        <InsertNodeMenu 
          open={showInsertMenu}
          onOpenChange={setShowInsertMenu}
        />

        {/* Settings Modal */}
        <DocumentSettingsModal
          document={document}
          databaseId={databaseId}
          onUpdate={handleUpdateSettings}
          onDelete={onDelete}
          open={showSettingsModal}
          onOpenChange={setShowSettingsModal}
        />

        {/* Saving indicator */}
        {isSaving && (
          <div className="fixed bottom-4 right-4 bg-background border shadow-sm px-3 py-2 rounded-md text-sm text-muted-foreground">
            Saving...
          </div>
        )}
        {!isSaving && lastSaved && (
          <div className="fixed bottom-4 right-4 bg-background border shadow-sm px-3 py-2 rounded-md text-sm text-muted-foreground">
            Saved {new Date(lastSaved).toLocaleTimeString()}
          </div>
        )}
      </LexicalComposer>
    </div>
  );
}
