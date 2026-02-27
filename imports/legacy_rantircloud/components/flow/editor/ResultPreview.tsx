
import React from 'react';
import { Card } from '@/components/ui/card';

interface ResultPreviewProps {
  error: string | null;
  result: any;
}

export function ResultPreview({ error, result }: ResultPreviewProps) {
  if (error) {
    return (
      <Card className="p-3 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs rounded-md">
        <p className="font-medium">Error:</p>
        <pre className="whitespace-pre-wrap mt-1 overflow-auto max-h-[200px] p-2 bg-red-100/50 dark:bg-red-900/30 rounded">{error}</pre>
      </Card>
    );
  }
  
  if (result !== null && result !== undefined) {
    if (typeof result === 'object') {
      try {
        const stringified = JSON.stringify(result, null, 2);
        
        return (
          <div className="mb-4">
            <div className="text-xs font-medium mb-1 text-muted-foreground flex justify-between items-center">
              <span>Result:</span>
              <span className="text-muted-foreground/70">{typeof result === 'object' ? (Array.isArray(result) ? 'Array' : 'Object') : typeof result}</span>
            </div>
            <Card className="p-3 bg-muted/30 border-border rounded-md">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto text-foreground">
                {stringified}
              </pre>
            </Card>
          </div>
        );
      } catch (err) {
        return (
          <Card className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-md">
            <p className="font-medium">Warning:</p>
            <p>Object cannot be stringified (may contain circular references)</p>
          </Card>
        );
      }
    } else {
      return (
        <div className="mb-4">
          <div className="text-xs font-medium mb-1 text-muted-foreground flex justify-between items-center">
            <span>Result:</span>
            <span className="text-muted-foreground/70">{typeof result}</span>
          </div>
          <Card className="p-3 bg-muted/30 border-border rounded-md">
            <div className="text-sm font-mono text-foreground">{String(result)}</div>
          </Card>
        </div>
      );
    }
  }
  
  return (
    <div className="text-sm text-muted-foreground text-center p-4 bg-muted/30 rounded-md border border-dashed border-border">
      No result to display. Run the code to see output.
    </div>
  );
}
