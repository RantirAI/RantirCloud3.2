import { HyperFormula } from 'hyperformula';

let hyperFormulaInstance: HyperFormula | null = null;

export function initializeFormulaEngine() {
  if (hyperFormulaInstance) {
    return hyperFormulaInstance;
  }

  hyperFormulaInstance = HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3',
    useArrayArithmetic: true,
    useColumnIndex: true,
  });

  return hyperFormulaInstance;
}

export function getFormulaEngine(): HyperFormula {
  if (!hyperFormulaInstance) {
    return initializeFormulaEngine();
  }
  return hyperFormulaInstance;
}

export function evaluateFormula(formula: string, context?: any): any {
  try {
    const engine = getFormulaEngine();
    let sheetId: number;
    
    const existingSheetId = engine.getSheetId('Sheet1');
    if (existingSheetId !== null && existingSheetId !== undefined) {
      sheetId = typeof existingSheetId === 'number' ? existingSheetId : 0;
    } else {
      const newSheetId = engine.addSheet('Sheet1');
      sheetId = typeof newSheetId === 'number' ? newSheetId : 0;
    }
    
    // Parse and evaluate formula
    const address = { sheet: sheetId, col: 0, row: 0 };
    engine.setCellContents(address, [[formula]]);
    
    const result = engine.getCellValue(address);
    return result;
  } catch (error: any) {
    console.error('Formula evaluation error:', error);
    return { error: error.message };
  }
}

export function parseFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const engine = getFormulaEngine();
    let sheetId: number;
    
    const existingSheetId = engine.getSheetId('Sheet1');
    if (existingSheetId !== null && existingSheetId !== undefined) {
      sheetId = typeof existingSheetId === 'number' ? existingSheetId : 0;
    } else {
      const newSheetId = engine.addSheet('Sheet1');
      sheetId = typeof newSheetId === 'number' ? newSheetId : 0;
    }
    
    const address = { sheet: sheetId, col: 0, row: 0 };
    engine.setCellContents(address, [[formula]]);
    
    const result = engine.getCellValue(address);
    
    if (result && typeof result === 'object' && 'error' in result) {
      return { valid: false, error: String(result.error) };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

export function destroyFormulaEngine() {
  if (hyperFormulaInstance) {
    hyperFormulaInstance.destroy();
    hyperFormulaInstance = null;
  }
}
