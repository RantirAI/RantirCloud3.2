import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Radio, Copy, Check, Loader2, Webhook, Package, Search, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SelectablePayloadTree } from './SelectablePayloadTree';
import { SamplePayloadSelector, SamplePayload } from './SamplePayloadSelector';

interface WebhookTesterProps {
  isOpen: boolean;
  onClose: () => void;
  flowProjectId: string;
  webhookUrl: string | null;
  currentPayload?: any;
  onPayloadCapture: (payload: any, selectedFields?: { paths: string[]; autoNames: Record<string, string> }) => void;
}

export function WebhookTester({
  isOpen,
  onClose,
  flowProjectId,
  webhookUrl,
  currentPayload,
  onPayloadCapture
}: WebhookTesterProps) {
  const [isListening, setIsListening] = useState(false);
  const [capturedPayload, setCapturedPayload] = useState<any>(currentPayload || null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState<string | undefined>();
  const [tab, setTab] = useState<string>('listen');
  
  // Selection state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [autoNames, setAutoNames] = useState<Map<string, string>>(new Map());

  // Use the deployed webhook URL for testing
  const testUrl = webhookUrl || '';
  
  // Track when listening started for polling
  const [listeningStartedAt, setListeningStartedAt] = useState<string | null>(null);

  // Subscribe to realtime updates AND poll as fallback
  useEffect(() => {
    if (!isListening || !flowProjectId) return;

    const startTime = new Date().toISOString();
    setListeningStartedAt(startTime);

    // Realtime subscription
    const channel = supabase
      .channel(`webhook-test-${flowProjectId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'flow_endpoint_analytics',
        filter: `flow_project_id=eq.${flowProjectId}`
      }, async (payload) => {
        const data = payload.new as any;
        const params = data.request_params || {};
        const captured = {
          body: params.body || {},
          headers: params.headers || [],
          query: params.query || {},
          method: data.method,
          _capturedAt: data.called_at,
          _statusCode: data.status_code
        };
        setCapturedPayload(captured);
        setIsListening(false);
        toast.success('Webhook request captured!', {
          description: `Status: ${data.status_code}, Method: ${data.method}`
        });
      })
      .subscribe();

    // Polling fallback - check every 2 seconds for new analytics
    const pollInterval = setInterval(async () => {
      const { data: latestAnalytics } = await supabase
        .from('flow_endpoint_analytics')
        .select('*')
        .eq('flow_project_id', flowProjectId)
        .gt('called_at', startTime)
        .order('called_at', { ascending: false })
        .limit(1);

      if (latestAnalytics && latestAnalytics.length > 0) {
        const data = latestAnalytics[0];
        const params = (data.request_params as any) || {};
        const captured = {
          body: params.body || {},
          headers: params.headers || [],
          query: params.query || {},
          method: data.method,
          _capturedAt: data.called_at,
          _statusCode: data.status_code
        };
        setCapturedPayload(captured);
        setIsListening(false);
        toast.success('Webhook request captured!', {
          description: `Status: ${data.status_code}, Method: ${data.method}`
        });
      }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isListening, flowProjectId]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(testUrl);
    setCopied(true);
    toast.success('Test URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [testUrl]);

  const handleStartListening = () => {
    setIsListening(true);
    setCapturedPayload(null);
    setSelectedPaths(new Set());
    setAutoNames(new Map());
    toast.info('Listening for webhook...', {
      description: 'Send a request to the test URL above'
    });
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handleSelectSample = (sample: SamplePayload) => {
    const payload = {
      body: sample.payload.body,
      headers: sample.payload.headers,
      query: sample.payload.query,
      method: sample.payload.method,
      _provider: sample.provider,
      _capturedAt: new Date().toISOString(),
      _isSample: true
    };
    setCapturedPayload(payload);
    setSelectedSample(`${sample.provider}::${sample.eventType}`);
    setSelectedPaths(new Set());
    setAutoNames(new Map());
    toast.success(`Loaded ${sample.displayName} sample`);
  };

  const handleSelectionChange = useCallback((paths: Set<string>, names: Map<string, string>) => {
    setSelectedPaths(paths);
    setAutoNames(names);
  }, []);

  const handleUsePayload = () => {
    if (capturedPayload) {
      // Build the filtered payload based on selection
      const selectedFields = {
        paths: Array.from(selectedPaths),
        autoNames: Object.fromEntries(autoNames)
      };
      
      onPayloadCapture(capturedPayload, selectedPaths.size > 0 ? selectedFields : undefined);
      toast.success('Payload saved for variable binding', {
        description: selectedPaths.size > 0 
          ? `${selectedPaths.size} field(s) selected`
          : 'All fields available'
      });
      onClose();
    }
  };

  const handleClearPayload = () => {
    setCapturedPayload(null);
    setSelectedSample(undefined);
    setSelectedPaths(new Set());
    setAutoNames(new Map());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Webhook className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-base">Test Webhook</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send a test request to your deployed webhook URL
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="listen" className="flex-1 gap-2">
                <Radio className="h-3.5 w-3.5" />
                Listen for Webhook
              </TabsTrigger>
              <TabsTrigger value="sample" className="flex-1 gap-2">
                <Package className="h-3.5 w-3.5" />
                Use Sample Payload
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="listen" className="flex-shrink-0 px-6 py-4 mt-0">
            <div className="space-y-4">
              {!webhookUrl ? (
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Deploy your flow first to get a webhook URL for testing.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Your Deployed Webhook URL</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input 
                        value={testUrl} 
                        readOnly 
                        className="text-xs font-mono bg-muted/30"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleCopyUrl}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isListening ? (
                      <Button 
                        onClick={handleStartListening}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Radio className="h-4 w-4 mr-2" />
                        Start Listening
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStopListening}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Stop Listening
                      </Button>
                    )}
                  </div>

                  {isListening && (
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Waiting for webhook... Send a request to your deployed URL above.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sample" className="flex-shrink-0 px-6 py-4 mt-0">
            <SamplePayloadSelector 
              onSelect={handleSelectSample}
              value={selectedSample}
            />
          </TabsContent>

          {/* Payload Display Section */}
          {capturedPayload && (
            <div className="flex-1 flex flex-col min-h-0 border-t">
              <div className="px-6 py-3 bg-muted/30 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">
                    {capturedPayload._isSample ? 'Sample Payload' : 'Captured Payload'}
                  </span>
                  {capturedPayload._provider && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {capturedPayload._provider}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search fields..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 w-40 pl-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPayload}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-6 py-3">
                <SelectablePayloadTree 
                  data={capturedPayload}
                  onSelectionChange={handleSelectionChange}
                  searchQuery={searchQuery}
                />
              </ScrollArea>
              
              {selectedPaths.size > 0 && (
                <div className="px-6 py-2 border-t bg-primary/5 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedPaths.size}</span> field{selectedPaths.size !== 1 ? 's' : ''} selected. 
                    Only these will be available for binding.
                  </p>
                </div>
              )}
            </div>
          )}
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-between flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUsePayload}
            disabled={!capturedPayload}
            className="bg-primary"
          >
            <Check className="h-4 w-4 mr-2" />
            Use {selectedPaths.size > 0 ? `${selectedPaths.size} Selected Fields` : 'All Fields'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
