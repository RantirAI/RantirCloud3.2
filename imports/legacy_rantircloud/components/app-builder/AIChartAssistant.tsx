import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { databaseService } from '@/services/databaseService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Database, 
  Table,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface AIChartAssistantProps {
  componentId: string;
  onChartConfigUpdate: (config: any) => void;
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  actions?: {
    type: 'connect_database' | 'select_table' | 'configure_chart' | 'add_dummy_data' | 'select_database';
    label: string;
    payload?: any;
  }[];
}

interface DatabaseInfo {
  id: string;
  name: string;
  tables?: TableInfo[];
}

interface TableInfo {
  id: string;
  name: string;
  schema: any;
  records: any[];
}

export const AIChartAssistant: React.FC<AIChartAssistantProps> = ({ 
  componentId, 
  onChartConfigUpdate,
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Chart Assistant powered by Claude AI. I can help you create beautiful charts using your database data or dummy data for testing. What kind of chart would you like to create?',
      timestamp: new Date(),
      actions: [
        { type: 'add_dummy_data', label: 'Use Sample Data' },
        { type: 'connect_database', label: 'Connect Database' }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load databases on component mount
  useEffect(() => {
    if (user?.id) {
      loadDatabases();
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDatabases = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingDatabases(true);
      const { data: userDatabases, error } = await supabase
        .from('databases')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error loading databases:', error);
        toast.error('Failed to load databases');
        return;
      }
      
      console.log('Loaded databases:', userDatabases);
      setDatabases(userDatabases || []);
    } catch (error) {
      console.error('Error loading databases:', error);
      toast.error('Failed to load databases');
    } finally {
      setLoadingDatabases(false);
    }
  };

  const loadTablesByDatabaseId = async (databaseId: string) => {
    try {
      const { data: tablesData, error } = await supabase
        .from('table_projects')
        .select('*')
        .eq('database_id', databaseId);
        
      if (error) {
        console.error('Error loading tables:', error);
        toast.error('Failed to load tables');
        setTables([]);
        return;
      }
      
      console.log('Loaded tables for database:', databaseId, tablesData);
      setTables((tablesData || []).map(table => ({
        id: table.id,
        name: table.name,
        schema: table.schema,
        records: Array.isArray(table.records) ? table.records : []
      })));
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Failed to load tables');
      setTables([]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call Claude AI via edge function
      const response = await supabase.functions.invoke('ai-chart-assistant', {
        body: {
          message: inputValue.trim(),
          context: {
            databases: databases.map(db => ({ id: db.id, name: db.name })),
            selectedDatabase: selectedDatabase?.name,
            availableTables: tables.map(table => ({
              name: table.name,
              schema: table.schema,
              recordCount: table.records?.length || 0
            })),
            componentId
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
        actions: response.data.actions || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle AI responses with sample data or chart configurations
      if (response.data.actions) {
        response.data.actions.forEach((action: any) => {
          if (action.type === 'add_dummy_data' && action.payload) {
            console.log('Adding dummy data:', action.payload);
            // Apply the dummy data to the chart configuration
            if (action.payload.data && action.payload.chartType) {
              const chartConfig = {
                type: action.payload.chartType,
                data: action.payload.data,
                options: {
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Sample Chart Data'
                    }
                  }
                }
              };
              onChartConfigUpdate(chartConfig);
              toast.success('Sample data added to chart!');
            }
          }
        });
      }

      // Parse AI response and handle chart configuration
      if (response.data.chartConfig) {
        console.log('Applying chart config from AI:', response.data.chartConfig);
        onChartConfigUpdate(response.data.chartConfig);
        toast.success('Chart configuration updated!');
      } else if (response.data.actions) {
        // Handle any actions in the response
        response.data.actions.forEach((action: any) => {
          if (action.type === 'add_dummy_data' && action.payload) {
            const chartConfig = {
              type: action.payload.chartType || 'bar',
              data: action.payload.data,
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Sample Chart Data'
                  }
                }
              }
            };
            onChartConfigUpdate(chartConfig);
            toast.success('Sample data added to chart!');
          }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request. Let me help you with some quick actions:',
        timestamp: new Date(),
        actions: [
          { type: 'add_dummy_data', label: 'Add Sample Data' },
          { type: 'connect_database', label: 'Connect Database' }
        ]
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error communicating with AI assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: any) => {
    switch (action.type) {
      case 'connect_database':
        if (databases.length === 0) {
          const connectMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: 'You don\'t have any databases connected yet. Please create a database first in the Databases section, then come back here to connect it to your chart.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, connectMessage]);
          toast.info('Please create a database first');
        } else {
          const dbMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `Great! I found ${databases.length} database${databases.length !== 1 ? 's' : ''} available. Which one would you like to use for your chart?`,
            timestamp: new Date(),
            actions: databases.map(db => ({
              type: 'select_database' as const,
              label: `📊 ${db.name}`,
              payload: { databaseId: db.id, databaseName: db.name }
            }))
          };
          setMessages(prev => [...prev, dbMessage]);
        }
        break;

      case 'select_database':
        const selectedDb = databases.find(db => db.id === action.payload.databaseId);
        if (selectedDb) {
          setSelectedDatabase(selectedDb);
          await loadTablesByDatabaseId(selectedDb.id);
          
          if (tables.length === 0) {
            const noTablesMessage: Message = {
              id: Date.now().toString(),
              type: 'assistant',
              content: `The database "${selectedDb.name}" doesn't have any tables yet. Please create some tables with data first, or use dummy data for now.`,
              timestamp: new Date(),
              actions: [{ type: 'add_dummy_data', label: 'Use Sample Data' }]
            };
            setMessages(prev => [...prev, noTablesMessage]);
          } else {
            const tableMessage: Message = {
              id: Date.now().toString(),
              type: 'assistant',
              content: `Connected to "${selectedDb.name}"! Found ${tables.length} table${tables.length !== 1 ? 's' : ''}. Which table would you like to use for your chart?`,
              timestamp: new Date(),
              actions: tables.map(table => ({
                type: 'select_table' as const,
                label: `📋 ${table.name} (${table.records?.length || 0} records)`,
                payload: { tableId: table.id, tableName: table.name }
              }))
            };
            setMessages(prev => [...prev, tableMessage]);
          }
        }
        break;

      case 'add_dummy_data':
        addDummyDataToChart();
        break;
    }
  };

  const addDummyDataToChart = () => {
    const dummyConfigs = [
      {
        chartType: 'bar',
        title: 'Monthly Sales Performance',
        dataSource: 'manual',
        data: [
          { month: 'Jan', sales: 4200, target: 4000 },
          { month: 'Feb', sales: 3800, target: 4200 },
          { month: 'Mar', sales: 5100, target: 4500 },
          { month: 'Apr', sales: 4700, target: 4800 },
          { month: 'May', sales: 5500, target: 5000 },
          { month: 'Jun', sales: 6200, target: 5500 }
        ],
        xAxisField: 'month',
        yAxisField: 'sales',
        showLegend: true,
        showGrid: true,
        colorScheme: 'blue'
      },
      {
        chartType: 'line',
        title: 'User Growth Over Time',
        dataSource: 'manual',
        data: [
          { date: '2024-01', users: 1200 },
          { date: '2024-02', users: 1850 },
          { date: '2024-03', users: 2300 },
          { date: '2024-04', users: 2800 },
          { date: '2024-05', users: 3200 },
          { date: '2024-06', users: 3900 }
        ],
        xAxisField: 'date',
        yAxisField: 'users',
        showLegend: true,
        showGrid: true,
        colorScheme: 'green'
      },
      {
        chartType: 'pie',
        title: 'Revenue Distribution by Category',
        dataSource: 'manual',
        data: [
          { name: 'Software', value: 45000 },
          { name: 'Hardware', value: 32000 },
          { name: 'Services', value: 28000 },
          { name: 'Support', value: 15000 }
        ],
        showLegend: true,
        colorScheme: 'purple'
      }
    ];

    const randomConfig = dummyConfigs[Math.floor(Math.random() * dummyConfigs.length)];
    onChartConfigUpdate(randomConfig);

    const dummyMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `🎯 I've added a sample "${randomConfig.title}" chart with dummy data so you can see how it looks! The chart is now populated with realistic sample data. You can modify the styling, chart type, and data in the configuration panel.`,
      timestamp: new Date(),
      actions: [
        { type: 'add_dummy_data', label: 'Try Another Sample' },
        { type: 'connect_database', label: 'Use Real Data' }
      ]
    };
    setMessages(prev => [...prev, dummyMessage]);
    toast.success('Sample chart data added successfully!');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Chart Assistant
            {selectedDatabase && (
              <Badge variant="secondary" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {selectedDatabase.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 p-4">
          <ScrollArea className="flex-1 pr-4 max-h-96">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      message.type === 'user' ? 'bg-primary' : 'bg-muted'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, index) => (
                            <Button
                              key={`${action.type}-${index}`}
                              size="sm"
                              variant={action.type === 'add_dummy_data' ? 'default' : 'outline'}
                              className="text-xs h-7"
                              onClick={() => handleAction(action)}
                            >
                              {action.type === 'connect_database' && <Database className="h-3 w-3 mr-1" />}
                              {action.type === 'select_table' && <Table className="h-3 w-3 mr-1" />}
                              {action.type === 'add_dummy_data' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Claude AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create a chart, connect database data, or add sample data..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputValue.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {databases.length > 0 && (
            <div className="text-xs text-muted-foreground">
              💡 You have {databases.length} database{databases.length !== 1 ? 's' : ''} available for charts
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};