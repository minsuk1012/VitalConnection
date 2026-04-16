// app/api/thumbnail/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, getConfig, saveConfig, PATHS } from '@/lib/thumbnail'
import { buildRegistryEntry } from '@/lib/thumbnail-registry'
import { isTemplateSnapshot, normalizeTemplateSnapshot } from '@/lib/thumbnail-template-schema'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const existing = getConfig(id)
  if (!existing) return NextResponse.json({ error: '템플릿 없음' }, { status: 404 })

  const body = await req.json()
  const registry = getRegistry()
  const entry = registry.templates.find((t: { id: string }) => t.id === id)
  const { nameKo, name, sceneTokenId, accentColor, color, panelColor, elements, texts, requiresCutout } = body
  const existingSnapshot = isTemplateSnapshot(existing) ? existing : null
  const resolvedSceneTokenId =
    (typeof sceneTokenId === 'string' && sceneTokenId) ||
    existingSnapshot?.sceneTokenId ||
    entry?.sceneTokenId ||
    entry?.baseTemplateId ||
    id

  const nextConfig = normalizeTemplateSnapshot({
    id,
    nameKo: nameKo ?? existingSnapshot?.nameKo ?? entry?.nameKo,
    name: name ?? existingSnapshot?.name ?? entry?.name,
    source: (entry?.source === 'legacy') ? 'manual' : (existingSnapshot?.source ?? entry?.source),
    sceneTokenId: resolvedSceneTokenId,
    panelColor: panelColor ?? existingSnapshot?.panelColor ?? entry?.panelColor ?? entry?.color,
    elements: elements ?? existingSnapshot?.elements ?? entry?.elements ?? [],
    texts: texts ?? existingSnapshot?.texts ?? {},
    baseTemplateId: existingSnapshot?.baseTemplateId ?? entry?.baseTemplateId,
    version: existingSnapshot?.version ?? entry?.version,
    createdAt: existingSnapshot?.createdAt ?? entry?.createdAt,
  })

  if (!nextConfig.sceneTokenId || !nextConfig.panelColor) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  saveConfig(id, nextConfig)

  if (entry) {
    const updated = buildRegistryEntry({
      ...entry,
      id,
      nameKo: nameKo ?? nextConfig.nameKo,
      name: name ?? nextConfig.name,
      source: entry.source === 'legacy' ? 'manual' : entry.source,
      sceneTokenId: nextConfig.sceneTokenId,
      layoutTokenId: entry.layoutTokenId,
      effectTokenId: entry.effectTokenId,
      accentColor: accentColor ?? entry.accentColor,
      color: color ?? nextConfig.panelColor,
      panelColor: nextConfig.panelColor,
      elements: nextConfig.elements,
      requiresCutout: requiresCutout ?? entry.requiresCutout,
      createdAt: nextConfig.createdAt ?? entry.createdAt,
    })
    Object.assign(entry, updated)
    fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const registry = getRegistry()
  const index = registry.templates.findIndex((t: { id: string }) => t.id === id)
  const configPath = `${PATHS.configs}/${id}.json`

  if (index === -1 && !fs.existsSync(configPath)) {
    return NextResponse.json({ error: '템플릿 없음' }, { status: 404 })
  }

  if (index !== -1) {
    registry.templates.splice(index, 1)
    fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')
  }

  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath)
  }

  return NextResponse.json({ ok: true })
}
