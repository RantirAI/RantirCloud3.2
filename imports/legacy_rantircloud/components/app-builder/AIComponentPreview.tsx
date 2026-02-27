import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Code, Copy, Download, Sparkles, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentRenderer } from './ComponentRenderer';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface AIComponentPreviewProps {
  component: any;
  onAccept: (component: any) => void;
  onReject: () => void;
  onRegenerate: (feedback: string) => void;
  rawResponse?: string;
}

export function AIComponentPreview({ 
  component, 
  onAccept, 
  onReject, 
  onRegenerate,
  rawResponse 
}: AIComponentPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const { addComponent } = useAppBuilderStore();

  const handleAccept = () => {
    addComponent(component);
    onAccept(component);
  };

  const handleRegenerate = () => {
    if (feedback.trim()) {
      onRegenerate(feedback);
      setFeedback('');
      setShowFeedback(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(component, null, 2));
  };

  return (
    <Card className="w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Generated Component</h3>
              <p className="text-xs text-gray-500">{component.type || 'Unknown'}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            New
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-fit m-0 h-10 bg-gray-50 rounded-none">
          <TabsTrigger value="preview" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            Code
          </TabsTrigger>
          <TabsTrigger value="props" className="text-xs">
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="p-4 mt-0">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 min-h-[200px] border border-gray-200">
            <div className="bg-white rounded-lg p-4 shadow-sm min-h-[160px] overflow-auto">
              <ComponentRenderer 
                component={component} 
                isPreview={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="code" className="p-4 mt-0">
          <div className="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-auto max-h-[200px]">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(component, null, 2)}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="props" className="p-4 mt-0">
          <div className="space-y-3 max-h-[200px] overflow-auto">
            {Object.entries(component.props || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs font-medium text-gray-700">{key}</span>
                <span className="text-xs text-gray-500 truncate ml-2 max-w-[120px]">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t border-gray-100 space-y-3">
        {showFeedback && (
          <div className="space-y-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What would you like to change about this component?"
              className="w-full p-2 text-xs border border-gray-200 rounded-lg resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleRegenerate}
                className="flex-1 text-xs h-7"
                disabled={!feedback.trim()}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowFeedback(false)}
                className="text-xs h-7"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={copyToClipboard}
            className="flex-1 text-xs h-8"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex-1 text-xs h-8"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Modify
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onReject}
            className="flex-1 text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
          <Button 
            size="sm" 
            onClick={handleAccept}
            className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Accept & Add
          </Button>
        </div>
      </div>
    </Card>
  );
}