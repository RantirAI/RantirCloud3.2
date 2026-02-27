import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, RefreshCw, Send, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { databaseApiService, Webhook as WebhookType, WebhookDelivery } from '@/services/databaseApiService';
import { format } from 'date-fns';

interface WebhookManagerProps {
  databaseId?: string;
  tableId?: string;
}

const AVAILABLE_EVENTS = [
  { id: 'record.created', label: 'Record Created', description: 'Triggered when a new record is created' },
  { id: 'record.updated', label: 'Record Updated', description: 'Triggered when a record is updated' },
  { id: 'record.deleted', label: 'Record Deleted', description: 'Triggered when a record is deleted' },
];

export function WebhookManager({ databaseId, tableId }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  
  // Form state
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['record.created']);
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  
  useEffect(() => {
    loadWebhooks();
  }, [databaseId, tableId]);
  
  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const hooks = await databaseApiService.listWebhooks(databaseId, tableId);
      setWebhooks(hooks);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };
  
  const loadDeliveries = async (webhookId: string) => {
    try {
      const deliveryLogs = await databaseApiService.getWebhookDeliveries(webhookId);
      setDeliveries(prev => ({ ...prev, [webhookId]: deliveryLogs }));
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    }
  };
  
  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim()) {
      toast.error('Please enter a name for the webhook');
      return;
    }
    
    if (!newWebhookUrl.trim()) {
      toast.error('Please enter a URL for the webhook');
      return;
    }
    
    try {
      new URL(newWebhookUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    
    try {
      await databaseApiService.createWebhook({
        name: newWebhookName,
        url: newWebhookUrl,
        database_id: databaseId,
        table_id: tableId,
        events: newWebhookEvents,
        secret: newWebhookSecret || undefined,
      });
      
      loadWebhooks();
      setCreateDialogOpen(false);
      
      // Reset form
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookEvents(['record.created']);
      setNewWebhookSecret('');
      
      toast.success('Webhook created successfully');
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    }
  };
  
  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await databaseApiService.toggleWebhook(webhookId, isActive);
      setWebhooks(hooks => hooks.map(h => h.id === webhookId ? { ...h, is_active: isActive } : h));
      toast.success(isActive ? 'Webhook enabled' : 'Webhook disabled');
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      toast.error('Failed to update webhook');
    }
  };
  
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }
    
    try {
      await databaseApiService.deleteWebhook(webhookId);
      setWebhooks(hooks => hooks.filter(h => h.id !== webhookId));
      toast.success('Webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };
  
  const handleTestWebhook = async (webhookId: string) => {
    try {
      const webhook = webhooks.find(h => h.id === webhookId);
      if (!webhook) return;
      
      // Send test request directly
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'This is a test webhook delivery' },
        }),
      });
      
      if (response.ok) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(`Test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    }
  };
  
  const handleEventToggle = (event: string) => {
    setNewWebhookEvents(current => {
      if (current.includes(event)) {
        return current.filter(e => e !== event);
      }
      return [...current, event];
    });
  };
  
  const toggleExpanded = (webhookId: string) => {
    if (expandedWebhook === webhookId) {
      setExpandedWebhook(null);
    } else {
      setExpandedWebhook(webhookId);
      if (!deliveries[webhookId]) {
        loadDeliveries(webhookId);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Receive real-time notifications when data changes
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Set up a webhook to receive notifications when data changes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input
                  id="webhook-name"
                  placeholder="My Webhook"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={newWebhookEvents.includes(event.id)}
                        onCheckedChange={() => handleEventToggle(event.id)}
                      />
                      <div className="grid gap-1">
                        <Label htmlFor={`event-${event.id}`} className="font-medium cursor-pointer">
                          {event.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  placeholder="Used for HMAC signature verification"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If set, we'll include an X-Webhook-Signature header for verification
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook}>Create Webhook</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Webhooks</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first webhook to receive real-time notifications
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <Collapsible open={expandedWebhook === webhook.id} onOpenChange={() => toggleExpanded(webhook.id)}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedWebhook === webhook.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div>
                        <h4 className="font-medium">{webhook.name}</h4>
                        <p className="text-sm text-muted-foreground truncate max-w-md">{webhook.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event.replace('record.', '')}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {webhook.total_deliveries} deliveries
                        </span>
                        {webhook.failed_deliveries > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {webhook.failed_deliveries} failed
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTestWebhook(webhook.id)}
                        title="Send test webhook"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <CollapsibleContent>
                  <div className="border-t px-4 py-3">
                    <h5 className="text-sm font-medium mb-3">Recent Deliveries</h5>
                    {deliveries[webhook.id]?.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Response</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveries[webhook.id].slice(0, 10).map((delivery) => (
                            <TableRow key={delivery.id}>
                              <TableCell>
                                {delivery.success ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs">Success</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-destructive">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-xs">Failed</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {delivery.event_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {delivery.response_status || delivery.error_message || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {delivery.response_time_ms ? `${delivery.response_time_ms}ms` : '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(delivery.created_at), 'MMM d, HH:mm')}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No deliveries yet
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
