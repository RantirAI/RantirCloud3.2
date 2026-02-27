
import React from "react";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableField } from "@/services/tableService";

interface FormPreviewProps {
  fields: TableField[];
  config: {
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
}

export function FormPreview({ fields, config }: FormPreviewProps) {
  const primaryColor = config?.primaryColor || '#9b87f5';
  const inputBorderRadius = config?.inputBorderRadius || '6';
  const buttonBorderRadius = config?.buttonBorderRadius || '6';
  const formPadding = config?.formPadding || '24';
  const fieldGap = config?.fieldGap || '24';
  const fontFamily = config?.fontFamily || 'inconsolata';
  const titleFont = config?.titleFont || 'inter';
  const descriptionFont = config?.descriptionFont || 'inter';
  const allCaps = config?.allCaps || false;
  
  // Font mapping for Tailwind classes
  const getFontClass = (font: string) => {
    const fontMap: { [key: string]: string } = {
      inconsolata: 'font-inconsolata',
      inter: 'font-inter',
      raleway: 'font-raleway',
      'open-sans': 'font-open-sans',
      roboto: 'font-roboto',
      lato: 'font-lato',
      montserrat: 'font-montserrat',
      'source-sans': 'font-source-sans',
      nunito: 'font-nunito',
      poppins: 'font-poppins',
      'work-sans': 'font-work-sans',
      'fira-sans': 'font-fira-sans',
      'dm-sans': 'font-dm-sans'
    };
    return fontMap[font] || 'font-inter';
  };
  
  const buttonStyle = {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
    borderRadius: `${buttonBorderRadius}px`
  };

  const inputStyle = {
    borderRadius: `${inputBorderRadius}px`
  };

  const containerStyle = {
    padding: `${formPadding}px`
  };

  const fieldSpacing = {
    marginBottom: `${fieldGap}px`
  };

  const isCompact = config?.style === 'compact';
  const isDark = config?.theme === 'dark';

  if (isCompact) {
    return (
      <div className={`max-w-2xl ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'} rounded-lg`} style={containerStyle}>
        <div className="flex flex-wrap gap-2 items-end">
            {fields.map((field) => (
              <div key={field.id} className="flex-shrink-0 min-w-[120px]">
                {field.type === 'text' ? (
                  <Input placeholder={field.name} className={`h-9 ${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
                ) : field.type === 'email' ? (
                  <Input type="email" placeholder={field.name} className={`h-9 ${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
                ) : field.type === 'password' ? (
                  <Input type="password" placeholder={field.name} className={`h-9 ${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
                ) : field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
                  <Select>
                    <SelectTrigger className={`h-9 ${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={inputStyle}>
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
                  <Input type={field.type} placeholder={field.name} className={`h-9 ${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
                )}
              </div>
            ))}
            
            <Button 
              className="h-9 px-6 flex-shrink-0"
              style={buttonStyle}
          >
            {config?.submitButtonText || "Submit"}
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white'} rounded-lg`} style={containerStyle}>
      {config?.title && (
        <h2 className={`text-2xl font-bold mb-2 ${getFontClass(titleFont)} ${allCaps ? 'uppercase' : ''}`} style={{ color: primaryColor }}>
          {config.title}
        </h2>
      )}
      
      {config?.description && (
        <p className={`mb-6 ${getFontClass(descriptionFont)} ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>{config.description}</p>
      )}
      
      <div className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2" style={index === fields.length - 1 ? {} : fieldSpacing}>
            <Label className={`${getFontClass(fontFamily)} ${allCaps ? 'uppercase' : ''} ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {field.description && (
              <p className={`text-sm ${getFontClass(descriptionFont)} ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{field.description}</p>
            )}
            
            {field.type === 'text' ? (
              <Input placeholder={`Enter ${field.name.toLowerCase()}`} className={`${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
            ) : field.type === 'textarea' ? (
              <Textarea placeholder={`Enter ${field.name.toLowerCase()}`} className={`${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
            ) : field.type === 'boolean' ? (
              <Checkbox />
            ) : field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
              <Select>
                <SelectTrigger className={`${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={inputStyle}>
                  <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
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
              <Input type={field.type} placeholder={`Enter ${field.name.toLowerCase()}`} className={`${getFontClass(fontFamily)} ${isDark ? 'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-600'}`} style={inputStyle} />
            )}
          </div>
        ))}
        
          <Button 
            className="w-full"
            style={buttonStyle}
        >
          {config?.submitButtonText || "Submit"}
        </Button>
      </div>
    </div>
  );
}
