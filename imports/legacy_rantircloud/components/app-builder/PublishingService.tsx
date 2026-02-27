import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink, QrCode, Globe, Lock, Eye, Calendar, BarChart3, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface PublishingServiceProps {
  onClose: () => void;
}

interface PublishedApp {
  id: string;
  app_project_id: string;
  slug: string;
  custom_domain?: string;
  status: string;
  access_type: 'public' | 'password';
  views: number;
  unique_visitors: number;
  created_at: string;
  updated_at: string;
}

interface CustomDomain {
  id: string;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  dns_verified: boolean;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed';
  verification_token?: string;
}

const PublishingService: React.FC<PublishingServiceProps> = ({ onClose }) => {
  const { id: projectId } = useParams();
  const [isPublished, setIsPublished] = useState(false);
  const [publishedApp, setPublishedApp] = useState<PublishedApp | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get current hostname for subdomain generation
  const currentHostname = window.location.hostname;
  const publishedUrl = `${projectId}.${currentHostname}`;

  useEffect(() => {
    if (projectId) {
      loadPublishedApp();
    }
  }, [projectId]);

  const loadPublishedApp = async () => {
    try {
      const { data: publishedApps, error } = await supabase
        .from('published_apps')
        .select('*')
        .eq('app_project_id', projectId);

      if (error) throw error;

      if (publishedApps && publishedApps.length > 0) {
        const app = publishedApps[0];
        setPublishedApp(app as PublishedApp);
        setIsPublished(true);
        setIsPublic(app.access_type === 'public');
        setCustomSlug(app.slug);
        loadCustomDomains(app.id);
      }
    } catch (error) {
      console.error('Error loading published app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomDomains = async (publishedAppId: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('published_app_id', publishedAppId);

      if (error) throw error;
      setCustomDomains((data || []) as CustomDomain[]);
    } catch (error) {
      console.error('Error loading custom domains:', error);
    }
  };

  const handlePublish = async () => {
    if (!projectId) return;
    
    setIsPublishing(true);
    
    try {
      // Use the project ID as the subdomain
      const slug = projectId;
      
      const { data, error } = await supabase.functions.invoke('publish-app', {
        body: {
          appProjectId: projectId,
          slug: slug,
          accessType: isPublic ? 'public' : 'password',
          password: isPublic ? undefined : password
        }
      });

      if (error) throw error;

      setPublishedApp(data.publishedApp);
      setIsPublished(true);
      toast.success(`App published at ${publishedUrl}!`);
      
      // Reload to get updated data
      await loadPublishedApp();
    } catch (error) {
      console.error('Error publishing app:', error);
      toast.error('Failed to publish app');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const openPreview = () => {
    if (publishedApp) {
      const baseUrl = publishedApp.custom_domain 
        ? `https://${publishedApp.custom_domain}`
        : `${window.location.protocol}//${publishedUrl}`;
      window.open(baseUrl, '_blank');
    }
  };

  const generateEmbedCode = () => {
    if (!publishedApp) return '';
    const baseUrl = publishedApp.custom_domain 
      ? `https://${publishedApp.custom_domain}`
      : `${window.location.protocol}//${publishedUrl}`;
    return `<iframe src="${baseUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const addCustomDomain = async () => {
    if (!publishedApp || !newDomain.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-domains', {
        body: {
          publishedAppId: publishedApp.id,
          domain: newDomain.trim(),
          action: 'add'
        }
      });

      if (error) throw error;

      setCustomDomains([...customDomains, data.customDomain]);
      setNewDomain('');
      toast.success('Custom domain added! Please follow the DNS instructions.');
    } catch (error) {
      console.error('Error adding custom domain:', error);
      toast.error('Failed to add custom domain');
    }
  };

  const verifyDomain = async (domain: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-domains', {
        body: {
          publishedAppId: publishedApp?.id,
          domain,
          action: 'verify'
        }
      });

      if (error) throw error;

      // Update the domain in the list
      setCustomDomains(customDomains.map(d => 
        d.domain === domain ? data.customDomain : d
      ));

      if (data.verified) {
        toast.success('Domain verified successfully!');
        await loadPublishedApp(); // Reload to get updated app data
      } else {
        toast.error('Domain verification failed. Please check your DNS settings.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    }
  };

  const removeDomain = async (domain: string) => {
    if (!publishedApp) return;

    try {
      const { error } = await supabase.functions.invoke('manage-domains', {
        body: {
          publishedAppId: publishedApp.id,
          domain,
          action: 'remove'
        }
      });

      if (error) throw error;

      setCustomDomains(customDomains.filter(d => d.domain !== domain));
      toast.success('Custom domain removed');
      await loadPublishedApp(); // Reload to get updated app data
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Failed to remove domain');
    }
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isPublished && publishedApp) {
    const appUrl = publishedApp.custom_domain 
      ? `https://${publishedApp.custom_domain}`
      : `${window.location.protocol}//${publishedUrl}`;

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              App Published Successfully
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="domains">Domains</TabsTrigger>
                <TabsTrigger value="share">Share</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Live App URL</CardTitle>
                    <CardDescription>Your app is now live at this URL</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-sm font-mono">{appUrl}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(appUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openPreview}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Publication Info</CardTitle>
                    <CardDescription>App status and settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {publishedApp.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Access</span>
                      <Badge variant={publishedApp.access_type === 'public' ? "secondary" : "outline"}>
                        {publishedApp.access_type === 'public' ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Password Protected
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Published</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(publishedApp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Views</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {publishedApp.views.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Unique Visitors</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BarChart3 className="h-3 w-3" />
                        {publishedApp.unique_visitors.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="domains" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Domains</CardTitle>
                  <CardDescription>
                    Add your own custom domain to make your app accessible at your own URL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="yourdomain.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                    <Button onClick={addCustomDomain} disabled={!newDomain.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Domain
                    </Button>
                  </div>

                  {customDomains.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Your Custom Domains</Label>
                      {customDomains.map((domain) => (
                        <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{domain.domain}</div>
                            <div className="text-sm text-muted-foreground">
                              Status: {domain.verification_status} • 
                              DNS: {domain.dns_verified ? 'Verified' : 'Pending'} • 
                              SSL: {domain.ssl_status}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {domain.verification_status !== 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verifyDomain(domain.domain)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Verify
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeDomain(domain.domain)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {customDomains.length > 0 && customDomains.some(d => d.verification_status === 'pending') && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-3">DNS Setup Instructions</h4>
                      <div className="text-sm space-y-4">
                        <div>
                          <p className="font-medium text-blue-900 mb-2">Step 1: Choose Your DNS Setup Method</p>
                          
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded border">
                              <p className="font-medium text-sm mb-2">Option A: Subdomain (Recommended)</p>
                              <div className="font-mono text-xs space-y-1">
                                <div><strong>Type:</strong> CNAME</div>
                                <div><strong>Name:</strong> www (or any subdomain like app, portal, etc.)</div>
                                <div><strong>Value:</strong> {currentHostname === 'localhost' ? 'your-app-domain.com.' : `${currentHostname}.`}</div>
                                <div><strong>TTL:</strong> 300</div>
                              </div>
                              <p className="text-green-600 text-xs mt-2">✅ This will make your app available at www.yourdomain.com</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded border">
                              <p className="font-medium text-sm mb-2">Option B: Root Domain (A Record)</p>
                              <div className="font-mono text-xs space-y-1">
                                <div><strong>Type:</strong> A</div>
                                <div><strong>Name:</strong> @ (or leave blank)</div>
                                <div><strong>Value:</strong> [Contact your hosting provider for the IP address]</div>
                                <div><strong>TTL:</strong> 300</div>
                              </div>
                              <p className="text-blue-600 text-xs mt-2">ℹ️ This makes your app available at yourdomain.com (no www)</p>
                            </div>
                          </div>
                        </div>
                        
                        {customDomains.filter(d => d.verification_status === 'pending').map(domain => (
                          <div key={domain.id} className="bg-white p-3 rounded border">
                            <p className="font-medium text-blue-900 mb-2">Step 2 for {domain.domain}: Add TXT Record</p>
                            <div className="font-mono text-xs space-y-1">
                              <div><strong>Type:</strong> TXT</div>
                              <div><strong>Name:</strong> _rantir-verification.{domain.domain}</div>
                              <div><strong>Value:</strong> {domain.verification_token || 'Loading...'}</div>
                              <div><strong>TTL:</strong> 300 (or Auto)</div>
                              {domain.verification_token && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(domain.verification_token!)}
                                  className="h-6 px-2 text-xs mt-2"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Token
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <div className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                          <p className="font-medium text-red-800 mb-1">⚠️ Why "@" Doesn't Work with CNAME:</p>
                          <ul className="text-red-700 text-xs space-y-1">
                            <li>• CNAME records cannot be used for root domains (@) - this is a DNS standard</li>
                            <li>• Use "www" or another subdomain name instead</li>
                            <li>• For root domain, you need A records (requires IP address from hosting provider)</li>
                          </ul>
                        </div>
                        
                        <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                          <p className="font-medium text-orange-800 mb-1">Important Notes:</p>
                          <ul className="text-orange-700 text-xs space-y-1">
                            <li>• Most users choose Option A (www subdomain) as it's easier to set up</li>
                            <li>• DNS changes can take up to 24-48 hours to propagate globally</li>
                            <li>• You can check your DNS settings at <a href="https://dnschecker.org" target="_blank" className="underline">dnschecker.org</a></li>
                            <li>• Contact your hosting provider if you need help with DNS settings</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Share Your App</CardTitle>
                  <CardDescription>
                    Share your app with others using these options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Direct Link</Label>
                    <div className="flex gap-2">
                      <Input value={appUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(appUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <QRCodeSVG value={appUrl} size={200} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Embed Your App</CardTitle>
                  <CardDescription>
                    Embed your app in other websites using this code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Embed Code</Label>
                    <div className="space-y-2">
                      <textarea
                        readOnly
                        value={generateEmbedCode()}
                        className="w-full p-3 border rounded-lg font-mono text-sm resize-none"
                        rows={3}
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(generateEmbedCode())}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Embed Code
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Overview</CardTitle>
                  <CardDescription>
                    Track your app's performance and visitor engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{publishedApp.views}</div>
                      <div className="text-sm text-muted-foreground">Total Views</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{publishedApp.unique_visitors}</div>
                      <div className="text-sm text-muted-foreground">Unique Visitors</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {publishedApp.unique_visitors > 0 ? Math.round(publishedApp.views / publishedApp.unique_visitors * 100) / 100 : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Views per Visitor</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => { setIsPublished(false); setPublishedApp(null); }}>
              Update Settings
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Publish Your App
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Publish Your App</h3>
                  <p className="text-sm text-green-700">Your app will be available at:</p>
                  <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                    {window.location.protocol}//{publishedUrl}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Public Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can view your app
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {!isPublic && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password Protection</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={isPublishing || (!isPublic && !password.trim())}
              className="min-w-[100px]"
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Publish App
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { PublishingService };
export default PublishingService;