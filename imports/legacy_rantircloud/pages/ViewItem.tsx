import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

export function ViewItem() {
  const { itemData } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    if (itemData) {
      try {
        const decodedItem = JSON.parse(decodeURIComponent(itemData));
        setItem(decodedItem);
      } catch (error) {
        console.error('Error parsing item data:', error);
        navigate('/');
      }
    }
  }, [itemData, navigate]);

  const renderFieldValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">No data</span>;
    }

    // Handle different data types
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center">
          {value ? (
            <span className="text-green-600 font-medium">✓ Yes</span>
          ) : (
            <span className="text-red-600 font-medium">✗ No</span>
          )}
        </div>
      );
    }

    // Check if it's a URL (simple check)
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
      return (
        <img 
          src={value} 
          alt={key}
          className="w-32 h-32 object-cover rounded-lg border"
          onError={(e) => {
            // If image fails to load, show as text
            const target = e.target as HTMLImageElement;
            target.outerHTML = `<span class="text-sm">${value}</span>`;
          }}
        />
      );
    }

    // Handle dates
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      } catch {
        // Fall through to default
      }
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  if (!item) {
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
              <h1 className="text-3xl font-bold mb-2">Item Details</h1>
              <p className="text-muted-foreground">View detailed information about this item</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const editUrl = `/edit-item/${encodeURIComponent(JSON.stringify(item))}`;
                  navigate(editUrl);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
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
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {key}
                    </Badge>
                    <span className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {formatFieldName(key)}
                    </span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 min-h-[48px] flex items-start border">
                    {renderFieldValue(key, value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}