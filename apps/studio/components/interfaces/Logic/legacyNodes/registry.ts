/**
 * Legacy Node Registry
 *
 * Loads node definitions from the static manifest (generated from
 * imports/legacy_rantircloud/nodes) and exposes them for the palette,
 * canvas, and inspector.
 *
 * Import approach: we use a **static JSON manifest** so we do NOT
 * need to transpile 160 legacy TS files into the Studio bundle.
 * The manifest is generated at build/dev time by scanning the
 * legacy nodes directory.
 */

import type { NodePlugin, NodeCategory } from './types'
import { isCoreNode } from './types'
import manifestData from './node-manifest.json'

export interface ManifestEntry {
  dir: string
  type: string
  name: string
  description: string
  category: string
  color: string
  inputCount: number
  outputCount: number
}

const manifest: ManifestEntry[] = manifestData as ManifestEntry[]

const pluginCache = new Map<string, NodePlugin>()

function manifestToPlugin(entry: ManifestEntry): NodePlugin {
  return {
    type: entry.type,
    name: entry.name,
    description: entry.description,
    category: (entry.category || 'action') as NodeCategory,
    color: entry.color,
    inputs: [],
    outputs: [],
  }
}

class LegacyNodeRegistry {
  private entries: ManifestEntry[] = manifest

  getAllEntries(): ManifestEntry[] {
    return this.entries
  }

  getPlugin(type: string): NodePlugin | undefined {
    if (pluginCache.has(type)) return pluginCache.get(type)
    const entry = this.entries.find((e) => e.type === type)
    if (!entry) return undefined
    const plugin = manifestToPlugin(entry)
    pluginCache.set(type, plugin)
    return plugin
  }

  getAvailablePlugins(installedTypes?: string[]): NodePlugin[] {
    return this.entries
      .filter((e) => {
        if (isCoreNode(e.type)) return true
        if (!installedTypes) return true
        return installedTypes.includes(e.type)
      })
      .map((e) => this.getPlugin(e.type)!)
  }

  getAllPlugins(): NodePlugin[] {
    return this.entries.map((e) => this.getPlugin(e.type)!)
  }

  getCorePlugins(): NodePlugin[] {
    return this.entries.filter((e) => isCoreNode(e.type)).map((e) => this.getPlugin(e.type)!)
  }

  getOptionalPlugins(): NodePlugin[] {
    return this.entries.filter((e) => !isCoreNode(e.type)).map((e) => this.getPlugin(e.type)!)
  }

  search(query: string): NodePlugin[] {
    const q = query.toLowerCase()
    return this.entries
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      )
      .map((e) => this.getPlugin(e.type)!)
  }

  getByCategory(category: NodeCategory): NodePlugin[] {
    return this.entries
      .filter((e) => e.category === category)
      .map((e) => this.getPlugin(e.type)!)
  }

  get count(): number {
    return this.entries.length
  }
}

export const legacyNodeRegistry = new LegacyNodeRegistry()
