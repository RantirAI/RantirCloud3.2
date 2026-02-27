import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ClicDataSelectFieldProps {
  value: string;
  onChange: (value: string, label?: string) => void;
  apiKey?: string;
  apiVersion?: string;
  optionType: 'dataSets' | 'dashboards';
  placeholder?: string;
  loadOnMount?: boolean;
  onVersionDiscovered?: (version: string) => void;
}

interface ClicDataOption {
  label: string;
  value: string;
  description?: string;
}

interface VersionInfo {
  supportedVersions: string[];
  recommendedVersion: string | null;
}

export function ClicDataSelectField({
  value,
  onChange,
  apiKey,
  apiVersion,
  optionType,
  placeholder = "Select a table",
  loadOnMount = false,
  onVersionDiscovered
}: ClicDataSelectFieldProps) {
  const [options, setOptions] = useState<ClicDataOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const isLoadingRef = useRef(false);
  const lastApiKeyRef = useRef<string>('');
  const hasLoadedRef = useRef(false);

  // Discover supported versions when API key changes (Webflow-like pattern)
  const discoverVersions = useCallback(async () => {
    if (!apiKey || apiKey.length < 10) return;
    
    setIsDiscovering(true);
    setError(null);

    try {
      console.log('ClicData: Discovering supported versions...');
      
      const { data, error: fnError } = await supabase.functions.invoke('clicdata-proxy', {
        body: {
          action: 'discoverVersions',
          apiKey,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.success) {
        setVersionInfo({
          supportedVersions: data.supportedVersions || [],
          recommendedVersion: data.recommendedVersion,
        });

        // Auto-apply recommended version if none set
        if (data.recommendedVersion && !apiVersion && onVersionDiscovered) {
          console.log('ClicData: Auto-applying recommended version:', data.recommendedVersion);
          onVersionDiscovered(data.recommendedVersion);
        }
        
        setError(null);
        return true;
      } else {
        const diagMsg = data.diagnostics?.errorMessage || '';
        if (diagMsg.includes('Invalid') || diagMsg.includes('401') || diagMsg.includes('403')) {
          setError('Invalid API key. Please check your ClicData API key.');
        } else {
          setError(data.error || 'Could not detect supported versions');
        }
        setVersionInfo(null);
        return false;
      }
    } catch (err: any) {
      console.error('ClicData: Version discovery error:', err);
      setError(err.message || 'Failed to discover versions');
      setVersionInfo(null);
      return false;
    } finally {
      setIsDiscovering(false);
    }
  }, [apiKey, apiVersion, onVersionDiscovered]);

  // Trigger version discovery when API key changes
  useEffect(() => {
    if (apiKey && apiKey !== lastApiKeyRef.current && apiKey.length >= 10) {
      lastApiKeyRef.current = apiKey;
      hasLoadedRef.current = false;
      setOptions([]);
      discoverVersions();
    }
  }, [apiKey, discoverVersions]);

  const loadOptions = useCallback(async (forceLoad = false) => {
    if (!apiKey) {
      setError("ClicData API key is required");
      return;
    }

    // Use discovered version or user-provided version
    const effectiveVersion = apiVersion || versionInfo?.recommendedVersion;
    
    // Wait for version discovery if not done yet
    if (!effectiveVersion && versionInfo === null && !isDiscovering) {
      console.log('ClicData: No version available, triggering discovery...');
      const success = await discoverVersions();
      if (!success) return;
    }

    if (!forceLoad && hasLoadedRef.current && options.length > 0) {
      return;
    }
    
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const action = optionType === 'dataSets' ? 'listData' : 'listDashboards';
      const versionToUse = apiVersion || versionInfo?.recommendedVersion;
      
      console.log(`ClicData: Loading ${optionType} with version ${versionToUse || 'auto'}...`);
      
      const { data, error: fnError } = await supabase.functions.invoke('clicdata-proxy', {
        body: {
          action,
          apiKey,
          apiVersion: versionToUse,
        },
      });
      
      if (fnError) {
        throw new Error(`Edge function error: ${fnError.message}`);
      }
      
      if (!data || !data.success) {
        // Check for version suggestions
        if (data?.supportedVersions?.length > 0) {
          setVersionInfo({
            supportedVersions: data.supportedVersions,
            recommendedVersion: data.recommendedVersion,
          });
          
          if (data.recommendedVersion && onVersionDiscovered) {
            onVersionDiscovered(data.recommendedVersion);
          }
        }
        
        let errorMsg = 'Failed to load data from ClicData';
        if (data?.error) {
          errorMsg = typeof data.error === 'string' ? data.error : data.error.description || JSON.stringify(data.error);
        }
        if (data?.suggestion) {
          errorMsg += ` ${data.suggestion}`;
        }
        throw new Error(errorMsg);
      }
      
      console.log(`Received ClicData ${optionType} data:`, data);
      
      let newOptions: ClicDataOption[] = [];
      
      if (optionType === 'dataSets') {
        const dataSets = data.dataSets || data.data?.data || data.data || [];
        if (Array.isArray(dataSets)) {
          newOptions = dataSets.map((ds: any) => ({
            label: ds.name || ds.Name || ds.title || ds.Title || `Table ${ds.rec_id || ds.id}`,
            value: String(ds.rec_id || ds.RecId || ds.id || ds.Id),
            description: ds.description || ds.Description || undefined
          }));
        }
      } else if (optionType === 'dashboards') {
        const dashboards = data.dashboards || data.data?.dashboards || data.data || [];
        if (Array.isArray(dashboards)) {
          newOptions = dashboards.map((db: any) => ({
            label: db.name || db.Name || `Dashboard ${db.id}`,
            value: String(db.id || db.Id),
            description: db.description || db.Description || undefined
          }));
        }
      }
      
      console.log(`Parsed ${newOptions.length} ClicData options`);
      setOptions(newOptions);
      hasLoadedRef.current = true;
      
      if (newOptions.length === 0) {
        setError(`No ${optionType === 'dataSets' ? 'tables' : 'dashboards'} found.`);
      }
    } catch (error: any) {
      console.error(`Error loading ClicData ${optionType}:`, error);
      setError(error.message || `Failed to load ${optionType}`);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [apiKey, apiVersion, versionInfo, optionType, options.length, isDiscovering, discoverVersions, onVersionDiscovered]);

  // Load on mount after version is discovered
  useEffect(() => {
    if (loadOnMount && apiKey && (versionInfo || apiVersion) && !hasLoadedRef.current && !isLoadingRef.current) {
      loadOptions();
    }
  }, [loadOnMount, apiKey, versionInfo, apiVersion, loadOptions]);

  const handleChange = (newValue: string) => {
    const selectedOption = options.find(option => option.value === newValue);
    onChange(newValue, selectedOption?.label);
  };

  const handleOpenDropdown = () => {
    if (options.length === 0 && !loading && !isLoadingRef.current && apiKey) {
      loadOptions(true);
    }
  };

  const handleRefresh = () => {
    setOptions([]);
    hasLoadedRef.current = false;
    discoverVersions().then(() => loadOptions(true));
  };

  const handleApplyVersion = (version: string) => {
    if (onVersionDiscovered) {
      onVersionDiscovered(version);
      // Force reload with new version
      hasLoadedRef.current = false;
      setTimeout(() => loadOptions(true), 100);
    }
  };

  const isReady = !isDiscovering && (versionInfo?.recommendedVersion || apiVersion);

  return (
    <div className="space-y-2">
      {/* Version status indicator */}
      {apiKey && (
        <div className="flex items-center gap-2 text-xs">
          {isDiscovering ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Detecting API version...
            </span>
          ) : versionInfo?.recommendedVersion ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" />
              Version: {apiVersion || versionInfo.recommendedVersion}
            </span>
          ) : apiVersion ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Manual: {apiVersion}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select 
          value={value} 
          onValueChange={handleChange} 
          onOpenChange={(open) => {
            if (open) handleOpenDropdown();
          }}
          disabled={!apiKey || isDiscovering}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder={
              isDiscovering ? "Detecting version..." :
              loading ? "Loading..." :
              !apiKey ? "Enter API key first" :
              !isReady ? "Detecting version..." :
              placeholder
            }>
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
          <SelectContent className="bg-background border shadow-lg z-50">
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : error ? (
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                
                {/* Show supported versions if available */}
                {versionInfo?.supportedVersions && versionInfo.supportedVersions.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1.5">Supported versions:</p>
                    <div className="flex flex-wrap gap-1">
                      {versionInfo.supportedVersions.slice(0, 5).map((v) => (
                        <Button
                          key={v}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyVersion(v);
                          }}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {isReady ? 'No items found' : 'Click to load'}
              </div>
            )}
          </SelectContent>
        </Select>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={loading || !apiKey || isDiscovering}
          title="Refresh"
          className="h-9 w-9 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading || isDiscovering ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Error with version suggestions */}
      {error && !loading && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {error}
            {versionInfo?.recommendedVersion && !apiVersion && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2 text-xs"
                onClick={() => handleApplyVersion(versionInfo.recommendedVersion!)}
              >
                Use {versionInfo.recommendedVersion}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
