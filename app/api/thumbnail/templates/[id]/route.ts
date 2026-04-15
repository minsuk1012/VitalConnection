// app/api/thumbnail/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, getConfig, saveConfig, PATHS } from '@/lib/thumbnail'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const existing = getConfig(id)
  if (!existing) return NextResponse.json({ error: '템플릿 없음' }, { status: 404 })

  const body = await req.json()
  const { nameKo, layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts } = body

  saveConfig(id, { layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts })

  if (nameKo) {
    const registry = getRegistry()
    const entry = registry.templates.find((t: { id: string }) => t.id === id)
    if (entry) {
      entry.nameKo = nameKo
      entry.name   = nameKo
      if (accentColor) entry.accentColor = accentColor
      fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')
    }
  }

  return NextResponse.json({ ok: true })
}
