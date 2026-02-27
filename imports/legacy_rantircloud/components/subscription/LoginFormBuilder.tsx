import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Code, Eye, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { tableService } from "@/services/tableService";
import { TableField } from "@/services/tableService";
import { FormRenderer } from "@/components/FormRenderer";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionFieldManager } from "./SubscriptionFieldManager";

interface LoginForm {
  id: string;
  name: string;
  title: string;
  description: string;
  selectedTableId: string;
  fields: TableField[];
  primaryColor: string;
  submitButtonText: string;
  successMessage: string;
  redirectAfterSubmit: string;
  style?: 'default' | 'compact';
}

interface LoginFormBuilderProps {
  tableId: string;
  project: any;
  onUpdate: (updatedProject: any) => void;
}

export function LoginFormBuilder({ tableId, project, onUpdate }: LoginFormBuilderProps) {
  const { user } = useAuth();
  const [forms, setForms] = useState<LoginForm[]>([]);
  const [userTables, setUserTables] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<LoginForm | null>(null);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<LoginForm | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<TableField[]>([]);
  const [selectedFields, setSelectedFields] = useState<TableField[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    title: string;
    description: string;
    selectedTableId: string;
    primaryColor: string;
    submitButtonText: string;
    successMessage: string;
    redirectAfterSubmit: string;
    style: 'default' | 'compact';
  }>({
    name: "",
    title: "",
    description: "",
    selectedTableId: "",
    primaryColor: "#3b82f6",
    submitButtonText: "Create Account",
    successMessage: "Account created successfully!",
    redirectAfterSubmit: "",
    style: "default"
  });

  useEffect(() => {
    loadForms();
    if (user?.id) {
      loadUserTables();
    }
  }, [project, user]);

  useEffect(() => {
    if (selectedTableId) {
      loadTableFields(selectedTableId);
    }
  }, [selectedTableId]);

  const loadForms = () => {
    if (project?.records) {
      // Only get login/registration forms, NOT subscription plans
      const formRecords = project.records.filter((record: any) => 
        (record.type === 'login-form' || record.formType === 'login') && 
        record.type !== 'subscription' && // Explicitly exclude subscription records
        record.type !== 'user-registration' // Explicitly exclude user registration records
      );
      console.log('Loading forms:', formRecords.length, 'Total records:', project.records.length);
      setForms(formRecords);
    }
  };

  const loadUserTables = async () => {
    try {
      if (user?.id) {
        const tables = await tableService.getUserTableProjects(user.id);
        setUserTables(tables || []);
      }
    } catch (error) {
      console.error('Failed to load user tables:', error);
    }
  };

  const loadTableFields = async (tableId: string) => {
    try {
      const table = await tableService.getTableProject(tableId);
      if (table?.schema?.fields) {
        setAvailableFields(table.schema.fields);
        setSelectedFields(table.schema.fields.filter(field => !field.system));
      }
    } catch (error) {
      console.error('Failed to load table fields:', error);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    setFormData({ ...formData, selectedTableId: tableId });
  };

  const handleFieldToggle = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (!field) return;

    const isSelected = selectedFields.some(f => f.id === fieldId);
    if (isSelected) {
      setSelectedFields(selectedFields.filter(f => f.id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const createDefaultFormFields = (): TableField[] => [
    {
      id: crypto.randomUUID(),
      name: "email",
      type: "email",
      required: true,
      description: "User's email address"
    },
    {
      id: crypto.randomUUID(),
      name: "password",
      type: "password",
      required: true,
      description: "User's password"
    },
    {
      id: crypto.randomUUID(),
      name: "name",
      type: "text",
      required: true,
      description: "User's full name"
    }
  ];

  const handleSave = async () => {
    if (!formData.selectedTableId) {
      toast.error("Please select a table for the form");
      return;
    }

    if (selectedFields.length === 0) {
      toast.error("Please select at least one field for the form");
      return;
    }

    try {
      // Ensure proper record structure with validation
      const formRecord = {
        ...formData,
        id: editingForm?.id || crypto.randomUUID(),
        type: 'login-form', // Explicitly set type
        formType: 'login', // Additional identifier
        fields: selectedFields,
        createdAt: (editingForm as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate that this is actually a form record
      if (!formRecord.name || !formRecord.selectedTableId || !formRecord.fields?.length) {
        throw new Error("Invalid form data - missing required fields");
      }

      if (editingForm) {
        // Update existing form
        const updatedRecords = project.records.map((record: any) =>
          record.id === editingForm.id ? formRecord : record
        );
        
        const updatedProject = await tableService.updateTableProject(tableId, {
          records: updatedRecords
        });
        onUpdate(updatedProject);
      } else {
        // Add new form
        const newRecord = await tableService.addRecord(tableId, formRecord, project.records);
        const updatedProject = {
          ...project,
          records: [...project.records, newRecord]
        };
        onUpdate(updatedProject);
      }

      toast.success(editingForm ? "Form updated" : "Form created");
      resetForm();
    } catch (error: any) {
      toast.error("Failed to save form", {
        description: error.message
      });
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      await tableService.deleteRecord(tableId, formId, project.records);
      const updatedProject = {
        ...project,
        records: project.records.filter((record: any) => record.id !== formId)
      };
      onUpdate(updatedProject);
      toast.success("Form deleted");
    } catch (error: any) {
      toast.error("Failed to delete form");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      description: "",
      selectedTableId: "",
      primaryColor: "#3b82f6",
      submitButtonText: "Create Account",
      successMessage: "Account created successfully!",
      redirectAfterSubmit: "",
      style: "default"
    });
    setEditingForm(null);
    setIsAddDialogOpen(false);
    setSelectedTableId("");
    setAvailableFields([]);
    setSelectedFields([]);
  };

  const openEditDialog = (form: LoginForm) => {
    setFormData({
      name: form.name,
      title: form.title,
      description: form.description,
      selectedTableId: form.selectedTableId || "",
      primaryColor: form.primaryColor,
      submitButtonText: form.submitButtonText,
      successMessage: form.successMessage,
      redirectAfterSubmit: form.redirectAfterSubmit,
      style: form.style || "default"
    });
    setEditingForm(form);
    setSelectedTableId(form.selectedTableId || "");
    setSelectedFields(form.fields || []);
    setIsAddDialogOpen(true);
  };

  const generateFormCode = (form: LoginForm) => {
    const isCompact = form.style === 'compact';
    
    if (isCompact) {
      // Generate compact horizontal form
      return `
<div id="compact-form-${form.id}" style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
    <!-- Form -->
    <form id="form-${form.id}" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      ${form.fields.map(field => `
      <input 
        type="${field.type}" 
        name="${field.name}" 
        required="${field.required}"
        style="min-width: 120px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white; transition: all 0.2s; box-sizing: border-box;"
        placeholder="${field.name}"
        onfocus="this.style.borderColor='${form.primaryColor}'; this.style.boxShadow='0 0 0 2px ${form.primaryColor}20'"
        onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
      />
      `).join('')}
      
      <button 
        type="submit"
        id="submit-btn-${form.id}"
        style="padding: 8px 16px; background: ${form.primaryColor}; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s; white-space: nowrap;"
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
      >
        <span id="submit-text-${form.id}">${form.submitButtonText}</span>
      </button>
    </form>
  </div>
  
  <script>
    (function() {
      document.getElementById('form-${form.id}').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn-${form.id}');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
          const supabaseUrl = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/form-submit/${form.selectedTableId}?signup=true';
          const response = await fetch(supabaseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          if (response.ok) {
            alert('${form.successMessage}');
            ${form.redirectAfterSubmit ? `window.location.href = '${form.redirectAfterSubmit}';` : ''}
          } else {
            const errorData = await response.json();
            alert(errorData.error || 'Error submitting form. Please try again.');
          }
        } catch (error) {
          alert('Error processing request. Please try again.');
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    })();
  </script>
</div>`.trim();
    } else {
      // Generate default vertical form
      return `
<div id="login-form-${form.id}" style="max-width: 400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: white; padding: 40px 32px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #f3f4f6;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 48px; height: 48px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
        <div style="width: 24px; height: 24px; background: #6b7280; border-radius: 50%;"></div>
      </div>
      <h1 id="form-title-${form.id}" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">${form.title}</h1>
      <p id="form-description-${form.id}" style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${form.description}</p>
    </div>

    <!-- Form -->
    <form id="form-${form.id}">
      ${form.fields.map(field => `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151;">${field.name}${field.required ? ' *' : ''}</label>
        <input 
          type="${field.type}" 
          name="${field.name}" 
          required="${field.required}"
          style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: white; transition: all 0.2s; box-sizing: border-box;"
          placeholder="Enter ${field.name.toLowerCase()}"
          onfocus="this.style.borderColor='${form.primaryColor}'; this.style.boxShadow='0 0 0 3px ${form.primaryColor}20'"
          onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
        />
      </div>
      `).join('')}
      
      <button 
        type="submit"
        id="submit-btn-${form.id}"
        style="width: 100%; padding: 12px 16px; background: ${form.primaryColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; margin-top: 8px; transition: all 0.2s;"
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
      >
        <span id="submit-text-${form.id}">${form.submitButtonText}</span>
      </button>
    </form>
    
    <!-- Powered by -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0; display: flex; align-items: center; justify-content: center; gap: 4px;">
        Secured by <strong style="color: #374151;">Rantir</strong>
      </p>
    </div>
  </div>
  
  <script>
    (function() {
      document.getElementById('form-${form.id}').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn-${form.id}');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
          const supabaseUrl = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/form-submit/${form.selectedTableId}?signup=true';
          const response = await fetch(supabaseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          if (response.ok) {
            alert('${form.successMessage}');
            ${form.redirectAfterSubmit ? `window.location.href = '${form.redirectAfterSubmit}';` : ''}
          } else {
            const errorData = await response.json();
            alert(errorData.error || 'Error submitting form. Please try again.');
          }
        } catch (error) {
          alert('Error processing request. Please try again.');
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    })();
  </script>
</div>`.trim();
    }
  };

  const handlePreviewSubmit = (values: any) => {
    console.log('Preview form submitted with values:', values);
    toast.success('Form submitted successfully! (This is just a preview)');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Login & Registration Forms</h3>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Form
        </Button>
      </div>

      <div className="grid gap-4">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No forms created yet. Click "Add Form" to create your first login/registration form.
            </CardContent>
          </Card>
        ) : (
          forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{form.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Login Form</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedForm(form);
                        setIsPreviewDialogOpen(true);
                      }}
                      title="Preview Form"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedForm(form);
                        setIsEmbedDialogOpen(true);
                      }}
                      title="Get Embed Code"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(form)}
                      title="Edit Form"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(form.id)}
                      title="Delete Form"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{form.description}</p>
                <p className="text-xs text-muted-foreground">
                  Form URL: /form/{tableId}?formId={form.id}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Edit Form" : "Add Registration Form"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., User Registration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableSelect">Select Table</Label>
              <Select value={formData.selectedTableId} onValueChange={handleTableSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a table to store form submissions" />
                </SelectTrigger>
                <SelectContent>
                  {userTables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Subscription Field Manager */}
              {selectedTableId && (
                <SubscriptionFieldManager 
                  selectedTableId={selectedTableId}
                  onTableUpdated={() => loadTableFields(selectedTableId)}
                />
              )}
              {userTables.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tables found. Create a table first to use for form submissions.
                </p>
              )}
            </div>

            {availableFields.length > 0 && (
              <div className="space-y-2">
                <Label>Select Fields</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-3">
                    {availableFields.filter(field => !field.system).map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.some(f => f.id === field.id)}
                          onCheckedChange={() => handleFieldToggle(field.id)}
                        />
                        <Label htmlFor={field.id} className="flex-1 text-sm">
                          <span className="font-medium">{field.name}</span>
                          <span className="text-muted-foreground ml-2">({field.type})</span>
                          {field.description && (
                            <span className="block text-xs text-muted-foreground">{field.description}</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected {selectedFields.length} of {availableFields.filter(f => !f.system).length} fields
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Form Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Create Your Account"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Join our platform to get started..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="style">Form Style</Label>
              <Select value={formData.style} onValueChange={(value: 'default' | 'compact') => setFormData({ ...formData, style: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Vertical)</SelectItem>
                  <SelectItem value="compact">Compact (Horizontal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submitButtonText">Submit Button Text</Label>
                <Input
                  id="submitButtonText"
                  value={formData.submitButtonText}
                  onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                  placeholder="Create Account"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="successMessage">Success Message</Label>
              <Input
                id="successMessage"
                value={formData.successMessage}
                onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                placeholder="Account created successfully!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectAfterSubmit">Redirect After Submit (optional)</Label>
              <Input
                id="redirectAfterSubmit"
                value={formData.redirectAfterSubmit}
                onChange={(e) => setFormData({ ...formData, redirectAfterSubmit: e.target.value })}
                placeholder="https://your-site.com/welcome"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 px-6 pb-6">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.selectedTableId || selectedFields.length === 0}
            >
              {editingForm ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Form Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">
              Copy this code and paste it into your website where you want the registration form to appear.
            </p>
            {selectedForm && (
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">HTML Code</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generateFormCode(selectedForm));
                      toast.success("Form code copied to clipboard");
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </Button>
                </div>
                <div className="bg-muted border rounded-lg max-h-[400px] overflow-auto">
                  <pre className="text-xs p-4 whitespace-pre-wrap leading-relaxed">
                    {generateFormCode(selectedForm)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {selectedForm && (
              <FormRenderer
                tableSchema={{
                  name: selectedForm.name,
                  fields: selectedForm.fields.map(field => ({
                    id: field.id || field.name,
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    description: field.description,
                    options: field.options
                  }))
                }}
                formConfig={{
                  title: selectedForm.title,
                  description: selectedForm.description,
                  primaryColor: selectedForm.primaryColor,
                  submitButtonText: selectedForm.submitButtonText,
                  style: selectedForm.style
                }}
                onSubmit={handlePreviewSubmit}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
