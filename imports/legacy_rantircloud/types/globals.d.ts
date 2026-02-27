
interface Window {
  flowDataTables?: Record<string, any[]>;
  flowDatabases?: Record<string, any[]>;
  fetchingDatabases?: boolean;
  fetchingTables?: Record<string, boolean>;
  flow?: {
    nodeRegistry?: any;
  };
  webflowCache?: {
    sites: Map<string, any[]>;
    collections: Map<string, any[]>;
    items: Map<string, any[]>;
  };
}
