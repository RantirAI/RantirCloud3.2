import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface PlanValidatorProps {
  planId?: string;
  tableId?: string;
  onValidPlan?: (plan: any) => void;
  onInvalidPlan?: (error: string) => void;
}

export function PlanValidator({ planId, tableId, onValidPlan, onInvalidPlan }: PlanValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    plan?: any;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (planId && tableId) {
      validatePlan();
    }
  }, [planId, tableId]);

  const validatePlan = async () => {
    if (!planId || !tableId) {
      const error = "Missing plan or table information";
      setValidationResult({ valid: false, error });
      onInvalidPlan?.(error);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(
        `https://appdmmjexevclmpyvtss.supabase.co/functions/v1/validate-plan?planId=${encodeURIComponent(planId)}&tableId=${encodeURIComponent(tableId)}`
      );
      
      const data = await response.json();
      
      if (data.valid && data.plan) {
        setValidationResult({ valid: true, plan: data.plan });
        onValidPlan?.(data.plan);
        toast.success("Subscription plan validated successfully!");
      } else {
        const error = data.error || "Plan validation failed";
        setValidationResult({ valid: false, error });
        onInvalidPlan?.(error);
        toast.error(error);
      }
    } catch (error) {
      const errorMessage = "Failed to validate subscription plan";
      setValidationResult({ valid: false, error: errorMessage });
      onInvalidPlan?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  if (!planId || !tableId) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-900">Invalid Request</h3>
              <p className="text-sm text-orange-700">
                Missing subscription plan information. Please use a valid subscription link.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isValidating) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-semibold text-blue-900">Validating Plan</h3>
              <p className="text-sm text-blue-700">
                Verifying subscription plan details...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <Button onClick={validatePlan} variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Validate Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult.valid) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Plan Not Found</h3>
              <p className="text-sm text-red-700">
                {validationResult.error || "The subscription plan you're looking for is not available."}
              </p>
              <Button 
                onClick={validatePlan} 
                variant="outline" 
                size="sm" 
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = validationResult.plan;
  
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <CardTitle className="text-green-900">Plan Validated</CardTitle>
            <p className="text-sm text-green-700 mt-1">
              This subscription plan is verified and available
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
            <p className="text-muted-foreground mb-3">{plan.description}</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-green-700">
                ${plan.price}
              </span>
              <span className="text-muted-foreground">/{plan.billingPeriod}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Verified subscription plan
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}