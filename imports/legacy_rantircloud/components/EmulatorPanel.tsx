
import { useState, useEffect, useRef } from "react";
import { getEmulatorFriendlyError } from "@/lib/chat-error-utils";
import { Send, RefreshCw, Check, Copy, Trash2, Code2, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useFlowStore } from "@/lib/flow-store";
import { toast } from "./ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

interface EmulatorPanelProps {
  onOpenEmbedConfig?: () => void;
}

export function EmulatorPanel({ onOpenEmbedConfig }: EmulatorPanelProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const { nodes } = useFlowStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { user } = useAuth();
  const { id: flowProjectId } = useParams<{ id: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiAgentNodes = nodes.filter(node => node.data.type === 'ai-agent');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      // Build conversation history
      const history = messages
        .filter(m => m.id !== '1')
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      if (!flowProjectId) {
        throw new Error('No flow project found');
      }

      // Call the chat-widget edge function directly with the flow project ID
      // This works for both deployed and undeployed flows
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Optionally load API key for auth
      const { data: keyData } = await supabase
        .from('flow_variables')
        .select('value')
        .eq('flow_project_id', flowProjectId)
        .eq('name', 'API_KEY')
        .eq('is_secret', true)
        .maybeSingle();

      if (keyData?.value) headers['x-api-key'] = keyData.value;

      const res = await fetch(`${supabaseUrl}/functions/v1/chat-widget/${flowProjectId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: currentInput, history }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { id: `bot-${Date.now()}`, text: data.reply, sender: "bot", timestamp: new Date() },
      ]);
    } catch (error: any) {
      setIsTyping(false);
      const friendlyMsg = getEmulatorFriendlyError(error.message || '');
      setMessages(prev => [
        ...prev,
        { id: `bot-${Date.now()}`, text: friendlyMsg, sender: "bot", timestamp: new Date() },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([{ id: "1", text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }]);
    setSelectedNodeId(null);
  };

  return (
    <div className="bg-background flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b flex justify-between items-center bg-background shrink-0">
        <h3 className="font-medium text-sm text-foreground">Emulator</h3>
        <div className="flex gap-1">
          {onOpenEmbedConfig && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenEmbedConfig} title="Get Embed Code">
              <Code2 size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetConversation}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {aiAgentNodes.length > 0 && (
        <div className="p-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">AI Agent:</span>
            <Select value={selectedNodeId || ""} onValueChange={setSelectedNodeId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select a node" />
              </SelectTrigger>
              <SelectContent>
                {aiAgentNodes.map(node => (
                  <SelectItem key={node.id} value={node.id}>{node.data.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedNodeId && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
              <Check size={12} className="flex-shrink-0" />
              <span>Connected to AI Agent node</span>
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 bg-muted/30">
        <div className="flex flex-col gap-3">
          {messages.map(message =>
            message.sender === 'user' ? (
              <div key={message.id} className="flex flex-col items-end gap-1 max-w-[80%] self-end">
                <div className="flex gap-2 items-start flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {user?.email?.substring(0, 2).toUpperCase() || 'Y'}
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 text-sm">
                    {message.text}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                  <span>{message.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(message.text); toast.success("Copied"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setMessages(messages.filter(m => m.id !== message.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div key={message.id} className="max-w-[80%] self-start">
                <div className="bg-background border rounded-lg p-2.5 text-xs text-foreground prose prose-sm max-w-none">
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                </div>
                <div className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          )}

          {isTyping && (
            <div className="self-start">
              <div className="bg-background border rounded-lg p-3 flex gap-1 items-center">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground ml-1">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t bg-background">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-primary"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
