import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tableService, TableField, TableProject } from '@/services/tableService';
import { FileUploader } from '@/components/FileUploader';
import { generateRecordId } from '@/utils/generateRecordId';

export default function AddRecord() {
  const { id: tableProjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tableProject, setTableProject] = useState<TableProject | null>(null);
  const [tableFields, setTableFields] = useState<TableField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadTableProject = async () => {
      if (!tableProjectId) {
        navigate('/tables');
        return;
      }

      try {
        setIsLoading(true);
        const project = await tableService.getTableProject(tableProjectId);
        setTableProject(project);
        
        if (project.schema?.fields) {
          setTableFields(project.schema.fields);
        } else {
          toast({
            title: "Error",
            description: "Unable to load table schema",
            variant: "destructive"
          });
          navigate('/tables');
        }
      } catch (error: any) {
        console.error('Error loading table project:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load table project",
          variant: "destructive"
        });
        navigate('/tables');
      } finally {
        setIsLoading(false);
      }
    };

    loadTableProject();
  }, [tableProjectId, navigate, toast]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableProjectId) return;

    try {
      setIsSaving(true);
      
      // Auto-populate timestamp fields
      const timestampData: Record<string, any> = {};
      tableFields.forEach(field => {
        if (field.type === 'timestamp') {
          timestampData[field.name] = new Date().toISOString();
        }
      });

      const newRecord = {
        id: generateRecordId(formData, { fields: tableFields }),
        ...formData,
        ...timestampData,
        created_at: new Date().toISOString()
      };

      await tableService.addRecord(tableProjectId, newRecord, tableProject?.records || []);
      
      toast({
        title: "Success",
        description: "Record added successfully",
      });
      
      navigate(`/tables/${tableProjectId}`);
    } catch (error: any) {
      console.error('Error adding record:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add record",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldInput = (field: TableField) => {
    if (field.name === 'id' || field.system || field.type === 'timestamp') return null;

    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            minLength={field.options?.minLength}
            maxLength={field.options?.maxLength}
            pattern={field.options?.pattern}
            className="h-12"
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            className="h-12"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            rows={4}
            minLength={field.options?.minLength}
            maxLength={field.options?.maxLength}
            className="min-h-[100px]"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${field.name}`}
            className="h-12"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-3 pt-3">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              id={field.name}
            />
            <Label htmlFor={field.name} className="text-sm font-normal">
              Yes
            </Label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="h-12"
          />
        );

      case 'select':
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'image':
      case 'pdf':
        return (
          <FileUploader
            type={field.type}
            value={value}
            onChange={(url) => handleFieldChange(field.name, url)}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            className="h-12"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load the form</div>
        </div>
      </div>
    );
  }

  if (!tableProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Table Not Found</div>
          <div className="text-sm text-muted-foreground mb-4">The requested table could not be found</div>
          <Button onClick={() => navigate('/tables')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tables
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {tableProject.name}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-record-form"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Record
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Add New Record</CardTitle>
            <p className="text-muted-foreground">
              Add a new record to <span className="font-medium">{tableProject.name}</span>
            </p>
          </CardHeader>
          <CardContent>
            <form id="add-record-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tableFields
                  .filter(field => field.name !== 'id' && !field.system)
                  .map((field) => (
                    <div key={field.id} className={`space-y-3 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                      <Label htmlFor={field.name} className="text-sm font-medium">
                        {field.name}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                      )}
                      {renderFieldInput(field)}
                    </div>
                  ))}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}