import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EditItem() {
  const { itemData } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [originalItem, setOriginalItem] = useState<any>(null);
  const [editedItem, setEditedItem] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (itemData) {
      try {
        const decodedItem = JSON.parse(decodeURIComponent(itemData));
        setOriginalItem(decodedItem);
        setEditedItem({ ...decodedItem });
      } catch (error) {
        console.error('Error parsing item data:', error);
        navigate('/');
      }
    }
  }, [itemData, navigate]);

  const handleFieldChange = (key: string, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderFieldEditor = (key: string, value: any) => {
    const fieldType = typeof value;
    
    // Handle boolean fields
    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={editedItem[key] || false}
            onCheckedChange={(checked) => handleFieldChange(key, checked)}
          />
          <Label className="text-sm">
            {editedItem[key] ? 'Yes' : 'No'}
          </Label>
        </div>
      );
    }

    // Handle long text fields
    if (typeof value === 'string' && (
      key.toLowerCase().includes('description') || 
      key.toLowerCase().includes('note') || 
      key.toLowerCase().includes('comment') ||
      (typeof value === 'string' && value.length > 100)
    )) {
      return (
        <Textarea
          value={editedItem[key] || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          placeholder={`Enter ${formatFieldName(key).toLowerCase()}`}
          rows={4}
          className="resize-none"
        />
      );
    }

    // Handle URLs/images
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
      return (
        <div className="space-y-2">
          <Input
            value={editedItem[key] || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            placeholder={`Enter ${formatFieldName(key).toLowerCase()}`}
            type="url"
          />
          {editedItem[key] && (
            <div className="mt-2">
              <img 
                src={editedItem[key]} 
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // Handle numbers
    if (fieldType === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
      return (
        <Input
          type="number"
          value={editedItem[key] || ''}
          onChange={(e) => handleFieldChange(key, e.target.value ? Number(e.target.value) : '')}
          placeholder={`Enter ${formatFieldName(key).toLowerCase()}`}
        />
      );
    }

    // Handle dates
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      let dateValue = '';
      try {
        if (editedItem[key]) {
          const date = new Date(editedItem[key]);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString().split('T')[0];
          }
        }
      } catch {
        dateValue = '';
      }

      return (
        <Input
          type="date"
          value={dateValue}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value).toISOString() : '';
            handleFieldChange(key, newDate);
          }}
        />
      );
    }

    // Default to text input
    return (
      <Input
        value={editedItem[key] || ''}
        onChange={(e) => handleFieldChange(key, e.target.value)}
        placeholder={`Enter ${formatFieldName(key).toLowerCase()}`}
      />
    );
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate save operation
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Item Updated",
        description: "The item has been successfully updated.",
      });
    }, 1000);
  };

  const hasChanges = () => {
    if (!originalItem) return false;
    return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
  };

  if (!originalItem) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Loading...</h2>
              <p className="text-muted-foreground">Please wait while we load the item details.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Item</h1>
              <p className="text-muted-foreground">Make changes to this item</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const viewUrl = `/view-item/${encodeURIComponent(JSON.stringify(editedItem))}`;
                  navigate(viewUrl);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges() || isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {Object.entries(originalItem).map(([key, value]) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {key}
                    </Badge>
                    <Label className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {formatFieldName(key)}
                    </Label>
                  </div>
                  {renderFieldEditor(key, value)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {hasChanges() && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You have unsaved changes. Don't forget to save your work!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}