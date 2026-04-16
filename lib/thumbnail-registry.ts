import type { ElementInstance } from './thumbnail-element-schema'
import { getRegistry } from './thumbnail'
import { resolveSceneTokenId as resolveSnapshotSceneTokenId } from './thumbnail-template-schema'
import type { SceneToken } from './thumbnail-template-schema'

export type RegistrySource = 'builder' | 'manual' | 'legacy' | 'llm-text' | 'llm-image'

export interface RegistryEntryInput {
  id: string
  nameKo?: string
  name?: string
  source?: RegistrySource
  baseTemplateId?: string
  version?: number
  sceneTokenId?: string
  layoutTokenId?: string
  effectTokenId?: string
  accentColor?: string
  color?: string
  panelColor?: string
  elements?: ElementInstance[]
  layout?: string
  legacyLayout?: string
  createdAt?: string
  requiresCutout?: boolean
}

const LAYOUT_GROUP_BY_TOKEN: Record<string, string> = {
  'bottom-text-stack': 'full-overlay',
  'left-text-stack': 'split',
  'stacked-center-cutout': 'solid-bg',
  'bottom-banner': 'bottom-banner',
  'top-left-editorial': 'full-overlay',
  'solid-text-left': 'solid-bg',
  'center-frame-circle': 'frame',
  'card-frame-dark': 'frame',
  'card-frame-white': 'frame',
  'gradient-dual-circle': 'gradient-bg',
  'circle-bg-callout': 'frame',
  'arch-frame-editorial': 'frame',
  'center-frame-sparkle': 'frame',
  'solid-bg-stars': 'solid-bg',
  'solid-bg-icons': 'solid-bg',
  'solid-bg-stamp': 'solid-bg',
  'gradient-mesh': 'gradient-bg',
  'gradient-stroke-typography': 'gradient-bg',
  'notebook-diary': 'frame',
}

const VERSIONED_TEMPLATE_ID_RE = /^(.*)-v(\d+)$/

const CUTOUT_LAYOUT_TOKENS = new Set([
  'stacked-center-cutout',
  'gradient-mesh',
  'gradient-stroke-typography',
  'center-frame-sparkle',
  'solid-bg-stars',
  'solid-bg-icons',
  'solid-bg-stamp',
])

const COLOR_TARGET_PRIORITY = [
  'price',
  'headline',
  'headline-ko',
  'subheadline',
  'brand-ko',
  'brand-en',
  'tagline',
  'model',
]

export function parseVersionedTemplateId(id: string) {
  const match = id.match(VERSIONED_TEMPLATE_ID_RE)
  if (!match) return null
  return {
    baseTemplateId: match[1],
    version: Number(match[2]),
  }
}

export function resolveTemplateVersionInfo(input: {
  id: string
  baseTemplateId?: string
  version?: number
}) {
  const parsed = parseVersionedTemplateId(input.id)
  return {
    baseTemplateId: input.baseTemplateId ?? parsed?.baseTemplateId,
    version: input.version ?? parsed?.version,
  }
}

export function generateVersionedTemplateId(
  baseTemplateId: string,
  existingIds: Iterable<string>,
  startVersion: number,
) {
  const taken = new Set(existingIds)
  let version = Math.max(1, startVersion)
  let id = `${baseTemplateId}-v${version}`
  while (taken.has(id)) {
    version += 1
    id = `${baseTemplateId}-v${version}`
  }
  return { id, version }
}

export function deriveSceneTokenId(input: {
  id: string
  sceneTokenId?: string
  baseTemplateId?: string
  version?: number
}) {
  return resolveSnapshotSceneTokenId(input)
}

export function deriveRegistryLayout(layoutTokenId?: string, legacyLayout?: string): string | undefined {
  if (legacyLayout) return legacyLayout
  if (!layoutTokenId) return undefined
  return LAYOUT_GROUP_BY_TOKEN[layoutTokenId] ?? layoutTokenId
}

export function deriveRegistryColor(input: {
  accentColor?: string
  color?: string
  panelColor?: string
  elements?: ElementInstance[]
}): string {
  if (input.accentColor) return input.accentColor
  if (input.color) return input.color

  const elementColor = input.elements?.find(el =>
    COLOR_TARGET_PRIORITY.includes(el.cssTarget) &&
    typeof el.props.color === 'string' &&
    el.props.color.trim() !== '',
  )?.props.color

  if (typeof elementColor === 'string' && elementColor.trim()) return elementColor

  const elementBgColor = input.elements?.find(el =>
    COLOR_TARGET_PRIORITY.includes(el.cssTarget) &&
    typeof el.props.bgColor === 'string' &&
    el.props.bgColor.trim() !== '',
  )?.props.bgColor

  if (typeof elementBgColor === 'string' && elementBgColor.trim()) return elementBgColor

  if (input.panelColor) return input.panelColor
  return '#1a1a2e'
}

export function deriveRequiresCutout(layoutTokenId?: string, current?: boolean): boolean | undefined {
  if (typeof current === 'boolean') return current
  if (!layoutTokenId) return undefined
  return CUTOUT_LAYOUT_TOKENS.has(layoutTokenId)
}

export function buildRegistryEntry(input: RegistryEntryInput) {
  const accentColor = deriveRegistryColor({
    accentColor: input.accentColor,
    color: input.color,
    panelColor: input.panelColor,
    elements: input.elements,
  })
  const versionInfo = resolveTemplateVersionInfo({
    id: input.id,
    baseTemplateId: input.baseTemplateId,
    version: input.version,
  })

  return {
    id: input.id,
    nameKo: input.nameKo ?? input.name ?? input.id,
    name: input.name ?? input.nameKo ?? input.id,
    source: input.source ?? 'manual',
    baseTemplateId: versionInfo.baseTemplateId,
    version: versionInfo.version,
    sceneTokenId: input.sceneTokenId ?? versionInfo.baseTemplateId ?? input.id,
    layoutTokenId: input.layoutTokenId,
    effectTokenId: input.effectTokenId,
    accentColor,
    color: input.color ?? accentColor,
    layout: input.layout ?? deriveRegistryLayout(input.layoutTokenId, input.legacyLayout),
    createdAt: input.createdAt ?? new Date().toISOString(),
    requiresCutout: deriveRequiresCutout(input.layoutTokenId, input.requiresCutout),
  }
}

export function getSceneTokens(): SceneToken[] {
  const registry = getRegistry()
  const seen = new Set<string>()
  const scenes: SceneToken[] = []

  for (const entry of registry.templates ?? []) {
    const sceneId = deriveSceneTokenId(entry)
    if (!sceneId || seen.has(sceneId)) continue
    seen.add(sceneId)

    scenes.push({
      id: sceneId,
      nameKo: entry.nameKo ?? entry.name ?? sceneId,
      name: entry.name ?? entry.nameKo ?? sceneId,
      description: entry.description,
      group: entry.layout,
      tags: entry.tags,
      requiresCutout: entry.requiresCutout,
      color: entry.color,
      accentColor: entry.accentColor,
      layoutTokenId: entry.layoutTokenId,
      effectTokenId: entry.effectTokenId,
    })
  }

  return scenes
}

export function getSceneTokenById(sceneTokenId: string): SceneToken | null {
  const registry = getRegistry()
  const entry = registry.templates?.find((item: RegistryEntryInput) =>
    deriveSceneTokenId(item) === sceneTokenId
  )

  if (!entry) return null

  return {
    id: sceneTokenId,
    nameKo: entry.nameKo ?? entry.name ?? sceneTokenId,
    name: entry.name ?? entry.nameKo ?? sceneTokenId,
    description: entry.description,
    group: entry.layout,
    tags: entry.tags,
    requiresCutout: entry.requiresCutout,
    color: entry.color,
    accentColor: entry.accentColor,
    layoutTokenId: entry.layoutTokenId,
    effectTokenId: entry.effectTokenId,
  }
}
