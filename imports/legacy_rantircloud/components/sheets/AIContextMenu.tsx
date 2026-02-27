import { useState } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { Sparkles, Wand2, Type, Database } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface AIContextMenuProps {
  children: React.ReactNode;
  selectedCell?: { row: number; col: number };
  onGenerateFormula?: (formula: string) => void;
  onSuggestType?: (type: string) => void;
  onMapData?: (mapping: any) => void;
  columns?: any[];
  sampleData?: any[];
}

export function AIContextMenu({ 
  children, 
  selectedCell,
  onGenerateFormula,
  onSuggestType,
  onMapData,
  columns = [],
  sampleData = []
}: AIContextMenuProps) {
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);
  const [formulaPrompt, setFormulaPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFormula, setGeneratedFormula] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleGenerateFormula = async () => {
    if (!formulaPrompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-formula', {
        body: { 
          prompt: formulaPrompt,
          columns,
          sampleData
        }
      });

      if (error) throw error;

      if (data?.formula) {
        setGeneratedFormula(data.formula);
        toast.success('Formula generated successfully');
      } else {
        throw new Error('No formula returned');
      }
    } catch (error: any) {
      console.error('Formula generation error:', error);
      toast.error(error.message || 'Failed to generate formula');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestType = async () => {
    if (!selectedCell || !columns.length || !sampleData.length) {
      toast.error('Please select a cell with data');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Analyzing column data...');

    try {
      const field = columns[selectedCell.col];
      const columnData = sampleData.map(row => row[field?.id || field?.name]);

      const { data, error } = await supabase.functions.invoke('suggest-field-type', {
        body: {
          columnData,
          columnName: field?.name || field?.id
        }
      });

      if (error) throw error;

      if (data?.type) {
        onSuggestType?.(data.type);
        toast.success(`Suggested type: ${data.type}`);
      }
    } catch (error: any) {
      console.error('Type suggestion error:', error);
      toast.error(error.message || 'Failed to suggest field type');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFill = async () => {
    if (!selectedCell || !sampleData.length) {
      toast.error('Please select cells with a pattern');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Detecting pattern...');

    try {
      const field = columns[selectedCell.col];
      const columnData = sampleData
        .map(row => row[field?.id || field?.name])
        .filter(v => v !== null && v !== undefined && v !== '');

      if (columnData.length < 2) {
        toast.error('Need at least 2 values to detect a pattern');
        return;
      }

      const { data, error } = await supabase.functions.invoke('autofill-pattern', {
        body: {
          values: columnData.slice(-5), // Use last 5 values for pattern
          count: 5
        }
      });

      if (error) throw error;

      if (data?.values) {
        toast.success(`Pattern detected! Generated ${data.values.length} values`, {
          description: `Values: ${data.values.join(', ')}`
        });
      }
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      toast.error(error.message || 'Failed to detect pattern');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMapPastedData = async () => {
    if (!columns.length) {
      toast.error('No columns available for mapping');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Reading clipboard data...');

    try {
      // Read from clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText.trim()) {
        toast.error('No data found in clipboard');
        return;
      }

      // Parse clipboard data (TSV from Excel/Sheets, CSV, or JSON)
      let pastedData: any[] = [];
      
      try {
        // Try parsing as JSON first
        pastedData = JSON.parse(clipboardText);
        if (!Array.isArray(pastedData)) {
          pastedData = [pastedData];
        }
      } catch {
        // Parse as TSV/CSV
        const lines = clipboardText.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error('Clipboard contains no data');
          return;
        }

        const delimiter = clipboardText.includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim());
        
        // If only one line, treat it as data without headers
        if (lines.length === 1) {
          const values = lines[0].split(delimiter).map(v => v.trim());
          pastedData = [Object.fromEntries(values.map((v, i) => [`column${i + 1}`, v]))];
        } else {
          // Parse with headers
          pastedData = lines.slice(1).map(line => {
            const values = line.split(delimiter).map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          }).filter(row => Object.values(row).some(v => v !== ''));
        }
      }

      if (!pastedData.length) {
        console.error('Parsed data is empty. Clipboard content:', clipboardText.substring(0, 200));
        toast.error('No valid data found in clipboard. Expected JSON or CSV/TSV format.');
        return;
      }

      console.log('Parsed data:', pastedData);

      toast.info('AI mapping data to columns...');

      const { data, error } = await supabase.functions.invoke('map-pasted-data', {
        body: {
          pastedData,
          targetColumns: columns
        }
      });

      if (error) throw error;

      if (data?.mapping) {
        const mappingText = Object.entries(data.mapping)
          .map(([source, target]) => `${source} → ${target}`)
          .join('\n');
        
        toast.success('Data mapping complete', {
          description: mappingText
        });
        
        onMapData?.(data);
      }
    } catch (error: any) {
      console.error('Data mapping error:', error);
      
      if (error.message?.includes('clipboard')) {
        toast.error('Failed to read clipboard. Please ensure clipboard permissions are granted.');
      } else {
        toast.error(error.message || 'Failed to map data');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => setShowFormulaDialog(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Formula
            <Sparkles className="h-3 w-3 ml-auto text-purple-500" />
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleSuggestType} disabled={isAnalyzing}>
            <Type className="h-4 w-4 mr-2" />
            Suggest Field Type
            <Sparkles className="h-3 w-3 ml-auto text-purple-500" />
          </ContextMenuItem>

          <ContextMenuItem onClick={handleAutoFill} disabled={isAnalyzing}>
            <Database className="h-4 w-4 mr-2" />
            Auto-fill Pattern
            <Sparkles className="h-3 w-3 ml-auto text-purple-500" />
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={handleMapPastedData} disabled={isAnalyzing}>
            <Database className="h-4 w-4 mr-2" />
            Map Pasted Data
            <Sparkles className="h-3 w-3 ml-auto text-purple-500" />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={showFormulaDialog} onOpenChange={setShowFormulaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI Formula Generator
              <Sparkles className="h-4 w-4 text-purple-500" />
            </DialogTitle>
            <DialogDescription>
              Describe what you want to calculate, and AI will generate the formula for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {!generatedFormula ? (
              <>
                <Textarea
                  value={formulaPrompt}
                  onChange={(e) => setFormulaPrompt(e.target.value)}
                  placeholder="E.g., 'Sum all values in column A' or 'Calculate the average of selected cells'"
                  rows={4}
                />

                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerateFormula} 
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Formula'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowFormulaDialog(false);
                      setFormulaPrompt('');
                      setGeneratedFormula('');
                    }} 
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated Formula:</label>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm">
                    {generatedFormula}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedFormula);
                      toast.success('Formula copied to clipboard');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Copy Formula
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowFormulaDialog(false);
                      setFormulaPrompt('');
                      setGeneratedFormula('');
                    }}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
