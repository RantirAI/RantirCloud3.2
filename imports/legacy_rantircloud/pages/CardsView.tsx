import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Mail, Phone, Image, Hash, Check } from "lucide-react";

export default function CardsView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<TableProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await tableService.getTableProject(id);
        
        // Parse the schema and records safely
        const defaultSchema = {
          id: data.id,
          name: data.name,
          fields: []
        };
        
        const schema = safeParseJson(data.schema, defaultSchema);
        const records = safeParseJson(data.records, []);
        
        const parsedProject = {
          ...data,
          schema,
          records
        };
        
        setProject(parsedProject);
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <FileText className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'number': return <Hash className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      case 'boolean': return <Check className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (!value && value !== false) return "-";
    
    switch (field.type) {
      case 'boolean':
        return value ? "Yes" : "No";
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'image':
        return value ? <img src={value} alt="" className="w-8 h-8 object-cover rounded" /> : "-";
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!project || !project.records) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-muted-foreground">This table doesn't have any records to display.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get gallery view settings with defaults
  const gallerySettings = project.view_settings?.gallery || {
    cardsPerRow: 3,
    showImages: true,
    showLabels: true,
    showTypeIcons: true
  };

  // Find title field - use the first text field as title
  const titleField = project.schema.fields.find(f => f.type === 'text' || f.type === 'email');
  const imageField = project.schema.fields.find(f => f.type === 'image');

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground">{project.records.length} records</p>
        </div>

        <div 
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${gallerySettings.cardsPerRow || 3}, minmax(0, 1fr))`
          }}
        >
          {project.records.map((record: any, index: number) => (
            <Card key={record.id || index} className="overflow-hidden bg-background dark:bg-zinc-900">
              {/* Image if enabled and available */}
              {gallerySettings.showImages && imageField && record[imageField.name] && (
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={record[imageField.name]} 
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader className="pb-2">
                {titleField && record[titleField.name] && (
                  <CardTitle className="text-base font-medium truncate">
                    {record[titleField.name]}
                  </CardTitle>
                )}
              </CardHeader>
              
              <CardContent className="space-y-2">
                {project.schema.fields
                  .filter(field => field.id !== titleField?.id && field.id !== imageField?.id)
                  .slice(0, 4) // Limit to 4 additional fields
                  .map(field => {
                    const value = record[field.name] || record[field.id];
                    if (!value && value !== false) return null;
                    
                    return (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        {gallerySettings.showTypeIcons && (
                          <span className="text-muted-foreground flex-shrink-0">
                            {getFieldIcon(field.type)}
                          </span>
                        )}
                        {gallerySettings.showLabels && (
                          <span className="text-muted-foreground font-medium min-w-0 flex-shrink-0">
                            {field.name}:
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {renderFieldValue(field, value)}
                        </span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ))}
        </div>

        {project.records.length === 0 && (
          <Card className="w-full">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
              <p className="text-muted-foreground">This table doesn't have any data to display yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}