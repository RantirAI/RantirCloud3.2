import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { tableService } from "@/services/tableService";
import { FormRenderer } from "@/components/FormRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { generateRecordId } from "@/utils/generateRecordId";

export default function FormSubmit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formId = searchParams.get('formId');
  const planId = searchParams.get('plan');
  const planType = searchParams.get('type');

  useEffect(() => {
    const loadFormData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await tableService.getTableProject(id);
        setProject(data);

        // Find the specific form if formId is provided
        if (formId) {
          const loginForm = data.records.find((record: any) => 
            record.id === formId && (record.type === 'login-form' || record.formType === 'login')
          );
          setForm(loginForm);
        }
      } catch (error) {
        console.error("Failed to load form:", error);
        toast.error("Failed to load form");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFormData();
  }, [id, formId]);

  const handleSubmit = async (values: any) => {
    if (!project || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Add subscription information if available
      const submissionData = {
        ...values,
        id: generateRecordId(),
        type: 'user-registration',
        createdAt: new Date().toISOString(),
        ...(planId && { subscriptionPlan: planId }),
        ...(planType && { subscriptionType: planType })
      };

      // Create the signup URL with the signup=true parameter
      const baseUrl = `https://appdmmjexevclmpyvtss.supabase.co/functions/v1/form-submit/${id}`;
      const signupUrl = baseUrl + '?signup=true' + (planId ? `&planId=${encodeURIComponent(planId)}` : '');

      // Submit to the edge function
      const response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      // Show success message
      const successMessage = form?.successMessage || "Registration successful!";
      toast.success(successMessage);

      // Redirect if specified
      if (form?.redirectAfterSubmit) {
        setTimeout(() => {
          window.location.href = form.redirectAfterSubmit;
        }, 2000);
      }
    } catch (error: any) {
      console.error("Failed to submit form:", error);
      toast.error("Failed to submit form", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-sans">
        <h1 className="text-2xl font-bold mb-4">Form not found</h1>
        <p>The form you are looking for does not exist.</p>
      </div>
    );
  }

  // Use custom form if available, otherwise fall back to default form
  const formToRender = form || {
    title: project.formConfig?.title || "Create Account",
    description: project.formConfig?.description || "Join our platform",
    primaryColor: project.formConfig?.primaryColor || "#3b82f6",
    submitButtonText: form?.submitButtonText || "Create Account"
  };

  // Show subscription info if available
  const showSubscriptionInfo = planId && planType;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 bg-grid-pattern font-sans">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {showSubscriptionInfo && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">Selected Plan</h3>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {planType}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-white shadow-md rounded-lg p-6 md:p-8">
          {form ? (
            // Custom login form
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: form.primaryColor }}>
                {form.title}
              </h2>
              {form.description && (
                <p className="text-gray-600 mb-6">{form.description}</p>
              )}
              
              <FormRenderer
                tableSchema={{
                  name: form.name,
                  fields: form.fields
                }}
                formConfig={{
                  title: form.title,
                  description: form.description,
                  primaryColor: form.primaryColor,
                  submitButtonText: isSubmitting ? "Creating Account..." : form.submitButtonText
                }}
                onSubmit={handleSubmit}
              />
            </div>
          ) : (
            // Default table form
            <FormRenderer
              tableSchema={project.schema}
              formConfig={{
                ...project.formConfig,
                submitButtonText: isSubmitting ? "Submitting..." : (project.formConfig?.submitButtonText || "Submit")
              }}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
