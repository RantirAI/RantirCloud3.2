import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Globe, Loader2, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DomainStatusBadge, type DomainStatus } from './DomainStatusBadge';
import { DomainRecordsTable, type DnsRecord } from './DomainRecordsTable';
import { cn } from '@/lib/utils';

// Constants for DNS configuration
const RANTIR_CNAME = 'rantir.cloud';

export interface CustomDomainData {
  id: string;
  domain: string;
  verification_token: string;
  verification_status: 'pending' | 'verified' | 'failed';
  dns_verified: boolean;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed';
}

interface CustomDomainSetupProps {
  publishedAppId?: string;
  existingDomain?: CustomDomainData | null;
  onDomainAdded?: (domain: CustomDomainData) => void;
  onDomainRemoved?: () => void;
  onVerificationComplete?: (domain: CustomDomainData) => void;
  addDomain: (publishedAppId: string, domain: string) => Promise<{ success: boolean; data?: CustomDomainData; error?: string }>;
  verifyDomain: (domain: string) => Promise<{ success: boolean; data?: CustomDomainData; error?: string }>;
  removeDomain: (publishedAppId: string, domain: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Generate DNS records - always use CNAME to rantir.cloud
 */
function generateDnsRecords(domain: string, verificationToken: string): DnsRecord[] {
  const records: DnsRecord[] = [];
  
  // Always use CNAME to rantir.cloud
  records.push({
    type: 'CNAME',
    name: '@',
    value: RANTIR_CNAME,
    purpose: 'Routes traffic to Rantir',
  });
  
  // Always add TXT record for verification
  records.push({
    type: 'TXT',
    name: '_rantir-verify',
    value: verificationToken,
    purpose: 'Domain ownership verification',
  });
  
  return records;
}

export function CustomDomainSetup({
  publishedAppId,
  existingDomain,
  onDomainAdded,
  onDomainRemoved,
  onVerificationComplete,
  addDomain,
  verifyDomain,
  removeDomain,
}: CustomDomainSetupProps) {
  const [showInput, setShowInput] = useState(!existingDomain);
  const [domainInput, setDomainInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [domainData, setDomainData] = useState<CustomDomainData | null>(existingDomain || null);

  const handleAddDomain = async () => {
    if (!publishedAppId || !domainInput.trim()) return;
    
    setIsAdding(true);
    try {
      const result = await addDomain(publishedAppId, domainInput.trim().toLowerCase());
      
      if (result.success && result.data) {
        setDomainData(result.data);
        setShowInput(false);
        setDomainInput('');
        onDomainAdded?.(result.data);
        toast.success('Domain added! Follow the instructions to complete setup.');
      } else {
        toast.error(result.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!domainData) return;
    
    setIsVerifying(true);
    try {
      const result = await verifyDomain(domainData.domain);
      
      if (result.success && result.data) {
        setDomainData(result.data);
        onVerificationComplete?.(result.data);
        
        if (result.data.dns_verified) {
          toast.success('Domain verified! SSL is being provisioned.');
        } else {
          toast.error('DNS records not found. Please check your settings and try again.');
        }
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!publishedAppId || !domainData) return;
    
    setIsRemoving(true);
    try {
      const result = await removeDomain(publishedAppId, domainData.domain);
      
      if (result.success) {
        setDomainData(null);
        setShowInput(true);
        onDomainRemoved?.();
        toast.success('Domain removed');
      } else {
        toast.error(result.error || 'Failed to remove domain');
      }
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Failed to remove domain');
    } finally {
      setIsRemoving(false);
    }
  };

  const getEffectiveStatus = (): DomainStatus => {
    if (!domainData) return 'pending';
    if (domainData.ssl_status === 'active') return 'active';
    if (domainData.ssl_status === 'provisioning') return 'provisioning';
    if (domainData.ssl_status === 'failed') return 'failed';
    if (domainData.dns_verified || domainData.verification_status === 'verified') return 'verified';
    if (domainData.verification_status === 'failed') return 'failed';
    return 'pending';
  };

  // Show input if no domain exists
  if (showInput && !domainData) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Custom Domain</Label>
          <div className="flex gap-2">
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
              placeholder="www.yourdomain.com"
              className="h-9 text-sm font-mono flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <Button
              onClick={handleAddDomain}
              disabled={isAdding || !domainInput.trim() || !publishedAppId}
              className="h-9 px-4"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show domain setup instructions
  if (domainData) {
    const records = generateDnsRecords(domainData.domain, domainData.verification_token);
    const status = getEffectiveStatus();
    const isPending = status === 'pending';
    const isActive = status === 'active';

    return (
      <div className="space-y-3 border rounded-lg p-3 bg-card">
        {/* Domain Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium font-mono">{domainData.domain}</span>
          </div>
          <div className="flex items-center gap-2">
            <DomainStatusBadge status={status} sslStatus={domainData.ssl_status} />
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(`https://${domainData.domain}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Verification Instructions (only show if not active) */}
        {!isActive && (
          <>
            <div className={cn(
              'flex items-start gap-2 p-2.5 rounded-md text-xs',
              isPending ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200'
            )}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {isPending ? 'Verification required' : 'SSL provisioning in progress'}
                </p>
                {isPending && (
                  <p className="mt-0.5 text-[11px] opacity-80">
                    Add the DNS records below at your domain registrar, then click "Verify Domain".
                  </p>
                )}
              </div>
            </div>

            {/* DNS Records Table */}
            {isPending && (
              <DomainRecordsTable records={records} />
            )}

            <p className="text-[10px] text-muted-foreground">
              DNS changes can take up to 48 hours to propagate globally.
            </p>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveDomain}
            disabled={isRemoving}
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isRemoving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            Remove
          </Button>
          
          {!isActive && (
            <Button
              onClick={handleVerifyDomain}
              disabled={isVerifying}
              size="sm"
              className="h-7 px-3 text-xs"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Verifying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verify Domain
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
