import React, { useState } from "react";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Share2, Palette } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { TableField } from "@/services/tableService";
import { FormPreview } from "@/components/FormPreview";
import { FormBuilderSidebar } from "@/components/FormBuilderSidebar";
import { FormShareDialog } from "@/components/FormShareDialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormBuilderProps {
  tableSchema: {
    name: string;
    fields: TableField[];
  };
  tableId: string;
  formConfig?: {
    title?: string;
    description?: string;
    primaryColor?: string;
    submitButtonText?: string;
    style?: string;
    theme?: string;
    redirectUrl?: string;
    inputBorderRadius?: string;
    buttonBorderRadius?: string;
    formPadding?: string;
    fieldGap?: string;
    fontFamily?: string;
    titleFont?: string;
    descriptionFont?: string;
    allCaps?: boolean;
  };
  onSaveFormConfig: (config: any) => Promise<void>;
}

export function FormBuilder({ tableSchema, tableId, formConfig, onSaveFormConfig }: FormBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [displayedFields, setDisplayedFields] = useState<TableField[]>(
    tableSchema.fields.filter(field => !field.hideInForm)
  );
  const [hiddenFields, setHiddenFields] = useState<TableField[]>(
    tableSchema.fields.filter(field => field.hideInForm)
  );
  const [config, setConfig] = useState({
    title: formConfig?.title || tableSchema.name,
    description: formConfig?.description || "",
    primaryColor: formConfig?.primaryColor || "#9b87f5",
    submitButtonText: formConfig?.submitButtonText || "Submit",
    style: formConfig?.style || "default",
    theme: formConfig?.theme || "light",
    redirectUrl: formConfig?.redirectUrl || "",
    inputBorderRadius: formConfig?.inputBorderRadius || "6",
    buttonBorderRadius: formConfig?.buttonBorderRadius || "6",
    formPadding: formConfig?.formPadding || "24",
    fieldGap: formConfig?.fieldGap || "24",
    fontFamily: formConfig?.fontFamily || "inconsolata",
    titleFont: formConfig?.titleFont || "inter",
    descriptionFont: formConfig?.descriptionFont || "inter",
    allCaps: formConfig?.allCaps || false
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id !== over.id) {
      setDisplayedFields(fields => {
        const oldIndex = fields.findIndex(field => field.id === active.id);
        const newIndex = fields.findIndex(field => field.id === over.id);
        return arrayMove(fields, oldIndex, newIndex);
      });
    }
  };

  const toggleFieldVisibility = (fieldId: string) => {
    const fieldToMove = displayedFields.find(f => f.id === fieldId);

    if (fieldToMove) {
      setDisplayedFields(displayedFields.filter(f => f.id !== fieldId));
      setHiddenFields([...hiddenFields, {...fieldToMove, hideInForm: true}]);
    } else {
      const field = hiddenFields.find(f => f.id === fieldId);
      if (field) {
        setHiddenFields(hiddenFields.filter(f => f.id !== fieldId));
        setDisplayedFields([...displayedFields, {...field, hideInForm: false}]);
      }
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<TableField>) => {
    setDisplayedFields(fields =>
      fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const saveForm = async () => {
    try {
      const updatedFields = [
        ...displayedFields.map(field => ({...field, hideInForm: false})),
        ...hiddenFields.map(field => ({...field, hideInForm: true}))
      ];

      await onSaveFormConfig({
        ...config,
        fields: updatedFields
      });

      toast.success("Form configuration saved successfully!");
    } catch (error) {
      toast.error("Failed to save form configuration");
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-0 w-full min-h-[80vh]">
      {/* Center Live Preview, builder background */}
      <div className="flex-1 flex justify-center items-start py-10 bg-muted/30">
        <div className="w-full max-w-2xl">
          <Card className="rounded-xl shadow-lg border-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="bg-card rounded-xl">
              <div className="p-6 md:p-8 border rounded-lg bg-background min-h-[60vh] shadow transition-all">
                <FormPreview
                  fields={displayedFields}
                  config={config}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sidebar on the right with form options */}
      <aside className="w-full md:w-[350px] xl:w-[400px] flex-shrink-0 shadow-none border-l bg-background/95 z-20 px-1 py-2 h-auto md:min-h-[80vh] flex flex-col">
        <Card className="shadow-none border-0 bg-transparent flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Form Fields</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="px-2 py-1 h-7 text-xs"
                  onClick={saveForm}
                >
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 min-h-[720px]">
            <CardContent className="space-y-4 pr-4 min-h-[720px] max-h-[720px] overflow-y-auto">
              <div>
                <Label htmlFor="formTitle">Form Title</Label>
                <Input
                  id="formTitle"
                  value={config.title}
                  onChange={(e) => setConfig({...config, title: e.target.value})}
                  placeholder="Enter form title"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="formDescription">Form Description</Label>
                <Textarea
                  id="formDescription"
                  value={config.description}
                  onChange={(e) => setConfig({...config, description: e.target.value})}
                  placeholder="Enter form description"
                  className="text-sm min-h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="formStyle">Form Style</Label>
                  <Select
                    value={config.style}
                    onValueChange={(value) => setConfig({...config, style: value})}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Vertical)</SelectItem>
                      <SelectItem value="compact">Compact (Horizontal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="formTheme">Theme</Label>
                  <Select
                    value={config.theme}
                    onValueChange={(value) => setConfig({...config, theme: value})}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="primaryColor" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Primary Color
                  </Label>
                  <div className="flex gap-2 items-center mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                      className="w-10 h-7 p-0 border"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="submitText">Submit Text</Label>
                  <Input
                    id="submitText"
                    value={config.submitButtonText}
                    onChange={(e) => setConfig({...config, submitButtonText: e.target.value})}
                    placeholder="Submit"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
                <Input
                  id="redirectUrl"
                  value={config.redirectUrl}
                  onChange={(e) => setConfig({...config, redirectUrl: e.target.value})}
                  placeholder="https://your-site.com/thank-you"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="inputRadius">Input Border Radius</Label>
                  <div className="flex gap-1 items-center">
                    <Input
                      id="inputRadius"
                      type="number"
                      value={config.inputBorderRadius}
                      onChange={(e) => setConfig({...config, inputBorderRadius: e.target.value})}
                      placeholder="6"
                      className="text-xs"
                      min="0"
                      max="50"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="buttonRadius">Button Border Radius</Label>
                  <div className="flex gap-1 items-center">
                    <Input
                      id="buttonRadius"
                      type="number"
                      value={config.buttonBorderRadius}
                      onChange={(e) => setConfig({...config, buttonBorderRadius: e.target.value})}
                      placeholder="6"
                      className="text-xs"
                      min="0"
                      max="50"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="formPadding">Form Padding</Label>
                  <div className="flex gap-1 items-center">
                    <Input
                      id="formPadding"
                      type="number"
                      value={config.formPadding}
                      onChange={(e) => setConfig({...config, formPadding: e.target.value})}
                      placeholder="24"
                      className="text-xs"
                      min="8"
                      max="80"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="fieldGap">Field Spacing</Label>
                  <div className="flex gap-1 items-center">
                    <Input
                      id="fieldGap"
                      type="number"
                      value={config.fieldGap}
                      onChange={(e) => setConfig({...config, fieldGap: e.target.value})}
                      placeholder="24"
                      className="text-xs"
                      min="8"
                      max="60"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="fontFamily">Label Font</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) => setConfig({...config, fontFamily: value})}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inconsolata">Inconsolata</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="raleway">Raleway</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="lato">Lato</SelectItem>
                    <SelectItem value="montserrat">Montserrat</SelectItem>
                    <SelectItem value="source-sans">Source Sans Pro</SelectItem>
                    <SelectItem value="nunito">Nunito</SelectItem>
                    <SelectItem value="poppins">Poppins</SelectItem>
                    <SelectItem value="work-sans">Work Sans</SelectItem>
                    <SelectItem value="fira-sans">Fira Sans</SelectItem>
                    <SelectItem value="dm-sans">DM Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="titleFont">Title Font</Label>
                  <Select
                    value={config.titleFont}
                    onValueChange={(value) => setConfig({...config, titleFont: value})}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inconsolata">Inconsolata</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="raleway">Raleway</SelectItem>
                      <SelectItem value="open-sans">Open Sans</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="lato">Lato</SelectItem>
                      <SelectItem value="montserrat">Montserrat</SelectItem>
                      <SelectItem value="source-sans">Source Sans Pro</SelectItem>
                      <SelectItem value="nunito">Nunito</SelectItem>
                      <SelectItem value="poppins">Poppins</SelectItem>
                      <SelectItem value="work-sans">Work Sans</SelectItem>
                      <SelectItem value="fira-sans">Fira Sans</SelectItem>
                      <SelectItem value="dm-sans">DM Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="descriptionFont">Description Font</Label>
                  <Select
                    value={config.descriptionFont}
                    onValueChange={(value) => setConfig({...config, descriptionFont: value})}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inconsolata">Inconsolata</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="raleway">Raleway</SelectItem>
                      <SelectItem value="open-sans">Open Sans</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="lato">Lato</SelectItem>
                      <SelectItem value="montserrat">Montserrat</SelectItem>
                      <SelectItem value="source-sans">Source Sans Pro</SelectItem>
                      <SelectItem value="nunito">Nunito</SelectItem>
                      <SelectItem value="poppins">Poppins</SelectItem>
                      <SelectItem value="work-sans">Work Sans</SelectItem>
                      <SelectItem value="fira-sans">Fira Sans</SelectItem>
                      <SelectItem value="dm-sans">DM Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allCaps"
                  checked={config.allCaps}
                  onChange={(e) => setConfig({...config, allCaps: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="allCaps" className="text-xs cursor-pointer">
                  All Caps Labels
                </Label>
              </div>

              {/* Visible Fields */}
              <div>
                <h3 className="text-base font-medium mb-1 mt-2">Visible Fields</h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={displayedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {displayedFields.length > 0 ? (
                        displayedFields.map((field) => (
                          <FormField
                            key={field.id}
                            field={field}
                            isActive={activeId === field.id}
                            onToggleVisibility={() => toggleFieldVisibility(field.id)}
                            onUpdateField={(updates) => handleUpdateField(field.id, updates)}
                            visible
                          />
                        ))
                      ) : (
                        <div className="p-2 bg-muted rounded-md text-center text-xs">
                          No visible fields
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              
              {/* Hidden Fields */}
              <div className="pb-4">
                <h3 className="text-base font-medium mb-1 mt-4">Hidden Fields</h3>
                {hiddenFields.length > 0 ? (
                  <div className="space-y-1">
                    {hiddenFields.map((field) => (
                      <FormField
                        key={field.id}
                        field={field}
                        isActive={false}
                        onToggleVisibility={() => toggleFieldVisibility(field.id)}
                        onUpdateField={() => {}}
                        visible={false}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">None</span>
                )}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
        <FormBuilderSidebar />
      </aside>

      <FormShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        tableId={tableId}
        config={config}
      />
    </div>
  );
}
