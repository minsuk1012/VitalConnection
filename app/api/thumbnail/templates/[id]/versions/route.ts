import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, saveConfig, PATHS } from '@/lib/thumbnail'
import {
  buildRegistryEntry,
  generateVersionedTemplateId,
  resolveTemplateVersionInfo,
} from '@/lib/thumbnail-registry'
import { normalizeTemplateSnapshot } from '@/lib/thumbnail-template-schema'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const registry = getRegistry()
  const sourceEntry = registry.templates.find((t: any) => t.id === id)
  if (!sourceEntry) {
    return NextResponse.json({ error: '템플릿 없음' }, { status: 404 })
  }

  const body = await req.json()
  const config = body.config ?? body

  const versionInfo = resolveTemplateVersionInfo(sourceEntry)
  const baseTemplateId = versionInfo.baseTemplateId ?? sourceEntry.id
  const nextVersion = registry.templates.reduce((maxVersion: number, entry: any) => {
    const info = resolveTemplateVersionInfo(entry)
    if ((info.baseTemplateId ?? entry.id) !== baseTemplateId) return maxVersion
    return Math.max(maxVersion, info.version ?? 1)
  }, 1) + 1

  const { id: nextId, version } = generateVersionedTemplateId(
    baseTemplateId,
    registry.templates.map((entry: any) => entry.id),
    nextVersion,
  )

  const resolvedSceneTokenId =
    (typeof config.sceneTokenId === 'string' && config.sceneTokenId)
    || sourceEntry.sceneTokenId
    || sourceEntry.baseTemplateId
    || sourceEntry.id

  const nextConfig = normalizeTemplateSnapshot({
    id: nextId,
    nameKo: body.nameKo ?? sourceEntry.nameKo,
    name: body.name ?? sourceEntry.name,
    source: sourceEntry.source === 'legacy' ? 'manual' : sourceEntry.source,
    sceneTokenId: resolvedSceneTokenId,
    panelColor: config.panelColor ?? sourceEntry.panelColor ?? sourceEntry.color,
    elements: config.elements ?? sourceEntry.elements ?? [],
    texts: config.texts ?? {},
    baseTemplateId,
    version,
    createdAt: new Date().toISOString(),
  })

  if (!nextConfig.sceneTokenId || !nextConfig.panelColor) {
    return NextResponse.json({ error: '신규 포맷 필수 필드 누락' }, { status: 400 })
  }

  saveConfig(nextId, nextConfig)

  const source = sourceEntry.source === 'legacy'
    ? 'manual'
    : sourceEntry.source

  const newEntry = buildRegistryEntry({
    ...sourceEntry,
    id: nextId,
    nameKo: body.nameKo ?? nextConfig.nameKo,
    name: body.name ?? nextConfig.name,
    source,
    baseTemplateId,
    version,
    sceneTokenId: nextConfig.sceneTokenId,
    layoutTokenId: sourceEntry.layoutTokenId,
    effectTokenId: sourceEntry.effectTokenId,
    accentColor: sourceEntry.accentColor,
    color: nextConfig.panelColor,
    panelColor: nextConfig.panelColor,
    elements: nextConfig.elements,
    requiresCutout: sourceEntry.requiresCutout,
    createdAt: new Date().toISOString(),
  })

  const sourceIndex = registry.templates.findIndex((entry: any) => entry.id === id)
  if (sourceIndex >= 0) {
    registry.templates.splice(sourceIndex + 1, 0, newEntry)
  } else {
    registry.templates.push(newEntry)
  }

  fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')

  return NextResponse.json({ ok: true, id: nextId, version })
}
