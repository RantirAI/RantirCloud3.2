import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, Plus, Settings, ExternalLink, Clock, DollarSign, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomServicesCardProps {
  workspaceId: string;
}

interface EnterpriseService {
  id: string;
  title: string;
  description: string;
  due_date?: string;
  start_date?: string;
  contract_duration_months?: number;
  status: string;
  service_type: string;
  price?: number;
  monthly_price?: number;
  is_recurring?: boolean;
  created_at: string;
}

const STANDARD_SERVICES = [
  {
    title: 'Custom Development Services',
    description: 'Full-stack development services for custom enterprise applications and integrations. Our expert team will build tailored solutions to meet your specific business requirements.',
    price: 5000,
    duration: 3,
    features: [
      'Full-stack application development',
      'Custom API integrations',
      'Database design and optimization',
      'Testing and deployment',
      'Documentation and training'
    ]
  },
  {
    title: 'Enterprise Consulting',
    description: 'Strategic consulting services for enterprise architecture and implementation. Get expert guidance on technology decisions and implementation strategies.',
    price: 3000,
    duration: 1,
    features: [
      'Technology stack assessment',
      'Architecture planning',
      'Implementation roadmap',
      'Best practices guidance',
      'Risk assessment and mitigation'
    ]
  },
  {
    title: 'Priority Support & Maintenance',
    description: 'Dedicated support channel with guaranteed response times and maintenance services. Keep your systems running smoothly with our expert support.',
    price: 1500,
    duration: 12,
    features: [
      '24/7 priority support',
      'Guaranteed 4-hour response time',
      'Regular system maintenance',
      'Performance monitoring',
      'Security updates and patches'
    ]
  },
  {
    title: 'Custom Integration Development',
    description: 'Build custom integrations with third-party services and enterprise systems. Connect your existing tools and workflows seamlessly.',
    price: 4000,
    duration: 6,
    features: [
      'Third-party API integrations',
      'Enterprise system connectors',
      'Data synchronization',
      'Webhook implementations',
      'Real-time monitoring'
    ]
  }
];

export function CustomServicesCard({ workspaceId }: CustomServicesCardProps) {
  const [services, setServices] = useState<EnterpriseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    due_date: '',
    start_date: '',
    contract_duration_months: '',
    price: '',
    monthly_price: '',
    is_recurring: false
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadServices();
  }, [workspaceId]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprise_services')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices((data || []) as EnterpriseService[]);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      const { error } = await supabase
        .from('enterprise_services')
        .insert({
          workspace_id: workspaceId,
          title: newService.title,
          description: newService.description,
          due_date: newService.due_date || null,
          start_date: newService.start_date || null,
          contract_duration_months: newService.contract_duration_months ? parseInt(newService.contract_duration_months) : null,
          price: newService.price ? parseFloat(newService.price) : null,
          monthly_price: newService.monthly_price ? parseFloat(newService.monthly_price) : null,
          is_recurring: newService.is_recurring,
          service_type: 'custom',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Service Added",
        description: "Custom service has been added successfully.",
      });

      setNewService({
        title: '',
        description: '',
        due_date: '',
        start_date: '',
        contract_duration_months: '',
        price: '',
        monthly_price: '',
        is_recurring: false
      });
      setShowAddDialog(false);
      await loadServices();
    } catch (error: any) {
      console.error('Error adding service:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add service.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('enterprise_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Deleted",
        description: "Service has been removed successfully.",
      });

      await loadServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete service.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Contact for pricing';
    return `$${price.toLocaleString()}`;
  };

  const formatDuration = (months?: number) => {
    if (!months) return 'Flexible';
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  const handleScheduleDemo = () => {
    window.open('https://calendly.com/rantir/30min', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Custom Services</h2>
          <p className="text-muted-foreground">
            Manage custom enterprise services and view available consulting options
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-10 p-1">
          <TabsTrigger value="workspace" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <Settings className="h-3.5 w-3.5" />
            Workspace Services
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <Calendar className="h-3.5 w-3.5" />
            Available Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Settings className="h-4 w-4" />
                    Custom Workspace Services
                  </CardTitle>
                  <CardDescription>
                    Manage services specific to your workspace
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Custom Service</DialogTitle>
                      <DialogDescription>
                        Create a new custom service for your workspace
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Service Title</Label>
                        <Input
                          id="title"
                          value={newService.title}
                          onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                          placeholder="Enter service title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          placeholder="Describe the service details"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="price">Fixed Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="monthly_price">Monthly Price ($)</Label>
                          <Input
                            id="monthly_price"
                            type="number"
                            value={newService.monthly_price}
                            onChange={(e) => setNewService({ ...newService, monthly_price: e.target.value })}
                            placeholder="500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={newService.start_date}
                            onChange={(e) => setNewService({ ...newService, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="due_date">Due Date</Label>
                          <Input
                            id="due_date"
                            type="date"
                            value={newService.due_date}
                            onChange={(e) => setNewService({ ...newService, due_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="duration">Duration (months)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={newService.contract_duration_months}
                            onChange={(e) => setNewService({ ...newService, contract_duration_months: e.target.value })}
                            placeholder="12"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <input
                            type="checkbox"
                            id="is_recurring"
                            checked={newService.is_recurring}
                            onChange={(e) => setNewService({ ...newService, is_recurring: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="is_recurring" className="text-sm">Recurring Service</Label>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleAddService} className="flex-1">
                          Add Service
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading services...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No custom services created yet</p>
                  <p className="text-xs text-muted-foreground">Add your first custom service to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-sm">{service.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {(service.price || service.monthly_price) && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {service.monthly_price && service.price 
                                ? `$${service.price} + $${service.monthly_price}/mo`
                                : service.monthly_price 
                                  ? `$${service.monthly_price}/month`
                                  : formatPrice(service.price)
                              }
                            </span>
                          )}
                          {service.contract_duration_months && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(service.contract_duration_months)}
                            </span>
                          )}
                          {service.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Start: {new Date(service.start_date).toLocaleDateString()}
                            </span>
                          )}
                          {service.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(service.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {service.is_recurring && (
                            <Badge variant="outline" className="text-xs">Recurring</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Available Enterprise Services
              </CardTitle>
              <CardDescription>
                Professional services available for your enterprise needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STANDARD_SERVICES.map((service, index) => (
                  <Card key={index} className="border border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{service.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {formatPrice(service.price)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(service.duration)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="details" className="border-none">
                          <AccordionTrigger className="text-xs py-2 hover:no-underline">
                            About this service
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pb-0">
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium">What's included:</h4>
                              <ul className="space-y-1">
                                {service.features.map((feature, featureIndex) => (
                                  <li key={featureIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      <Button
                        onClick={handleScheduleDemo}
                        className="w-full"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Schedule Demo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm font-medium mb-2">Need something custom?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  We offer tailored enterprise solutions to meet your specific requirements.
                </p>
                <Button onClick={handleScheduleDemo} variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Consultation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}