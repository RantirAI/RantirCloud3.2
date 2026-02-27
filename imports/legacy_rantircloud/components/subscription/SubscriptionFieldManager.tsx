import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { tableService } from "@/services/tableService";

interface SubscriptionFieldManagerProps {
  selectedTableId: string;
  onTableUpdated?: (tableProject: any) => void;
}

export function SubscriptionFieldManager({ selectedTableId, onTableUpdated }: SubscriptionFieldManagerProps) {
  const [tableProject, setTableProject] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [hasSelectedPlanField, setHasSelectedPlanField] = useState(false);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedTableId) {
      loadTableData();
    }
  }, [selectedTableId]);

  const loadTableData = async () => {
    try {
      setIsLoading(true);
      const table = await tableService.getTableProject(selectedTableId);
      setTableProject(table);
      setSubscriptionEnabled(table.subscription_enabled || false);
      
      // Check if selectedPlan field exists
      const hasField = table.schema?.fields?.some((field: any) => field.name === 'selectedPlan');
      setHasSelectedPlanField(hasField);
      
      // Check for subscription plans in the records
      const plans = table.records?.filter((record: any) => 
        record.type === 'subscription' || (record.name && record.price !== undefined)
      ) || [];
      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Failed to load table data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enableSubscriptions = async () => {
    if (!tableProject) return;
    
    try {
      setIsLoading(true);
      
      // Enable subscriptions on the table - this will trigger the database function
      // to automatically add the selectedPlan field
      const updatedProject = await tableService.updateTableProject(selectedTableId, {
        subscription_enabled: true
      });
      
      setTableProject(updatedProject);
      setSubscriptionEnabled(true);
      setHasSelectedPlanField(true);
      
      toast.success("Subscriptions enabled! The 'selectedPlan' field has been added automatically.");
      
      if (onTableUpdated) {
        onTableUpdated(updatedProject);
      }
    } catch (error: any) {
      toast.error("Failed to enable subscriptions", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const manuallyAddField = async () => {
    if (!tableProject) return;
    
    try {
      setIsLoading(true);
      
      const newField = {
        id: crypto.randomUUID(),
        name: 'selectedPlan',
        type: 'json',
        required: false,
        system: true,
        description: 'Automatically stores selected subscription plan information'
      };
      
      const updatedFields = [...tableProject.schema.fields, newField];
      
      const updatedProject = await tableService.updateTableProject(selectedTableId, {
        schema: {
          ...tableProject.schema,
          fields: updatedFields
        },
        subscription_enabled: true
      });
      
      setTableProject(updatedProject);
      setSubscriptionEnabled(true);
      setHasSelectedPlanField(true);
      
      toast.success("The 'selectedPlan' field has been added to the table.");
      
      if (onTableUpdated) {
        onTableUpdated(updatedProject);
      }
    } catch (error: any) {
      toast.error("Failed to add selectedPlan field", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-sm text-muted-foreground">
              Checking subscription configuration...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tableProject) {
    return null;
  }

  // If no subscription plans exist, don't show anything
  if (subscriptionPlans.length === 0) {
    return null;
  }

  // If subscriptions are enabled and field exists, show success
  if (subscriptionEnabled && hasSelectedPlanField) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Subscriptions enabled:</strong> The 'selectedPlan' field is configured and ready to capture subscription information from form submissions.
        </AlertDescription>
      </Alert>
    );
  }

  // If subscription plans exist but subscriptions aren't enabled, show prompt
  if (subscriptionPlans.length > 0 && (!subscriptionEnabled || !hasSelectedPlanField)) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Subscription Plans Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-orange-700">
            <p className="mb-2">
              This table has <strong>{subscriptionPlans.length} subscription plan(s)</strong> but subscriptions are not enabled.
            </p>
            <p className="mb-4">
              To capture subscription information when users sign up through forms, you need to enable subscriptions and add a 'selectedPlan' field.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-subscriptions"
                checked={subscriptionEnabled}
                disabled={true}
              />
              <Label htmlFor="enable-subscriptions" className="text-sm">
                Enable subscription tracking for this table
              </Label>
            </div>
            
            <Button 
              onClick={enableSubscriptions}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Enabling..." : "Enable Subscriptions & Add Field"}
            </Button>
            
            <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
              <Info className="h-3 w-3 inline mr-1" />
              This will automatically add a 'selectedPlan' field to store subscription information when users register through forms.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}