import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DomainStatus = 'pending' | 'verified' | 'active' | 'failed' | 'provisioning';

interface DomainStatusBadgeProps {
  status: DomainStatus;
  sslStatus?: 'pending' | 'provisioning' | 'active' | 'failed';
  className?: string;
}

const statusConfig: Record<DomainStatus, { 
  label: string; 
  icon: React.ReactNode; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    variant: 'warning',
  },
  verified: {
    label: 'DNS Verified',
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: 'info',
  },
  provisioning: {
    label: 'SSL Provisioning',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    variant: 'info',
  },
  active: {
    label: 'Active',
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: 'success',
  },
  failed: {
    label: 'Failed',
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'destructive',
  },
};

export function DomainStatusBadge({ status, sslStatus, className }: DomainStatusBadgeProps) {
  // Determine the effective status based on both verification and SSL status
  let effectiveStatus = status;
  if (status === 'verified' && sslStatus === 'provisioning') {
    effectiveStatus = 'provisioning';
  } else if (status === 'verified' && sslStatus === 'active') {
    effectiveStatus = 'active';
  } else if (sslStatus === 'failed') {
    effectiveStatus = 'failed';
  }

  const config = statusConfig[effectiveStatus];

  return (
    <Badge 
      variant={config.variant}
      className={cn('gap-1 text-[10px] font-medium', className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
