import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getConfig, saveConfig } from '@/lib/thumbnail'

// GET /api/thumbnail/config/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const config = getConfig(id)
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(config)
}

// POST /api/thumbnail/config/:id
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  try {
    saveConfig(id, body)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
