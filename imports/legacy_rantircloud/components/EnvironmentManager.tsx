import React, { useEffect, useState } from "react";
import { listEnvironments, createEnvironment, updateEnvironment, deleteEnvironment, listEnvironmentVariables, createVariable, updateVariable, deleteVariable, FlowEnvironment, EnvironmentVariable } from "@/services/environmentService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Trash2, Plus, Pencil } from "lucide-react";
export function EnvironmentManager() {
  const {
    toast
  } = useToast();
  const [environments, setEnvironments] = useState<FlowEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Environment form state
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvDesc, setNewEnvDesc] = useState("");

  // Variable form state
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [newVarIsSecret, setNewVarIsSecret] = useState(false);
  const [newVarIntegration, setNewVarIntegration] = useState("");

  // Show/hide secrets for this session
  const [showSecrets, setShowSecrets] = useState<{
    [k: string]: boolean;
  }>({});
  useEffect(() => {
    fetchEnvs();
  }, []);
  useEffect(() => {
    if (selectedEnvId) {
      fetchVars(selectedEnvId);
    } else {
      setVariables([]);
    }
  }, [selectedEnvId]);
  async function fetchEnvs() {
    setIsLoading(true);
    try {
      const list = await listEnvironments();
      setEnvironments(list);
      if (list.length > 0 && !selectedEnvId) setSelectedEnvId(list[0].id);
    } catch (e) {
      toast({
        title: "Error loading environments",
        description: String(e),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  async function fetchVars(envId: string) {
    setIsLoading(true);
    try {
      setVariables(await listEnvironmentVariables(envId));
    } catch (e) {
      toast({
        title: "Error loading variables",
        description: String(e),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  async function handleAddEnv(e: React.FormEvent) {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    try {
      const env = await createEnvironment({
        name: newEnvName,
        description: newEnvDesc
      });
      setEnvironments(list => [env, ...list]);
      setNewEnvName("");
      setNewEnvDesc("");
      setSelectedEnvId(env.id);
      toast({
        title: "Environment created"
      });
    } catch (err) {
      toast({
        title: "Failed to add environment",
        description: String(err),
        variant: "destructive"
      });
    }
  }
  async function handleDeleteEnv(id: string) {
    if (!confirm("Delete environment and all its variables?")) return;
    try {
      await deleteEnvironment(id);
      setEnvironments(envs => envs.filter(e => e.id !== id));
      if (selectedEnvId === id) {
        // Fixed: Correctly get the first environment's ID from the updated environments array
        const remainingEnvs = environments.filter(env => env.id !== id);
        setSelectedEnvId(remainingEnvs.length > 0 ? remainingEnvs[0].id : null);
      }
      toast({
        title: "Environment deleted"
      });
    } catch (err) {
      toast({
        title: "Failed to delete environment",
        description: String(err),
        variant: "destructive"
      });
    }
  }
  async function handleAddVariable(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEnvId || !newVarKey.trim()) return;
    try {
      const v = await createVariable({
        environment_id: selectedEnvId,
        key: newVarKey,
        value: newVarValue,
        is_secret: newVarIsSecret,
        integration_type: newVarIntegration || undefined
      });
      setVariables(vars => [v, ...vars]);
      setNewVarKey("");
      setNewVarValue("");
      setNewVarIsSecret(false);
      setNewVarIntegration("");
      toast({
        title: "Variable created"
      });
    } catch (err) {
      toast({
        title: "Failed to add variable",
        description: String(err),
        variant: "destructive"
      });
    }
  }
  async function handleDeleteVariable(id: string) {
    if (!confirm("Delete environment variable?")) return;
    try {
      await deleteVariable(id);
      setVariables(vars => vars.filter(v => v.id !== id));
      toast({
        title: "Variable deleted"
      });
    } catch (err) {
      toast({
        title: "Failed to delete variable",
        description: String(err),
        variant: "destructive"
      });
    }
  }
  return <div className="p-6 max-w-3xl mx-auto px-0 py-0">
      <h2 className="text-sm font-medium mb-6">Environment Manager</h2>
      {/* Add new environment form */}
      <form className="flex gap-2 mb-6" onSubmit={handleAddEnv}>
        <Input placeholder="Environment name" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} />
        <Input placeholder="Description" value={newEnvDesc} onChange={e => setNewEnvDesc(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>

      <div className="flex gap-6">
        {/* Environment list */}
        <div className="w-48 flex-shrink-0 border rounded-md bg-muted">
          <div className="p-2 font-medium border-b">Environments</div>
          <ul>
            {environments.map(env => <li key={env.id} className={`cursor-pointer px-3 py-2 border-b ${selectedEnvId === env.id ? "bg-white font-bold" : ""}`} onClick={() => setSelectedEnvId(env.id)}>
                <div className="flex items-center justify-between">
                  <span>{env.name}</span>
                  <button type="button" className="text-destructive hover:underline p-1" onClick={e => {
                e.stopPropagation();
                handleDeleteEnv(env.id);
              }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {env.description && <div className="text-xs text-muted-foreground">{env.description}</div>}
              </li>)}
          </ul>
        </div>
        {/* Variables list */}
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-3">
            Variables for:{" "}
            {environments.find(e => e.id === selectedEnvId)?.name || "—"}
          </h3>
          {selectedEnvId && <form className="flex gap-2 mb-4 items-center" onSubmit={handleAddVariable}>
              <Input placeholder="Key" value={newVarKey} onChange={e => setNewVarKey(e.target.value)} />
              <Input placeholder="Value" type={newVarIsSecret && !showSecrets["new"] ? "password" : "text"} value={newVarValue} onChange={e => setNewVarValue(e.target.value)} />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={newVarIsSecret} onChange={e => setNewVarIsSecret(e.target.checked)} className="mr-1" />
                Secret
              </label>
              <Input placeholder="Integration (optional)" value={newVarIntegration} onChange={e => setNewVarIntegration(e.target.value)} className="w-28" />
              <Button type="submit">
                <Plus className="w-4 h-4" />
              </Button>
              {newVarIsSecret && <Button type="button" variant="ghost" onClick={() => setShowSecrets(secrets => ({
            ...secrets,
            new: !secrets["new"]
          }))} className="px-2">
                  {showSecrets["new"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>}
            </form>}
          <div>
            {variables.length === 0 && <div className="text-sm italic text-muted-foreground">
                No variables found for this environment.
              </div>}
            {variables.map(v => <div key={v.id} className="flex items-center border rounded px-2 py-1 mb-2 gap-2">
                <div className="w-36 font-mono truncate">{v.key}</div>
                <div className="flex-1 flex items-center">
                  <Input type={v.is_secret && !showSecrets[v.id] ? "password" : "text"} value={v.value} readOnly />
                  {v.is_secret && <Button type="button" size="icon" variant="ghost" onClick={() => setShowSecrets(secrets => ({
                ...secrets,
                [v.id]: !secrets[v.id]
              }))} className="ml-1" tabIndex={-1}>
                      {showSecrets[v.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>}
                </div>
                <div className="text-xs text-muted-foreground w-32">
                  {v.integration_type || ""}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteVariable(v.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
}