import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DatabaseConnection } from '@/types/appBuilder';
import { Database, Loader2 } from 'lucide-react';

interface DatabaseConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (connection: Omit<DatabaseConnection, 'id'>) => void;
  connection?: DatabaseConnection;
}

export function DatabaseConnectionDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  connection 
}: DatabaseConnectionDialogProps) {
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    type: connection?.type || 'supabase' as const,
    config: connection?.config || {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tables: connection?.tables || []
    });
    onOpenChange(false);
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResult({ success: true, message: 'Connection successful!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Connection failed. Please check your credentials.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfigFields = () => {
    switch (formData.type) {
      case 'supabase':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Supabase URL</Label>
              <Input
                id="url"
                value={formData.config.url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, url: e.target.value }
                }))}
                placeholder="https://your-project.supabase.co"
              />
            </div>
            <div>
              <Label htmlFor="anonKey">Anon Key</Label>
              <Textarea
                id="anonKey"
                value={formData.config.anonKey || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, anonKey: e.target.value }
                }))}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'postgres':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                value={formData.config.host || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, host: e.target.value }
                }))}
                placeholder="localhost"
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.config.port || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, port: parseInt(e.target.value) }
                }))}
                placeholder="5432"
              />
            </div>
            <div>
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                value={formData.config.database || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, database: e.target.value }
                }))}
                placeholder="myapp"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.config.username || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, username: e.target.value }
                }))}
                placeholder="postgres"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.config.password || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, password: e.target.value }
                }))}
                placeholder="••••••••"
              />
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={formData.config.baseUrl || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, baseUrl: e.target.value }
                }))}
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={formData.config.apiKey || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, apiKey: e.target.value }
                }))}
                placeholder="your-api-key"
              />
            </div>
            <div>
              <Label htmlFor="headers">Custom Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={formData.config.headers || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, headers: e.target.value }
                }))}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {connection ? 'Edit Connection' : 'Add Database Connection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Database"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Database Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: any) => setFormData(prev => ({ 
                ...prev, 
                type: value,
                config: {} // Reset config when type changes
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supabase">Supabase</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="api">REST API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderConfigFields()}

          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading || !formData.name}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name || !testResult?.success}
              className="flex-1"
            >
              Save Connection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}