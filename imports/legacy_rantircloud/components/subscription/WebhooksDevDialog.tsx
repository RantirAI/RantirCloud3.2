import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Code, Copy, Globe, Key, Settings, Webhook } from "lucide-react";
import { subscriptionService, EmbedConfiguration } from "@/services/subscriptionService";
import { useAuth } from "@/hooks/useAuth";
interface WebhooksDevDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableProjectId: string;
}
export function WebhooksDevDialog({
  isOpen,
  onClose,
  tableProjectId
}: WebhooksDevDialogProps) {
  const {
    user
  } = useAuth();
  const [embedConfigs, setEmbedConfigs] = useState<EmbedConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  useEffect(() => {
    if (isOpen && user) {
      loadEmbedConfigurations();
      generateApiKey();
    }
  }, [isOpen, user, tableProjectId]);
  const loadEmbedConfigurations = async () => {
    try {
      setIsLoading(true);
      const data = await subscriptionService.getEmbedConfigurations(tableProjectId);
      setEmbedConfigs(data);
    } catch (error: any) {
      toast.error("Failed to load embed configurations", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const generateApiKey = () => {
    const key = `sk_${tableProjectId.slice(0, 8)}_${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
  };
  const generateAuthFormsEmbed = () => {
    return `<!-- Authentication Forms Embed -->
<div id="auth-forms-container"></div>
<script>
(function() {
  const API_KEY = '${apiKey}';
  const TABLE_PROJECT_ID = '${tableProjectId}';
  const BASE_URL = 'YOUR_API_ENDPOINT';
  
  // Create login form
  function createLoginForm() {
    return \`
      <form id="login-form" class="auth-form">
        <h3>Login</h3>
        <div class="form-group">
          <input type="email" id="login-email" placeholder="Email" required />
        </div>
        <div class="form-group">
          <input type="password" id="login-password" placeholder="Password" required />
        </div>
        <button type="submit">Login</button>
        <p><a href="#" onclick="showSignupForm()">Need an account? Sign up</a></p>
        <p><a href="#" onclick="showForgotForm()">Forgot password?</a></p>
      </form>
    \`;
  }
  
  // Create signup form
  function createSignupForm() {
    return \`
      <form id="signup-form" class="auth-form">
        <h3>Sign Up</h3>
        <div class="form-group">
          <input type="email" id="signup-email" placeholder="Email" required />
        </div>
        <div class="form-group">
          <input type="password" id="signup-password" placeholder="Password" required />
        </div>
        <div class="form-group">
          <select id="subscription-plan" required>
            <option value="">Select a plan</option>
            <!-- Plans will be loaded dynamically -->
          </select>
        </div>
        <button type="submit">Sign Up</button>
        <p><a href="#" onclick="showLoginForm()">Already have an account? Login</a></p>
      </form>
    \`;
  }
  
  // Create forgot password form
  function createForgotForm() {
    return \`
      <form id="forgot-form" class="auth-form">
        <h3>Reset Password</h3>
        <div class="form-group">
          <input type="email" id="forgot-email" placeholder="Email" required />
        </div>
        <button type="submit">Send Reset Link</button>
        <p><a href="#" onclick="showLoginForm()">Back to login</a></p>
      </form>
    \`;
  }
  
  // Form switching functions
  window.showLoginForm = () => {
    document.getElementById('auth-forms-container').innerHTML = createLoginForm();
    setupFormHandlers();
  };
  
  window.showSignupForm = () => {
    document.getElementById('auth-forms-container').innerHTML = createSignupForm();
    loadSubscriptionPlans();
    setupFormHandlers();
  };
  
  window.showForgotForm = () => {
    document.getElementById('auth-forms-container').innerHTML = createForgotForm();
    setupFormHandlers();
  };
  
  // Load subscription plans
  async function loadSubscriptionPlans() {
    try {
      const response = await fetch(\`\${BASE_URL}/subscription-plans?project=\${TABLE_PROJECT_ID}\`, {
        headers: { 'Authorization': \`Bearer \${API_KEY}\` }
      });
      const plans = await response.json();
      
      const select = document.getElementById('subscription-plan');
      plans.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = \`\${plan.name} - $\${plan.price}/\${plan.billing_period}\`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  }
  
  // Setup form event handlers
  function setupFormHandlers() {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.addEventListener('submit', handleFormSubmit);
    });
  }
  
  // Handle form submissions
  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      let endpoint = '';
      let data = {};
      
      if (form.id === 'login-form') {
        endpoint = '/auth/login';
        data = {
          email: form.querySelector('#login-email').value,
          password: form.querySelector('#login-password').value,
          tableProjectId: TABLE_PROJECT_ID
        };
      } else if (form.id === 'signup-form') {
        endpoint = '/auth/signup';
        data = {
          email: form.querySelector('#signup-email').value,
          password: form.querySelector('#signup-password').value,
          planId: form.querySelector('#subscription-plan').value,
          tableProjectId: TABLE_PROJECT_ID
        };
      } else if (form.id === 'forgot-form') {
        endpoint = '/auth/forgot-password';
        data = {
          email: form.querySelector('#forgot-email').value,
          tableProjectId: TABLE_PROJECT_ID
        };
      }
      
      const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${API_KEY}\`
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (form.id === 'login-form') {
          localStorage.setItem('authToken', result.token);
          window.location.reload();
        } else {
          alert('Success! Check your email for next steps.');
        }
      } else {
        alert(result.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('An error occurred. Please try again.');
    }
  }
  
  // Initialize with login form
  showLoginForm();
  
  // Add basic styles
  const style = document.createElement('style');
  style.textContent = \`
    .auth-form {
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .auth-form input, .auth-form select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .auth-form button {
      width: 100%;
      padding: 12px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
    }
    .auth-form button:hover {
      background: #005a8b;
    }
    .auth-form a {
      color: #007cba;
      text-decoration: none;
    }
    .auth-form a:hover {
      text-decoration: underline;
    }
  \`;
  document.head.appendChild(style);
})();
</script>`;
  };
  const generateAccessCheckEmbed = () => {
    return `<!-- Access Check API Embed -->
<script>
(function() {
  const API_KEY = '${apiKey}';
  const TABLE_PROJECT_ID = '${tableProjectId}';
  const BASE_URL = 'YOUR_API_ENDPOINT';
  
  // Access checking function
  window.checkUserAccess = async function(gatedContentId, userId) {
    try {
      const response = await fetch(\`\${BASE_URL}/check-access\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${API_KEY}\`
        },
        body: JSON.stringify({
          gatedContentId,
          userId,
          tableProjectId: TABLE_PROJECT_ID
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Access check failed:', error);
      return { hasAccess: false, error: true };
    }
  };
  
  // Auto-check access on page load
  window.autoCheckAccess = async function() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return false;
    
    // Extract user ID from token (you may need to implement this differently)
    const userId = JSON.parse(atob(authToken.split('.')[1])).sub;
    
    const elements = document.querySelectorAll('[data-ms-gated]');
    for (const element of elements) {
      const gatedContentId = element.getAttribute('data-ms-gated');
      const result = await checkUserAccess(gatedContentId, userId);
      
      if (result.hasAccess) {
        element.style.display = 'block';
        element.removeAttribute('data-gated');
      } else {
        element.style.display = 'none';
        element.setAttribute('data-gated', 'true');
      }
    }
  };
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoCheckAccess);
  } else {
    autoCheckAccess();
  }
})();
</script>`;
  };
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };
  const saveWebhookConfig = async () => {
    if (!user) return;
    try {
      await subscriptionService.createEmbedConfiguration({
        table_project_id: tableProjectId,
        embed_type: 'auth_forms',
        configuration: {
          webhook_url: webhookUrl,
          api_key: apiKey
        },
        is_active: true,
        user_id: user.id
      });
      toast.success("Webhook configuration saved");
      await loadEmbedConfigurations();
    } catch (error: any) {
      toast.error("Failed to save webhook configuration", {
        description: error.message
      });
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Webhooks & Development Tools
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api" className="space-y-4 px-[16px] py-[16px]">
          <TabsList className="w-fit">
            <TabsTrigger value="api" className="data-[state=active]:my-[2px]">API Keys</TabsTrigger>
            <TabsTrigger value="auth-embed" className="data-[state=active]:my-[2px]">Auth Forms</TabsTrigger>
            <TabsTrigger value="access-embed" className="data-[state=active]:my-[2px]">Access Check</TabsTrigger>
            <TabsTrigger value="webhooks" className="data-[state=active]:my-[2px]">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input value={apiKey} readOnly className="font-mono text-sm" />
                    <Button variant="outline" onClick={() => copyToClipboard(apiKey, "API Key")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={generateApiKey}>
                      Regenerate
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Table Project ID</Label>
                  <div className="flex gap-2">
                    <Input value={tableProjectId} readOnly className="font-mono text-sm" />
                    <Button variant="outline" onClick={() => copyToClipboard(tableProjectId, "Project ID")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">API Endpoints</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <div>POST /auth/login</div>
                    <div>POST /auth/signup</div>
                    <div>POST /auth/forgot-password</div>
                    <div>POST /check-access</div>
                    <div>GET /subscription-plans</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth-embed" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Authentication Forms Embed</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateAuthFormsEmbed(), "Auth Forms Embed")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add this code to your website's &lt;head&gt; section to embed authentication forms.
                </p>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                  {generateAuthFormsEmbed()}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access-embed" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Access Check Embed</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateAccessCheckEmbed(), "Access Check Embed")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add this code to check user access and control content visibility.
                </p>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                  {generateAccessCheckEmbed()}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">1. Mark gated content in Webflow:</h4>
                  <pre className="bg-muted p-2 rounded text-sm mt-2">
                    {`<div data-ms-gated="GATED_CONTENT_ID">
  This content requires a subscription
</div>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium">2. The script will automatically:</h4>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Check user authentication status</li>
                    <li>Verify subscription access</li>
                    <li>Show/hide content based on permissions</li>
                    <li>Log access attempts for analytics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="h-4 w-4" />
                  Webhook Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://your-site.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                </div>

                <Button onClick={saveWebhookConfig} className="w-full">
                  Save Webhook Configuration
                </Button>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Webhook Events</h4>
                  <div className="space-y-1 text-sm">
                    <div>• user.signup - New user registration</div>
                    <div>• user.login - User login</div>
                    <div>• subscription.created - New subscription</div>
                    <div>• subscription.cancelled - Subscription cancelled</div>
                    <div>• access.granted - Content access granted</div>
                    <div>• access.denied - Content access denied</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>;
}