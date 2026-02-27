import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Code, 
  GitBranch, 
  Zap,
  Database,
  Mail,
  Calendar,
  FileText,
  Image,
  MessageSquare,
  Settings,
  Globe,
  Webhook,
  LucideIcon
} from 'lucide-react';

interface FlowNodeCardProps {
  nodeName: string;
  nodeType: string;
  category?: 'trigger' | 'action' | 'condition' | 'transformer';
  description?: string;
  onClick?: () => void;
}

export function FlowNodeCard({ nodeName, nodeType, category, description, onClick }: FlowNodeCardProps) {
  const getNodeIcon = (type: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
      'api-request': Globe,
      'webhook': Webhook,
      'data-filter': Database,
      'condition': GitBranch,
      'trigger': Zap,
      'email': Mail,
      'resend': Mail,
      'calendar': Calendar,
      'document': FileText,
      'image': Image,
      'chat': MessageSquare,
      'code': Code,
      'transform': Settings,
      'start': Play,
    };
    
    const iconKey = type.toLowerCase().replace(/\s+/g, '-');
    return icons[iconKey] || Code;
  };

  const getCategoryColor = (cat?: string) => {
    const colors: Record<string, string> = {
      trigger: 'from-blue-500/20 to-sky-500/20 border-blue-300 dark:border-blue-700',
      action: 'from-purple-500/20 to-violet-500/20 border-purple-300 dark:border-purple-700',
      condition: 'from-orange-500/20 to-amber-500/20 border-orange-300 dark:border-orange-700',
      transformer: 'from-green-500/20 to-emerald-500/20 border-green-300 dark:border-green-700',
    };
    return colors[cat || 'action'] || colors.action;
  };

  const getIconColor = (cat?: string) => {
    const colors: Record<string, string> = {
      trigger: 'from-blue-500 to-sky-500',
      action: 'from-purple-500 to-violet-500',
      condition: 'from-orange-500 to-amber-500',
      transformer: 'from-green-500 to-emerald-500',
    };
    return colors[cat || 'action'] || colors.action;
  };

  const Icon = getNodeIcon(nodeType);

  return (
    <Card 
      className={`
        min-h-[80px] p-3 transition-all duration-200 border-2 
        bg-gradient-to-br ${getCategoryColor(category)}
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center shrink-0
          bg-gradient-to-br ${getIconColor(category)}
        `}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate text-foreground">
            {nodeName}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {category || 'action'}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
