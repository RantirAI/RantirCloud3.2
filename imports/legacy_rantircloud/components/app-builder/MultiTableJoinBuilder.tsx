import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, Table, Link, Plus, Trash2, ArrowRight, ArrowDown, 
  CheckCircle, AlertCircle, Info 
} from 'lucide-react';
import { DatabaseBindingField } from './properties/DatabaseBindingField';
import { supabase } from '@/integrations/supabase/client';

interface TableJoin {
  id: string;
  table: any;
  joinType: 'inner' | 'left' | 'right' | 'full';
  primaryKey: string;
  foreignKey: string;
  alias?: string;
}

interface MultiTableJoinBuilderProps {
  primaryTable: any;
  joins: TableJoin[];
  onPrimaryTableChange: (table: any) => void;
  onJoinsChange: (joins: TableJoin[]) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function MultiTableJoinBuilder({
  primaryTable,
  joins,
  onPrimaryTableChange,
  onJoinsChange,
  onValidationChange
}: MultiTableJoinBuilderProps) {
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAvailableTables();
  }, []);

  useEffect(() => {
    validateJoins();
  }, [primaryTable, joins]);

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

  const validateJoins = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!primaryTable) {
      errors.primaryTable = 'Primary table is required';
      isValid = false;
    }

    joins.forEach((join, index) => {
      if (!join.table) {
        errors[`join-${join.id}-table`] = 'Table selection is required';
        isValid = false;
      }
      
      if (!join.primaryKey.trim()) {
        errors[`join-${join.id}-primaryKey`] = 'Primary key is required';
        isValid = false;
      }
      
      if (!join.foreignKey.trim()) {
        errors[`join-${join.id}-foreignKey`] = 'Foreign key is required';
        isValid = false;
      }

      // Check for duplicate table names
      const duplicateTable = joins.find((otherJoin, otherIndex) => 
        otherIndex !== index && 
        otherJoin.table?.name === join.table?.name
      );
      
      if (duplicateTable) {
        errors[`join-${join.id}-duplicate`] = 'This table is already joined';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    onValidationChange?.(isValid);
  };

  const addJoin = () => {
    const newJoin: TableJoin = {
      id: `join-${Date.now()}`,
      table: null,
      joinType: 'left',
      primaryKey: '',
      foreignKey: '',
      alias: ''
    };

    onJoinsChange([...joins, newJoin]);
  };

  const updateJoin = (joinId: string, updates: Partial<TableJoin>) => {
    const updatedJoins = joins.map(join =>
      join.id === joinId ? { ...join, ...updates } : join
    );
    onJoinsChange(updatedJoins);
  };

  const removeJoin = (joinId: string) => {
    const updatedJoins = joins.filter(join => join.id !== joinId);
    onJoinsChange(updatedJoins);
  };

  const getJoinTypeColor = (joinType: string) => {
    const colors = {
      inner: 'bg-blue-100 text-blue-800',
      left: 'bg-green-100 text-green-800',
      right: 'bg-yellow-100 text-yellow-800',
      full: 'bg-purple-100 text-purple-800'
    };
    return colors[joinType as keyof typeof colors] || colors.left;
  };

  const getJoinTypeDescription = (joinType: string) => {
    const descriptions = {
      inner: 'Only records that have matches in both tables',
      left: 'All records from primary table, matching records from joined table',
      right: 'All records from joined table, matching records from primary table',
      full: 'All records from both tables'
    };
    return descriptions[joinType as keyof typeof descriptions] || '';
  };

  const getAvailableFields = (table: any) => {
    return table?.fields || [];
  };

  return (
    <div className="space-y-6">
      {/* Primary Table Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Primary Table</CardTitle>
            {primaryTable && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        </CardHeader>
        <CardContent>
          <DatabaseBindingField
            label="Select Primary Table"
            value={primaryTable}
            onChange={onPrimaryTableChange}
            description="This will be the main table that other tables join to"
          />
          {validationErrors.primaryTable && (
            <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              {validationErrors.primaryTable}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Table Joins</CardTitle>
              <Badge variant="outline">{joins.length} joins</Badge>
            </div>
            <Button
              onClick={addJoin}
              disabled={!primaryTable}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Join
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {joins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No table joins configured</p>
              <p className="text-xs">
                {primaryTable 
                  ? "Click 'Add Join' to connect additional tables"
                  : "Select a primary table first"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {joins.map((join, index) => (
                <div key={join.id} className="space-y-4">
                  {index > 0 && <Separator />}
                  
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {/* Join Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getJoinTypeColor(join.joinType)}>
                              {join.joinType.toUpperCase()} JOIN
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Join #{index + 1}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeJoin(join.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Table Selection */}
                        <div className="space-y-2">
                          <DatabaseBindingField
                            label="Table to Join"
                            value={join.table}
                            onChange={(table) => updateJoin(join.id, { table })}
                            description=""
                          />
                          {validationErrors[`join-${join.id}-table`] && (
                            <div className="flex items-center gap-1 text-sm text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors[`join-${join.id}-table`]}
                            </div>
                          )}
                          {validationErrors[`join-${join.id}-duplicate`] && (
                            <div className="flex items-center gap-1 text-sm text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors[`join-${join.id}-duplicate`]}
                            </div>
                          )}
                        </div>

                        {/* Join Configuration Grid */}
                        <div className="grid grid-cols-12 gap-3 items-end">
                          {/* Join Type */}
                          <div className="col-span-3">
                            <Label className="text-xs">Join Type</Label>
                            <Select
                              value={join.joinType}
                              onValueChange={(value: 'inner' | 'left' | 'right' | 'full') => 
                                updateJoin(join.id, { joinType: value })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inner">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Inner
                                  </div>
                                </SelectItem>
                                <SelectItem value="left">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Left
                                  </div>
                                </SelectItem>
                                <SelectItem value="right">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Right
                                  </div>
                                </SelectItem>
                                <SelectItem value="full">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    Full
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Primary Key */}
                          <div className="col-span-4">
                            <Label className="text-xs">Primary Table Key</Label>
                            <Select
                              value={join.primaryKey}
                              onValueChange={(value) => updateJoin(join.id, { primaryKey: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select key field" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableFields(primaryTable).map((field: any) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs px-1">
                                        {field.type}
                                      </Badge>
                                      {field.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors[`join-${join.id}-primaryKey`] && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                                <AlertCircle className="h-2 w-2" />
                                {validationErrors[`join-${join.id}-primaryKey`]}
                              </div>
                            )}
                          </div>

                          {/* Equals Sign */}
                          <div className="col-span-1 flex justify-center">
                            <div className="text-muted-foreground font-mono">=</div>
                          </div>

                          {/* Foreign Key */}
                          <div className="col-span-4">
                            <Label className="text-xs">Joined Table Key</Label>
                            <Select
                              value={join.foreignKey}
                              onValueChange={(value) => updateJoin(join.id, { foreignKey: value })}
                              disabled={!join.table}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select key field" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableFields(join.table).map((field: any) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs px-1">
                                        {field.type}
                                      </Badge>
                                      {field.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors[`join-${join.id}-foreignKey`] && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                                <AlertCircle className="h-2 w-2" />
                                {validationErrors[`join-${join.id}-foreignKey`]}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Join Type Description */}
                        {join.joinType && (
                          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                            <Info className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="font-medium">{join.joinType.toUpperCase()} JOIN:</p>
                              <p className="text-muted-foreground">
                                {getJoinTypeDescription(join.joinType)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Table Alias */}
                        <div className="space-y-2">
                          <Label className="text-xs">Table Alias (Optional)</Label>
                          <Input
                            className="h-8 text-xs"
                            value={join.alias || ''}
                            onChange={(e) => updateJoin(join.id, { alias: e.target.value })}
                            placeholder={`Alias for ${join.table?.name || 'table'}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use an alias to avoid field name conflicts and make queries clearer
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join Summary */}
      {primaryTable && joins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Join Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Table className="h-4 w-4 text-primary" />
                <span className="font-medium">{primaryTable.name}</span>
                <span className="text-muted-foreground">(Primary)</span>
              </div>
              
              {joins.map((join, index) => (
                <div key={join.id} className="flex items-center gap-2 text-sm ml-4">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge className={`${getJoinTypeColor(join.joinType)} text-xs`}>
                    {join.joinType.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{join.table?.name || 'Unknown'}</span>
                  {join.alias && (
                    <span className="text-muted-foreground">as {join.alias}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    on {primaryTable.name}.{join.primaryKey} = {join.table?.name || 'table'}.{join.foreignKey}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}