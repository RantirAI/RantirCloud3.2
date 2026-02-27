import React, { useState } from 'react';
import { JsonMapperButton } from './JsonMapperButton';
import { AiMapperDialog } from './AiMapperDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Wand } from 'lucide-react';

// This functionality has been migrated into the DataBindingTabs component
// Keeping this file as a thin wrapper for backward compatibility

interface JsonMapperButtonToggleProps {
  nodeId: string;
  inputField: string;
  onSelectMapping: (mapping: string) => void;
}

export function JsonMapperButtonToggle({
  nodeId,
  inputField,
  onSelectMapping
}: JsonMapperButtonToggleProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  
  const handleOpenManualMapper = () => {
    setIsManualDialogOpen(true);
  };
  
  const handleOpenAiMapper = () => {
    setIsAiDialogOpen(true);
  };
  
  const handleCloseManualDialog = () => {
    setIsManualDialogOpen(false);
  };
  
  const handleCloseAiDialog = () => {
    setIsAiDialogOpen(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "manual" | "ai");
    
    if (value === "manual") {
      handleOpenManualMapper();
    } else if (value === "ai") {
      handleOpenAiMapper();
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
        <TabsList className="h-7 p-0 bg-transparent space-x-1">
          <TabsTrigger 
            value="manual" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted"
          >
            <Map className="h-3 w-3 mr-1" />
            Map
          </TabsTrigger>
          <TabsTrigger 
            value="ai" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted"
          >
            <Wand className="h-3 w-3 mr-1" />
            AI
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {isManualDialogOpen && (
        <JsonMapperButton
          nodeId={nodeId}
          inputField={inputField}
          onSelectMapping={onSelectMapping}
          useAdvancedMapper={true}
          useAiMapper={false}
          onClose={handleCloseManualDialog}
          open={isManualDialogOpen}
        />
      )}
      
      {isAiDialogOpen && (
        <AiMapperDialog
          open={isAiDialogOpen}
          onOpenChange={setIsAiDialogOpen}
          sourceNodeId=""
          targetNodeId={nodeId}
          targetInputField={inputField}
          onSaveMapping={onSelectMapping}
        />
      )}
    </>
  );
}
