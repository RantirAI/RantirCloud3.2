import { useState } from 'react';
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
import { X, Save, ChevronLeft, BarChart3, LineChart, PieChart, TrendingUp, Plus, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ChartConfiguratorProps {
  componentId: string;
  onClose: () => void;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'scatter';
  title: string;
  data: any[];
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  xAxisLabel: string;
  yAxisLabel: string;
  dataSource: 'manual' | 'api' | 'database';
  apiUrl?: string;
  databaseTable?: string;
  xAxisKey: string;
  yAxisKey: string;
}

export function ChartConfigurator({ componentId, onClose }: ChartConfiguratorProps) {
  const { 
    currentProject, 
    currentPage, 
    updateComponent
  } = useAppBuilderStore();

  const [dummyDataVisible, setDummyDataVisible] = useState(false);

  // Sample dummy data for different chart types
  const getDummyData = (chartType: string) => {
    const dummyDataSets = {
      bar: [
        { category: 'Q1 2024', sales: 12500, target: 12000, region: 'North' },
        { category: 'Q2 2024', sales: 15800, target: 15000, region: 'North' },
        { category: 'Q3 2024', sales: 18200, target: 17500, region: 'North' },
        { category: 'Q4 2024', sales: 22100, target: 20000, region: 'North' }
      ],
      line: [
        { month: 'Jan', users: 1200, sessions: 4800 },
        { month: 'Feb', users: 1450, sessions: 5800 },
        { month: 'Mar', users: 1800, sessions: 7200 },
        { month: 'Apr', users: 2100, sessions: 8400 },
        { month: 'May', users: 2350, sessions: 9400 },
        { month: 'Jun', users: 2800, sessions: 11200 }
      ],
      area: [
        { date: '2024-01', revenue: 45000, costs: 32000, profit: 13000 },
        { date: '2024-02', revenue: 52000, costs: 35000, profit: 17000 },
        { date: '2024-03', revenue: 48000, costs: 33000, profit: 15000 },
        { date: '2024-04', revenue: 61000, costs: 38000, profit: 23000 },
        { date: '2024-05', revenue: 58000, costs: 36000, profit: 22000 },
        { date: '2024-06', revenue: 67000, costs: 41000, profit: 26000 }
      ],
      pie: [
        { segment: 'Mobile', value: 45, color: '#3b82f6' },
        { segment: 'Desktop', value: 35, color: '#10b981' },
        { segment: 'Tablet', value: 15, color: '#f59e0b' },
        { segment: 'Other', value: 5, color: '#ef4444' }
      ],
      donut: [
        { category: 'Premium', amount: 125000, percentage: 42 },
        { category: 'Standard', amount: 95000, percentage: 32 },
        { category: 'Basic', amount: 58000, percentage: 19 },
        { category: 'Trial', amount: 22000, percentage: 7 }
      ],
      scatter: [
        { x: 20, y: 35, size: 1200, category: 'Product A' },
        { x: 35, y: 42, size: 1800, category: 'Product B' },
        { x: 45, y: 28, size: 950, category: 'Product C' },
        { x: 30, y: 55, size: 2100, category: 'Product D' },
        { x: 52, y: 38, size: 1650, category: 'Product E' }
      ]
    };
    
    return dummyDataSets[chartType as keyof typeof dummyDataSets] || dummyDataSets.bar;
  };

  const [config, setConfig] = useState<ChartConfig>({
    type: 'bar',
    title: 'Chart Title',
    data: [],
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    xAxisLabel: 'X Axis',
    yAxisLabel: 'Y Axis',
    dataSource: 'manual',
    xAxisKey: '',
    yAxisKey: ''
  });

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

  const addDummyData = () => {
    const dummyData = getDummyData(config.type);
    const keys = Object.keys(dummyData[0] || {});
    const xKey = keys.find(k => ['category', 'month', 'date', 'segment', 'x'].includes(k)) || keys[0];
    const yKey = keys.find(k => ['sales', 'users', 'revenue', 'value', 'amount', 'y'].includes(k)) || keys[1];
    
    updateConfig({
      data: dummyData,
      xAxisKey: xKey,
      yAxisKey: yKey,
      dataSource: 'manual'
    });
    
    setDummyDataVisible(false);
    toast.success(`Added ${config.type} chart sample data!`);
  };

  const handleSave = () => {
    updateComponent(componentId, {
      ...chartComponent,
      props: {
        ...chartComponent.props,
        chartConfig: config
      }
    });
    onClose();
  };

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleAddDataPoint = () => {
    const newDataPoint = {
      name: `Point ${config.data.length + 1}`,
      value: Math.floor(Math.random() * 1000)
    };
    setConfig(prev => ({
      ...prev,
      data: [...prev.data, newDataPoint]
    }));
  };

  const handleRemoveDataPoint = (index: number) => {
    setConfig(prev => ({
      ...prev,
      data: prev.data.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateDataPoint = (index: number, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      data: prev.data.map((item, i) => 
        i === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const getChartIcon = (type: string) => {
    const iconMap = {
      bar: BarChart3,
      line: LineChart,
      pie: PieChart,
      area: TrendingUp,
      donut: PieChart,
      scatter: TrendingUp
    };
    return iconMap[type as keyof typeof iconMap] || BarChart3;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader>
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
              <DialogTitle>Configure Chart</DialogTitle>
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
                  <TabsList className="w-fit">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                    <TabsTrigger value="style">Style</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chart Type</Label>
                      <Select value={config.type} onValueChange={(value: any) => updateConfig({ type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">📊 Bar Chart</SelectItem>
                          <SelectItem value="line">📈 Line Chart</SelectItem>
                          <SelectItem value="area">📊 Area Chart</SelectItem>
                          <SelectItem value="pie">🥧 Pie Chart</SelectItem>
                          <SelectItem value="donut">🍩 Donut Chart</SelectItem>
                          <SelectItem value="scatter">📍 Scatter Plot</SelectItem>
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
                      <Label>X-Axis Label</Label>
                      <Input
                        value={config.xAxisLabel}
                        onChange={(e) => updateConfig({ xAxisLabel: e.target.value })}
                        placeholder="Enter X-axis label"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Y-Axis Label</Label>
                      <Input
                        value={config.yAxisLabel}
                        onChange={(e) => updateConfig({ yAxisLabel: e.target.value })}
                        placeholder="Enter Y-axis label"
                      />
                    </div>

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
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Data Source</Label>
                      <div className="flex gap-2">
                        <Select value={config.dataSource} onValueChange={(value: any) => updateConfig({ dataSource: value })}>
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">📝 Manual Data</SelectItem>
                            <SelectItem value="database">🗄️ Database</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Popover open={dummyDataVisible} onOpenChange={setDummyDataVisible}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" title="Add sample data">
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80">
                            <div className="space-y-3">
                              <h4 className="font-medium">Add Sample Data</h4>
                              <p className="text-sm text-muted-foreground">
                                This will add realistic sample data for a {config.type} chart so you can see how it looks.
                              </p>
                              <div className="flex justify-between gap-2">
                                <Button variant="outline" onClick={() => setDummyDataVisible(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={addDummyData}>
                                  Add Sample Data
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {config.dataSource === 'manual' && (
                      <div className="space-y-2">
                        <Label>Data (JSON)</Label>
                        <Textarea
                          value={JSON.stringify(config.data || [], null, 2)}
                          onChange={(e) => {
                            try {
                              const data = JSON.parse(e.target.value);
                              updateConfig({ data });
                            } catch (error) {
                              // Invalid JSON, don't update
                            }
                          }}
                          placeholder="Enter your data as JSON array"
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Try the magic wand button above to add sample data, or use the AI Assistant for help!
                        </p>
                      </div>
                    )}

                    {config.data && config.data.length > 0 && (
                      <>
                        <div className="space-y-2">
                          <Label>X-Axis Field</Label>
                          <Select value={config.xAxisKey || ''} onValueChange={(value) => updateConfig({ xAxisKey: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select field for X-axis" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(config.data[0] || {}).map((key) => (
                                <SelectItem key={key} value={key}>{key}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Y-Axis Field</Label>
                          <Select value={config.yAxisKey || ''} onValueChange={(value) => updateConfig({ yAxisKey: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select field for Y-axis" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(config.data[0] || {}).map((key) => (
                                <SelectItem key={key} value={key}>{key}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="style" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Colors</span>
                        <span className="text-xs text-muted-foreground">
                          {config.colors?.length || 0} colors
                        </span>
                      </Label>
                      
                      {/* Preset Color Schemes */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: 'Blue Ocean', colors: ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a'] },
                            { name: 'Green Nature', colors: ['#10b981', '#059669', '#047857', '#065f46'] },
                            { name: 'Warm Sunset', colors: ['#f59e0b', '#d97706', '#b45309', '#92400e'] },
                            { name: 'Purple Dreams', colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'] },
                            { name: 'Rainbow Mix', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] },
                            { name: 'Professional', colors: ['#64748b', '#475569', '#334155', '#1e293b'] }
                          ].map((scheme) => (
                            <Button
                              key={scheme.name}
                              variant="outline"
                              size="sm"
                              className="h-auto p-2 flex-col gap-1"
                              onClick={() => updateConfig({ colors: scheme.colors })}
                            >
                              <div className="flex gap-1">
                                {scheme.colors.map((color, i) => (
                                  <div
                                    key={i}
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              <span className="text-xs">{scheme.name}</span>
                            </Button>
                          ))}
                        </div>
                        
                        {/* Custom Colors */}
                        <div className="flex flex-wrap gap-2">
                          {(config.colors || ['#3b82f6']).map((color, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                  const newColors = [...(config.colors || [])];
                                  newColors[index] = e.target.value;
                                  updateConfig({ colors: newColors });
                                }}
                                className="w-8 h-8 rounded border cursor-pointer"
                              />
                              {(config.colors || []).length > 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6"
                                  onClick={() => {
                                    const newColors = (config.colors || []).filter((_, i) => i !== index);
                                    updateConfig({ colors: newColors });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-8 h-8"
                            onClick={() => {
                              const newColors = [...(config.colors || []), '#3b82f6'];
                              updateConfig({ colors: newColors });
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Chart Preview */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <div className="h-full bg-background p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getChartIcon(config.type);
                        return <IconComponent className="h-5 w-5" />;
                      })()}
                      {config.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl mb-2">
                          {(() => {
                            const IconComponent = getChartIcon(config.type);
                            return <IconComponent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />;
                          })()}
                        </div>
                        <p className="text-lg font-medium">{config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart Preview</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.data.length} data points • {config.dataSource} source
                        </p>
                        {config.data.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Add sample data with the magic wand button or use the AI Assistant!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}