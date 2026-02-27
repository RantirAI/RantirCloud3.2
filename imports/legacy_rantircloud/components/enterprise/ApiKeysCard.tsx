import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Key, Plus, RotateCcw, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import { useToast } from '@/hooks/use-toast';
import type { EnterpriseKey } from '@/types/enterprise';

interface ApiKeysCardProps {
  workspaceId: string;
}

export function ApiKeysCard({ workspaceId }: ApiKeysCardProps) {
  const [keys, setKeys] = useState<EnterpriseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadKeys();
  }, [workspaceId]);

  const loadKeys = async () => {
    try {
      const data = await enterpriseService.getEnterpriseKeys(workspaceId);
      setKeys(data);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setGenerating(true);
      const newKey = await enterpriseService.generateApiKey(workspaceId);
      setGeneratedKey(newKey);
      setNewKeyDialogOpen(true);
      await loadKeys();
      toast({
        title: "API Key Generated",
        description: "Your new API key has been created. Make sure to copy it now.",
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await enterpriseService.revokeApiKey(keyId);
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked and is no longer valid.",
      });
      await loadKeys();
    } catch (error: any) {
      toast({
        title: "Revoke Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading API keys...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your enterprise API keys for programmatic access
          </p>
        </div>
        <Button onClick={handleGenerateKey} disabled={generating} size="sm" className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {generating ? "Generating..." : "Generate Key"}
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">•••••••••••••{key.last4}</span>
                      <Badge variant={key.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {key.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.profiles?.name && ` by ${key.profiles.name}`}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs px-1.5 py-0.5">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently revoke the API key ending in {key.last4}. 
                          Applications using this key will no longer be able to access the API.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRevokeKey(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            
            {keys.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Key className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No API keys found</p>
                <p className="text-xs">Generate your first API key to get started</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* New Key Dialog */}
        <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Your new API key has been generated. Copy it now - you won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono break-all">{generatedKey}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => generatedKey && copyToClipboard(generatedKey)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">read</Badge>
                <Badge variant="outline" className="text-xs">write</Badge>
                <span>Full API access</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}