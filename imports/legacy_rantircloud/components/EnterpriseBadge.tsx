import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
interface EnterpriseBadgeProps {
  variant?: 'default' | 'outline' | 'secondary';
  showIcon?: boolean;
  className?: string;
}
export function EnterpriseBadge({
  variant = 'default',
  showIcon = true,
  className
}: EnterpriseBadgeProps) {
  return (
    <Badge variant={variant} className={className}>
      {showIcon && <Crown className="h-3 w-3 mr-1" />}
      Enterprise
    </Badge>
  );
}