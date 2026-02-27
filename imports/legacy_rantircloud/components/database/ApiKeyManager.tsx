import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Copy, Key, Plus, Trash2, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';
import { databaseApiService, ApiKey, ApiKeyResponse, ApiKeyScope } from '@/services/databaseApiService';
import { format } from 'date-fns';

interface ApiKeyManagerProps {
  databaseId?: string;
}

const AVAILABLE_SCOPES = [
  { id: 'read', label: 'Read', description: 'Read databases, tables, and records' },
  { id: 'write', label: 'Write', description: 'Create and update records' },
  { id: 'delete', label: 'Delete', description: 'Delete records, tables, and databases' },
  { id: 'schema', label: 'Schema', description: 'Modify table schemas' },
  { id: 'admin', label: 'Admin', description: 'Full access to all operations' },
];

export function ApiKeyManager({ databaseId }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyResponse, setNewKeyResponse] = useState<ApiKeyResponse | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  
  // Form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<ApiKeyScope[]>(['read']);
  const [newKeyRateLimitMinute, setNewKeyRateLimitMinute] = useState(60);
  const [newKeyRateLimitDay, setNewKeyRateLimitDay] = useState(10000);
  const [newKeyExpiration, setNewKeyExpiration] = useState<string>('never');
  
  useEffect(() => {
    loadApiKeys();
  }, [databaseId]);
  
  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await databaseApiService.listApiKeys(databaseId);
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    
    try {
      let expiresAt: string | null = null;
      if (newKeyExpiration !== 'never') {
        const days = parseInt(newKeyExpiration);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }
      
      const response = await databaseApiService.createApiKey({
        name: newKeyName,
        database_id: databaseId,
        scopes: newKeyScopes,
        rate_limit_per_minute: newKeyRateLimitMinute,
        rate_limit_per_day: newKeyRateLimitDay,
        expires_at: expiresAt,
      });
      
      setNewKeyResponse(response);
      setShowNewKey(true);
      loadApiKeys();
      
      // Reset form
      setNewKeyName('');
      setNewKeyScopes(['read']);
      setNewKeyRateLimitMinute(60);
      setNewKeyRateLimitDay(10000);
      setNewKeyExpiration('never');
      
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    }
  };
  
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };
  
  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    try {
      await databaseApiService.toggleApiKey(keyId, isActive);
      setApiKeys(keys => keys.map(k => k.id === keyId ? { ...k, is_active: isActive } : k));
      toast.success(isActive ? 'API key enabled' : 'API key disabled');
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      toast.error('Failed to update API key');
    }
  };
  
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      await databaseApiService.deleteApiKey(keyId);
      setApiKeys(keys => keys.filter(k => k.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };
  
  const handleScopeToggle = (scope: ApiKeyScope) => {
    setNewKeyScopes(current => {
      if (current.includes(scope)) {
        return current.filter(s => s !== scope);
      }
      return [...current, scope];
    });
  };
  
  const closeNewKeyDialog = () => {
    setNewKeyResponse(null);
    setShowNewKey(false);
    setCreateDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to your databases
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {newKeyResponse ? (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Make sure to copy your API key now. You won't be able to see it again!
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono break-all">
                        {showNewKey ? newKeyResponse.key : '•'.repeat(40)}
                      </code>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowNewKey(!showNewKey)}
                        >
                          {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyKey(newKeyResponse.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      This key will only be shown once. Store it securely.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeNewKeyDialog}>Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key to access your databases programmatically
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Name</Label>
                    <Input
                      id="key-name"
                      placeholder="My API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <div key={scope.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted">
                          <Checkbox
                            id={`scope-${scope.id}`}
                            checked={newKeyScopes.includes(scope.id as ApiKeyScope)}
                            onCheckedChange={() => handleScopeToggle(scope.id as ApiKeyScope)}
                          />
                          <div className="grid gap-1">
                            <Label htmlFor={`scope-${scope.id}`} className="font-medium cursor-pointer">
                              {scope.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{scope.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate-minute">Requests/min</Label>
                      <Input
                        id="rate-minute"
                        type="number"
                        value={newKeyRateLimitMinute}
                        onChange={(e) => setNewKeyRateLimitMinute(parseInt(e.target.value) || 60)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate-day">Requests/day</Label>
                      <Input
                        id="rate-day"
                        type="number"
                        value={newKeyRateLimitDay}
                        onChange={(e) => setNewKeyRateLimitDay(parseInt(e.target.value) || 10000)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration</Label>
                    <Select value={newKeyExpiration} onValueChange={setNewKeyExpiration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey}>Create Key</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No API Keys</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first API key to start using the Database API
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {key.total_requests.toLocaleString()} requests
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.is_active}
                        onCheckedChange={(checked) => handleToggleKey(key.id, checked)}
                      />
                      <span className={key.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(key.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
