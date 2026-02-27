import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { parseCsvToSubscribers } from '@/utils/importCsvData';

export default function ImportSubscribers() {
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [autoImporting, setAutoImporting] = useState(false);
  const { toast } = useToast();

  // Auto-import the uploaded CSV file
  useEffect(() => {
    const importUploadedFile = async () => {
      const uploadedCsv = `customer_id,Workspace Name,name,plan_description,email,subscription_monthly_value,gross_volume,payment_count,refund_volume,dispute_losses,first_payment,last_payment,WF Order Id (metadata),WF Cart Updated On (metadata),WF Cart Started On (metadata),WF Full Name (metadata),WF Cart Id (metadata),tenant_id (metadata),msAppId (metadata),msMemberId (metadata)
cus_StnLAnGq4nQlEj,Relevant Training,William Nations,Enterprise-Starter,william@relevant.training,799,1598,2,799,0,8/20/2025 0:21,9/20/2025 1:22,,,,,,,,
cus_Rw6aCEvGa7GnAc,FuegoUX,Nate Wearin,Enterprise-Lite,nate.wearin@fuegoux.com,299,2093,7,0,0,3/13/2025 16:15,9/13/2025 17:14,,,,,,,,
cus_Qrxd9FvhJ6vIFx,Kikoff,Kevin Otsuka,Enterprise,samuel@kikoff.com,3999,51987,13,0,0,9/18/2024 2:34,9/18/2025 3:36,,,,,,,,
cus_RbYdKUsDOGX8ob,OnSiteHeadshots,Brian Dow,Enterprise-Lite,brian@signatureheadshotsorlando.com,299,2691,9,0,0,1/17/2025 19:50,9/17/2025 20:50,,,,,,,,
cus_Of7U26Kfck4Q42,DrBaker,Susan a baker,Enterprise-Starter,susan@susanbakermd.com,399,23472,25,0,0,9/18/2023 19:37,9/18/2025 20:38,,,,,,,,
cus_T02psd1AXLc36V,TravelInsured,Sherry Sutton,Enterprise,ssutton@travelinsured.com,1499,1499,1,0,0,9/5/2025 16:45,9/5/2025 16:45,,,,,,,,
cus_P5W3eoHsOOMe91,LeaseLeads,David Freund,User,dave@leaseleads.co,49,500,1,0,0,11/28/2023 6:46,11/28/2023 6:46,,,,,,,,
cus_SjwraPm7x3Cxwb,TypeIII,Gidget Brestel,Enterprise-Lite,gidget@typeiii.tech,299,598,2,0,0,7/24/2025 17:31,8/24/2025 18:32,,,,,,,,
cus_SzBbYZ1jC2LfYO,LocalContent,Glenn Vickers II,Enterprise-Starter,gvickers@mrvgroup.org,999,999,1,0,0,9/3/2025 9:44,9/3/2025 9:44,,,,,,,,
cus_SeUlK0Kwdv9Oxq,Elaren,Amber Smith,Enterprise-Starter,amber_kate@hotmail.com,599,1797,3,0,0,7/10/2025 4:08,9/10/2025 5:10,,,,,,,,
cus_OkkaIvSivrsz3e,TheDataGroup,Paul Kent Graeve,Enterprise-Lite,graeve@thedatagroup.cloud,299,6900,3,0,0,10/3/2023 22:03,11/29/2023 14:52,,,,,,,,
cus_RFQzfqei91ZENk,MarjenTech,Raj Croager,Enterprise-Lite,rcroager@marjentech.com,249,820,2,0,0,11/19/2024 18:58,12/9/2024 17:00,,,,,,,,`;

      if (uploadedCsv && !autoImporting && !results) {
        setAutoImporting(true);
        setCsvData(uploadedCsv);
        
        toast({
          title: 'Auto-importing uploaded file',
          description: 'Processing your CSV file...'
        });

        try {
          const parsedData = parseCsvToSubscribers(uploadedCsv);
          console.log('Parsed subscriber data:', parsedData);

          const { data, error } = await supabase.functions.invoke('import-subscribers', {
            body: { csvData: parsedData }
          });

          if (error) {
            throw error;
          }

          setResults(data);
          toast({
            title: 'Auto-import Completed',
            description: `Successfully imported ${data.summary.successful} out of ${data.summary.total} subscribers`
          });

        } catch (error: any) {
          console.error('Auto-import error:', error);
          toast({
            title: 'Auto-import Failed',
            description: error.message || 'An error occurred during import',
            variant: 'destructive'
          });
        } finally {
          setAutoImporting(false);
        }
      }
    };

    // Small delay to ensure component is mounted
    setTimeout(importUploadedFile, 1000);
  }, []);

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter CSV data to import',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setResults(null);

    try {
      // Parse CSV data (simple parsing - assumes comma-separated with headers)
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      console.log('Parsed data:', parsedData);

      const { data, error } = await supabase.functions.invoke('import-subscribers', {
        body: { csvData: parsedData }
      });

      if (error) {
        throw error;
      }

      setResults(data);
      toast({
        title: 'Import Completed',
        description: `Successfully imported ${data.summary.successful} out of ${data.summary.total} subscribers`
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const sampleCsv = `email,name,plan
john@example.com,John Doe,Professional
jane@example.com,Jane Smith,Personal
bob@company.com,Bob Johnson,Enterprise Starter`;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Import Subscribers</h1>
          <p className="text-muted-foreground mt-2">
            Import subscriber data from CSV format. All accounts will be created with password "rantir2025".
          </p>
        </div>

        {autoImporting && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-600">
                <FileText className="h-5 w-5 animate-pulse" />
                <span>Auto-importing your uploaded CSV file...</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV Data Import
            </CardTitle>
            <CardDescription>
              Your uploaded file is being processed automatically, or paste CSV data below manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sample CSV Format:</label>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {sampleCsv}
              </pre>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Your CSV Data:</label>
              <Textarea
                placeholder="Paste your CSV data here..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleImport} 
              disabled={isImporting || !csvData.trim()}
              className="w-full"
            >
              {isImporting ? 'Importing...' : 'Import Subscribers'}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded">
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.summary?.total || 0}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.summary?.successful || 0}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.summary?.errors || 0}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {results.results && results.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Detailed Results:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {results.results.map((result: any, index: number) => (
                      <div key={index} className={`flex items-center justify-between p-2 rounded text-sm ${
                        result.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        <span>{result.email}</span>
                        <span className="font-medium">
                          {result.status === 'success' ? '✓ Success' : `✗ ${result.error}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">After importing:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>All accounts will have password: <code className="bg-muted px-1 rounded">rantir2025</code></li>
              <li>Check the database tables: billing_plans, workspaces, workspace_plans, workspace_members</li>
              <li>Verify users can log in with their email and the password</li>
              <li>Check that workspaces are created and assigned to users</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}