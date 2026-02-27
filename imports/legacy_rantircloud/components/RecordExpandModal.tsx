import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TableField, TableRecord } from "@/services/tableService";
import { SchemaTypeIcon } from "./SchemaTypeIcon";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  X, 
  Save, 
  Trash2, 
  Copy, 
  MessageSquare, 
  Activity, 
  ChevronUp, 
  ChevronDown,
  Send,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface RecordExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TableRecord | null;
  tableSchema: {
    fields: TableField[];
  };
  onEdit?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  onDuplicate?: (record: TableRecord) => void;
}

// Helper function to get field value using both field name and field ID
const getFieldValue = (record: TableRecord, field: TableField): any => {
  if (!record || !field) return undefined;
  return record[field.name] !== undefined ? record[field.name] : record[field.id];
};

export function RecordExpandModal({
  isOpen,
  onClose,
  record,
  tableSchema,
  onEdit,
  onDelete,
  onDuplicate
}: RecordExpandModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [newComment, setNewComment] = useState("");
  
  // Mock comments and activity - in real app would come from database
  const [comments] = useState([
    { id: '1', user: 'John D.', text: 'Updated the status field', time: new Date(Date.now() - 3600000) },
    { id: '2', user: 'Sarah M.', text: 'Looks good to me!', time: new Date(Date.now() - 7200000) }
  ]);
  
  const [activities] = useState([
    { id: '1', action: 'Created record', user: 'System', time: new Date(Date.now() - 86400000) },
    { id: '2', action: 'Updated Status field', user: 'John D.', time: new Date(Date.now() - 3600000) }
  ]);

  useEffect(() => {
    if (record) {
      const initialData: Record<string, any> = {};
      tableSchema.fields.forEach(field => {
        const value = getFieldValue(record, field);
        initialData[field.name] = value;
      });
      setFormData(initialData);
    }
  }, [record, tableSchema.fields]);
  
  if (!record) return null;

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = async () => {
    if (!record || !onEdit) return;

    setIsLoading(true);
    try {
      await onEdit(record.id, formData);
      toast.success("Record updated successfully");
    } catch (error) {
      toast.error("Failed to update record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!record || !onDelete) return;
    if (window.confirm("Are you sure you want to delete this record?")) {
      onDelete(record.id);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (!record || !onDuplicate) return;
    onDuplicate(record);
    toast.success("Record duplicated");
    onClose();
  };

  const getRecordTitle = () => {
    const titleField = tableSchema.fields.find(f => 
      f.type === 'text' && (
        f.name.toLowerCase().includes('title') || 
        f.name.toLowerCase().includes('name')
      )
    );
    
    if (titleField) {
      const titleValue = getFieldValue(record, titleField);
      if (titleValue) return String(titleValue);
    }
    
    const firstTextField = tableSchema.fields.find(f => f.type === 'text');
    if (firstTextField) {
      const value = getFieldValue(record, firstTextField);
      if (value) return String(value);
    }
    
    return `Record ${record.id.slice(0, 8)}...`;
  };

  const renderFieldInput = (field: TableField) => {
    const value = formData[field.name];
    
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <Input
            type={field.type === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            className="bg-background"
          />
        );
      case 'textarea':
      case 'codescript':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            rows={3}
            className={`bg-background ${field.type === 'codescript' ? 'font-mono text-sm' : ''}`}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={field.description || `Enter ${field.name}`}
            className="bg-background"
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label className="text-sm text-muted-foreground">{field.description || "Enable"}</Label>
          </div>
        );
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(newValue) => handleFieldChange(field.name, newValue)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[60]">
              {Array.isArray(field.options) && field.options.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="bg-background"
          />
        );
      case 'image':
        return (
          <div className="space-y-2">
            <Input
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder="Image URL"
              className="bg-background"
            />
            {value && (
              <img src={value} alt="Preview" className="h-24 w-auto rounded-md border" />
            )}
          </div>
        );
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            className="bg-background"
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
              <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <DialogTitle className="flex-1 text-center font-semibold">
              {getRecordTitle()}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleDuplicate} title="Duplicate">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Tabs */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Record Fields */}
          <div className="flex-1 border-r flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 w-fit">
                <TabsTrigger value="content" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Content
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4 space-y-4">
                    {tableSchema.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <SchemaTypeIcon type={field.type} size={14} />
                          <Label className="text-sm font-medium">
                            {field.name}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                        </div>
                        {renderFieldInput(field)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="px-6 py-4 border-t flex-shrink-0">
              <Button onClick={handleSave} disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Right Panel - Activity & Comments */}
          <div className="w-80 flex flex-col min-h-0 bg-muted/30">
            <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-4 mt-4 w-fit">
                <TabsTrigger value="comments" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="flex-1 min-h-0 mt-0 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="px-4 py-4 space-y-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No comments yet</p>
                        <p className="text-xs">Start a conversation</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {comment.user.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{comment.user}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(comment.time, 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                
                {/* Comment Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Leave a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="bg-background"
                    />
                    <Button size="icon" variant="ghost">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-full">
                  <div className="px-4 py-4 space-y-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activity yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          <div className="flex-1">
                            <p className="text-sm">{activity.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{activity.user}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {format(activity.time, 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
