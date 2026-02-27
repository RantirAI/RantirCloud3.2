import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useEffect, useState } from 'react';
import { FORMAT_TEXT_COMMAND, $getSelection, $isRangeSelection } from 'lexical';
import { $patchStyleText } from '@lexical/selection';
import {
  Sparkles,
  Wand2,
  ImagePlus,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  Type,
  Highlighter,
  Send,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function FloatingToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [selectedText, setSelectedText] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAction, setAIAction] = useState<'improve' | 'generate' | 'ask' | 'image'>('improve');
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);

  const updateToolbar = useCallback(() => {
    // Don't hide toolbar when AI panel is open
    if (showAIPanel) return;
    
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString();

    if (text.trim().length === 0) {
      setIsVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    
    // Store selected text
    setSelectedText(text);
    
    // Position toolbar above the selection
    setPosition({
      top: rect.top + window.scrollY - 60,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setIsVisible(true);
  }, [showAIPanel]);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateToolbar();
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Close AI panel when clicking outside
      if (showAIPanel) {
        const target = e.target as HTMLElement;
        // Check if click is outside the toolbar and AI panel
        if (!target.closest('.floating-toolbar-container')) {
          setShowAIPanel(false);
          setAIPrompt('');
          setAIResponse('');
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [updateToolbar, showAIPanel]);

  const handleFormat = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': color });
      }
    });
  };

  const handleAIAction = (action: 'improve' | 'generate' | 'ask' | 'image') => {
    setAIAction(action);
    setShowAIPanel(true);
    setAIPrompt('');
    setAIResponse('');
  };

  const handleAISubmit = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setAILoading(true);
    setAIResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('doc-ai', {
        body: {
          action: aiAction,
          prompt: aiPrompt,
          selectedText: selectedText,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.response) {
        setAIResponse(data.response);
      } else {
        toast.error('No response from AI');
      }
    } catch (error: any) {
      console.error('AI error:', error);
      toast.error(error.message || 'Failed to process AI request');
    } finally {
      setAILoading(false);
    }
  };

  const handleInsertAIResponse = () => {
    if (aiResponse) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(aiResponse);
        }
      });
      toast.success('Inserted into document');
      setShowAIPanel(false);
      setAIPrompt('');
      setAIResponse('');
    }
  };

  const getAIIcon = () => {
    switch (aiAction) {
      case 'improve': return <Sparkles className="h-3.5 w-3.5" />;
      case 'generate': return <Wand2 className="h-3.5 w-3.5" />;
      case 'image': return <ImagePlus className="h-3.5 w-3.5" />;
      case 'ask': return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      className={cn(
        'floating-toolbar-container fixed z-50 transition-all duration-200 -translate-x-1/2',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Main Toolbar */}
        <div className="flex items-center gap-1 p-1.5 bg-popover border rounded-lg shadow-lg">
          {/* AI Actions */}
          <button
            onClick={() => handleAIAction('improve')}
            className="flex items-center gap-1.5 px-2 h-7 hover:bg-accent rounded-md transition-colors text-sm"
            title="Improve writing"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs">Improve</span>
          </button>
          <button
            onClick={() => handleAIAction('generate')}
            className="flex items-center gap-1.5 px-2 h-7 hover:bg-accent rounded-md transition-colors text-sm"
            title="Generate writing"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span className="text-xs">Generate</span>
          </button>
          <button
            onClick={() => handleAIAction('image')}
            className="flex items-center gap-1.5 px-2 h-7 hover:bg-accent rounded-md transition-colors text-sm"
            title="Generate image"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span className="text-xs">Image</span>
          </button>
          <button
            onClick={() => handleAIAction('ask')}
            className="flex items-center gap-1.5 px-2 h-7 hover:bg-accent rounded-md transition-colors text-sm"
            title="Ask AI"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs">Ask AI</span>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-7 px-1.5 hover:bg-accent rounded-md transition-colors flex items-center gap-1"
                title="Text color"
              >
                <Type className="h-3.5 w-3.5" />
                <div className="h-3.5 w-3.5 rounded border" style={{ backgroundColor: textColor }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center">
              <div className="space-y-2">
                <p className="text-xs font-medium mb-2">Text Color</p>
                <HexColorPicker color={textColor} onChange={handleTextColorChange} />
              </div>
            </PopoverContent>
          </Popover>

          {/* Background Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-7 px-1.5 hover:bg-accent rounded-md transition-colors flex items-center gap-1"
                title="Background color"
              >
                <Highlighter className="h-3.5 w-3.5" />
                <div className="h-3.5 w-3.5 rounded border" style={{ backgroundColor: bgColor }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center">
              <div className="space-y-2">
                <p className="text-xs font-medium mb-2">Background</p>
                <HexColorPicker color={bgColor} onChange={handleBgColorChange} />
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Quick Formatting */}
          <button
            onClick={() => handleFormat('bold')}
            className="h-7 w-7 p-0 hover:bg-accent rounded-md transition-colors flex items-center justify-center"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleFormat('italic')}
            className="h-7 w-7 p-0 hover:bg-accent rounded-md transition-colors flex items-center justify-center"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleFormat('underline')}
            className="h-7 w-7 p-0 hover:bg-accent rounded-md transition-colors flex items-center justify-center"
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* AI Panel - Inline Chat */}
        {showAIPanel && (
          <div className="bg-popover border rounded-lg shadow-lg p-3" style={{ width: '400px' }}>
            <div className="space-y-3">
              {/* Header with selected text */}
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getAIIcon()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
                  <p className="text-xs bg-muted p-2 rounded max-h-20 overflow-y-auto">
                    {selectedText}
                  </p>
                </div>
              </div>

              {/* Input area */}
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder={`Enter your ${aiAction} prompt...`}
                className="min-h-[60px] text-sm resize-none"
                disabled={aiLoading}
              />

              {/* Response area */}
              {aiResponse && (
                <div className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto">
                  {aiResponse}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAIPanel(false);
                    setAIPrompt('');
                    setAIResponse('');
                  }}
                  disabled={aiLoading}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  {aiResponse && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAISubmit}
                        disabled={aiLoading}
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleInsertAIResponse}
                      >
                        Insert
                      </Button>
                    </>
                  )}
                  {!aiResponse && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAISubmit}
                      disabled={aiLoading || !aiPrompt.trim()}
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1" />
                      )}
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
