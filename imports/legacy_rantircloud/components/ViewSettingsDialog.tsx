import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TableField } from "@/services/tableService";
import { SortAsc, SortDesc } from "lucide-react";
import { ViewType, ViewSettings } from "@/types/viewTypes";
interface ViewSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  viewType: ViewType;
  tableSchema: {
    fields: TableField[];
  };
  settings: ViewSettings;
  onSave: (settings: ViewSettings) => void;
  titleField?: string;
  onTitleFieldChange?: (fieldId: string) => void;
}
export function ViewSettingsDialog({
  isOpen,
  onClose,
  viewType,
  tableSchema,
  settings,
  onSave,
  titleField,
  onTitleFieldChange
}: ViewSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<ViewSettings>({
    ...settings,
    showTypeIcons: settings.showTypeIcons ?? true,
    showImages: settings.showImages ?? true,
    kanbanImageDisplay: settings.kanbanImageDisplay ?? "cover"
  });
  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };
  const toggleField = (fieldId: string) => {
    setLocalSettings(prev => {
      if (prev.visibleFields.includes(fieldId)) {
        return {
          ...prev,
          visibleFields: prev.visibleFields.filter(id => id !== fieldId)
        };
      } else {
        return {
          ...prev,
          visibleFields: [...prev.visibleFields, fieldId]
        };
      }
    });
  };
  const getViewTitle = () => {
    switch (viewType) {
      case "table":
        return "Grid View Settings";
      case "gallery":
        return "Card View Settings";
      case "kanban":
        return "Kanban View Settings";
      case "form":
        return "Form View Settings";
      default:
        return "View Settings";
    }
  };
  return <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg mt-12">
        <SheetHeader>
          <SheetTitle>{getViewTitle()}</SheetTitle>
          <SheetDescription>
            Customize how your data is displayed in this view
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 px-[16px] space-y-6">
          {/* Card Title Field Selector */}
          {(viewType === "gallery" || viewType === "kanban") && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Card Title Field</h4>
              <Select 
                value={titleField || ""} 
                onValueChange={(value) => onTitleFieldChange?.(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select title field" />
                </SelectTrigger>
                <SelectContent>
                  {tableSchema.fields
                    .filter(f => f.type === 'text' || f.type === 'email')
                    .map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fields Visibility - Only show for non-gallery views */}
          {viewType !== "gallery" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Fields</h4>
              <p className="text-xs text-muted-foreground">Toggle visibility of fields</p>
              <div className="space-y-2">
                {tableSchema.fields.map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`field-${field.id}`} 
                      checked={localSettings.visibleFields.includes(field.id)} 
                      onCheckedChange={() => toggleField(field.id)} 
                    />
                    <Label htmlFor={`field-${field.id}`}>{field.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sorting */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Sorting</h4>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select 
                value={localSettings.sortField || ""} 
                onValueChange={value => setLocalSettings(prev => ({
                  ...prev,
                  sortField: value
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {tableSchema.fields.map(field => (
                    <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {localSettings.sortField && (
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant={localSettings.sortDirection === "asc" ? "default" : "outline"} 
                    onClick={() => setLocalSettings(prev => ({
                      ...prev,
                      sortDirection: "asc"
                    }))}
                    className="flex-1"
                  >
                    <SortAsc className="h-4 w-4 mr-2" />
                    Ascending
                  </Button>
                  <Button 
                    type="button" 
                    variant={localSettings.sortDirection === "desc" ? "default" : "outline"} 
                    onClick={() => setLocalSettings(prev => ({
                      ...prev,
                      sortDirection: "desc"
                    }))}
                    className="flex-1"
                  >
                    <SortDesc className="h-4 w-4 mr-2" />
                    Descending
                  </Button>
                </div>
              </div>
            )}

            {viewType === "kanban" && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Group by field</Label>
                  <Select 
                    value={localSettings.groupByField || ""} 
                    onValueChange={value => setLocalSettings(prev => ({
                      ...prev,
                      groupByField: value
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableSchema.fields.map(field => (
                        <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Display</h4>
            
            {(viewType === "kanban" || viewType === "gallery") && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showTypeIcons">Show type icons</Label>
                  <Switch 
                    id="showTypeIcons" 
                    checked={!!localSettings.showTypeIcons} 
                    onCheckedChange={checked => setLocalSettings(prev => ({
                      ...prev,
                      showTypeIcons: checked
                    }))} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="showImages">Show images</Label>
                  <Switch 
                    id="showImages" 
                    checked={!!localSettings.showImages} 
                    onCheckedChange={checked => setLocalSettings(prev => ({
                      ...prev,
                      showImages: checked
                    }))} 
                  />
                </div>
                
                {localSettings.showImages && (
                  <div className="space-y-2">
                    <Label>Image display</Label>
                    <Select 
                      value={localSettings.kanbanImageDisplay || "cover"} 
                      onValueChange={value => setLocalSettings(prev => ({
                        ...prev,
                        kanbanImageDisplay: value as "cover" | "square"
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Hero Cover (full-width)</SelectItem>
                        <SelectItem value="square">Small Image (rounded corners)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {viewType === "gallery" && (
              <div className="space-y-2">
                <Label>Cards per row</Label>
                <Select 
                  value={localSettings.cardsPerRow?.toString() || "3"} 
                  onValueChange={value => setLocalSettings(prev => ({
                    ...prev,
                    cardsPerRow: parseInt(value)
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="show-labels">Show field labels</Label>
              <Switch 
                id="show-labels" 
                checked={!!localSettings.showLabels} 
                onCheckedChange={checked => setLocalSettings(prev => ({
                  ...prev,
                  showLabels: checked
                }))} 
              />
            </div>
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button onClick={handleSave} className="w-full">Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>;
}