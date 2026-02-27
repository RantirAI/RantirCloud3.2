import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Circle, Database, BarChart3, Settings, Eye, AlertCircle, Filter, Sparkles } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AdvancedChartRenderer } from './AdvancedChartRenderer';
import { DatabaseBindingField } from './properties/DatabaseBindingField';
import { ChartFieldSelector } from './charts/ChartFieldSelector';
import { ChartFilterBuilder, ChartFilterGroup } from './charts/ChartFilterBuilder';

interface ChartSetupWizardProps {
  component: any;
  onComplete?: () => void;
}

// Default dummy field names
const DUMMY_FIELDS = {
  xField: 'month',
  yField: 'sales',
  y2Field: 'revenue'
};

// Dummy data size options
type DummyDataSize = 'small' | 'medium' | 'large';

const DUMMY_SIZE_CONFIG: Record<DummyDataSize, { label: string; count: number }> = {
  small: { label: 'Small (5 records)', count: 5 },
  medium: { label: 'Medium (12 records)', count: 12 },
  large: { label: 'Large (50 records)', count: 50 }
};

// Generate dummy data based on chart type and size
const generateDummyData = (chartType: string, size: DummyDataSize = 'medium') => {
  const count = DUMMY_SIZE_CONFIG[size].count;
  
  if (chartType === 'pie' || chartType === 'donut') {
    const categories = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Product F', 'Product G', 'Other'];
    return categories.slice(0, Math.min(count, 8)).map((name) => ({
      [DUMMY_FIELDS.xField]: name,
      [DUMMY_FIELDS.yField]: Math.floor(Math.random() * 40) + 10,
    }));
  }

  if (chartType === 'scatter') {
    return Array.from({ length: count }, (_, i) => ({
      [DUMMY_FIELDS.xField]: Math.floor(Math.random() * 100),
      [DUMMY_FIELDS.yField]: Math.floor(Math.random() * 100),
    }));
  }

  if (chartType === 'funnel') {
    const stages = ['Visitors', 'Leads', 'Qualified', 'Proposals', 'Negotiations', 'Closed Won'];
    let value = 5000;
    return stages.slice(0, Math.min(count, 6)).map((stage) => {
      const current = value;
      value = Math.floor(value * (0.5 + Math.random() * 0.3));
      return { [DUMMY_FIELDS.xField]: stage, [DUMMY_FIELDS.yField]: current };
    });
  }

  if (chartType === 'radar') {
    const metrics = ['Performance', 'Usability', 'Security', 'Scalability', 'Reliability', 'Speed'];
    return metrics.slice(0, Math.min(count, 6)).map((metric) => ({
      [DUMMY_FIELDS.xField]: metric,
      [DUMMY_FIELDS.yField]: Math.floor(Math.random() * 40) + 60,
      [DUMMY_FIELDS.y2Field]: Math.floor(Math.random() * 30) + 50,
    }));
  }

  if (chartType === 'stacked-area') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = ['2023', '2024', '2025'];
    const allMonths: string[] = [];
    
    for (const year of years) {
      for (const month of months) {
        allMonths.push(`${month} ${year}`);
        if (allMonths.length >= count) break;
      }
      if (allMonths.length >= count) break;
    }
    
    // For stacked area, we generate Mobile and Desktop columns
    return allMonths.slice(0, count).map((month) => ({
      [DUMMY_FIELDS.xField]: month,
      [DUMMY_FIELDS.yField]: Math.floor(Math.random() * 400) + 100,
      [DUMMY_FIELDS.y2Field]: Math.floor(Math.random() * 300) + 80,
    }));
  }

  // Bar, Line, Area charts - generate monthly data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = ['2023', '2024', '2025'];
  const allMonths: string[] = [];
  
  for (const year of years) {
    for (const month of months) {
      allMonths.push(`${month} ${year}`);
      if (allMonths.length >= count) break;
    }
    if (allMonths.length >= count) break;
  }
  
  return allMonths.slice(0, count).map((month) => ({
    [DUMMY_FIELDS.xField]: month,
    [DUMMY_FIELDS.yField]: Math.floor(Math.random() * 800) + 200,
    [DUMMY_FIELDS.y2Field]: Math.floor(Math.random() * 600) + 100,
  }));
};

export function ChartSetupWizard({ component, onComplete }: ChartSetupWizardProps) {
  const { updateComponent } = useAppBuilderStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [useDummyData, setUseDummyData] = useState(false);
  const [dummyDataSize, setDummyDataSize] = useState<DummyDataSize>('medium');
  
  // Get the current chart type, ensuring both type and chartType are synced
  const initialType = component.props?.chartType || component.props?.type || 'bar';
  
  const [chartConfig, setChartConfig] = useState(() => {
    const baseConfig = {
      title: component.props?.title || 'My Chart',
      dataSource: component.props?.dataSource || null,
      xField: component.props?.xField || '',
      yField: component.props?.yField || '',
      y2Field: component.props?.y2Field || '',
      filters: component.props?.filters || [],
      ...component.props,
    };
    // Override type and chartType after spreading props
    return {
      ...baseConfig,
      type: initialType,
      chartType: initialType,
    };
  });

  // When dummy data is toggled ON, auto-populate fields and generate data
  const handleDummyDataToggle = (enabled: boolean) => {
    setUseDummyData(enabled);
    
    if (enabled) {
      // Auto-fill the chart fields with dummy field names
      const newConfig = {
        ...chartConfig,
        chartType: chartConfig.type, // Ensure chartType matches type
        xField: DUMMY_FIELDS.xField,
        yField: DUMMY_FIELDS.yField,
        y2Field: ['line', 'bar', 'area', 'radar', 'stacked-area', 'composed'].includes(chartConfig.type) ? DUMMY_FIELDS.y2Field : '',
      };
      setChartConfig(newConfig);
      updateComponent(component.id, { 
        props: { 
          ...newConfig, 
          demoData: generateDummyData(chartConfig.type, dummyDataSize) 
        } 
      });
    }
  };

  // Handle dummy data size change
  const handleDummySizeChange = (size: DummyDataSize) => {
    setDummyDataSize(size);
    if (useDummyData) {
      const newData = generateDummyData(chartConfig.type, size);
      updateComponent(component.id, { 
        props: { 
          ...chartConfig,
          xField: DUMMY_FIELDS.xField,
          yField: DUMMY_FIELDS.yField,
          y2Field: ['line', 'bar', 'area', 'radar', 'stacked-area', 'composed'].includes(chartConfig.type) ? DUMMY_FIELDS.y2Field : '',
          demoData: newData 
        } 
      });
    }
  };

  // Generate dummy data when enabled
  const dummyData = useMemo(() => {
    if (!useDummyData) return null;
    return generateDummyData(chartConfig.type, dummyDataSize);
  }, [useDummyData, chartConfig.type, dummyDataSize]);

  // Extract fields from the connected data source
  const connectedFields = useMemo(() => {
    const table = chartConfig.dataSource?.table;
    if (!table) return [];
    
    // Get fields from table connection
    const fields = table.fields || table.schema || [];
    return Array.isArray(fields) ? fields : [];
  }, [chartConfig.dataSource]);

  const steps = [
    { id: 1, title: 'Chart Type', description: 'Choose your chart type', icon: BarChart3 },
    { id: 2, title: 'Data Source', description: 'Connect your data', icon: Database },
    { id: 3, title: 'Field Mapping', description: 'Map your data fields', icon: Settings },
    { id: 4, title: 'Filters', description: 'Add WHERE conditions', icon: Filter },
    { id: 5, title: 'Preview', description: 'Review and finalize', icon: Eye }
  ];

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', description: 'Compare categories' },
    { value: 'stacked-bar', label: 'Stacked Bar', description: 'Compare stacked categories' },
    { value: 'line', label: 'Line Chart', description: 'Show trends over time' },
    { value: 'area', label: 'Area Chart', description: 'Show volume over time' },
    { value: 'stacked-area', label: 'Stacked Area', description: 'Show overlapping volumes' },
    { value: 'pie', label: 'Pie Chart', description: 'Show proportions' },
    { value: 'donut', label: 'Donut Chart', description: 'Show proportions with center' },
    { value: 'scatter', label: 'Scatter Plot', description: 'Show correlations' },
    { value: 'radar', label: 'Radar Chart', description: 'Compare multiple metrics' },
    { value: 'funnel', label: 'Funnel Chart', description: 'Show conversion rates' },
    { value: 'composed', label: 'Composed Chart', description: 'Mix bar & line together' }
  ];

  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1: return !!chartConfig.type;
      case 2: return !!chartConfig.dataSource?.table;
      case 3: return !!chartConfig.xField && !!chartConfig.yField;
      case 4: return true; // Filters are optional
      case 5: return true;
      default: return false;
    }
  };

  const canProceedToStep = (stepId: number) => {
    if (stepId === 1) return true;
    return isStepComplete(stepId - 1);
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...chartConfig, [key]: value };
    
    // If chart type changes, also update chartType for compatibility with AdvancedChartRenderer
    if (key === 'type') {
      newConfig.chartType = value;
    }
    
    setChartConfig(newConfig);
    
    // If chart type changes while dummy data is enabled, regenerate dummy data
    if (key === 'type' && useDummyData) {
      const newDummyData = generateDummyData(value, dummyDataSize);
      const updatedConfig = {
        ...newConfig,
        chartType: value, // Ensure chartType is also updated
        xField: DUMMY_FIELDS.xField,
        yField: DUMMY_FIELDS.yField,
        y2Field: ['line', 'bar', 'area', 'radar', 'stacked-area', 'composed'].includes(value) ? DUMMY_FIELDS.y2Field : '',
      };
      setChartConfig(updatedConfig);
      updateComponent(component.id, {
        props: {
          ...updatedConfig,
          demoData: newDummyData
        }
      });
    } else {
      // Update component in real-time
      updateComponent(component.id, {
        props: useDummyData ? { ...newConfig, demoData: dummyData } : newConfig
      });
    }
  };

  const handleDatabaseConnection = (tableData: any) => {
    const newDataSource = {
      type: 'database',
      table: tableData
    };
    
    // Reset field mappings when table changes
    const newConfig = { 
      ...chartConfig, 
      dataSource: newDataSource,
      xField: '',
      yField: '',
      y2Field: ''
    };
    setChartConfig(newConfig);
    
    updateComponent(component.id, {
      props: newConfig
    });
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Select Chart Type</Label>
              <p className="text-xs text-muted-foreground mb-3">Choose the best visualization for your data</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {chartTypes.map((type) => (
                <div
                  key={type.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    chartConfig.type === type.value ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleConfigChange('type', type.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{type.label}</h4>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    {chartConfig.type === type.value && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Data Source</Label>
              <p className="text-xs text-muted-foreground mb-3">Connect your chart to a data table</p>
            </div>
            <DatabaseBindingField
              label="Table Connection"
              value={chartConfig.dataSource?.table}
              onChange={handleDatabaseConnection}
              description="Select a table to visualize"
            />
            {chartConfig.dataSource?.table && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Connected to "{chartConfig.dataSource.table.tableName || chartConfig.dataSource.table.name}"
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  {connectedFields.length} fields available for mapping
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Field Mapping</Label>
              <p className="text-xs text-muted-foreground mb-3">Map your data fields to chart axes</p>
            </div>
            
            {connectedFields.length > 0 ? (
              <div className="space-y-4">
                <ChartFieldSelector
                  label="X-Axis Field (Categories/Labels)"
                  value={chartConfig.xField || ''}
                  onChange={(value) => handleConfigChange('xField', value)}
                  fields={connectedFields}
                  placeholder="Select X-axis field..."
                />
                
                <ChartFieldSelector
                  label="Y-Axis Field (Values)"
                  value={chartConfig.yField || ''}
                  onChange={(value) => handleConfigChange('yField', value)}
                  fields={connectedFields}
                  placeholder="Select Y-axis field..."
                />

                {['line', 'bar', 'area'].includes(chartConfig.type) && (
                  <ChartFieldSelector
                    label="Secondary Y-Axis Field (Optional)"
                    value={chartConfig.y2Field || ''}
                    onChange={(value) => handleConfigChange('y2Field', value)}
                    fields={connectedFields}
                    placeholder="Select secondary Y-axis..."
                    allowEmpty
                  />
                )}

                {chartConfig.xField && chartConfig.yField && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Chart will display:</strong> {chartConfig.yField} values grouped by {chartConfig.xField}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No fields available</p>
                <p className="text-xs mt-1">Please connect a data source in Step 2 first</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Filter Conditions</Label>
              <p className="text-xs text-muted-foreground mb-3">Add WHERE conditions to filter your data</p>
            </div>
            
            <ChartFilterBuilder
              fields={connectedFields}
              filters={chartConfig.filters || []}
              onChange={(filters) => handleConfigChange('filters', filters)}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Chart Configuration</Label>
              <p className="text-xs text-muted-foreground mb-3">Review your chart settings</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="chart-title" className="text-xs">Chart Title</Label>
                <Input
                  id="chart-title"
                  value={chartConfig.title}
                  onChange={(e) => handleConfigChange('title', e.target.value)}
                  placeholder="Enter chart title..."
                  className="h-8"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <span className="font-medium">Type: </span>
                  <span className="capitalize">{chartConfig.type}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="font-medium">Data: </span>
                  <span>{chartConfig.dataSource?.table?.tableName || 'None'}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="font-medium">X-Axis: </span>
                  <span>{chartConfig.xField || 'None'}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="font-medium">Y-Axis: </span>
                  <span>{chartConfig.yField || 'None'}</span>
                </div>
              </div>
              
              {chartConfig.filters?.length > 0 && chartConfig.filters.some((g: ChartFilterGroup) => g.filters.length > 0) && (
                <div className="p-2 bg-muted/50 rounded">
                  <span className="font-medium text-xs">Filters: </span>
                  <span className="text-xs">{chartConfig.filters.reduce((acc: number, g: ChartFilterGroup) => acc + g.filters.length, 0)} conditions</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Setup Panel */}
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Progress Steps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Chart Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = isStepComplete(step.id);
              const canAccess = canProceedToStep(step.id);
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                    isActive ? 'bg-primary/10 border border-primary/20' : 
                    canAccess ? 'hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => canAccess && setCurrentStep(step.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-xs">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{steps[currentStep - 1]?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="flex-1"
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={currentStep === steps.length ? onComplete : handleNextStep}
            disabled={!isStepComplete(currentStep)}
            className="flex-1"
          >
            {currentStep === steps.length ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Live Preview</CardTitle>
              <div className="flex items-center gap-3">
                {useDummyData && (
                  <Select value={dummyDataSize} onValueChange={(v) => handleDummySizeChange(v as DummyDataSize)}>
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DUMMY_SIZE_CONFIG) as DummyDataSize[]).map((size) => (
                        <SelectItem key={size} value={size} className="text-xs">
                          {DUMMY_SIZE_CONFIG[size].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant={useDummyData ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleDummyDataToggle(!useDummyData)}
                  className="h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {useDummyData ? 'Demo Data ON' : 'Load Demo Data'}
                </Button>
                <Badge variant="secondary" className="text-xs">
                  Step {currentStep} of {steps.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Show dummy data JSON when enabled */}
            {useDummyData && dummyData && (
              <div className="p-2 bg-muted/50 rounded-md border shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Demo Data (JSON)</span>
                  <span className="text-xs text-muted-foreground">{dummyData.length} records</span>
                </div>
                <pre className="text-xs overflow-auto max-h-24 text-foreground/80 font-mono">
                  {JSON.stringify(dummyData, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex-1 min-h-0">
              <AdvancedChartRenderer 
                component={{
                  ...component,
                  props: {
                    ...chartConfig,
                    ...(useDummyData && dummyData ? { demoData: dummyData } : {})
                  }
                }}
                isPreview={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}