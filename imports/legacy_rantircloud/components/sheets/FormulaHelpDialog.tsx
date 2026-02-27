import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FormulaHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FormulaHelpDialog({ isOpen, onClose }: FormulaHelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle>Formula Guide</DialogTitle>
          <DialogDescription>
            Learn how to use formulas in your spreadsheet
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basics" className="w-full px-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="math">Math</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="logic">Logic</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px] mt-4 pr-4">
            <TabsContent value="basics" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  To use a formula, start your cell value with an equals sign (=).
                </p>
                
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm mb-1">=2+2</div>
                    <p className="text-xs text-muted-foreground">Simple arithmetic</p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm mb-1">=A1+B1</div>
                    <p className="text-xs text-muted-foreground">Add values from cells A1 and B1</p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm mb-1">=A1*1.2</div>
                    <p className="text-xs text-muted-foreground">Multiply A1 by 1.2</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="math" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Mathematical Functions</h3>
                
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">SUM(range)</div>
                    <p className="text-xs text-muted-foreground mb-2">Add up all numbers in a range</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =SUM(A1:A10)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">AVERAGE(range)</div>
                    <p className="text-xs text-muted-foreground mb-2">Calculate the average</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =AVERAGE(B1:B20)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">MAX(range) / MIN(range)</div>
                    <p className="text-xs text-muted-foreground mb-2">Find maximum or minimum value</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =MAX(C1:C10)<br />
                      =MIN(C1:C10)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">ROUND(number, decimals)</div>
                    <p className="text-xs text-muted-foreground mb-2">Round to specified decimal places</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =ROUND(A1, 2)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">ABS(number)</div>
                    <p className="text-xs text-muted-foreground mb-2">Get absolute value</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =ABS(A1)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">SQRT(number)</div>
                    <p className="text-xs text-muted-foreground mb-2">Calculate square root</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =SQRT(A1)
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">COUNT(range)</div>
                    <p className="text-xs text-muted-foreground mb-2">Count numbers in range</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =COUNT(A1:A100)
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Text Functions</h3>
                
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">CONCATENATE(text1, text2, ...)</div>
                    <p className="text-xs text-muted-foreground mb-2">Join text strings together</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =CONCATENATE(A1, " ", B1)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">UPPER(text) / LOWER(text)</div>
                    <p className="text-xs text-muted-foreground mb-2">Convert text to uppercase or lowercase</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =UPPER(A1)<br />
                      =LOWER(A1)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">LEN(text)</div>
                    <p className="text-xs text-muted-foreground mb-2">Get the length of text</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =LEN(A1)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">LEFT(text, num) / RIGHT(text, num)</div>
                    <p className="text-xs text-muted-foreground mb-2">Extract characters from left or right</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =LEFT(A1, 5)<br />
                      =RIGHT(A1, 3)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">TRIM(text)</div>
                    <p className="text-xs text-muted-foreground mb-2">Remove extra spaces</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =TRIM(A1)
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="logic" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Logical Functions</h3>
                
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">IF(condition, value_if_true, value_if_false)</div>
                    <p className="text-xs text-muted-foreground mb-2">Return different values based on condition</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =IF(A1{'>'}10, "High", "Low")
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">AND(condition1, condition2, ...)</div>
                    <p className="text-xs text-muted-foreground mb-2">Check if all conditions are true</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =AND(A1{'>'}5, B1{'<'}10)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">OR(condition1, condition2, ...)</div>
                    <p className="text-xs text-muted-foreground mb-2">Check if any condition is true</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =OR(A1{'>'}100, B1="active")
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">NOT(condition)</div>
                    <p className="text-xs text-muted-foreground mb-2">Reverse a logical value</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =NOT(A1{'>'}10)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="font-mono text-sm font-semibold mb-1">ISBLANK(cell)</div>
                    <p className="text-xs text-muted-foreground mb-2">Check if a cell is empty</p>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      =IF(ISBLANK(A1), "Empty", "Has value")
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="mt-4 p-3 bg-muted rounded-lg mx-1">
          <p className="text-sm font-medium mb-1">💡 Tips:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>All formulas must start with = (equals sign)</li>
            <li>Cell references are case-insensitive (A1 = a1)</li>
            <li>Use : for ranges (A1:A10) and , for multiple arguments</li>
            <li>Formulas calculate automatically as you type</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
