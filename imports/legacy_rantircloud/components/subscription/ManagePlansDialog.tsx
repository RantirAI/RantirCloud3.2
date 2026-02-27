import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash2, Edit, DollarSign, Users, Crown } from "lucide-react";
import { subscriptionService, SubscriptionPlan } from "@/services/subscriptionService";
import { useAuth } from "@/hooks/useAuth";
interface ManagePlansDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
export function ManagePlansDialog({
  isOpen,
  onClose
}: ManagePlansDialogProps) {
  const {
    user
  } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    billing_period: "free",
    features: [] as string[],
    max_tables: undefined as number | undefined,
    max_records_per_table: undefined as number | undefined,
    access_level: "basic",
    is_active: true
  });
  const [newFeature, setNewFeature] = useState("");
  useEffect(() => {
    if (isOpen && user) {
      loadPlans();
    }
  }, [isOpen, user]);
  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await subscriptionService.getSubscriptionPlans(user!.id);
      setPlans(data);
    } catch (error: any) {
      toast.error("Failed to load subscription plans", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      billing_period: "free",
      features: [],
      max_tables: undefined,
      max_records_per_table: undefined,
      access_level: "basic",
      is_active: true
    });
    setEditingPlan(null);
    setNewFeature("");
  };
  const handleSave = async () => {
    if (!user) return;
    try {
      const planData = {
        ...formData,
        user_id: user.id
      };
      if (editingPlan) {
        await subscriptionService.updateSubscriptionPlan(editingPlan.id, planData);
        toast.success("Subscription plan updated successfully");
      } else {
        await subscriptionService.createSubscriptionPlan(planData);
        toast.success("Subscription plan created successfully");
      }
      await loadPlans();
      resetForm();
      setActiveTab("list");
    } catch (error: any) {
      toast.error("Failed to save subscription plan", {
        description: error.message
      });
    }
  };
  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billing_period: plan.billing_period,
      features: Array.isArray(plan.features) ? plan.features.filter((f): f is string => typeof f === 'string') : [],
      max_tables: plan.max_tables,
      max_records_per_table: plan.max_records_per_table,
      access_level: plan.access_level,
      is_active: plan.is_active
    });
    setActiveTab("form");
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription plan?")) return;
    try {
      await subscriptionService.deleteSubscriptionPlan(id);
      toast.success("Subscription plan deleted successfully");
      await loadPlans();
    } catch (error: any) {
      toast.error("Failed to delete subscription plan", {
        description: error.message
      });
    }
  };
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature("");
    }
  };
  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Manage Subscription Plans
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-[16px] py-[16px]">
          <TabsList className="w-fit">
            <TabsTrigger value="list">Plans List</TabsTrigger>
            <TabsTrigger value="form">{editingPlan ? "Edit Plan" : "Create Plan"}</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Subscription Plans</h3>
              <Button onClick={() => {
              resetForm();
              setActiveTab("form");
            }} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Plan
              </Button>
            </div>

            {isLoading ? <div className="text-center py-8">Loading...</div> : plans.length === 0 ? <Card>
                <CardContent className="text-center py-8">
                  <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No subscription plans created yet.</p>
                  <Button onClick={() => setActiveTab("form")} className="mt-4">
                    Create Your First Plan
                  </Button>
                </CardContent>
              </Card> : <div className="grid gap-4 md:grid-cols-2">
                {plans.map(plan => <Card key={plan.id} className={plan.is_active ? "border-green-200" : "border-gray-200"}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={plan.is_active ? "default" : "secondary"}>
                            {plan.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {plan.access_level}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-2xl font-bold">
                        <DollarSign className="h-5 w-5" />
                        {plan.price === 0 ? "Free" : `$${plan.price}`}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.billing_period}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Features:</h4>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(plan.features) ? plan.features.filter((f): f is string => typeof f === 'string') : []).map((feature, index) => <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>)}
                        </div>
                      </div>

                      {(plan.max_tables || plan.max_records_per_table) && <div className="text-sm text-muted-foreground">
                          {plan.max_tables && <div>Max Tables: {plan.max_tables}</div>}
                          {plan.max_records_per_table && <div>Max Records: {plan.max_records_per_table}</div>}
                        </div>}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" placeholder="Basic Plan" value={formData.name} onChange={e => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="access_level">Access Level</Label>
                  <Select value={formData.access_level} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  access_level: value
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Plan description..." value={formData.description} onChange={e => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData(prev => ({
                  ...prev,
                  price: parseFloat(e.target.value) || 0
                }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_period">Billing Period</Label>
                  <Select value={formData.billing_period} onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  billing_period: value
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="max_tables">Max Tables (optional)</Label>
                  <Input id="max_tables" type="number" min="1" value={formData.max_tables || ""} onChange={e => setFormData(prev => ({
                  ...prev,
                  max_tables: e.target.value ? parseInt(e.target.value) : undefined
                }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_records">Max Records per Table (optional)</Label>
                  <Input id="max_records" type="number" min="1" value={formData.max_records_per_table || ""} onChange={e => setFormData(prev => ({
                  ...prev,
                  max_records_per_table: e.target.value ? parseInt(e.target.value) : undefined
                }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input placeholder="Add a feature..." value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyPress={e => e.key === 'Enter' && addFeature()} />
                  <Button type="button" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, index) => <Badge key={index} variant="secondary" className="text-sm">
                      {feature}
                      <Button variant="ghost" size="sm" className="ml-2 h-auto p-0" onClick={() => removeFeature(index)}>
                        ×
                      </Button>
                    </Badge>)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({
                ...prev,
                is_active: checked
              }))} />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  {editingPlan ? "Update" : "Create"} Plan
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("list")}>
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>;
}