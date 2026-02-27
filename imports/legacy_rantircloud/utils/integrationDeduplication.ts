import { BotpressIntegration } from "@/types/integration";

interface IntegrationWithNodeType extends BotpressIntegration {
  nodeType?: string;
  requiresInstallation?: boolean;
}

/**
 * Smart deduplication utility for integrations.
 * Groups integrations by normalized service name and prioritizes:
 * 1. Node integrations over general integrations
 * 2. Non-trigger versions over trigger versions
 * 3. Completed integrations over incomplete ones
 */
export function deduplicateIntegrations(integrations: IntegrationWithNodeType[]): IntegrationWithNodeType[] {
  if (!integrations || integrations.length === 0) return [];

  // Helper function to normalize integration names for comparison
  const normalizeIntegrationName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+trigger\s*$/i, '') // Remove "Trigger" suffix
      .replace(/\s+/g, '') // Remove spaces
      .trim();
  };

  // Helper function to create a canonical key for grouping
  const getCanonicalKey = (integration: IntegrationWithNodeType): string => {
    const normalizedName = normalizeIntegrationName(integration.name);
    const provider = integration.provider?.toLowerCase() || 'default';
    return `${normalizedName}-${provider}`;
  };

  // Group integrations by canonical key
  const groups = new Map<string, IntegrationWithNodeType[]>();
  
  integrations.forEach(integration => {
    const key = getCanonicalKey(integration);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(integration);
  });

  // For each group, select the best representative
  const deduplicated: IntegrationWithNodeType[] = [];
  
  groups.forEach((group) => {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      return;
    }

    // Sort by priority:
    // 1. Node integrations first (has nodeType)
    // 2. Non-trigger versions first
    // 3. Completed integrations first
    // 4. More recent/higher priority items first
    const sorted = group.sort((a, b) => {
      // Priority 1: Node integrations over general
      const aIsNode = !!a.nodeType;
      const bIsNode = !!b.nodeType;
      if (aIsNode !== bIsNode) {
        return aIsNode ? -1 : 1;
      }

      // Priority 2: Non-trigger over trigger versions
      const aIsTrigger = a.name.toLowerCase().includes('trigger');
      const bIsTrigger = b.name.toLowerCase().includes('trigger');
      if (aIsTrigger !== bIsTrigger) {
        return aIsTrigger ? 1 : -1;
      }

      // Priority 3: Completed over incomplete
      const aCompleted = a.isCompleted ?? true;
      const bCompleted = b.isCompleted ?? true;
      if (aCompleted !== bCompleted) {
        return aCompleted ? -1 : 1;
      }

      // Priority 4: Alphabetical as tie-breaker
      return a.name.localeCompare(b.name);
    });

    deduplicated.push(sorted[0]);
  });

  // Log deduplication results for debugging
  const originalCount = integrations.length;
  const deduplicatedCount = deduplicated.length;
  const removedCount = originalCount - deduplicatedCount;
  
  if (removedCount > 0) {
    console.debug(`[Integration Deduplication] Removed ${removedCount} duplicates (${originalCount} → ${deduplicatedCount})`);
    
    // Log specific duplicates removed
    const removedIntegrations = integrations.filter(integration => 
      !deduplicated.some(kept => kept.id === integration.id)
    );
    
    if (removedIntegrations.length > 0) {
      console.debug('[Integration Deduplication] Removed:', removedIntegrations.map(i => i.name));
    }
  }

  // Sort final results: completed integrations first, then by name
  return deduplicated.sort((a, b) => {
    // Priority 1: Completed integrations first
    const aCompleted = a.isCompleted ?? true;
    const bCompleted = b.isCompleted ?? true;
    if (aCompleted !== bCompleted) {
      return aCompleted ? -1 : 1;
    }
    
    // Priority 2: Alphabetical order
    return a.name.localeCompare(b.name);
  });
}

/**
 * Helper function to create unique React keys for deduplicated integrations
 */
export function getIntegrationKey(integration: IntegrationWithNodeType): string {
  return `${integration.id}-${integration.nodeType || 'general'}`;
}