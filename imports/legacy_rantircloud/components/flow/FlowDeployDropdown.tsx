import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle2, Clock, XCircle, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FlowDeployDropdownProps {
  flowProjectId: string;
  flowName: string;
  onOpenSidebar?: () => void;
  hasAiAgentNodes?: boolean;
}

export function FlowDeployDropdown({ 
  flowProjectId, 
  flowName,
  onOpenSidebar,
  hasAiAgentNodes,
}: FlowDeployDropdownProps) {
  const { data: deploymentData, isLoading } = useQuery({
    queryKey: ['flow-deployment-status', flowProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flow_projects')
        .select('is_deployed, deployment_status, deployed_version')
        .eq('id', flowProjectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusBadge = () => {
    if (isLoading) {
      return <Loader2 className="w-3 h-3 animate-spin" />;
    }
    
    if (!deploymentData) return null;
    
    switch (deploymentData.deployment_status) {
      case 'deployed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px] h-5 gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            v{deploymentData.deployed_version}
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="text-[10px] h-5 gap-1">
            <Clock className="w-2.5 h-2.5" />
            Draft
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-[10px] h-5 gap-1">
            <XCircle className="w-2.5 h-2.5" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Button 
      variant="ghost"
      size="sm"
      onClick={onOpenSidebar}
      className="h-8 px-3 text-xs font-medium gap-1.5"
    >
      <Rocket className="h-3.5 w-3.5" />
      <span>Deploy</span>
      {getStatusBadge()}
      {hasAiAgentNodes && (
        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-[10px] h-5 gap-1">
          <MessageCircle className="w-2.5 h-2.5" />
          Chat Embed
        </Badge>
      )}
    </Button>
  );
}
