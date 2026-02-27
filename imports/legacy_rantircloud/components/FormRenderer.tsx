
import React from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader } from "./FileUploader";
import { toast } from "@/components/ui/sonner";


interface FormRendererProps {
  tableSchema: {
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      options?: { values: string[] };
      required?: boolean;
      description?: string;
      hideInForm?: boolean;
    }>;
  };
  formConfig?: {
    title?: string;
    description?: string;
    primaryColor?: string;
    submitButtonText?: string;
    style?: 'default' | 'compact';
    theme?: 'light' | 'dark';
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
  onSubmit: (values: any) => void;
}

export function FormRenderer({ tableSchema, formConfig, onSubmit }: FormRendererProps) {
  const form = useForm({
    defaultValues: tableSchema.fields.reduce((acc, field) => {
      acc[field.id] = '';
      return acc;
    }, {} as Record<string, any>)
  });
  
  const primaryColor = formConfig?.primaryColor || '#9b87f5';

  const handleFormSubmit = async (values: any) => {
    // Validate email fields first
    for (const field of tableSchema.fields) {
      if (field.type === 'email' && values[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values[field.id])) {
          toast.error(`Please enter a valid email address for ${field.name}`);
          return;
        }
      }
    }
    
    // Send plaintext passwords - hashing is done server-side in the edge function
    const processedValues = { ...values };
    
    onSubmit(processedValues);
    
    // Handle redirect after form submission
    if (formConfig?.redirectUrl) {
      setTimeout(() => {
        window.location.href = formConfig.redirectUrl!;
      }, 1000); // Small delay to show success message
    }
  };
  
  const isCompact = formConfig?.style === 'compact';
  const isDark = formConfig?.theme === 'dark';

  if (isCompact) {
    const fontClass = formConfig?.fontFamily === 'inter' ? 'font-sans' : 
                      formConfig?.fontFamily === 'inconsolata' ? 'font-mono' : 
                      formConfig?.fontFamily === 'playfair' ? 'font-serif' : 'font-sans';
    
    const inputStyle = {
      borderRadius: `${formConfig?.inputBorderRadius || '6'}px`,
      fontFamily: formConfig?.fontFamily === 'inconsolata' ? 'Inconsolata, monospace' :
                  formConfig?.fontFamily === 'playfair' ? 'Playfair Display, serif' :
                  'Inter, sans-serif'
    };

    const buttonStyle = {
      backgroundColor: formConfig?.primaryColor || '#9b87f5',
      borderColor: formConfig?.primaryColor || '#9b87f5',
      borderWidth: '1px',
      borderRadius: `${formConfig?.buttonBorderRadius || '6'}px`,
      fontFamily: formConfig?.fontFamily === 'inconsolata' ? 'Inconsolata, monospace' :
                  formConfig?.fontFamily === 'playfair' ? 'Playfair Display, serif' :
                  'Inter, sans-serif'
    };

    const gapClass = formConfig?.fieldGap === '12' ? 'gap-3' :
                     formConfig?.fieldGap === '16' ? 'gap-4' :
                     formConfig?.fieldGap === '24' ? 'gap-6' : 'gap-2';

    return (
      <div 
        className={`max-w-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-900'} rounded-lg ${fontClass}`}
        style={{ 
          padding: `${formConfig?.formPadding || '16'}px`,
          fontFamily: formConfig?.fontFamily === 'inconsolata' ? 'Inconsolata, monospace' :
                      formConfig?.fontFamily === 'playfair' ? 'Playfair Display, serif' :
                      'Inter, sans-serif'
        }}
      >
        {/* Hide title in compact style for now - will add horizontal layout later */}
        {false && formConfig?.title && (
          <h2 
            className={`text-2xl font-bold mb-4 ${formConfig?.allCaps ? 'uppercase' : ''}`}
            style={{ 
              color: formConfig?.primaryColor || '#9b87f5',
              fontFamily: formConfig?.titleFont === 'inconsolata' ? 'Inconsolata, monospace' :
                          formConfig?.titleFont === 'playfair' ? 'Playfair Display, serif' :
                          'Inter, sans-serif'
            }}
          >
            {formConfig.title}
          </h2>
        )}
        
        {formConfig?.description && (
          <p 
            className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
            style={{
              fontFamily: formConfig?.descriptionFont === 'inconsolata' ? 'Inconsolata, monospace' :
                          formConfig?.descriptionFont === 'playfair' ? 'Playfair Display, serif' :
                          'Inter, sans-serif'
            }}
          >
            {formConfig.description}
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className={`flex flex-wrap ${gapClass} items-end`}>
            {tableSchema.fields.filter(field => !field.hideInForm && field.name !== 'id').map((field) => (
              <FormField
                key={field.id}
                control={form.control}
                name={field.id}
                rules={{ required: field.required }}
                render={({ field: formField }) => (
                  <FormItem className="flex-shrink-0 min-w-[120px] flex-grow-0">
                    <FormControl>
                      {field.type === 'text' ? (
                        <Input {...formField} placeholder={field.name} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} style={inputStyle} />
                      ) : field.type === 'email' ? (
                        <Input {...formField} type="email" placeholder={field.name} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} style={inputStyle} />
                      ) : field.type === 'password' ? (
                        <Input {...formField} type="password" placeholder={field.name} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} style={inputStyle} />
                      ) : field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
                        <Select
                          value={formField.value}
                          onValueChange={formField.onChange}
                        >
                          <SelectTrigger className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} style={inputStyle}>
                            <SelectValue placeholder={field.name} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option: string, index: number) => (
                              <SelectItem key={`${option}-${index}`} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input {...formField} type={field.type} placeholder={field.name} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} style={inputStyle} />
                      )}
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            
            <Button 
              type="submit" 
              className="h-9 px-6 flex-shrink-0"
              style={buttonStyle}
            >
              {formConfig?.submitButtonText || "Submit"}
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className={isDark ? 'bg-gray-900 text-white p-6 rounded-lg' : ''}>
      {formConfig?.title && (
        <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
          {formConfig.title}
        </h2>
      )}
      
      {formConfig?.description && (
        <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formConfig.description}</p>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {tableSchema.fields.filter(field => !field.hideInForm && field.name !== 'id').map((field) => (
            <FormField
              key={field.id}
              control={form.control}
              name={field.id}
              rules={{ required: field.required }}
              render={({ field: formField }) => (
                <FormItem>
                    <FormLabel className={isDark ? 'text-gray-200' : ''}>
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                     {field.type === 'text' ? (
                       <Input {...formField} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} />
                     ) : field.type === 'textarea' ? (
                      <Textarea {...formField} className={isDark ? 'bg-gray-800 border-gray-600 text-white' : ''} />
                    ) : field.type === 'boolean' ? (
                      <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                    ) : field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
                      <Select
                        value={formField.value}
                        onValueChange={formField.onChange}
                      >
                        <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option: string, index: number) => (
                            <SelectItem key={`${option}-${index}`} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'image' ? (
                      <FileUploader
                        type="image"
                        value={formField.value}
                        onChange={formField.onChange}
                      />
                    ) : field.type === 'pdf' ? (
                      <FileUploader
                        type="pdf"
                        value={formField.value}
                        onChange={formField.onChange}
                      />
                    ) : field.type === 'codescript' ? (
                      <Input {...formField} className={`font-mono ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} />
                    ) : field.type === 'json' ? (
                        <Textarea 
                          {...formField} 
                          placeholder="Enter valid JSON..."
                          className={`font-mono text-sm ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
                          rows={4}
                        />
                     ) : field.type === 'email' ? (
                       <Input {...formField} type="email" placeholder="Enter email address" className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} />
                     ) : field.type === 'password' ? (
                       <Input {...formField} type="password" placeholder="Enter password" className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} />
                     ) : field.name === 'selectedPlan' ? (
                         <div className={`p-3 rounded-md text-sm ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-muted'}`}>
                           System field - Selected subscription plan will be automatically populated
                         </div>
                     ) : (
                       <Input {...formField} type={field.type} className={`h-9 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`} />
                     )}
                  </FormControl>
                    {field.description && (
                      <FormDescription className={isDark ? 'text-gray-400' : ''}>
                        {field.description}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />
          ))}
          
          <Button 
            type="submit" 
            className="w-full h-9"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderWidth: '1px',
              borderRadius: `${formConfig?.buttonBorderRadius || '6'}px`
            }}
          >
            {formConfig?.submitButtonText || "Submit"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
