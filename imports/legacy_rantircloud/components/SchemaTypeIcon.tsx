
import React from "react";
import {
  Database,
  Text,
  CalendarDays,
  ToggleLeft,
  List,
  CheckSquare,
  Layers,
  Image,
  FileText,
  Code,
  MessageSquare,
  Link,
  Link2 as LinkPlus,
  Braces,
  Mail,
  Lock,
} from "lucide-react";

interface SchemaTypeIconProps {
  type: string;
  size?: number;
  className?: string;
}

export function SchemaTypeIcon({ type, size = 16, className = "" }: SchemaTypeIconProps) {
  const getIconByType = () => {
    switch (type) {
      case "text":
        return <Text size={size} className={className} />;
      case "number":
        return <Database size={size} className={className} />;
      case "date":
        return <CalendarDays size={size} className={className} />;
      case "timestamp":
        return <CalendarDays size={size} className={className} />;
      case "boolean":
        return <ToggleLeft size={size} className={className} />;
      case "select":
        return <List size={size} className={className} />;
      case "multiselect":
        return <CheckSquare size={size} className={className} />;
      case "reference":
        return <Link size={size} className={className} />;
      case "multireference":
        return <LinkPlus size={size} className={className} />;
      case "image":
        return <Image size={size} className={className} />;
      case "pdf":
        return <FileText size={size} className={className} />;
      case "codescript":
        return <Code size={size} className={className} />;
      case "textarea":
        return <MessageSquare size={size} className={className} />;
      case "json":
        return <Braces size={size} className={className} />;
      case "email":
        return <Mail size={size} className={className} />;
      case "password":
        return <Lock size={size} className={className} />;
      default:
        return <Database size={size} className={className} />;
    }
  };

  return getIconByType();
}
