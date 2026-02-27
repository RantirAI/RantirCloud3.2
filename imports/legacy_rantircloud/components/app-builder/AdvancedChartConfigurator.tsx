import { useState, useEffect } from 'react';
import { AppComponent } from '@/types/appBuilder';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from '@/components/ColorPicker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, Save, ChevronLeft, BarChart3, LineChart, PieChart, TrendingUp, Plus, Trash2, 
  Wand2, Database, Table, Link, Palette, Settings, Eye, Download, Layers
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DatabaseBindingField } from './properties/DatabaseBindingField';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedChartConfiguratorProps {
  componentId: string;
  onClose: () => void;
}

interface TableJoin {
  id: string;
  table: any;
  joinType: 'inner' | 'left' | 'right';
  primaryKey: string;
  foreignKey: string;
}

interface ChartDataSource {
  type: 'single' | 'joined' | 'manual';
  primaryTable?: any;
  joinedTables?: TableJoin[];
  manualData?: any[];
  filters?: any[];
}

interface AdvancedChartConfig {
  type: string;
  title: string;
  subtitle: string;
  dataSource: ChartDataSource;
  xAxisField: string;
  yAxisField: string;
  secondaryYAxisField?: string;
  groupByField?: string;
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  showValues: boolean;
  colorScheme: string;
  customColors: string[];
  height: number;
  animation: boolean;
  responsive: boolean;
  stacked: boolean;
  curved: boolean;
  xAxisLabel: string;
  yAxisLabel: string;
  legendPosition: string;
  theme: string;
}

export function AdvancedChartConfigurator({ componentId, onClose }: AdvancedChartConfiguratorProps) {
  const { 
    currentProject, 
    currentPage, 
    updateComponent
  } = useAppBuilderStore();

  const [config, setConfig] = useState<AdvancedChartConfig>({
    type: 'bar',
    title: 'Advanced Chart',
    subtitle: '',
    dataSource: { type: 'manual', manualData: [] },
    xAxisField: '',
    yAxisField: '',
    secondaryYAxisField: '',
    groupByField: '',
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    showValues: false,
    colorScheme: 'modern',
    customColors: [],
    height: 400,
    animation: true,
    responsive: true,
    stacked: false,
    curved: false,
    xAxisLabel: '',
    yAxisLabel: '',
    legendPosition: 'bottom',
    theme: 'light'
  });

  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  useEffect(() => {
    loadAvailableTables();
  }, []);

  const loadAvailableTables = async () => {
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('id, name, schema');
      
      if (error) {
        console.error('Error loading tables:', error);
        return;
      }

      const tables = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        fields: (project.schema as any)?.fields || []
      }));

      setAvailableTables(tables);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  // Find the chart component
  const findComponent = (components: AppComponent[]): AppComponent | null => {
    for (const comp of components) {
      if (comp.id === componentId) return comp;
      if (comp.children) {
        const found = findComponent(comp.children);
        if (found) return found;
      }
    }
    return null;
  };

  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const chartComponent = pageData ? findComponent(pageData.components) : null;

  if (!chartComponent) {
    return null;
  }

  const handleSave = () => {
    updateComponent(componentId, {
      ...chartComponent,
      props: {
        ...chartComponent.props,
        ...config
      }
    });
    toast.success('Chart configuration saved!');
    onClose();
  };

  const updateConfig = (updates: Partial<AdvancedChartConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handlePrimaryTableChange = (table: any) => {
    updateConfig({
      dataSource: {
        ...config.dataSource,
        type: 'single',
        primaryTable: table
      }
    });
  };

  const addTableJoin = () => {
    const newJoin: TableJoin = {
      id: `join-${Date.now()}`,
      table: null,
      joinType: 'left',
      primaryKey: '',
      foreignKey: ''
    };

    updateConfig({
      dataSource: {
        ...config.dataSource,
        type: 'joined',
        joinedTables: [...(config.dataSource.joinedTables || []), newJoin]
      }
    });
  };

  const updateTableJoin = (joinId: string, updates: Partial<TableJoin>) => {
    const updatedJoins = (config.dataSource.joinedTables || []).map(join =>
      join.id === joinId ? { ...join, ...updates } : join
    );

    updateConfig({
      dataSource: {
        ...config.dataSource,
        joinedTables: updatedJoins
      }
    });
  };

  const removeTableJoin = (joinId: string) => {
    const updatedJoins = (config.dataSource.joinedTables || []).filter(join => join.id !== joinId);
    
    updateConfig({
      dataSource: {
        ...config.dataSource,
        type: updatedJoins.length === 0 ? 'single' : 'joined',
        joinedTables: updatedJoins
      }
    });
  };

  const addCustomColor = () => {
    updateConfig({
      customColors: [...config.customColors, '#3b82f6']
    });
  };

  const updateCustomColor = (index: number, color: string) => {
    const updatedColors = [...config.customColors];
    updatedColors[index] = color;
    updateConfig({ customColors: updatedColors });
  };

  const removeCustomColor = (index: number) => {
    const updatedColors = config.customColors.filter((_, i) => i !== index);
    updateConfig({ customColors: updatedColors });
  };

  const getChartIcon = (type: string) => {
    const iconMap = {
      bar: BarChart3,
      'stacked-bar': BarChart3,
      line: LineChart,
      pie: PieChart,
      donut: PieChart,
      area: TrendingUp,
      scatter: TrendingUp,
      radar: TrendingUp,
      funnel: TrendingUp,
      composed: Layers
    };
    return iconMap[type as keyof typeof iconMap] || BarChart3;
  };

  const generateSampleData = () => {
    const sampleDataSets = {
      bar: [
        { category: 'Q1', sales: 12500, target: 12000 },
        { category: 'Q2', sales: 15800, target: 15000 },
        { category: 'Q3', sales: 18200, target: 17500 },
        { category: 'Q4', sales: 22100, target: 20000 }
      ],
      line: [
        { month: 'Jan', users: 1200, revenue: 24000 },
        { month: 'Feb', users: 1450, revenue: 29000 },
        { month: 'Mar', users: 1800, revenue: 36000 },
        { month: 'Apr', users: 2100, revenue: 42000 }
      ],
      pie: [
        { segment: 'Mobile', value: 45 },
        { segment: 'Desktop', value: 35 },
        { segment: 'Tablet', value: 15 },
        { segment: 'Other', value: 5 }
      ]
    };

    const data = sampleDataSets[config.type as keyof typeof sampleDataSets] || sampleDataSets.bar;
    const keys = Object.keys(data[0] || {});
    
    updateConfig({
      dataSource: {
        type: 'manual',
        manualData: data
      },
      xAxisField: keys[0] || '',
      yAxisField: keys[1] || ''
    });
    
    toast.success('Sample data added!');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Advanced Chart Configuration</DialogTitle>
            </div>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Configuration Panel */}
          <div className="w-96 border-r border-border bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                    <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
                    <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chart Type</Label>
                      <Select value={config.type} onValueChange={(value) => updateConfig({ type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">📊 Bar Chart</SelectItem>
                          <SelectItem value="stacked-bar">📊 Stacked Bar</SelectItem>
                          <SelectItem value="line">📈 Line Chart</SelectItem>
                          <SelectItem value="area">📊 Area Chart</SelectItem>
                          <SelectItem value="pie">🥧 Pie Chart</SelectItem>
                          <SelectItem value="donut">🍩 Donut Chart</SelectItem>
                          <SelectItem value="scatter">📍 Scatter Plot</SelectItem>
                          <SelectItem value="radar">🎯 Radar Chart</SelectItem>
                          <SelectItem value="funnel">🔽 Funnel Chart</SelectItem>
                          <SelectItem value="composed">📊 Composed Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Chart Title</Label>
                      <Input
                        value={config.title}
                        onChange={(e) => updateConfig({ title: e.target.value })}
                        placeholder="Enter chart title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtitle (Optional)</Label>
                      <Input
                        value={config.subtitle}
                        onChange={(e) => updateConfig({ subtitle: e.target.value })}
                        placeholder="Enter chart subtitle"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>X-Axis Label</Label>
                        <Input
                          value={config.xAxisLabel}
                          onChange={(e) => updateConfig({ xAxisLabel: e.target.value })}
                          placeholder="X-axis"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Y-Axis Label</Label>
                        <Input
                          value={config.yAxisLabel}
                          onChange={(e) => updateConfig({ yAxisLabel: e.target.value })}
                          placeholder="Y-axis"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input
                        type="number"
                        value={config.height}
                        onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 400 })}
                        min="200"
                        max="800"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Data Source Type</Label>
                      <Select 
                        value={config.dataSource.type} 
                        onValueChange={(value: 'single' | 'joined' | 'manual') => 
                          updateConfig({ dataSource: { ...config.dataSource, type: value } })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">🗄️ Single Table</SelectItem>
                          <SelectItem value="joined">🔗 Multiple Tables (Join)</SelectItem>
                          <SelectItem value="manual">📝 Manual Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.dataSource.type === 'single' && (
                      <div className="space-y-3">
                        <DatabaseBindingField
                          label="Primary Table"
                          value={config.dataSource.primaryTable}
                          onChange={handlePrimaryTableChange}
                          description="Select the main table for your chart data"
                        />
                      </div>
                    )}

                    {config.dataSource.type === 'joined' && (
                      <div className="space-y-3">
                        <DatabaseBindingField
                          label="Primary Table"
                          value={config.dataSource.primaryTable}
                          onChange={handlePrimaryTableChange}
                          description="Select the main table to join other tables to"
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Joined Tables</Label>
                            <Button
                              size="sm"
                              onClick={addTableJoin}
                              className="h-7 px-2 text-xs"
                              disabled={!config.dataSource.primaryTable}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Join
                            </Button>
                          </div>

                          {config.dataSource.joinedTables?.map((join) => (
                            <Card key={join.id} className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm">Join Configuration</Label>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeTableJoin(join.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>

                                <DatabaseBindingField
                                  label="Table to Join"
                                  value={join.table}
                                  onChange={(table) => updateTableJoin(join.id, { table })}
                                  description=""
                                />

                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Join Type</Label>
                                    <Select
                                      value={join.joinType}
                                      onValueChange={(value: 'inner' | 'left' | 'right') => 
                                        updateTableJoin(join.id, { joinType: value })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inner">Inner</SelectItem>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Primary Key</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      value={join.primaryKey}
                                      onChange={(e) => updateTableJoin(join.id, { primaryKey: e.target.value })}
                                      placeholder="id"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Foreign Key</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      value={join.foreignKey}
                                      onChange={(e) => updateTableJoin(join.id, { foreignKey: e.target.value })}
                                      placeholder="user_id"
                                    />
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {config.dataSource.type === 'manual' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Manual Data (JSON)</Label>
                          <Button
                            size="sm"
                            onClick={generateSampleData}
                            className="h-7 px-2 text-xs"
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            Sample
                          </Button>
                        </div>
                        <Textarea
                          value={JSON.stringify(config.dataSource.manualData || [], null, 2)}
                          onChange={(e) => {
                            try {
                              const data = JSON.parse(e.target.value);
                              updateConfig({
                                dataSource: {
                                  ...config.dataSource,
                                  manualData: data
                                }
                              });
                            } catch (error) {
                              // Invalid JSON, don't update
                            }
                          }}
                          placeholder="Enter your data as JSON array"
                          rows={8}
                          className="font-mono text-xs"
                        />
                      </div>
                    )}

                    {(config.dataSource.primaryTable || config.dataSource.manualData?.length) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label>Field Mapping</Label>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">X-Axis Field</Label>
                              <Select value={config.xAxisField} onValueChange={(value) => updateConfig({ xAxisField: value })}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select X field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(config.dataSource.primaryTable?.fields || Object.keys(config.dataSource.manualData?.[0] || {})).map((field: any) => (
                                    <SelectItem key={typeof field === 'string' ? field : field.name} value={typeof field === 'string' ? field : field.name}>
                                      {typeof field === 'string' ? field : field.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs">Y-Axis Field</Label>
                              <Select value={config.yAxisField} onValueChange={(value) => updateConfig({ yAxisField: value })}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select Y field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(config.dataSource.primaryTable?.fields || Object.keys(config.dataSource.manualData?.[0] || {})).map((field: any) => (
                                    <SelectItem key={typeof field === 'string' ? field : field.name} value={typeof field === 'string' ? field : field.name}>
                                      {typeof field === 'string' ? field : field.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {(['line', 'composed'].includes(config.type)) && (
                            <div>
                              <Label className="text-xs">Secondary Y-Axis (Optional)</Label>
                              <Select value={config.secondaryYAxisField || ''} onValueChange={(value) => updateConfig({ secondaryYAxisField: value })}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select secondary field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {(config.dataSource.primaryTable?.fields || Object.keys(config.dataSource.manualData?.[0] || {})).map((field: any) => (
                                    <SelectItem key={typeof field === 'string' ? field : field.name} value={typeof field === 'string' ? field : field.name}>
                                      {typeof field === 'string' ? field : field.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="style" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Color Scheme</Label>
                      <Select value={config.colorScheme} onValueChange={(value) => updateConfig({ colorScheme: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">🎨 Modern</SelectItem>
                          <SelectItem value="vibrant">✨ Vibrant</SelectItem>
                          <SelectItem value="pastel">🌸 Pastel</SelectItem>
                          <SelectItem value="professional">💼 Professional</SelectItem>
                          <SelectItem value="ocean">🌊 Ocean</SelectItem>
                          <SelectItem value="forest">🌲 Forest</SelectItem>
                          <SelectItem value="sunset">🌅 Sunset</SelectItem>
                          <SelectItem value="monochrome">⚫ Monochrome</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom Colors</Label>
                        <Button
                          size="sm"
                          onClick={addCustomColor}
                          className="h-7 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {config.customColors.map((color, index) => (
                          <div key={index} className="relative">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full h-8 p-1"
                                  style={{ backgroundColor: color }}
                                >
                                  <span className="sr-only">Color {index + 1}</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <ColorPicker
                                  value={color}
                                  onChange={(newColor) => updateCustomColor(index, newColor)}
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCustomColor(index)}
                              className="absolute -top-2 -right-2 h-4 w-4 p-0 bg-destructive text-destructive-foreground rounded-full"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Legend Position</Label>
                      <Select value={config.legendPosition} onValueChange={(value) => updateConfig({ legendPosition: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">🔼 Top</SelectItem>
                          <SelectItem value="bottom">🔽 Bottom</SelectItem>
                          <SelectItem value="left">◀️ Left</SelectItem>
                          <SelectItem value="right">▶️ Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select value={config.theme} onValueChange={(value) => updateConfig({ theme: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">☀️ Light</SelectItem>
                          <SelectItem value="dark">🌙 Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Show Legend</Label>
                        <Switch
                          checked={config.showLegend}
                          onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Show Grid</Label>
                        <Switch
                          checked={config.showGrid}
                          onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Show Tooltip</Label>
                        <Switch
                          checked={config.showTooltip}
                          onCheckedChange={(checked) => updateConfig({ showTooltip: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Show Values</Label>
                        <Switch
                          checked={config.showValues}
                          onCheckedChange={(checked) => updateConfig({ showValues: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Animation</Label>
                        <Switch
                          checked={config.animation}
                          onCheckedChange={(checked) => updateConfig({ animation: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Responsive</Label>
                        <Switch
                          checked={config.responsive}
                          onCheckedChange={(checked) => updateConfig({ responsive: checked })}
                        />
                      </div>
                      
                      {['bar', 'line'].includes(config.type) && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>Stacked</Label>
                            <Switch
                              checked={config.stacked}
                              onCheckedChange={(checked) => updateConfig({ stacked: checked })}
                            />
                          </div>
                        </>
                      )}
                      
                      {['line', 'area'].includes(config.type) && (
                        <div className="flex items-center justify-between">
                          <Label>Curved Lines</Label>
                          <Switch
                            checked={config.curved}
                            onCheckedChange={(checked) => updateConfig({ curved: checked })}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 p-6 bg-background">
            <div className="h-full border rounded-lg bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <Badge variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  Live Preview
                </Badge>
              </div>
              
              <div className="h-[calc(100%-4rem)] flex items-center justify-center">
                <div className="text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Configure your chart settings to see a live preview
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Connect data source and set field mappings to get started
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}