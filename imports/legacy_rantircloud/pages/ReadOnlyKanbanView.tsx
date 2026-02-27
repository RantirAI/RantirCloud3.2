import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchemaTypeIcon } from "@/components/SchemaTypeIcon";
import { File } from "lucide-react";
import { RantirLoader, PoweredByRantir } from "@/components/RantirLoader";
import { useTheme } from "@/hooks/useTheme";

export default function ReadOnlyKanbanView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<TableProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId') === 'true';

  useEffect(() => {
    // Apply theme from URL parameter or default to light
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme') || 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeParam);
    
    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('light', 'dark');
    };
  }, []);

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
        const records = safeParseJson(data.records, []);
        
        const parsedProject = {
          ...data,
          schema,
          records
        };
        
        setProject(parsedProject);
      } catch (error) {
        console.error("Failed to load kanban:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RantirLoader size="lg" message="Loading kanban..." />
      </div>
    );
  }

  if (!project || !project.records) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2 text-foreground">No Data Available</h2>
              <p className="text-muted-foreground">This table doesn't have any records to display.</p>
            </CardContent>
          </Card>
        </div>
        <PoweredByRantir />
      </div>
    );
  }

  const kanbanSettings = project.view_settings?.kanban || {
    showImages: true,
    showTypeIcons: true,
    kanbanImageDisplay: "cover",
    groupByField: undefined
  };

  const groupByField = kanbanSettings.groupByField || 
    project.schema.fields.find((f) => f.type === "select")?.id || 
    project.schema.fields[0]?.id;

  const groupValues = project.records.reduce((acc: string[], record) => {
    const value = record[groupByField];
    if (value && !acc.includes(value)) {
      acc.push(value);
    }
    return acc;
  }, []);

  const allGroups = ["Not categorized", ...groupValues];
  const imageField = project.schema.fields.find(f => f.type === 'image');

  const getCardTitle = (record: any) => {
    const titleField = project.schema.fields.find(f => 
      f.type === 'text' && (
        f.name.toLowerCase().includes('title') || 
        f.name.toLowerCase().includes('name') ||
        f.name.toLowerCase().includes('username')
      )
    );
    
    if (titleField) {
      const titleValue = record[titleField.id] || record[titleField.name];
      if (titleValue) return String(titleValue);
    }
    
    const firstTextField = project.schema.fields.find(f => 
      f.type === 'text' && f.id !== groupByField
    );
    if (firstTextField) {
      const value = record[firstTextField.id] || record[firstTextField.name];
      if (value) return String(value);
    }
    
    return `Record ${record.id.slice(0, 8)}...`;
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
      case "select":
        return value ? <Badge variant="outline">{value}</Badge> : "-";
      case "pdf":
        return value ? (
          <div className="flex items-center">
            <File className="h-4 w-4 mr-1 text-red-500" />
            <span className="text-xs text-blue-500 underline">
              <a href={value} target="_blank" rel="noopener noreferrer">View</a>
            </span>
          </div>
        ) : '-';
      default:
        return String(value);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">{project.records.length} records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allGroups.map((groupValue) => {
              const groupCards = project.records.filter(record => 
                (groupValue === "Not categorized" && !record[groupByField]) || 
                record[groupByField] === groupValue
              );
              
              return (
                <div key={groupValue} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">{groupValue}</h4>
                    <Badge className="bg-primary/10 hover:bg-primary/20 text-primary">
                      {groupCards.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {groupCards.map(record => (
                      <Card key={record.id} className="shadow-sm bg-card border">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {kanbanSettings.showImages && imageField && record[imageField.name] && (
                              <div className="w-full h-28 mb-3 rounded overflow-hidden bg-muted/20">
                                <img
                                  src={record[imageField.name]}
                                  alt="Card media"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="font-medium text-sm text-foreground mb-2 truncate">
                              {getCardTitle(record)}
                            </div>
                            
                            {project.schema.fields
                              .filter((field) => field.id !== groupByField)
                              .slice(0, 2)
                              .map((field) => (
                                <div key={field.id} className="flex justify-between items-center text-xs">
                                  <span className="font-medium flex items-center gap-1 text-muted-foreground">
                                    {kanbanSettings.showTypeIcons && <SchemaTypeIcon type={field.type} size={12} />}
                                    {field.name}:
                                  </span>
                                  <span className="text-right text-foreground">
                                    {renderFieldValue(field, record[field.name] || record[field.id])}
                                  </span>
                                </div>
                              ))}
                            
                            <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                              {showId && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {record.id.slice(0, 8)}...
                                </div>
                              )}
                              {record.created_at && (
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(record.created_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PoweredByRantir />
    </div>
  );
}