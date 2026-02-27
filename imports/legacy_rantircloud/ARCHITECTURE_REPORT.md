# Legacy Rantir Cloud — Architectural Analysis Report

**Source:** `imports/legacy_rantircloud/` (full codebase, 1,177 files)
**Date:** 2026-02-27
**Scope:** Analysis only — no code modified, no files copied, no components created.

---

## 1. Inventory Summary

| Category | Files | Key Path |
|----------|-------|----------|
| Type definitions | 17 | `types/` |
| Core logic / lib | 71 | `lib/` |
| State management (stores) | 15 | `stores/` |
| React contexts | 2 | `contexts/` |
| Services | 33 | `services/` |
| React hooks | 47 | `hooks/` |
| Components (total) | 538+ | `components/` |
| Flow builder UI | 80 | `components/flow/` |
| App builder UI | 228 | `components/app-builder/` |
| Node plugin definitions | 161 | `nodes/` |
| Pages / routes | 51 | `pages/` |
| Utilities | 10 | `utils/` |
| Supabase integration | 2 | `integrations/supabase/` |
| Schema | 1 | `schema/` |
| Assets | 20+ | `assets/` |
| Entry point / config | 4 | `App.tsx`, `main.tsx`, `index.css`, `vite-env.d.ts` |

---

## 2. Categorized Deep Analysis

### 2.1 Flow Engine Core Logic

#### Execution Engine
**File:** `lib/flow-store.ts` (1,762 lines)
- Zustand store implementing the **entire flow execution engine**
- `executeFlow()` — DAG traversal with topological sort
- `executeSingleNode()` — isolated node testing
- Conditional branch resolution via `findBranchAncestry()`
- Loop execution with iteration tracking
- Debug logging per node step
- Edge animation during execution
- Error node tracking
- Variable resolution during execution

**Verdict:** ⚠️ Reusable with significant refactor — execution logic is tightly coupled to Zustand store state and UI concerns (edge animation, dialog state).

#### Runtime Orchestration
**Files:**
- `services/flowService.ts` (736 lines) — Supabase CRUD for flows, execution history, deployment, version management
- `services/flowMonitoringService.ts` — execution monitoring and logging
- `services/flowSecretsService.ts` — encrypted secret management for API keys

**Verdict:** ⚠️ Reusable with refactor — good service abstractions, but all call `supabase.from()` directly. Needs adapter layer.

#### Node Registry
**File:** `lib/node-registry.ts` (104 lines)
- Singleton `NodeRegistry` class with `Map<string, NodePlugin>`
- `register()` / `registerConditionally()` based on user installations
- `getPlugin()` / `getAvailablePlugins()` / `getAllPlugins()`
- `requiresInstallation()` checks against core node list
- Dispatches `window.CustomEvent('nodeRegistryUpdated')` for reactivity

**Verdict:** ✅ Reusable with minor refactor — replace `window.dispatchEvent` with proper event system.

#### Node Lifecycle / Core Node Types
**File:** `lib/coreNodeTypes.ts` (55 lines)
- `CORE_NODE_TYPES` Set — 27 built-in nodes that don't require installation
- Includes: `http-request`, `condition`, `for-each-loop`, `ai-agent`, `webhook-trigger`, `response`, `logger`, etc.
- `isCoreNode()` check function

**Verdict:** ✅ Reusable as-is

#### Node Registration
**Files:**
- `lib/register-nodes.ts` — bulk registration of all node plugins
- `lib/register-node-components.ts` — React Flow node type mapping
- `lib/node-alias-registry.ts` — node type aliases for backward compatibility

**Verdict:** ✅ Reusable with minor refactor

### 2.2 Node Definitions

**Path:** `nodes/` (161 files across 160 directories)

| Category | Count | Examples |
|----------|-------|---------|
| action | 143 | activecampaign, mailchimp, slack, stripe, gmail, shopify |
| transformer | 10 | ai-mapper, calculator, csv, data-filter, for-each-loop |
| trigger | 2 | webhook-trigger, cal-com |
| condition | 2 | condition, approval |

**Consistent `NodePlugin` interface (from `types/node-plugin.ts`):**
```typescript
interface NodePlugin {
  type: string;
  name: string;
  description: string;
  category: 'trigger' | 'action' | 'condition' | 'transformer';
  icon?: any;           // lucide-react icon component
  color?: string;       // hex color
  inputs?: NodeInput[];
  outputs?: NodeOutput[];
  getDynamicInputs?(currentInputs): NodeInput[];
  getDynamicOutputs?(currentInputs): NodeOutput[];
  execute?(inputs, context: ExecutionContext): Promise<Record<string, any>>;
}
```

**Input types:** `text`, `select`, `number`, `code`, `variable`, `textarea`, `boolean`, `databaseSelector`, `tableSelector`, `webflowFieldMapping`, `webflowSelect`, `clicdataSelect`, `loopVariables`, `queryParamsEditor`, `hidden`

**Execution pattern:** 126/160 nodes call `supabase.functions.invoke('{slug}-proxy')` for API execution via edge functions. No direct database calls.

**Verdict:** ⚠️ All 160 reusable with refactor (Supabase client import path, `resolveVariable` centralization, `localStorage`/`window` removal in 14 nodes)

### 2.3 UI Node Components

**Path:** `components/flow/` (80 files)

| Subfolder | Purpose | Key Files |
|-----------|---------|-----------|
| `nodes/` | React Flow node renderers | `BaseNode.tsx`, `ConditionalNode.tsx`, `ForEachLoopNode.tsx`, `LoopNode.tsx` |
| `edges/` | Custom edge renderers | `StraightEdge.tsx`, `StepEdge.tsx` |
| `editor/` | Node configuration panels | `NodeInputField.tsx`, `VariableBindingSidebar.tsx`, `CodeEditorModal.tsx`, `LoopConfigurationPanel.tsx`, `AdvancedJsonMapper.tsx` |
| `condition/` | Condition-specific UI | `ConditionCaseEditor.tsx`, `ResponseChecker.tsx` |
| `deployment/` | Flow deployment UI | `FlowDeploymentManager.tsx`, `WebhookConfiguration.tsx`, `ChatEmbedConfiguration.tsx` |
| `webhook/` | Webhook testing/config | `WebhookTester.tsx`, `PayloadTreeViewer.tsx`, `SamplePayloadSelector.tsx` |
| `icons/` | Custom integration SVGs | `AirtableIcon.tsx`, `HubSpotIcon.tsx`, `SalesforceIcon.tsx`, `ShopifyIcon.tsx`, `SnowflakeIcon.tsx` |
| Root | Canvas, palette, toolbar | `FlowCanvas.tsx`, `NodePalette.tsx`, `FlowToolbar.tsx`, `NodeProperties.tsx`, `FlowVariablesManager.tsx` |

**Key components:**
- `FlowCanvas.tsx` — Main React Flow canvas with drag-drop, auto-layout
- `NodePalette.tsx` — Node picker/search sidebar
- `NodeProperties.tsx` — Right panel for configuring selected node
- `BaseNode.tsx` — Universal node renderer with input/output handles
- `NodeInputField.tsx` — Dynamic form field renderer for all input types

**Verdict:** ⚠️ Reusable with refactor — largest chunk of reusable UI. Depends on legacy CSS (`FlowBuilderStyles.css`), Zustand stores, and legacy routing. Core rendering logic (BaseNode, NodeInputField, edges) is highly portable.

### 2.4 Flow Serialization Format

**From `services/flowService.ts`:**
```typescript
interface FlowData {
  id: string;
  flow_project_id: string;
  nodes: FlowNode[];      // React Flow node format
  edges: FlowEdge[];      // React Flow edge format
  version: number;
  version_name?: string;
  version_description?: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}
```

**From `types/flowTypes.ts`:**
```typescript
interface FlowNode extends Node {   // extends @xyflow/react Node
  data: {
    type: string;
    label: string;
    inputs?: Record<string, any>;
    disabled?: boolean;
    isFirstNode?: boolean;
    selectedOutputHandle?: string;
    payloadMappings?: PayloadMapping[];
    loopConfig?: LoopConfiguration;
  };
}
```

**Persistence:** Stored in Supabase tables (`flow_data`, `flow_projects`, `flow_executions`, `node_configurations`) via `flowService.ts`.

**Verdict:** ✅ Reusable as-is — standard React Flow JSON format with metadata extensions. Clean candidate for new persistence layer.

### 2.5 State Management

**Path:** `stores/` (15 Zustand stores)

| Store | Purpose | Logic-Relevant |
|-------|---------|:---:|
| `flowHistoryStore.ts` | Undo/redo for flow editor | ✅ |
| `variableStore.ts` | Flow variable management | ✅ |
| `databaseStore.ts` | Database connection state | ⚠️ |
| `aiSidebarStore.ts` | AI assistant state | ❌ |
| `aiWallStore.ts` | AI Wall feature state | ❌ |
| `appBuilderStore.ts` | App builder state | ❌ |
| `appBuilderSidebarStore.ts` | App builder sidebar | ❌ |
| `classStore.ts` | CSS class management | ❌ |
| `componentStateStore.ts` | Component state tracking | ❌ |
| `componentUsageStore.ts` | Component usage analytics | ❌ |
| `dashboardLayoutStore.ts` | Dashboard layout | ❌ |
| `designSystemStore.ts` | Design system tokens | ❌ |
| `designTokenStore.ts` | Design token values | ❌ |
| `snapshotStore.ts` | Snapshot management | ❌ |
| `userComponentStore.ts` | User component library | ❌ |

**Key flow state (in `lib/flow-store.ts`, not in `stores/`):**
- `FlowState` — nodes, edges, debug logs, execution status, viewport, UI state
- 1,762 lines of combined state + actions + execution engine

**Verdict:** Flow-relevant stores (2/15) are reusable with refactor. The main flow store (`lib/flow-store.ts`) needs decomposition — split execution engine from UI state.

### 2.6 Supabase Integration Logic

**Path:** `integrations/supabase/`

| File | Content |
|------|---------|
| `client.ts` | Supabase client singleton using `import.meta.env.VITE_*` (Vite-specific) |
| `types.ts` | Auto-generated Database type definitions |

**Database calls across services:**

| Service | Tables Used | Call Count |
|---------|-------------|-----------|
| `flowService.ts` | `flow_projects`, `flow_data`, `flow_executions`, `node_configurations` | 25+ |
| `databaseService.ts` | Dynamic user tables | 15+ |
| `integrationsService.ts` | `integrations`, `user_integrations` | 10+ |
| `tableService.ts` | Dynamic user tables | 10+ |
| `activityService.ts` | `activity_logs` | 5+ |
| `environmentService.ts` | `flow_environment_variables` | 5+ |

**Edge function calls:** 126 node types invoke dedicated edge functions (`{slug}-proxy` or `{slug}-action`)

**Auth coupling:** Auth handled by Supabase client singleton + `hooks/useAuth.tsx`. Not deeply coupled to node logic.

**Verdict:** ⚠️ Supabase client must be adapted — legacy uses `import.meta.env.VITE_*` (Vite), Studio uses `process.env.*` (Next.js). Services need adapter layer but core logic is portable.

### 2.7 Visual Builder Specific Code (NOT related to Logic)

**These are NOT relevant to the Logic project type:**

| Path | Purpose | Why Not Reusable |
|------|---------|-----------------|
| `components/app-builder/` (228 files) | Drag-drop visual app builder | Entirely separate product domain |
| `components/ai-wall/` (13 files) | AI wall/canvas feature | Unrelated feature |
| `components/docs/` (24 files) | Document editor | Unrelated feature |
| `components/sheets/` (6 files) | Spreadsheet view | Unrelated feature |
| `stores/appBuilderStore.ts` | App builder state | Unrelated |
| `stores/aiWallStore.ts` | AI wall state | Unrelated |
| `stores/designSystemStore.ts` | Design tokens | Unrelated |
| `stores/classStore.ts` | CSS classes | Unrelated |
| `lib/converters/` (6 files) | Figma/Framer/React/HTML/Webflow converters | Unrelated |
| `lib/stylesToTailwind.ts` | CSS → Tailwind conversion | Unrelated |
| `lib/canvasCSSGenerator.ts` | CSS generation for canvas | Unrelated |

### 2.8 Tight Coupling to Legacy Stack

| Pattern | Files Affected | Severity | Migration Effort |
|---------|---------------|----------|-----------------|
| `import.meta.env.VITE_*` | `integrations/supabase/client.ts` | 🔴 High | Must replace with Next.js `process.env` |
| `localStorage` usage | 14 node files + multiple components | 🟡 Medium | Replace with React state/context |
| `window.location` for routing | 14 node files + flow store | 🟡 Medium | Replace with Next.js router |
| `window.dispatchEvent` | `lib/node-registry.ts` | 🟢 Low | Replace with event emitter or React context |
| `@/` path alias (Vite) | All files | 🟢 Low | Works in Next.js with tsconfig paths |
| CSS files (legacy system) | `FlowBuilderStyles.css`, `App.css`, etc. (9 files) | 🟡 Medium | Convert to Tailwind or CSS modules |
| Zustand stores | 15 stores + flow-store | 🟢 Low | Zustand works in Next.js |
| `@xyflow/react` | `types/flowTypes.ts`, `lib/flow-store.ts` | ✅ Compatible | Already installed in Studio |

---

## 3. Folder → Purpose → Reusability Matrix

### Full Classification

| Folder / File | Purpose | Reusable As-Is | Reusable With Refactor | Not Reusable | Legacy Dep | Clean Candidate for `/logic` |
|---------------|---------|:-:|:-:|:-:|:-:|:-:|
| **`types/node-plugin.ts`** | NodePlugin interface, NodeInput, NodeOutput, ExecutionContext | ✅ | | | | ✅ |
| **`types/flowTypes.ts`** | FlowNode, FlowEdge, LoopConfiguration, debug types | ✅ | | | @xyflow/react | ✅ |
| **`lib/node-registry.ts`** | Node registration system | | ✅ | | `window.dispatchEvent` | ✅ |
| **`lib/coreNodeTypes.ts`** | Core node type list | ✅ | | | | ✅ |
| **`lib/register-nodes.ts`** | Bulk node registration | | ✅ | | import paths | ✅ |
| **`lib/register-node-components.ts`** | React Flow node type mapping | | ✅ | | import paths | ✅ |
| **`lib/node-alias-registry.ts`** | Node type aliases | ✅ | | | | ✅ |
| **`lib/flow-store.ts`** | Flow state + execution engine | | ⚠️ | | Zustand, UI coupling | ✅ (needs decomposition) |
| **`lib/dagre-layout.ts`** | Auto-layout algorithm | ✅ | | | | ✅ |
| **`lib/tree-layout.ts`** | Tree layout algorithm | ✅ | | | | ✅ |
| **`stores/flowHistoryStore.ts`** | Undo/redo | | ✅ | | Zustand | ✅ |
| **`stores/variableStore.ts`** | Variable management | | ✅ | | Zustand | ✅ |
| **`services/flowService.ts`** | Flow CRUD, execution, deployment | | ✅ | | Supabase direct calls | ✅ |
| **`services/flowMonitoringService.ts`** | Execution monitoring | | ✅ | | Supabase | ✅ |
| **`services/flowSecretsService.ts`** | Secret management | | ✅ | | Supabase | ✅ |
| **`services/environmentService.ts`** | Env variable management | | ✅ | | Supabase | ✅ |
| **`hooks/useFlowAutosave.tsx`** | Auto-save hook | | ✅ | | legacy routing | ✅ |
| **`hooks/useFlowHistory.ts`** | History hook | | ✅ | | | ✅ |
| **`hooks/useFlowNodes.tsx`** | Node management hook | | ✅ | | | ✅ |
| **`hooks/useNodeAliases.ts`** | Alias resolution hook | ✅ | | | | ✅ |
| **`hooks/useVariableResolver.ts`** | Variable resolution | | ✅ | | localStorage | ✅ |
| **`hooks/useUserNodeInstallations.tsx`** | Installed node tracking | | ✅ | | Supabase | ✅ |
| **`nodes/` (all 160)** | Integration node definitions | | ✅ | | Supabase client import | ✅ |
| **`components/flow/nodes/BaseNode.tsx`** | Universal node renderer | | ✅ | | legacy CSS | ✅ |
| **`components/flow/edges/`** | Custom edge components | | ✅ | | | ✅ |
| **`components/flow/editor/NodeInputField.tsx`** | Dynamic input renderer | | ✅ | | | ✅ |
| **`components/flow/NodePalette.tsx`** | Node picker | | ✅ | | legacy CSS | ✅ |
| **`components/flow/NodeProperties.tsx`** | Node config panel | | ✅ | | legacy CSS | ✅ |
| **`components/flow/FlowCanvas.tsx`** | Main canvas | | ✅ | | Zustand, CSS | ✅ |
| **`components/flow/FlowToolbar.tsx`** | Canvas toolbar | | ✅ | | | ✅ |
| **`components/flow/deployment/`** | Deploy UI | | ✅ | | Supabase | ✅ |
| **`components/flow/webhook/`** | Webhook testing UI | | ✅ | | | ✅ |
| **`components/flow/icons/`** | Custom SVG icons | ✅ | | | | ✅ |
| **`integrations/supabase/client.ts`** | Supabase singleton | | | ✅ | `import.meta.env.VITE_*` | Must rebuild for Next.js |
| **`integrations/supabase/types.ts`** | DB types | | ✅ | | | ✅ |
| **`data/nodeTemplates.ts`** | Node templates | ✅ | | | | ✅ |
| **`schema/integrations.sql`** | DB schema | ✅ | | | | ✅ |
| `components/app-builder/` (228) | Visual app builder | | | ✅ | Entirely separate domain | |
| `components/ai-wall/` (13) | AI wall feature | | | ✅ | Unrelated feature | |
| `components/docs/` (24) | Document editor | | | ✅ | Unrelated feature | |
| `components/sheets/` (6) | Spreadsheet views | | | ✅ | Unrelated feature | |
| `lib/converters/` (6) | Format converters | | | ✅ | Unrelated feature | |
| `lib/stylesToTailwind.ts` | CSS conversion | | | ✅ | Unrelated feature | |
| `stores/appBuilderStore.ts` (etc.) | App builder state (13) | | | ✅ | Unrelated feature | |
| `App.tsx`, `main.tsx` | Vite entry points | | | ✅ | Vite-only | |

### Summary Counts

| Classification | Count |
|----------------|-------|
| **Reusable as-is** | ~12 files (types, core lists, icons, templates, schema, layout algorithms) |
| **Reusable with refactor** | ~350 files (all nodes, flow components, services, hooks, stores, registries) |
| **Not reusable** | ~280+ files (app builder, AI wall, docs, sheets, converters, Vite config) |
| **Clean candidate for `/logic`** | ~370 files across types, lib, nodes, flow components, services, hooks |

---

## 4. What's Needed to Extract to `/logic`

**Priority 1 — Type Foundation (can copy as-is):**
1. `types/node-plugin.ts` — NodePlugin, NodeInput, NodeOutput, ExecutionContext
2. `types/flowTypes.ts` — FlowNode, FlowEdge, LoopConfiguration
3. `lib/coreNodeTypes.ts` — CORE_NODE_TYPES set

**Priority 2 — Infrastructure (needs refactor):**
4. `lib/node-registry.ts` — replace `window.dispatchEvent` with React context
5. `integrations/supabase/client.ts` — rebuild for Next.js `process.env`
6. `lib/flow-store.ts` — decompose into execution engine + UI state

**Priority 3 — Node Plugins (batch refactor):**
7. All 160 `nodes/*/index.ts` — update Supabase client import, centralize `resolveVariable()`

**Priority 4 — UI Components (needs restyling):**
8. `components/flow/nodes/BaseNode.tsx` — replace legacy CSS with Tailwind
9. `components/flow/editor/NodeInputField.tsx` — adapt form fields
10. `components/flow/FlowCanvas.tsx` — integrate with new layout

---

## 5. Key Architectural Insights

1. **React Flow is already the foundation** — `types/flowTypes.ts` extends `@xyflow/react` types directly. The serialization format IS React Flow's native format. This is a perfect match for the Phase 2 scaffold.

2. **Execution engine is embedded in UI state** — `lib/flow-store.ts` mixes execution logic with dialog state, viewport tracking, and edge animation. The `executeFlow()` function is ~200 lines of reusable DAG traversal that needs extraction.

3. **Supabase edge functions are the execution runtime** — Nodes don't execute API calls directly. They delegate to Supabase edge functions (`{slug}-proxy`). This means the node execution is already server-side. The Cloudflare worker at `imports/cloudflare-worker/` may be an alternative execution target.

4. **Node plugin system is clean and consistent** — 160 nodes follow the same interface. The `getDynamicInputs()` pattern enables sophisticated conditional forms. This is production-ready design.

5. **14 nodes have browser globals** — `localStorage` and `window.location` in 14 nodes are the only code-smell. Every other node is pure logic.

6. **No CSS framework lock-in in node logic** — CSS is only in UI components (`FlowBuilderStyles.css`), not in node definitions or services. The logic layer is style-agnostic.
