
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';
import { JsonMappingDialog } from './JsonMappingDialog';
import { useFlowStore } from '@/lib/flow-store';
import { useEffect, useState } from 'react';

interface JsonMapperButtonProps {
  nodeId: string;
  inputField: string;
  onSelectMapping: (mapping: string) => void;
  useAdvancedMapper?: boolean;
  useAiMapper?: boolean;
  onClose?: () => void;
  open?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'xs';
  initialTabId?: string;
}

export function JsonMapperButton({
  nodeId,
  inputField,
  onSelectMapping,
  useAdvancedMapper = false,
  useAiMapper = false,
  onClose,
  open: controlledOpen,
  size = 'default',
  initialTabId
}: JsonMapperButtonProps) {
  const [open, setOpen] = useState(false);
  const { edges } = useFlowStore();
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (controlledOpen !== undefined) {
      setOpen(controlledOpen);
    }
  }, [controlledOpen]);

  useEffect(() => {
    // Get all nodes that connect to this node
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    if (incomingEdge) {
      setSourceNodeId(incomingEdge.source);
    } else {
      // If no direct connection, just use an empty string
      setSourceNodeId("");
    }
  }, [edges, nodeId]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  const handleSelectMapping = (mapping: string) => {
    onSelectMapping(mapping);
    handleOpenChange(false);
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          variant="outline"
          size={size}
          onClick={() => setOpen(true)}
        >
          <Map className="h-4 w-4 mr-2" />
          Map JSON
        </Button>
      )}
      
      {sourceNodeId !== null && (
        <JsonMappingDialog
          open={open}
          onOpenChange={handleOpenChange}
          sourceNodeId={sourceNodeId}
          targetNodeId={nodeId}
          targetInputField={inputField}
          onSaveMapping={handleSelectMapping}
          initialTabId={initialTabId}
        />
      )}
    </>
  );
}
