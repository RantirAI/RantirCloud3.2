import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Eye, EyeOff, Lock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  createFlowSecret, 
  listFlowSecrets, 
  updateFlowSecret, 
  deleteFlowSecret,
  FlowSecret 
} from '@/services/flowSecretsService';

interface FlowVariable {
  id: string;
  name: string;
  value: string;
  isSecret: boolean;
  description?: string;
  isVaultBacked?: boolean; // Flag to indicate if stored in Vault
}

interface FlowVariablesManagerProps {
  icon?: React.ComponentType<any>;
  label?: string;
}

export function FlowVariablesManager({ icon: Icon, label = 'Variables & Secrets' }: FlowVariablesManagerProps = {}) {
  const { id: flowProjectId } = useParams<{ id: string }>();
  const [variables, setVariables] = useState<FlowVariable[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarIsSecret, setNewVarIsSecret] = useState(false);
  const [newVarDescription, setNewVarDescription] = useState('');

  // Load variables when component mounts or flow project changes
  useEffect(() => {
    if (flowProjectId) {
      loadVariables();
    }
  }, [flowProjectId]);

  const loadVariables = async () => {
    if (!flowProjectId) return;
    
    setLoading(true);
    try {
      // Load regular (non-secret) variables from flow_variables table
      const { data: regularVars, error: regularError } = await supabase
        .from('flow_variables')
        .select('*')
        .eq('flow_project_id', flowProjectId)
        .eq('is_secret', false)
        .order('created_at', { ascending: false });

      if (regularError) {
        console.error('Error loading regular flow variables:', regularError);
      }

      // Load Vault-backed secrets
      let vaultSecrets: FlowSecret[] = [];
      try {
        vaultSecrets = await listFlowSecrets(flowProjectId);
      } catch (err) {
        console.error('Error loading Vault secrets:', err);
      }

      // Convert regular variables
      const regularVariables: FlowVariable[] = (regularVars || []).map(item => ({
        id: item.id,
        name: item.name,
        value: item.value,
        isSecret: false,
        description: item.description,
        isVaultBacked: false,
      }));

      // Convert Vault secrets (value is never returned for security)
      const secretVariables: FlowVariable[] = vaultSecrets.map(secret => ({
        id: secret.id,
        name: secret.name,
        value: '••••••••', // Placeholder - actual value is encrypted in Vault
        isSecret: true,
        description: secret.description,
        isVaultBacked: true,
      }));

      setVariables([...secretVariables, ...regularVariables]);
    } catch (error) {
      console.error('Error loading flow variables:', error);
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newVarName.trim()) {
      toast.error('Variable name is required');
      return;
    }

    if (!flowProjectId) {
      toast.error('Flow project ID is required');
      return;
    }

    // Check if variable name already exists
    if (variables.some(v => v.name === newVarName.trim())) {
      toast.error('Variable name already exists');
      return;
    }

    setLoading(true);
    try {
      if (newVarIsSecret) {
        // Store secret in Vault
        const result = await createFlowSecret({
          flowProjectId,
          name: newVarName.trim(),
          value: newVarValue,
          description: newVarDescription.trim() || undefined,
        });

        const newVariable: FlowVariable = {
          id: result.id,
          name: newVarName.trim(),
          value: '••••••••', // Never show actual value
          isSecret: true,
          description: newVarDescription.trim() || undefined,
          isVaultBacked: true,
        };

        setVariables(prev => [newVariable, ...prev]);
        toast.success('Secret stored securely in Vault');
      } else {
        // Store regular variable in flow_variables table
        const { data, error } = await supabase
          .from('flow_variables')
          .insert({
            flow_project_id: flowProjectId,
            name: newVarName.trim(),
            value: newVarValue,
            is_secret: false,
            description: newVarDescription.trim() || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating variable:', error);
          toast.error('Failed to create variable');
          return;
        }

        const newVariable: FlowVariable = {
          id: data.id,
          name: data.name,
          value: data.value,
          isSecret: false,
          description: data.description,
          isVaultBacked: false,
        };

        setVariables(prev => [newVariable, ...prev]);
        toast.success('Variable added successfully');
      }
      
      // Clear form
      setNewVarName('');
      setNewVarValue('');
      setNewVarIsSecret(false);
      setNewVarDescription('');
    } catch (error) {
      console.error('Error creating variable:', error);
      toast.error('Failed to create variable');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariable = async (variable: FlowVariable) => {
    setLoading(true);
    try {
      if (variable.isVaultBacked) {
        // Delete from Vault
        await deleteFlowSecret({
          flowProjectId: flowProjectId!,
          secretId: variable.id,
        });
        toast.success('Secret deleted from Vault');
      } else {
        // Delete from flow_variables table
        const { error } = await supabase
          .from('flow_variables')
          .delete()
          .eq('id', variable.id);

        if (error) {
          console.error('Error deleting variable:', error);
          toast.error('Failed to delete variable');
          return;
        }
        toast.success('Variable deleted');
      }

      setVariables(prev => prev.filter(v => v.id !== variable.id));
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete variable');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVariable = async (variable: FlowVariable, field: keyof FlowVariable, value: string | boolean) => {
    // For Vault-backed secrets, only allow updating the value
    if (variable.isVaultBacked) {
      if (field === 'value' && typeof value === 'string') {
        setLoading(true);
        try {
          await updateFlowSecret({
            flowProjectId: flowProjectId!,
            name: variable.name,
            value: value,
          });
          toast.success('Secret updated in Vault');
          // Value display remains masked
        } catch (error) {
          console.error('Error updating Vault secret:', error);
          toast.error('Failed to update secret');
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // For regular variables
    setLoading(true);
    try {
      const updateData: any = {};
      
      if (field === 'isSecret') {
        updateData.is_secret = value;
      } else {
        updateData[field] = value;
      }

      const { error } = await supabase
        .from('flow_variables')
        .update(updateData)
        .eq('id', variable.id);

      if (error) {
        console.error('Error updating variable:', error);
        toast.error('Failed to update variable');
        return;
      }

      setVariables(prev => prev.map(v => 
        v.id === variable.id ? { ...v, [field]: value } : v
      ));
    } catch (error) {
      console.error('Error updating variable:', error);
      toast.error('Failed to update variable');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {Icon && <Icon className="h-4 w-4 mr-1" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">Variables & Secrets</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Add new variable form */}
            <form onSubmit={handleAddVariable} className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add New Variable</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="var-name" className="text-xs">Name</Label>
                  <Input
                    id="var-name"
                    placeholder="API_KEY"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="var-value" className="text-xs">Value</Label>
                  <Input
                    id="var-value"
                    type={newVarIsSecret ? 'password' : 'text'}
                    placeholder="Enter value..."
                    value={newVarValue}
                    onChange={(e) => setNewVarValue(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="var-description" className="text-xs">Description (optional)</Label>
                <Input
                  id="var-description"
                  placeholder="Describe what this variable is for..."
                  value={newVarDescription}
                  onChange={(e) => setNewVarDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="var-secret"
                  checked={newVarIsSecret}
                  onCheckedChange={setNewVarIsSecret}
                  className="scale-90"
                />
                <Label htmlFor="var-secret" className="flex items-center gap-1.5 text-xs">
                  <Lock className="h-3 w-3" />
                  Secret (encrypted in Vault)
                </Label>
              </div>
              
              {newVarIsSecret && (
                <p className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                  🔒 Secrets are encrypted with AES-256-GCM in Supabase Vault. Cannot be retrieved after saving.
                </p>
              )}
              
              <Button type="submit" className="w-full h-8 text-xs" disabled={loading}>
                <Plus className="h-3 w-3 mr-1.5" />
                {newVarIsSecret ? 'Add Encrypted Secret' : 'Add Variable'}
              </Button>
            </form>

            {/* Variables list */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Existing Variables ({variables.length})
              </h4>
              
              {loading && variables.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-xs">
                  Loading variables...
                </div>
              ) : variables.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-xs">
                  No variables created yet
                </div>
              ) : (
                <div className="space-y-2">
                  {variables.map((variable) => (
                    <div key={variable.id} className="border rounded-md p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium">{variable.name}</span>
                          {variable.isVaultBacked && (
                            <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5" />
                              Vault
                            </span>
                          )}
                          {variable.isSecret && !variable.isVaultBacked && (
                            <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded">
                              Legacy
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-0.5">
                          {!variable.isVaultBacked && variable.isSecret && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSecretVisibility(variable.id)}
                              className="h-5 w-5"
                            >
                              {showSecrets[variable.id] ? (
                                <EyeOff className="h-2.5 w-2.5" />
                              ) : (
                                <Eye className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVariable(variable)}
                            className="h-5 w-5 text-destructive hover:text-destructive"
                            disabled={loading}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {variable.isVaultBacked ? (
                        <Input
                          type="password"
                          placeholder="Enter new value to update..."
                          className="h-7 font-mono text-xs"
                          disabled={loading}
                          onBlur={(e) => {
                            if (e.target.value) {
                              handleUpdateVariable(variable, 'value', e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                      ) : (
                        <Input
                          type={variable.isSecret && !showSecrets[variable.id] ? 'password' : 'text'}
                          value={variable.value}
                          onChange={(e) => handleUpdateVariable(variable, 'value', e.target.value)}
                          className="h-7 font-mono text-xs"
                          disabled={loading}
                        />
                      )}
                      
                      <div className="text-[10px] text-muted-foreground">
                        Use: <code className="bg-muted px-1 rounded">{variable.isVaultBacked ? '{{env.' + variable.name + '}}' : '{{' + variable.name + '}}'}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
