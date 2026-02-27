import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Sparkles } from 'lucide-react';
import { ChartConfigurator } from './ChartConfigurator';
import { useState } from 'react';
import { AIChartAssistant } from './AIChartAssistant';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface ChartRendererProps {
  component: any;
  isPreview: boolean;
}

export function ChartRenderer({ component, isPreview }: ChartRendererProps) {
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { updateComponent } = useAppBuilderStore();
  const props = component.props || {};

  // Chart configuration
  const chartConfig = {
    type: props.chartType || 'bar',
    title: props.title || 'Chart',
    dataSource: props.dataSource,
    xAxisField: props.xAxisField,
    yAxisField: props.yAxisField,
    showLegend: props.showLegend !== false,
    showGrid: props.showGrid !== false,
    colorScheme: props.colorScheme || 'default',
    height: props.height || 300,
  };

  // Color schemes
  const colorSchemes = {
    default: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'],
    blue: ['#1f77b4', '#aec7e8', '#c5dbf7', '#6baed6', '#4292c6'],
    green: ['#2ca02c', '#98df8a', '#c5e1a5', '#7bccc4', '#43a2ca'],
    purple: ['#9467bd', '#c49c94', '#e377c2', '#f7b6d3', '#c7c7c7'],
    orange: ['#ff7f0e', '#ffbb78', '#fdd49e', '#fdb462', '#fb8072'],
  };

  const colors = colorSchemes[chartConfig.colorScheme as keyof typeof colorSchemes] || colorSchemes.default;

  // Sample data when no data source is connected
  const sampleData = useMemo(() => {
    switch (chartConfig.type) {
      case 'pie':
      case 'donut':
        return [
          { name: 'Product A', value: 400 },
          { name: 'Product B', value: 300 },
          { name: 'Product C', value: 300 },
          { name: 'Product D', value: 200 },
        ];
      case 'scatter':
        return [
          { x: 100, y: 200, z: 200 },
          { x: 120, y: 100, z: 260 },
          { x: 170, y: 300, z: 400 },
          { x: 140, y: 250, z: 280 },
          { x: 150, y: 400, z: 500 },
          { x: 110, y: 280, z: 200 },
        ];
      default:
        return [
          { month: 'Jan', sales: 4000, revenue: 2400 },
          { month: 'Feb', sales: 3000, revenue: 1398 },
          { month: 'Mar', sales: 2000, revenue: 9800 },
          { month: 'Apr', sales: 2780, revenue: 3908 },
          { month: 'May', sales: 1890, revenue: 4800 },
          { month: 'Jun', sales: 2390, revenue: 3800 },
        ];
    }
  }, [chartConfig.type]);

  // Process data based on configuration
  const chartData = useMemo(() => {
    // If data is passed directly in props (for chat charts), use it
    if (props.data && Array.isArray(props.data)) {
      return props.data;
    }
    
    // If no data source is connected, use sample data
    if (!chartConfig.dataSource?.data) {
      return sampleData;
    }

    // Transform real data based on x and y axis fields
    const sourceData = chartConfig.dataSource.data;
    if (!chartConfig.xAxisField || !chartConfig.yAxisField) {
      return sourceData;
    }

    return sourceData.map((item: any) => ({
      [chartConfig.xAxisField]: item[chartConfig.xAxisField],
      [chartConfig.yAxisField]: item[chartConfig.yAxisField],
      ...item, // Include all other fields
    }));
  }, [props.data, chartConfig.dataSource, chartConfig.xAxisField, chartConfig.yAxisField, sampleData]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartConfig.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxisField || 'month'} />
              <YAxis />
              {chartConfig.showLegend && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              <Bar 
                dataKey={chartConfig.yAxisField || 'sales'} 
                fill={colors[0]} 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <LineChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxisField || 'month'} />
              <YAxis />
              {chartConfig.showLegend && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              <Line 
                type="monotone" 
                dataKey={chartConfig.yAxisField || 'sales'} 
                stroke={colors[0]} 
                strokeWidth={2}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <AreaChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={chartConfig.xAxisField || 'month'} />
              <YAxis />
              {chartConfig.showLegend && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              <Area 
                type="monotone" 
                dataKey={chartConfig.yAxisField || 'sales'} 
                stroke={colors[0]} 
                fill={colors[0]} 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <PieChart>
               <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="label"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {chartConfig.showLegend && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <PieChart>
               <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                nameKey="label"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {chartConfig.showLegend && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <ScatterChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="x" type="number" />
              <YAxis dataKey="y" type="number" />
              {chartConfig.showLegend && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
              {chartConfig.showLegend && <Legend />}
              <Scatter dataKey="z" fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Unknown chart type: {chartConfig.type}
          </div>
        );
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">{chartConfig.title}</CardTitle>
          {/* Controls removed: AI and Setup are now managed via the Properties panel */}
        </CardHeader>
        <CardContent>
          {chartData && chartData.length > 0 ? (
            renderChart()
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Database className="h-8 w-8 mb-2" />
              <p className="text-sm">No data connected</p>
              <p className="text-xs">Configure data source to display chart</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed AI Assistant and legacy configurator dialogs */}
    </>
  );
}