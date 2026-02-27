import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code2, FileJson, Terminal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { DeploymentData } from './FlowDeploymentManager';

interface ApiDocumentationProps {
  deploymentData: DeploymentData | null;
  webhookUrl: string | null;
  flowName: string;
}

export function ApiDocumentation({
  deploymentData,
  webhookUrl,
  flowName,
}: ApiDocumentationProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState('curl');

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Code copied');
  };

  const allowedMethods = deploymentData?.allowed_methods || ['POST'];
  const parameters = (deploymentData?.api_parameters || []) as any[];

  const generateCurl = () => {
    const method = allowedMethods[0] || 'POST';
    const bodyParams = parameters.filter(p => p.in === 'body');
    const queryParams = parameters.filter(p => p.in === 'query');
    
    let url = webhookUrl || 'YOUR_ENDPOINT_URL';
    if (queryParams.length > 0) {
      const queryString = queryParams
        .map(p => `${p.name}=${p.type === 'string' ? `"value"` : 'value'}`)
        .join('&');
      url += `?${queryString}`;
    }

    const bodyJson = bodyParams.length > 0
      ? JSON.stringify(
          Object.fromEntries(bodyParams.map(p => [p.name, getExampleValue(p.type)])),
          null,
          2
        )
      : '{"key": "value"}';

    return `curl -X ${method} "${url}" \\
  -H "Content-Type: application/json" \\${deploymentData?.webhook_secret ? `
  -H "X-Webhook-Signature: sha256=YOUR_SIGNATURE" \\` : ''}
  -d '${bodyJson}'`;
  };

  const generateJavaScript = () => {
    const method = allowedMethods[0] || 'POST';
    const bodyParams = parameters.filter(p => p.in === 'body');
    
    const bodyObj = bodyParams.length > 0
      ? Object.fromEntries(bodyParams.map(p => [p.name, getExampleValue(p.type)]))
      : { key: 'value' };

    return `const response = await fetch("${webhookUrl || 'YOUR_ENDPOINT_URL'}", {
  method: "${method}",
  headers: {
    "Content-Type": "application/json",${deploymentData?.webhook_secret ? `
    "X-Webhook-Signature": "sha256=" + signature,` : ''}
  },
  body: JSON.stringify(${JSON.stringify(bodyObj, null, 4).split('\n').join('\n  ')}),
});

const data = await response.json();
console.log(data);`;
  };

  const generatePython = () => {
    const method = allowedMethods[0]?.toLowerCase() || 'post';
    const bodyParams = parameters.filter(p => p.in === 'body');
    
    const bodyObj = bodyParams.length > 0
      ? Object.fromEntries(bodyParams.map(p => [p.name, getExampleValue(p.type)]))
      : { key: 'value' };

    return `import requests

url = "${webhookUrl || 'YOUR_ENDPOINT_URL'}"
headers = {
    "Content-Type": "application/json",${deploymentData?.webhook_secret ? `
    "X-Webhook-Signature": f"sha256={signature}",` : ''}
}
data = ${JSON.stringify(bodyObj, null, 4)}

response = requests.${method}(url, json=data, headers=headers)
print(response.json())`;
  };

  const getExampleValue = (type: string) => {
    switch (type) {
      case 'number': return 123;
      case 'boolean': return true;
      case 'object': return {};
      case 'array': return [];
      default: return 'example';
    }
  };

  const getCodeExample = () => {
    switch (activeLanguage) {
      case 'curl': return generateCurl();
      case 'javascript': return generateJavaScript();
      case 'python': return generatePython();
      default: return generateCurl();
    }
  };

  if (!deploymentData?.is_deployed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Code2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Deploy your flow to view the API documentation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Endpoint Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            {flowName} API
          </CardTitle>
          <CardDescription>
            {deploymentData.api_description || 'API endpoint for your flow'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint Info */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Endpoint:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {webhookUrl}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Methods:</span>
              <div className="flex gap-1">
                {allowedMethods.map(method => (
                  <Badge key={method} variant="secondary" className="text-xs">
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters */}
          {parameters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Parameters</h4>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Location</th>
                      <th className="text-left px-3 py-2 font-medium">Required</th>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((param, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{param.name}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-xs">{param.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{param.in}</td>
                        <td className="px-3 py-2">
                          {param.required ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <span className="text-muted-foreground">Optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Code Examples
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyCode(getCodeExample(), activeLanguage)}
            >
              {copied === activeLanguage ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
            <TabsList className="mb-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent value={activeLanguage} className="mt-0">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {getCodeExample()}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Response Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "success": true,
  "executionId": "uuid",
  "executionTime": 150,
  "output": {
    // Your flow's response data
  }
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
