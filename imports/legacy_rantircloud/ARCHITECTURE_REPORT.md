# Legacy Rantir Cloud — Architectural Analysis Report

**Source:** `nodes.zip` (committed to master), extracted to `imports/legacy_rantircloud/src/`
**Date:** 2026-02-27
**Scope:** Analysis only — no code modified, no files copied, no components created.

---

## 1. Inventory Summary

| Metric | Count |
|--------|-------|
| Total files | 161 (all `index.ts`) |
| Total node directories | 160 |
| Action nodes | 143 |
| Transformer nodes | 10 |
| Trigger nodes | 2 |
| Condition nodes | 2 |
| Uncategorized | 1 (webflow) |

**What is present:** Node plugin definitions only.
**What is NOT present:** Flow engine, execution engine, runtime orchestration, state management, serialization format, UI components, configuration panels, persistence layer, CSS, build config.

---

## 2. Categorized Analysis

### 2.1 Flow Engine Core Logic

| Component | Status |
|-----------|--------|
| Execution engine | **NOT INCLUDED** — no flow runner, scheduler, or step executor code |
| Runtime orchestration | **NOT INCLUDED** — no DAG traversal, parallel execution, or retry logic |
| Node registry | **REFERENCED** — `import { nodeRegistry } from '@/lib/node-registry'` appears in 1 node (loop-node). Registry itself is missing. |
| Node lifecycle handling | **NOT INCLUDED** — no init/teardown/timeout/error-boundary code |

### 2.2 Node Definitions (THE PRIMARY ASSET)

Every file follows a consistent `NodePlugin` interface:

```typescript
interface NodePlugin {
  type: string;                    // unique slug (e.g., 'activecampaign')
  name: string;                    // display name
  description: string;             // tooltip/description
  category: 'action' | 'trigger' | 'transformer' | 'condition';
  icon: LucideIcon;                // from lucide-react
  color: string;                   // hex color
  inputs: NodeInput[];             // typed input definitions
  outputs: NodeOutput[];           // typed output definitions
  execute(inputs, context): Promise<Record<string, any>>;
  getDynamicInputs?(currentInputs): NodeInput[];  // optional
}
```

**Input types observed:** `text`, `select`, `boolean`, `number`, `textarea`, `code` (with `language: 'json'`), `loopVariables`
**Output types observed:** `string`, `number`, `boolean`, `object`, `array`

### 2.3 UI Node Components / Configuration Panels

**NOT INCLUDED.** The archive contains only data-layer node definitions. There are no:
- React components for rendering nodes on canvas
- Input/output handle components
- Configuration panel UIs
- Node property editors

These were part of the legacy Rantir Cloud frontend (likely at `@/components/flow/`) and are not in the archive.

### 2.4 Flow Serialization Format

**NOT INCLUDED.** No JSON schema, import/export utilities, or persistence format definitions found.

### 2.5 State Management

**NOT INCLUDED.** No stores, contexts, or global state files. However, legacy state patterns are visible inside nodes:
- `localStorage.getItem('flow-env-vars')` — env var storage
- `localStorage.getItem('flow-variables-${flowId}')` — flow-scoped variables
- `window.location.pathname.split('/').pop()` — flow ID from URL

### 2.6 Supabase Integration Logic

| Pattern | Count | Detail |
|---------|-------|--------|
| `supabase.functions.invoke('{name}-proxy')` | 126 nodes | Every action node calls a dedicated edge function |
| `import { supabase } from '@/integrations/supabase/client'` | 147 nodes | Direct Supabase client import |
| `import { databaseService } from '@/services/databaseService'` | 1 node (data-table) | Abstracted DB service |
| `import { tableService } from '@/services/tableService'` | 1 node (data-table) | Abstracted table service |
| Direct `supabase.from()` / `supabase.rpc()` | 0 | No direct PostgREST calls in nodes |

**Auth coupling:** None directly in nodes. Auth is handled externally by the Supabase client singleton.

**Edge function naming convention:** `{integration-slug}-proxy` or `{integration-slug}-action`

### 2.7 Visual Builder Specific Code

**NOT INCLUDED.** No visual builder components, canvas renderers, drag-and-drop handlers, or layout managers.

**Referenced but missing:**
- `@/components/flow/icons/AirtableIcon` (and HubSpot, Salesforce, Shopify, Snowflake)
- `@/components/flow/` — entire flow UI component tree
- `@/lib/node-registry` — node registration system

---

## 3. Dependency Analysis

### External Dependencies (per node files)

| Dependency | Usage | Available in Studio? |
|------------|-------|---------------------|
| `lucide-react` | Icons for every node | ✅ Yes — already in Studio |
| `@/types/node-plugin` | Core type definitions | ❌ Missing — must be created |
| `@/integrations/supabase/client` | Supabase client singleton | ⚠️ Needs adaptation — Studio has different Supabase client |
| `@/lib/node-registry` | Node registration | ❌ Missing — must be created |
| `@/services/databaseService` | DB abstraction (1 node) | ❌ Missing |
| `@/services/tableService` | Table abstraction (1 node) | ❌ Missing |
| `@/components/flow/icons/*` | Custom SVG icons (5 nodes) | ❌ Missing — can use lucide fallbacks |

### Legacy Stack Coupling

| Pattern | Count | Severity |
|---------|-------|----------|
| `localStorage` usage | 14 nodes | 🟡 Medium — must be replaced with proper state management |
| `window.location` usage | 14 nodes | 🟡 Medium — must use Next.js router |
| `resolveVariable()` helper (copy-pasted) | 12 nodes | 🟡 Medium — should be centralized utility |
| Vite-only setup (`@/` alias) | All 161 files | 🟢 Low — `@/` alias just needs tsconfig mapping |
| Legacy CSS system | 0 files | ✅ None — no CSS in archive |

---

## 4. Folder → Purpose → Reusability Matrix

### Node Categories

| Folder | Purpose | Reusable As-Is | Reusable With Refactor | Not Reusable | Legacy Dep | Clean Candidate |
|--------|---------|:-:|:-:|:-:|:-:|:-:|
| `nodes/activecampaign/` ... (143 action nodes) | Integration action definitions | | ✅ | | `supabase client`, `localStorage` | ✅ |
| `nodes/webhook-trigger/` | Webhook trigger with dynamic output inference | | ✅ | | `supabase client` | ✅ |
| `nodes/cal-com/` | Calendar trigger | | ✅ | | `supabase client` | ✅ |
| `nodes/ai-agent/` | AI agent with multi-model support | | ✅ | | `supabase client` | ✅ |
| `nodes/ai-mapper/` | AI-powered data transformation | | ✅ | | `supabase client` | ✅ |
| `nodes/for-each-loop/` | Loop control flow | | ✅ | | `nodeRegistry` | ✅ |
| `nodes/loop-node/` | Generic loop | | ✅ | | `nodeRegistry` | ✅ |
| `nodes/data-filter/` | Data filtering/transformation | | ✅ | | minimal | ✅ |
| `nodes/condition/` | Conditional branching | | ✅ | | minimal | ✅ |
| `nodes/approval/` | Human-in-the-loop approval | | ✅ | | `supabase client` | ✅ |
| `nodes/calculator/` | Math operations | | ✅ | | none | ✅ |
| `nodes/http-request/` | Generic HTTP client | | ✅ | | `supabase client` | ✅ |
| `nodes/data-table/` | Database CRUD operations | | ✅ | | `databaseService`, `tableService` | ✅ |

### Summary Counts

| Classification | Count |
|----------------|-------|
| **Reusable as-is** | 0 (all need at minimum import path changes) |
| **Reusable with refactor** | 160 (all nodes) |
| **Not reusable** | 0 |
| **Depends on legacy stack** | 14 (localStorage/window — light refactor) |
| **Clean candidate for `/logic`** | 160 (all nodes, after refactor) |

---

## 5. Refactor Requirements (For Future Extraction)

These are the changes needed to make nodes usable in the new `/logic` project type. **Do not execute yet.**

### Priority 1 — Infrastructure (must exist before any node works)

1. **Create `NodePlugin` type definition** — extract from usage patterns above
2. **Create Supabase client adapter** — wrap Studio's Supabase client to match `@/integrations/supabase/client` interface
3. **Create `nodeRegistry`** — registration system for discovered nodes
4. **Replace `localStorage`/`window.location`** — centralize `resolveVariable()` into a single utility that uses proper React state/context

### Priority 2 — Path Aliases

5. **Map `@/` alias** — configure `tsconfig.json` paths or use relative imports

### Priority 3 — Per-Node Cleanup

6. **Standardize edge function invocation** — ensure all `supabase.functions.invoke()` calls go through a unified proxy layer
7. **Replace 5 custom icons** — AirtableIcon, HubSpotIcon, SalesforceIcon, ShopifyIcon, SnowflakeIcon → use lucide-react alternatives or create new SVGs

---

## 6. What's Missing From The Archive

The following components are referenced by the nodes but not included. They would need to be either recovered from the legacy codebase or rebuilt:

| Missing Component | Path Referenced | Required For |
|-------------------|----------------|-------------|
| `NodePlugin` types | `@/types/node-plugin` | All 161 files |
| Supabase client singleton | `@/integrations/supabase/client` | 147 nodes |
| Node registry | `@/lib/node-registry` | Loop nodes |
| Database service | `@/services/databaseService` | data-table node |
| Table service | `@/services/tableService` | data-table node |
| Custom integration icons | `@/components/flow/icons/*` | 5 nodes |
| Flow execution engine | Unknown path | Running flows |
| Flow serialization | Unknown path | Save/load flows |
| Node UI components | `@/components/flow/` | Visual rendering |
| State management | Unknown | Flow variable resolution |

---

## 7. Conclusion

The `nodes.zip` archive is a **node definition library** — 160 integration plugins following a consistent `NodePlugin` interface. It is the **data layer** of the flow system, not the engine or UI.

**Strengths:**
- Extremely consistent structure across all 160 nodes
- Clean separation of concerns (each node is self-contained)
- Well-typed inputs/outputs with metadata
- `getDynamicInputs()` pattern enables dynamic configuration
- All edge function calls follow a naming convention

**Weaknesses:**
- 14 nodes use `localStorage`/`window.location` (browser globals)
- `resolveVariable()` helper is copy-pasted across 12 files instead of centralized
- No accompanying engine, UI, or persistence code
- Missing type definitions (`NodePlugin` interface must be reconstructed)

**Recommendation:** All 160 nodes are clean candidates for the new `/logic` project type after a systematic refactor pass. The `NodePlugin` interface should be formalized first, followed by creating infrastructure adapters (Supabase client wrapper, registry, variable resolver).
