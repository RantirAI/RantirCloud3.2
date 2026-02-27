
import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { integrationsService } from '@/services/integrationsService';
import { toast } from '@/components/ui/sonner';
import { Globe } from 'lucide-react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface WebflowSelectFieldProps {
  value: string;
  onChange: (value: string, label?: string) => void;
  apiKey?: string;
  optionType: 'sites' | 'collections' | 'items';
  siteId?: string;
  collectionId?: string;
  placeholder?: string;
  loadOnMount?: boolean;
  showIntegrationStatus?: boolean;
}

interface WebflowOption {
  label: string;
  value: string;
  description?: string;
}

export function WebflowSelectField({
  value,
  onChange,
  apiKey,
  optionType,
  siteId,
  collectionId,
  placeholder = "Select an option",
  loadOnMount = false,
  showIntegrationStatus = false
}: WebflowSelectFieldProps) {
  const [options, setOptions] = useState<WebflowOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIntegrationInstalled, setIsIntegrationInstalled] = useState(false);
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);
  const maxRetries = 3;
  
  // Use refs to track loading state and prevent duplicate calls
  const isLoadingRef = useRef(false);
  const lastLoadParamsRef = useRef<string>('');

  // Rate limit countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (rateLimited && rateLimitTimer > 0) {
      timer = setInterval(() => {
        setRateLimitTimer(prev => {
          if (prev <= 1) {
            setRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rateLimited, rateLimitTimer]);

  const checkWebflowIntegration = async () => {
    if (!user) return;
    
    try {
      const userIntegrations = await integrationsService.getUserIntegrations(user.id);
      const webflowIntegration = userIntegrations.find(
        integration => integration.id === 'webflow' && integration.isInstalled
      );
      
      setIsIntegrationInstalled(!!webflowIntegration);
    } catch (error) {
      console.error("Error checking Webflow integration:", error);
    }
  };

  useEffect(() => {
    if (showIntegrationStatus) {
      checkWebflowIntegration();
    }
  }, [showIntegrationStatus]);

  const getWebflowApiKey = async (): Promise<string | null> => {
    // If direct API key is provided, use it
    if (apiKey) {
      return apiKey;
    }
    
    // Otherwise try to get from user integrations
    if (!user) return null;
    
    try {
      const userIntegrations = await integrationsService.getUserIntegrations(user.id);
      const webflowIntegration = userIntegrations.find(
        integration => integration.id === 'webflow' && integration.isInstalled
      );
      
      return webflowIntegration?.apiKey || null;
    } catch (error) {
      console.error("Error getting Webflow API key:", error);
      return null;
    }
  };

  const loadOptions = async (forceLoad = false) => {
    // Create a unique identifier for this load call
    const loadParams = `${optionType}-${apiKey}-${siteId}-${collectionId}`;
    
    // If we're already loading the same thing, don't load again
    if (!forceLoad && (isLoadingRef.current || lastLoadParamsRef.current === loadParams)) {
      return;
    }
    
    if (rateLimited) {
      return;
    }
    
    // Mark as loading and store params
    isLoadingRef.current = true;
    lastLoadParamsRef.current = loadParams;
    setLoading(true);
    setError(null);
    
    try {
      const apiKeyValue = await getWebflowApiKey();
      
      if (!apiKeyValue) {
        setError("Webflow API key not found. Please install the Webflow integration first.");
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      console.log(`Loading ${optionType} with API key`);
      
      let path = '';
      let queryParams = '';
      
      // Use v2 API endpoints with correct paths
      switch (optionType) {
        case 'sites':
          path = 'v2/sites';
          break;
        case 'collections':
          if (!siteId) {
            setError("Site ID is required for collections");
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
          path = `v2/sites/${siteId}/collections`;
          break;
        case 'items':
          if (!collectionId) {
            setError("Collection ID is required for items");
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
          path = `v2/collections/${collectionId}/items`;
          queryParams = '?limit=100'; // Add a reasonable limit
          break;
      }

      console.log("Calling Webflow proxy with path:", path + queryParams);
      
      try {
        // Call the Supabase Edge Function directly using POST method
        const { data, error: fnError } = await supabase.functions.invoke('webflow-proxy', {
          method: 'POST',
          body: {
            path: path,
            queryParams: queryParams,
            apiKey: apiKeyValue
          }
        });
        
        if (fnError) {
          throw new Error(`Edge function error: ${fnError.message}`);
        }
        
        if (!data || !data.success) {
          // Check for rate limit error
          if (data?.error?.includes('rate limit') || data?.error?.includes('Too Many Requests') || 
              (data?.statusCode === 429) || data?.details?.status === 429) {
            
            // Get wait time from the response or use default 60 seconds
            let waitTime = 60;
            if (data?.waitTime) {
              waitTime = data.waitTime;
            }
            
            console.log(`Rate limited. Need to wait ${waitTime} seconds.`);
            setRateLimited(true);
            setRateLimitTimer(waitTime);
            setError(`Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`);
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
          
          throw new Error(data?.error || 'Invalid response format from Webflow API');
        }

        console.log(`Received ${optionType} data:`, data);
        
        let newOptions: WebflowOption[] = [];
        
        // Handle v2 API response format
        switch (optionType) {
          case 'sites':
            // Try to get sites from result property first (various response formats)
            if (data.result?.sites && Array.isArray(data.result.sites)) {
              newOptions = data.result.sites.map((site: any) => ({
                label: site.displayName || site.name || site._id,
                value: site.id || site._id,
                description: site.shortName || site.domain
              }));
            } 
            // If no sites in result.sites, check if result itself is an array
            else if (Array.isArray(data.result)) {
              newOptions = data.result.map((site: any) => ({
                label: site.displayName || site.name || site._id,
                value: site.id || site._id,
                description: site.shortName || site.domain
              }));
            }
            break;
          case 'collections':
            // Fix for collections parsing
            if (data.result?.collections && Array.isArray(data.result?.collections)) {
              newOptions = data.result.collections.map((collection: any) => ({
                label: collection.displayName || collection.name || collection._id,
                value: collection.id || collection._id,
                description: collection.slug
              }));
            }
            // Handle nested result structure
            else if (data.result?.result?.collections && Array.isArray(data.result.result.collections)) {
              newOptions = data.result.result.collections.map((collection: any) => ({
                label: collection.displayName || collection.name || collection._id,
                value: collection.id || collection._id,
                description: collection.slug
              }));
            }
            // If no collections in result.collections, check if result itself is an array
            else if (Array.isArray(data.result)) {
              newOptions = data.result.map((collection: any) => ({
                label: collection.displayName || collection.name || collection._id,
                value: collection.id || collection._id,
                description: collection.slug
              }));
            }
            break;
          case 'items':
            // Try different paths to find items
            let items = [];
            if (data.result?.items && Array.isArray(data.result.items)) {
              items = data.result.items;
            } else if (Array.isArray(data.result)) {
              items = data.result;
            } else if (data.items && Array.isArray(data.items)) {
              items = data.items;
            } else if (data.result?.result?.items && Array.isArray(data.result.result.items)) {
              items = data.result.result.items;
            }
            
            // Check if we have found any items
            if (items && items.length > 0) {
              newOptions = items.map((item: any) => {
                // Extract meaningful item data for display
                const itemName = item.name || item.displayName || '';
                const itemId = item.id || item._id || '';
                
                // Get field data if available (for better display)
                const fieldData = item.fieldData || {};
                
                // Find a descriptive field to display
                let displayValue = itemName || itemId;
                let description = item.slug || '';
                
                // Try to find a more meaningful field like title, name, or description in fieldData
                if (Object.keys(fieldData).length > 0) {
                  // Look for common descriptive fields
                  const titleField = fieldData.title || fieldData.name || fieldData.heading || 
                                    fieldData.label || fieldData.description || '';
                  if (titleField) {
                    displayValue = titleField;
                    description = `ID: ${itemId}`;
                  }
                  
                  // If we have structured content, try to extract the most useful info
                  const fieldValues = Object.entries(fieldData)
                    .filter(([key, val]) => 
                      typeof val === 'string' && 
                      val.length > 0 && 
                      key !== 'id' && 
                      key !== '_id' && 
                      !key.startsWith('_')
                    )
                    .map(([key, val]) => val);
                  
                  if (fieldValues.length > 0) {
                    // If we found descriptive fields, use the first one
                    if (!titleField) {
                      displayValue = String(fieldValues[0]).substring(0, 30);
                      if (String(fieldValues[0]).length > 30) displayValue += '...';
                      description = `ID: ${itemId}`;
                    }
                    
                    // Add a second field value to the description if available
                    if (fieldValues.length > 1) {
                      const secondValue = String(fieldValues[1]).substring(0, 30);
                      description += fieldValues.length > 1 ? ` | ${secondValue}` : '';
                      if (String(fieldValues[1]).length > 30) description += '...';
                    }
                  }
                }
                
                return {
                  label: displayValue,
                  value: itemId,
                  description: description
                };
              });
              
              console.log(`Parsed ${newOptions.length} items with descriptive labels`);
            } else {
              console.warn("No items found in response:", data);
            }
            break;
        }
        
        console.log(`Parsed ${newOptions.length} options`);
        setOptions(newOptions);
        
        if (newOptions.length === 0) {
          const errorMessage = `No ${optionType} found. Make sure your API key has the correct permissions.`;
          console.warn(errorMessage);
          setError(errorMessage);
        }
      } catch (error: any) {
        console.error(`Error in fetch:`, error);
        
        // Check if this appears to be a rate limit issue
        if (error.message && (
            error.message.includes('rate limit') || 
            error.message.includes('Too Many Requests') ||
            error.message.includes('429')
           )) {
          // Set rate limited state with a default wait time
          setRateLimited(true);
          setRateLimitTimer(60); // Default 60 second wait if no specific time provided
          setError(`Rate limit exceeded. Please wait before trying again.`);
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
        
        // If we haven't exceeded max retries, try again
        if (retryCount < maxRetries) {
          console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
          setRetryCount(prev => prev + 1);
          // Retry after a short delay with exponential backoff
          setTimeout(() => {
            isLoadingRef.current = false; // Reset loading state before retry
            loadOptions(true);
          }, 1000 * Math.pow(2, retryCount));
          return;
        }
        
        setError(error.message || `Failed to load ${optionType}`);
      }
    } catch (error: any) {
      console.error(`Error loading ${optionType}:`, error);
      setError(error.message || `Failed to load ${optionType}`);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Only load on specific triggers, not on every render
  useEffect(() => {
    if (rateLimited) return;
    
    if (optionType === 'sites' && apiKey) {
      console.log("API key provided, loading sites");
      loadOptions();
    } else if (optionType === 'collections' && siteId) {
      loadOptions();
    } else if (optionType === 'items' && collectionId) {
      loadOptions();
    }
  }, [optionType, apiKey, siteId, collectionId, rateLimited]);

  const handleChange = (newValue: string) => {
    const selectedOption = options.find(option => option.value === newValue);
    onChange(newValue, selectedOption?.label);
  };

  const installWebflowIntegration = () => {
    toast.info('Please install the Webflow integration from the Integrations page');
  };

  // Handler when dropdown is opened
  const handleOpenDropdown = () => {
    setIsDropdownOpen(true);
    // Only load options if we have none and we're not already loading or rate limited
    if (options.length === 0 && !loading && !error && !rateLimited && !isLoadingRef.current) {
      loadOptions(true);
    }
  };

  const handleRefresh = () => {
    setRetryCount(0); // Reset retry count
    setOptions([]); // Clear existing options
    lastLoadParamsRef.current = ''; // Reset load params to force reload
    loadOptions(true);
  };

  return (
    <div className="space-y-2">
      {showIntegrationStatus && !apiKey && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            <span className="text-sm">Webflow Integration</span>
          </div>
          {!isIntegrationInstalled && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={installWebflowIntegration}
            >
              Install
            </Button>
          )}
        </div>
      )}

      <Select 
        value={value} 
        onValueChange={handleChange} 
        onOpenChange={(open) => {
          if (open) handleOpenDropdown();
          setIsDropdownOpen(open);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </div>
            ) : (
              options.find(option => option.value === value)?.label || placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : rateLimited ? (
            <div className="px-2 py-2 text-sm">
              <div className="text-destructive flex items-center mb-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Rate limit exceeded</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Please wait {rateLimitTimer} seconds before trying again.
              </div>
              <div className="w-full bg-muted h-1 rounded overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-1000" 
                  style={{ width: `${(1 - rateLimitTimer/60) * 100}%` }}
                />
              </div>
            </div>
          ) : error ? (
            <div className="px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : options.length > 0 ? (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value} data-value={option.value}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No options available
            </div>
          )}
          
          {!loading && !rateLimited && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 flex items-center justify-center gap-1" 
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </SelectContent>
      </Select>
      
      {error && !rateLimited && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {rateLimited && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs flex flex-col gap-1">
            <span>Rate limit exceeded. Wait {rateLimitTimer} seconds.</span>
            <div className="w-full bg-muted h-1 rounded overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-1000" 
                style={{ width: `${(1 - rateLimitTimer/60) * 100}%` }}
              />
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
