
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tableService } from "@/services/tableService";
import { FormRenderer } from "@/components/FormRenderer";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FormView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadForm = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await tableService.getTableProject(id);
        setProject(data);
      } catch (error) {
        console.error("Failed to load form:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadForm();
  }, [id]);

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
        <p>The form you are looking for does not exist or you don't have permission to view it.</p>
        <Button className="mt-4" onClick={() => navigate("/tables")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tables
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 bg-grid-pattern font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/tables")}>Tables</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate(`/tables/${id}`)}>
                {project.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-muted-foreground">Form View</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="bg-white shadow-md rounded-lg p-6 md:p-8">
          <FormRenderer
            tableSchema={project.schema}
            formConfig={project.formConfig}
            onSubmit={(values) => {
              tableService.addRecord(id!, values, project.records);
              alert("Form submitted successfully!");
            }}
          />
        </div>
      </div>
    </div>
  );
}
