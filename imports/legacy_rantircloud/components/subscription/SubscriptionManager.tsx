import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Code, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { tableService } from "@/services/tableService";

interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  redirectUrl: string;
  showInEmbed: boolean;
  billingPeriod: string;
}

interface SubscriptionManagerProps {
  tableId: string;
  project: any;
  onUpdate: (updatedProject: any) => void;
}

export function SubscriptionManager({ tableId, project, onUpdate }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    redirectUrl: "",
    showInEmbed: true,
    billingPeriod: "monthly"
  });

  useEffect(() => {
    loadSubscriptions();
  }, [project]);

  const loadSubscriptions = () => {
    if (project?.records) {
      // Only get subscription records, NOT forms or user registrations
      // First filter out null/undefined records, then filter by type
      const subscriptionRecords = project.records
        .filter((record: any) => record != null) // Remove null/undefined records
        .filter((record: any) => 
          record.type === 'subscription' && 
          record.type !== 'login-form' && // Explicitly exclude login forms
          record.type !== 'user-registration' && // Explicitly exclude user registrations
          record.formType !== 'login' // Explicitly exclude anything with formType
        );
      console.log('Loading subscriptions:', subscriptionRecords.length, 'Total records:', project.records.length);
      setSubscriptions(subscriptionRecords);
    }
  };

  const handleSave = async () => {
    try {
      // Ensure proper record structure with validation
      const subscriptionData = {
        ...formData,
        id: editingSubscription?.id || crypto.randomUUID(),
        type: 'subscription', // Explicitly set type
        createdAt: (editingSubscription as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate that this is actually a subscription record
      if (!subscriptionData.name || subscriptionData.price === undefined || !subscriptionData.redirectUrl) {
        throw new Error("Invalid subscription data - missing required fields");
      }

      if (editingSubscription) {
        // Update existing subscription
        const updatedRecords = project.records.map((record: any) =>
          record.id === editingSubscription.id ? subscriptionData : record
        );
        
        const updatedProject = await tableService.updateTableProject(tableId, {
          records: updatedRecords
        });
        onUpdate(updatedProject);
      } else {
        // Add new subscription
        const newRecord = await tableService.addRecord(tableId, subscriptionData, project.records);
        const updatedProject = {
          ...project,
          records: [...project.records, newRecord]
        };
        onUpdate(updatedProject);
      }

      toast.success(editingSubscription ? "Subscription updated" : "Subscription created");
      resetForm();
    } catch (error: any) {
      toast.error("Failed to save subscription", {
        description: error.message
      });
    }
  };

  const handleDelete = async (subscriptionId: string) => {
    try {
      await tableService.deleteRecord(tableId, subscriptionId, project.records);
      const updatedProject = {
        ...project,
        records: project.records.filter((record: any) => record.id !== subscriptionId)
      };
      onUpdate(updatedProject);
      toast.success("Subscription deleted");
    } catch (error: any) {
      toast.error("Failed to delete subscription");
    }
  };

  const handleToggleEmbed = async (subscription: Subscription) => {
    try {
      const updatedSubscription = { ...subscription, showInEmbed: !subscription.showInEmbed };
      const updatedRecords = project.records.map((record: any) =>
        record.id === subscription.id ? updatedSubscription : record
      );
      
      const updatedProject = await tableService.updateTableProject(tableId, {
        records: updatedRecords
      });
      onUpdate(updatedProject);
      toast.success("Embed visibility updated");
    } catch (error: any) {
      toast.error("Failed to update subscription");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      redirectUrl: "",
      showInEmbed: true,
      billingPeriod: "monthly"
    });
    setEditingSubscription(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (subscription: Subscription) => {
    setFormData({
      name: subscription.name,
      description: subscription.description,
      price: subscription.price,
      redirectUrl: subscription.redirectUrl,
      showInEmbed: subscription.showInEmbed,
      billingPeriod: subscription.billingPeriod
    });
    setEditingSubscription(subscription);
    setIsAddDialogOpen(true);
  };

  const generateEmbedCode = () => {
    const embedCode = `
<div id="subscription-embed-${tableId}" style="max-width: 600px; margin: 24px auto; padding: 24px; font-family: system-ui;">
  <h3 id="plans-title" style="text-align: center; margin-bottom: 32px; font-size: 24px; font-weight: 600; color: #1f2937;">Choose Your Plan</h3>
  <div id="plans-container" style="display: grid; gap: 20px; padding: 0 16px;">
    <div style="text-align: center; padding: 48px 24px; color: #6b7280; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      Loading plans...
    </div>
  </div>
</div>

<script>
(function() {
  async function loadSubscriptionPlans() {
    try {
      const response = await fetch('https://appdmmjexevclmpyvtss.supabase.co/functions/v1/subscription-embed/${tableId}');
      const data = await response.json();
      
      const container = document.getElementById('plans-container');
      const title = document.getElementById('plans-title');
      
      if (data.subscriptions && data.subscriptions.length > 0) {
        container.innerHTML = data.subscriptions.map(sub => \`
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px 24px; background: white; transition: all 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'; this.style.borderColor='#d1d5db'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'; this.style.borderColor='#e5e7eb'">
            <h4 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1f2937; line-height: 1.3;">\${sub.name}</h4>
            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">\${sub.description}</p>
            <div style="margin-bottom: 24px; padding: 16px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
              <span style="font-size: 32px; font-weight: bold; color: #1f2937;">$\${sub.price}</span>
              <span style="color: #6b7280; font-size: 16px; margin-left: 4px;">/\${sub.billingPeriod}</span>
            </div>
            <button 
              onclick="window.location.href='\${sub.redirectUrl}?planId=\${sub.id}&tableId=${tableId}'"
              style="width: 100%; padding: 16px 32px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);"
              onmouseover="this.style.backgroundColor='#2563eb'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(59, 130, 246, 0.4)'"
              onmouseout="this.style.backgroundColor='#3b82f6'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59, 130, 246, 0.3)'"
            >
              Select Plan
            </button>
          </div>
        \`).join('');
      } else {
        container.innerHTML = '<div style="text-align: center; padding: 48px 24px; color: #6b7280; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">No subscription plans available</div>';
        title.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      document.getElementById('plans-container').innerHTML = '<div style="text-align: center; padding: 48px 24px; color: #ef4444; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">Error loading plans. Please try again later.</div>';
    }
  }
  
  // Load plans when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSubscriptionPlans);
  } else {
    loadSubscriptionPlans();
  }
})();
</script>`;
    
    return embedCode.trim();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subscription Plans</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEmbedDialogOpen(true)}>
            <Code className="h-4 w-4 mr-2" />
            Get Embed Code
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No subscription plans created yet. Click "Add Plan" to get started.
            </CardContent>
          </Card>
        ) : (
          subscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{subscription.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={subscription.showInEmbed ? "default" : "secondary"}>
                      {subscription.showInEmbed ? "In Embed" : "Hidden"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEmbed(subscription)}
                    >
                      {subscription.showInEmbed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(subscription)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subscription.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{subscription.description}</p>
                <p className="text-lg font-semibold mb-2">
                  ${subscription.price}/{subscription.billingPeriod}
                </p>
                <p className="text-xs text-muted-foreground">
                  Redirect URL: {subscription.redirectUrl}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? "Edit Subscription Plan" : "Add Subscription Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic Plan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this plan includes..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="9.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingPeriod">Billing Period</Label>
                <select
                  id="billingPeriod"
                  value={formData.billingPeriod}
                  onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                  className="w-full p-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectUrl">Redirect URL</Label>
              <Input
                id="redirectUrl"
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                placeholder="https://your-site.com/signup"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showInEmbed"
                checked={formData.showInEmbed}
                onCheckedChange={(checked) => setFormData({ ...formData, showInEmbed: checked })}
              />
              <Label htmlFor="showInEmbed">Show in embed</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSubscription ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 px-8 pb-8 overflow-y-auto">
            <div className="space-y-3">
              <p className="text-base text-muted-foreground leading-relaxed">
                Copy this code and paste it into your website where you want the subscription plans to appear.
              </p>
              <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-3">
                💡 The embed will automatically update when you add or modify subscription plans.
              </p>
            </div>
            <div className="bg-muted/30 border rounded-xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  HTML + JavaScript
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generateEmbedCode());
                    toast.success("Embed code copied to clipboard");
                  }}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
              <div className="bg-background border rounded-md overflow-hidden">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap p-6 leading-relaxed max-h-80 overflow-y-auto font-mono bg-slate-50 border-0">
                  <code className="text-slate-800">{generateEmbedCode()}</code>
                </pre>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">💡</span>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-blue-900">Pro Tip</p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Place this code anywhere on your website where you want visitors to see your subscription plans. 
                    The embed is fully responsive and will automatically adapt to your site's styling and theme.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}