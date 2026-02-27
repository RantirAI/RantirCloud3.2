
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogContentInner } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface FormShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  config?: {
    inputBorderRadius?: string;
    buttonBorderRadius?: string;
    formPadding?: string;
    fieldGap?: string;
    fontFamily?: string;
    titleFont?: string;
    descriptionFont?: string;
    allCaps?: boolean;
  };
}

export function FormShareDialog({ isOpen, onClose, tableId, config }: FormShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  
  const formUrl = `${window.location.origin}/form/${tableId}`;
  
  const inputRadius = config?.inputBorderRadius || '6';
  const buttonRadius = config?.buttonBorderRadius || '6';
  
  const embedCode = `<iframe
  src="${formUrl}"
  width="100%"
  height="600"
  style="border:none;border-radius:${inputRadius}px;box-shadow:0 2px 10px rgba(0,0,0,0.08)"
  title="Embedded Form"
></iframe>`;

  const copyToClipboard = (text: string, type: 'link' | 'embed') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'link') {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          setEmbedCopied(true);
          setTimeout(() => setEmbedCopied(false), 2000);
        }
        toast.success(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard`);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Form</DialogTitle>
        </DialogHeader>
        
        <DialogContentInner>
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="w-fit mb-4">
              <TabsTrigger value="link" className="text-xs">Share Link</TabsTrigger>
              <TabsTrigger value="embed" className="text-xs">Embed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="link">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link" className="text-xs">Form Link</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="link"
                      value={formUrl}
                      readOnly
                      className="flex-1 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formUrl, 'link')}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => window.open(formUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open in new tab
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="embed">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="embed" className="text-xs">Embed Code</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="embed"
                      value={embedCode}
                      readOnly
                      className="flex-1 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(embedCode, 'embed')}
                    >
                      {embedCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Paste this code into your website HTML to embed this form.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContentInner>
        
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
