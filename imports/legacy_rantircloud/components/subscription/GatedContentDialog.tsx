import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash2, Copy, Code, Shield } from "lucide-react";
import { tableService } from "@/services/tableService";
interface GatedContent {
  id: string;
  protectedUrl: string;
  pageTitle: string;
  requiredPlans: string[];
  redirectUrl: string;
  isActive: boolean;
  type: 'gated-content';
}

interface GatedContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  project: any;
  onUpdate: (updatedProject: any) => void;
}
export function GatedContentDialog({
  isOpen,
  onClose,
  tableId,
  project,
  onUpdate
}: GatedContentDialogProps) {
  const [gatedContentList, setGatedContentList] = useState<GatedContent[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [editingContent, setEditingContent] = useState<GatedContent | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  // Form state
  const [formData, setFormData] = useState({
    protectedUrl: "",
    pageTitle: "",
    requiredPlans: [] as string[],
    redirectUrl: "",
    isActive: true
  });
  useEffect(() => {
    if (isOpen && project) {
      loadData();
    }
  }, [isOpen, project]);

  const loadData = () => {
    if (project?.records) {
      // Get gated content records
      const gatedRecords = project.records.filter((record: any) => 
        record.type === 'gated-content'
      );
      setGatedContentList(gatedRecords);

      // Get subscription plans from the same project
      const subscriptionRecords = project.records.filter((record: any) => 
        record.type === 'subscription' && 
        record.type !== 'login-form' && 
        record.type !== 'user-registration' && 
        record.formType !== 'login'
      );
      setSubscriptionPlans(subscriptionRecords);
    }
  };
  const resetForm = () => {
    setFormData({
      protectedUrl: "",
      pageTitle: "",
      requiredPlans: [],
      redirectUrl: "",
      isActive: true
    });
    setEditingContent(null);
  };
  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.protectedUrl || !formData.redirectUrl || formData.requiredPlans.length === 0) {
        toast.error("Please fill in all required fields");
        return;
      }

      const contentData = {
        ...formData,
        id: editingContent?.id || crypto.randomUUID(),
        type: 'gated-content',
        createdAt: (editingContent as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingContent) {
        // Update existing content
        const updatedRecords = project.records.map((record: any) =>
          record.id === editingContent.id ? contentData : record
        );
        
        const updatedProject = await tableService.updateTableProject(tableId, {
          records: updatedRecords
        });
        onUpdate(updatedProject);
      } else {
        // Add new content
        const newRecord = await tableService.addRecord(tableId, contentData, project.records);
        const updatedProject = {
          ...project,
          records: [...project.records, newRecord]
        };
        onUpdate(updatedProject);
      }

      toast.success(editingContent ? "Gated content updated" : "Gated content created");
      resetForm();
      setActiveTab("list");
    } catch (error: any) {
      toast.error("Failed to save gated content", {
        description: error.message
      });
    }
  };
  const handleEdit = (content: GatedContent) => {
    setEditingContent(content);
    setFormData({
      protectedUrl: content.protectedUrl,
      pageTitle: content.pageTitle || "",
      requiredPlans: Array.isArray(content.requiredPlans) ? content.requiredPlans : [],
      redirectUrl: content.redirectUrl,
      isActive: content.isActive
    });
    setActiveTab("form");
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gated content?")) return;
    try {
      await tableService.deleteRecord(tableId, id, project.records);
      const updatedProject = {
        ...project,
        records: project.records.filter((record: any) => record.id !== id)
      };
      onUpdate(updatedProject);
      toast.success("Gated content deleted");
    } catch (error: any) {
      toast.error("Failed to delete gated content");
    }
  };
  const generateProtectionScript = () => {
    // Get all active gated content
    const activeGatedContent = gatedContentList.filter(content => content.isActive);
    
    if (activeGatedContent.length === 0) {
      return "<!-- No active gated content configured -->";
    }

    const gatedPages = activeGatedContent.map(content => ({
      url: content.protectedUrl,
      plans: content.requiredPlans,
      redirect: content.redirectUrl
    }));

    return `<!-- Page Protection Script - Add this to your HTML <head> -->
<script>
(function() {
  // Gated content configuration
  const gatedPages = ${JSON.stringify(gatedPages, null, 2)};
  const tableId = "${tableId}";
  
  // Check if current page is protected
  function checkPageProtection() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    
    // Find matching gated content
    const gatedPage = gatedPages.find(page => 
      currentUrl.includes(page.url) || 
      currentPath.includes(page.url.replace(/^https?:\\/\\/[^/]+/, ''))
    );
    
    if (gatedPage) {
      // This page is protected, check subscription
      checkSubscriptionAndRedirect(gatedPage);
    }
  }
  
  // Check user subscription status
  async function checkSubscriptionAndRedirect(gatedPage) {
    try {
      // Get stored subscription info from localStorage (set by your subscription system)
      const userSubscription = JSON.parse(localStorage.getItem('userSubscription') || '{}');
      const userPlanId = userSubscription.selectedPlan?.id;
      
      // If no subscription or plan doesn't match required plans
      if (!userPlanId || !gatedPage.plans.includes(userPlanId)) {
        // Redirect immediately before page loads
        window.location.replace(gatedPage.redirect);
        return;
      }
      
      // User has access, page loads normally
      console.log('Access granted to protected page');
      
    } catch (error) {
      console.error('Subscription check failed:', error);
      // On error, redirect to be safe
      window.location.replace(gatedPage.redirect);
    }
  }
  
  // Run check immediately (before page renders)
  checkPageProtection();
  
})();
</script>

<!-- Instructions -->
<!-- 
1. Add this script to the <head> section of your website
2. Make sure your subscription system stores user plan info in localStorage as 'userSubscription'
3. The script will automatically redirect users without proper access before they see protected content
-->`;
  };
  const copyProtectionScript = () => {
    const code = generateProtectionScript();
    navigator.clipboard.writeText(code);
    toast.success("Protection script copied to clipboard");
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Page Protection Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-[16px] py-[16px]">
          <TabsList className="w-fit">
            <TabsTrigger value="list">Protected Pages</TabsTrigger>
            <TabsTrigger value="form">{editingContent ? "Edit" : "Add New"}</TabsTrigger>
            <TabsTrigger value="script">Protection Script</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Protected Pages</h3>
              <Button onClick={() => {
              resetForm();
              setActiveTab("form");
            }} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Protected Page
              </Button>
            </div>

            {gatedContentList.length === 0 ? <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No protected pages configured yet.</p>
                  <Button onClick={() => setActiveTab("form")} className="mt-4">
                    Create Your First Protected Page
                  </Button>
                </CardContent>
              </Card> : <div className="grid gap-4">
                {gatedContentList.map(content => <Card key={content.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{content.pageTitle || "Untitled"}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{content.protectedUrl}</p>
                          <p className="text-xs text-muted-foreground mt-1">Redirects to: {content.redirectUrl}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={content.isActive ? "default" : "secondary"}>
                            {content.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-between items-center">
                         <div className="flex flex-wrap gap-1">
                           {content.requiredPlans.map((planId, index) => {
                      const plan = subscriptionPlans.find(p => p.id === planId);
                      return <Badge key={`${planId}-${index}`} variant="outline" className="text-xs">
                                 {plan?.name || String(planId)}
                               </Badge>;
                    })}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(content)}>
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(content.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="protectedUrl">Protected Page URL *</Label>
                <Input 
                  id="protectedUrl" 
                  placeholder="https://example.com/premium-content" 
                  value={formData.protectedUrl} 
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    protectedUrl: e.target.value
                  }))} 
                />
                <p className="text-xs text-muted-foreground">
                  Full URL or path of the page you want to protect
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pageTitle">Page Title</Label>
                <Input 
                  id="pageTitle" 
                  placeholder="Premium Content" 
                  value={formData.pageTitle} 
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    pageTitle: e.target.value
                  }))} 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="redirectUrl">Redirect URL *</Label>
                <Input 
                  id="redirectUrl" 
                  placeholder="https://example.com/upgrade" 
                  value={formData.redirectUrl} 
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    redirectUrl: e.target.value
                  }))} 
                />
                <p className="text-xs text-muted-foreground">
                  Where to redirect users who don't have access
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Required Subscription Plans *</Label>
                <div className="space-y-2">
                  {subscriptionPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No subscription plans found. Create some subscription plans first.
                    </p>
                  ) : (
                    subscriptionPlans.map(plan => (
                      <div key={plan.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={`plan-${plan.id}`} 
                          checked={formData.requiredPlans.includes(plan.id)} 
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                requiredPlans: [...prev.requiredPlans, plan.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                requiredPlans: prev.requiredPlans.filter(id => id !== plan.id)
                              }));
                            }
                          }} 
                        />
                        <Label htmlFor={`plan-${plan.id}`} className="text-sm">
                          {plan.name} - ${plan.price}/{plan.billingPeriod}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="isActive" 
                  checked={formData.isActive} 
                  onCheckedChange={checked => setFormData(prev => ({
                    ...prev,
                    isActive: checked
                  }))} 
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  {editingContent ? "Update" : "Create"} Protected Page
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("list")}>
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="script" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Page Protection Script</h3>
                <Button onClick={copyProtectionScript} className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Script
                </Button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add this script to the <code className="bg-muted px-1 rounded">&lt;head&gt;</code> section of your website to enable page protection. 
                  The script will automatically redirect users who don't have the required subscription plans before they see the protected content.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 How it works:</strong> The script checks if the current page URL matches any protected pages, 
                    then verifies the user's subscription stored in localStorage, and redirects immediately if access is denied.
                  </p>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {generateProtectionScript()}
                  </pre>
                </CardContent>
              </Card>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> Make sure your subscription system stores the user's selected plan 
                  in localStorage as 'userSubscription' with the structure: <code>{`{ selectedPlan: { id: 'plan-id' } }`}</code>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>;
}