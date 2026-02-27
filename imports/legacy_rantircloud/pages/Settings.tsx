
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { workspaceService, Workspace } from "@/services/workspaceService";
import { Input } from "@/components/ui/compact/Input";
import { Button } from "@/components/ui/compact/Button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { BillingModule } from "@/components/billing/BillingModule";
import {
  Settings as SettingsIcon, 
  CreditCard, 
  Bell, 
  User, 
  Building, 
  Palette,
  Database,
  Network,
  Grid3X3,
  Mail,
  Slack,
  CreditCard as PaymentIcon,
  ShoppingCart,
  Monitor,
  HelpCircle,
  FileText,
  Plus,
  Users,
  Check,
  ExternalLink
} from "lucide-react";
import { WorkspaceMembersSection } from "@/components/settings/WorkspaceMembersSection";
import { Input as StandardInput } from "@/components/ui/input";

type SettingTab = 'general' | 'billing' | 'notifications' | 'support' | 'licensing';

export default function Settings() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<SettingTab>('general');
  const [saving, setSaving] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState<File | null>(null);
  const [newWorkspaceIconPreview, setNewWorkspaceIconPreview] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  useEffect(() => {
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['general', 'billing', 'notifications', 'support', 'licensing'].includes(tabParam)) {
      setActiveTab(tabParam as SettingTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      // Fetch profile and settings
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
      supabase.from("user_settings").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setSettings(data));
      workspaceService.getCurrentWorkspace().then((ws) => setCurrentWorkspace(ws));
      workspaceService.getAllWorkspaces().then((ws) => setAllWorkspaces(ws));
    }
  }, [user, loading]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !user) return;
    
    try {
      setCreatingWorkspace(true);
      const newWorkspace = await workspaceService.createWorkspace({
        user_id: user.id,
        name: newWorkspaceName.trim(),
        is_default: false
      });
      
      if (newWorkspace) {
        // Upload icon if provided
        if (newWorkspaceIcon) {
          const iconUrl = await workspaceService.uploadWorkspaceIcon(newWorkspace.id, newWorkspaceIcon);
          if (iconUrl) {
            await workspaceService.updateWorkspace(newWorkspace.id, { icon_url: iconUrl });
          }
        }
        
        toast.success('Workspace created!');
        setNewWorkspaceName('');
        setNewWorkspaceIcon(null);
        setNewWorkspaceIconPreview(null);
        setShowCreateWorkspace(false);
        const updatedWorkspaces = await workspaceService.getAllWorkspaces();
        setAllWorkspaces(updatedWorkspaces);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleWorkspaceIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewWorkspaceIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewWorkspaceIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) return;
    
    await workspaceService.setCurrentWorkspace(workspaceId);
    window.location.reload();
  };

  if (loading) return <div className="p-8 bg-rc-bg min-h-screen">Loading...</div>;
  if (!user) return <div className="p-8 bg-rc-bg min-h-screen">Please log in to access settings.</div>;

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('Updating profile and workspace...', { profile, currentWorkspace });
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: profile?.name })
        .eq("id", user.id);
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }
      
      // Update workspace if exists
      if (currentWorkspace) {
        console.log('Updating workspace:', currentWorkspace.id, currentWorkspace.name);
        const updatedWorkspace = await workspaceService.updateWorkspace(currentWorkspace.id, {
          name: currentWorkspace.name
        });
        
        if (!updatedWorkspace) {
          throw new Error('Failed to update workspace - no data returned');
        }
        
        console.log('Workspace updated successfully:', updatedWorkspace);
        setCurrentWorkspace(updatedWorkspace);
      }
      
      toast.success("Settings updated!");
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (field: string, value: any) => {
    setSaving(true);
    const { error } = await supabase.from("user_settings").update({ [field]: value }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings updated!");
      setSettings({ ...settings, [field]: value });
    }
  };


  const sidebarItems = [
    { id: 'general', label: 'Settings', icon: SettingsIcon },
    { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'licensing', label: 'Licensing', icon: FileText },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
            <AvatarFallback>
              {profile?.name?.split(' ').map((n: string) => n[0]).join('') || 
               user.email?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-base font-semibold">{profile?.name || user.email}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        
        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile?.name || ""}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              disabled={saving}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <Label htmlFor="workspace">Workspace Name</Label>
            <Input
              id="workspace"
              value={currentWorkspace?.name || ""}
              onChange={e => setCurrentWorkspace(currentWorkspace ? { ...currentWorkspace, name: e.target.value } : null)}
              disabled={saving || !currentWorkspace}
              placeholder="My Workspace"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This name appears in the navigation bar
            </p>
          </div>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Workspaces Section */}
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <Building className="h-4 w-4" />
          Workspaces
        </h3>

        <div className="space-y-2">
          {allWorkspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No workspaces found</p>
          ) : (
            allWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSwitchWorkspace(workspace.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  workspace.id === currentWorkspace?.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                {/* Workspace Icon */}
                {workspace.icon_url ? (
                  <img 
                    src={workspace.icon_url} 
                    alt={workspace.name} 
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                    <span className="text-zinc-600 dark:text-zinc-300 text-sm font-bold">
                      {workspace.name?.charAt(0).toUpperCase() || 'W'}
                    </span>
                  </div>
                )}
                
                {/* Workspace Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{workspace.name}</span>
                    {workspace.user_id !== user?.id && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Invited</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Users className="h-3 w-3" />
                    <span>{workspace.is_default ? 'Default workspace' : 'Workspace'}</span>
                  </div>
                </div>
                
                {/* Check mark for current */}
                {workspace.id === currentWorkspace?.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Create workspace form */}
        {showCreateWorkspace ? (
          <div className="p-3 mt-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* Avatar upload */}
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleWorkspaceIconChange}
                  />
                  {newWorkspaceIconPreview ? (
                    <img 
                      src={newWorkspaceIconPreview} 
                      alt="Workspace icon" 
                      className="h-12 w-12 rounded-lg object-cover border-2 border-dashed border-primary"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </label>
                <StandardInput
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateWorkspace}
                  disabled={creatingWorkspace || !newWorkspaceName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {creatingWorkspace ? 'Creating...' : 'Create Workspace'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateWorkspace(false);
                    setNewWorkspaceName('');
                    setNewWorkspaceIcon(null);
                    setNewWorkspaceIconPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button 
            onClick={() => setShowCreateWorkspace(true)}
            className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </Button>
        )}
      </Card>

      {/* Workspace Members Section - only show for current workspace if user is owner */}
      {currentWorkspace && (
        <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            {currentWorkspace.name} - Members
          </h3>
          <WorkspaceMembersSection 
            workspaceId={currentWorkspace.id}
            isOwner={currentWorkspace.user_id === user?.id}
            currentUserId={user?.id || ''}
          />
        </Card>
      )}

      {/* Preferences */}
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
            </div>
            <Select 
              value={settings?.theme || "system"} 
              onValueChange={(value) => updateSettings('theme', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBillingSettings = () => (
    <div className="space-y-6">
      <BillingModule />
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Notifications
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing emails</Label>
              <p className="text-sm text-muted-foreground">Receive updates about new features and tips</p>
            </div>
            <Switch 
              checked={settings?.email_marketing || false}
              onCheckedChange={(checked) => updateSettings('email_marketing', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Security alerts</Label>
              <p className="text-sm text-muted-foreground">Receive alerts about account security</p>
            </div>
            <Switch 
              checked={settings?.email_security !== false}
              onCheckedChange={(checked) => updateSettings('email_security', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Usage notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when approaching usage limits</p>
            </div>
            <Switch 
              checked={settings?.email_usage || false}
              onCheckedChange={(checked) => updateSettings('email_usage', checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Slack className="h-4 w-4" />
          Slack Notifications
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Connect Slack Workspace</div>
              <div className="text-sm text-muted-foreground">Get notifications directly in Slack</div>
            </div>
            <Button variant="outline" size="sm">
              <Slack className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </div>
          
          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>App deployments</Label>
                <p className="text-sm text-muted-foreground">Notify when apps are published</p>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Flow executions</Label>
                <p className="text-sm text-muted-foreground">Notify when flows complete or fail</p>
              </div>
              <Switch disabled />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSupportSettings = () => (
    <div className="space-y-4">
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Support Center
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Get Help</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Need assistance with Rantir? Our support team is here to help.
            </p>
            
            <div className="grid md:grid-cols-2 gap-3">
              <Card className="p-3 bg-zinc-50 dark:bg-zinc-700/50 border-border/50">
                <h5 className="text-sm font-medium mb-1">Email Support</h5>
                <p className="text-xs text-muted-foreground mb-2">
                  Get personalized help. We respond within 24 hours.
                </p>
                <Button 
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                  onClick={() => window.location.href = 'mailto:support@rantir.com?subject=Support Request'}
                >
                  Contact Support
                </Button>
              </Card>
              
              <Card className="p-3 bg-zinc-50 dark:bg-zinc-700/50 border-border/50">
                <h5 className="text-sm font-medium mb-1">Documentation</h5>
                <p className="text-xs text-muted-foreground mb-2">
                  Browse guides and tutorials.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Docs
                </Button>
              </Card>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Common Issues</h4>
            <div className="space-y-2">
              <a 
                href="https://rantir.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-xs">Account & Billing</h5>
                    <p className="text-xs text-muted-foreground">Issues with subscriptions, payments, or account access</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
              <a 
                href="https://rantir.com/support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-xs">Technical Support</h5>
                    <p className="text-xs text-muted-foreground">Help with flows, apps, databases, and integrations</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
              <a 
                href="https://rantir.com/support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-xs">Feature Requests</h5>
                    <p className="text-xs text-muted-foreground">Suggest new features or improvements</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLicensingSettings = () => (
    <div className="space-y-4">
      <Card className="p-4 bg-white dark:bg-zinc-800 border-border/50">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Licensing Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Your License</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Review your current Rantir license and terms of use.
            </p>
            
            <div className="p-3 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium">Rantir Cloud License</h5>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">License Type:</span>
                  <span className="ml-2 font-medium">Personal</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valid Until:</span>
                  <span className="ml-2 font-medium">September 15, 2025</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Terms & Policies</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50">
                <div>
                  <h5 className="font-medium text-xs">Terms of Service</h5>
                  <p className="text-xs text-muted-foreground">Our terms and conditions for using Rantir</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50">
                <div>
                  <h5 className="font-medium text-xs">Privacy Policy</h5>
                  <p className="text-xs text-muted-foreground">How we handle and protect your data</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between p-2.5 border border-border/50 rounded-md bg-zinc-50 dark:bg-zinc-700/50">
                <div>
                  <h5 className="font-medium text-xs">License Agreement</h5>
                  <p className="text-xs text-muted-foreground">Detailed licensing terms and restrictions</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Need Help with Licensing?</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Have questions about your license or need to upgrade?
            </p>
            <Button 
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.href = 'mailto:support@rantir.com?subject=Licensing Inquiry'}
            >
              Contact Licensing Team
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="pt-6 pb-6">
          <h1 className="text-2xl font-tiempos font-light text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Review your account settings and preferences</p>
        </div>

        {/* Content with tabs */}
        <div className="flex gap-6">
          {/* Tab sidebar */}
          <div className="w-48 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as SettingTab)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors rounded-md ${
                  activeTab === item.id
                    ? 'bg-white dark:bg-zinc-800 border border-border/50 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'billing' && renderBillingSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'support' && renderSupportSettings()}
            {activeTab === 'licensing' && renderLicensingSettings()}
          </div>
        </div>
      </div>
    </div>
  );
}
