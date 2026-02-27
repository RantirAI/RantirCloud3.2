import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanValidator } from '@/components/subscription/PlanValidator';
import { usePlanValidation } from '@/hooks/usePlanValidation';
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { FormRenderer } from '@/components/FormRenderer';
import { toast } from '@/components/ui/sonner';

export default function SubscriptionTestPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const tableId = searchParams.get('tableId');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validPlan, setValidPlan] = useState<any>(null);
  
  const { isValidating, isValid, plan, error } = usePlanValidation(planId, tableId);

  // Mock form schema for demonstration
  const mockFormSchema = {
    name: "User Registration",
    fields: [
      {
        id: "name",
        name: "name",
        type: "text",
        required: true,
        description: "Your full name"
      },
      {
        id: "email", 
        name: "email",
        type: "email",
        required: true,
        description: "Your email address"
      },
      {
        id: "company",
        name: "company", 
        type: "text",
        required: false,
        description: "Your company name"
      },
      {
        id: "selectedPlan",
        name: "selectedPlan",
        type: "json",
        required: false,
        system: true,
        description: "Automatically stores selected subscription plan information"
      }
    ]
  };

  const handleFormSubmit = async (values: any) => {
    if (!planId || !tableId) {
      toast.error("Missing subscription plan information");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate form submission to the form-submit edge function
      const response = await fetch(
        `https://appdmmjexevclmpyvtss.supabase.co/functions/v1/form-submit/${tableId}?planId=${planId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values)
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Registration successful! Your subscription plan has been recorded.");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidPlan = (planData: any) => {
    setValidPlan(planData);
  };

  const handleInvalidPlan = (errorMessage: string) => {
    setValidPlan(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Subscription Registration System Demo
          </h1>
          <p className="text-gray-600">
            Complete subscription plan validation and secure user registration
          </p>
        </div>

        {/* Demo Info */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Plan Validation</p>
                  <p className="text-gray-600">Server validates subscription plan exists and is available</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Secure Registration</p>
                  <p className="text-gray-600">User data is collected with plan information automatically attached</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Database Storage</p>
                  <p className="text-gray-600">System automatically adds selectedPlan field to store validated plan data</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Parameters Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current URL Parameters</CardTitle>
            <CardDescription>These would typically come from your subscription embed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Plan ID:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {planId || 'Not provided'}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium">Table ID:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {tableId || 'Not provided'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Validation */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Plan Validation</CardTitle>
            <CardDescription>
              The system validates the subscription plan before allowing registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanValidator
              planId={planId}
              tableId={tableId}
              onValidPlan={handleValidPlan}
              onInvalidPlan={handleInvalidPlan}
            />
          </CardContent>
        </Card>

        {/* Registration Form */}
        {isValid && validPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: User Registration</CardTitle>
              <CardDescription>
                Complete your registration. The selected plan will be automatically recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Selected Plan Display */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Selected Plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{validPlan.name}</Badge>
                    <span className="text-sm text-gray-600">
                      ${validPlan.price}/{validPlan.billingPeriod}
                    </span>
                    <Badge variant="outline" className="text-green-600">
                      ✓ Verified
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{validPlan.description}</p>
                </div>

                {/* Registration Form */}
                <FormRenderer
                  tableSchema={mockFormSchema}
                  formConfig={{
                    title: "Complete Your Registration",
                    description: "Fill out the form below to complete your subscription registration",
                    primaryColor: "#3b82f6",
                    submitButtonText: isSubmitting ? "Registering..." : "Complete Registration"
                  }}
                  onSubmit={handleFormSubmit}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Technical Implementation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">🔒 Security Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Server-side plan validation prevents tampering</li>
                <li>Database trigger automatically enforces selectedPlan field</li>
                <li>URL parameters are validated against database records</li>
                <li>Invalid plans are rejected with clear error messages</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">⚡ Automatic Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>System automatically adds selectedPlan field to any table with subscription enabled</li>
                <li>Form creators cannot accidentally remove this critical field</li>
                <li>Plan information is validated and enriched server-side</li>
                <li>Comprehensive logging for debugging and monitoring</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">🎯 User Experience:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Clear visual feedback for plan validation status</li>
                <li>Seamless integration with existing form builders</li>
                <li>Intuitive plan display in user data views</li>
                <li>Error handling with user-friendly messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}