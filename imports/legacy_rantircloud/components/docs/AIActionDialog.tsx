import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'improve' | 'generate' | 'ask' | 'image';
  selectedText: string;
  onInsert?: (text: string) => void;
}

export function AIActionDialog({
  open,
  onOpenChange,
  action,
  selectedText,
  onInsert,
}: AIActionDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTitle = () => {
    switch (action) {
      case 'improve':
        return 'Improve Writing';
      case 'generate':
        return 'Generate Content';
      case 'ask':
        return 'Ask AI';
      case 'image':
        return 'Generate Image';
      default:
        return 'AI Assistant';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'improve':
        return 'Improve the selected text with AI assistance';
      case 'generate':
        return 'Generate new content based on your prompt';
      case 'ask':
        return 'Ask questions about the selected text';
      case 'image':
        return 'Generate an image based on your description';
      default:
        return 'Use AI to enhance your document';
    }
  };

  const getDefaultPrompt = () => {
    switch (action) {
      case 'improve':
        return 'Please improve this text: ' + selectedText;
      case 'generate':
        return 'Generate content about: ';
      case 'ask':
        return 'Question about the text: ';
      case 'image':
        return 'Generate an image showing: ';
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('doc-ai', {
        body: {
          action,
          prompt: prompt,
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
        setResponse(data.response);
      } else {
        toast.error('No response from AI');
      }
    } catch (error: any) {
      console.error('AI error:', error);
      toast.error(error.message || 'Failed to process AI request');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (response && onInsert) {
      onInsert(response);
      toast.success('Inserted into document');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setResponse('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedText && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Selected text:</p>
              <p className="text-sm text-muted-foreground">{selectedText}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              {action === 'ask' ? 'Your question' : 'Your prompt'}
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={getDefaultPrompt()}
              rows={3}
              className="resize-none"
            />
          </div>

          {response && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Response:</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                  {onInsert && (
                    <Button size="sm" onClick={handleInsert}>
                      Insert into document
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                {response}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Processing...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
