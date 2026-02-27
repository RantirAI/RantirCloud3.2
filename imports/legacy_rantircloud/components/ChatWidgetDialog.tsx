
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContentInner,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface ChatWidgetDialogProps {
  flowId: string;
}

export function ChatWidgetDialog({ flowId }: ChatWidgetDialogProps) {
  const [config, setConfig] = useState({
    title: "Chat with us",
    primaryColor: "#9b87f5",
    bubbleColor: "#f3f4f6",
    buttonText: "Start Chat",
    position: "bottom-right",
  });

  const generateEmbedCode = () => {
    const params = new URLSearchParams({
      title: config.title,
      primaryColor: config.primaryColor.replace("#", ""),
      bubbleColor: config.bubbleColor.replace("#", ""),
      buttonText: config.buttonText,
      position: config.position,
    });

    return `<iframe 
  src="https://lovable.dev/chat-widget/${flowId}?${params.toString()}"
  width="400" 
  height="600" 
  style="border: none; position: fixed; ${config.position === 'bottom-right' ? 'right: 20px; bottom: 20px;' : 'left: 20px; bottom: 20px;'}"
  allow="microphone"
></iframe>`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    toast("Embed Code Copied!", {
      description: "The chat widget embed code has been copied to your clipboard",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="text-xs gap-0.5">
          <Code className="h-3 w-3" />
          Embed Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Customize Chat Widget</DialogTitle>
          <DialogDescription>
            Customize how your chat widget looks and behaves before embedding it on your website.
          </DialogDescription>
        </DialogHeader>
        <DialogContentInner className="grid gap-4 text-sm">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-xs">
              Widget Title
            </Label>
            <Input
              id="title"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="col-span-3 text-xs"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="buttonText" className="text-right text-xs">
              Button Text
            </Label>
            <Input
              id="buttonText"
              value={config.buttonText}
              onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
              className="col-span-3 text-xs"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="primaryColor" className="text-right text-xs">
              Primary Color
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                type="color"
                id="primaryColor"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="w-12 h-8 p-1"
              />
              <Input
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bubbleColor" className="text-right text-xs">
              Bubble Color
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                type="color"
                id="bubbleColor"
                value={config.bubbleColor}
                onChange={(e) => setConfig({ ...config, bubbleColor: e.target.value })}
                className="w-12 h-8 p-1"
              />
              <Input
                value={config.bubbleColor}
                onChange={(e) => setConfig({ ...config, bubbleColor: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="position" className="text-right text-xs">
              Position
            </Label>
            <select
              id="position"
              value={config.position}
              onChange={(e) => setConfig({ ...config, position: e.target.value })}
              className="col-span-3 flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
        </DialogContentInner>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopyCode} size="sm" className="gap-2">
            <Copy className="h-3 w-3" />
            Copy Embed Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
