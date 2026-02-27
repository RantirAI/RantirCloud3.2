import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { FormRenderer } from "@/components/FormRenderer";
import { toast } from "sonner";

export default function ReadOnlyFormView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<TableProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get theme and background from URL params
  const urlTheme = searchParams.get('theme') as 'light' | 'dark' | null;
  const urlBackground = searchParams.get('background'); // e.g., "ffffff" or "000000" or "transparent"
  const urlOpacity = searchParams.get('opacity'); // e.g., "0.5" or "0.8"

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        // Public read access - no auth required
        const data = await tableService.getTableProjectPublic(id);
        
        const defaultSchema = {
          id: data.id,
          name: data.name,
          fields: []
        };
        
        const schema = safeParseJson(data.schema, defaultSchema);
        
        const parsedProject = {
          ...data,
          schema
        };
        
        setProject(parsedProject);
      } catch (error) {
        console.error("Failed to load form:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  const handleFormSubmit = async (formData: Record<string, any>) => {
    if (!project) return;
    
    try {
      // Filter out system fields and create clean submission data
      const filteredData: Record<string, any> = {};
      Object.keys(formData).forEach(key => {
        // Find the field in schema to check if it's a system field
        const field = project.schema.fields.find(f => f.id === key);
        if (field && !field.system && field.name !== 'id') {
          // Use field name instead of field ID for submission
          filteredData[field.name] = formData[key];
        }
      });

      // Submit via edge function to handle public form submissions
      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/form-submit/${project.id}?mode=submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      toast.success("Form submitted successfully!");
      
      // Optionally redirect if specified in form config
      if (formConfig?.redirectUrl) {
        setTimeout(() => {
          window.location.href = formConfig.redirectUrl!;
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit form. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-4 w-16 bg-muted rounded mx-auto mb-2"></div>
          <div className="h-3 w-24 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
          <p className="text-muted-foreground">The requested form could not be loaded.</p>
        </div>
      </div>
    );
  }

  // Parse form config from the project - check both properties
  const formConfig: any = (project as any).form_config || project.formConfig || {};
  
  // Override theme if specified in URL
  if (urlTheme) {
    formConfig.theme = urlTheme;
  }

  // Apply theme and style 
  const isDark = (formConfig?.theme === 'dark') || urlTheme === 'dark';
  const isCompact = formConfig?.style === 'compact';
  
  // Create custom background style from URL params
  const getBackgroundStyle = () => {
    if (urlBackground === 'transparent') {
      return { backgroundColor: 'transparent' };
    }
    if (urlBackground) {
      const opacity = urlOpacity ? parseFloat(urlOpacity) : 1;
      const bgColor = urlBackground.startsWith('#') ? urlBackground : `#${urlBackground}`;
      return { backgroundColor: bgColor, opacity };
    }
    return {};
  };
  
  const containerClass = isCompact 
    ? (isDark ? "min-h-screen bg-gray-900 text-white p-2" : "min-h-screen p-2")
    : (isDark ? "min-h-screen bg-gray-900 text-white p-4" : "min-h-screen p-4");

  return (
    <div 
      className={containerClass}
      style={getBackgroundStyle()}
    >
      <div className={isCompact ? "max-w-4xl mx-auto" : "max-w-2xl mx-auto"}>
        <FormRenderer
          tableSchema={project.schema}
          formConfig={formConfig}
          onSubmit={handleFormSubmit}
        />
      </div>
    </div>
  );
}