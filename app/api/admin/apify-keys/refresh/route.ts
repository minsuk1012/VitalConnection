import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getApifyKeys, updateApifyKeyBalance } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  let targetId: number | null = null
  try {
    const body = await request.json()
    targetId = body.id ?? null
  } catch {}

  const allKeys = getApifyKeys()
  const keys = targetId ? allKeys.filter(k => k.id === targetId) : allKeys
  const results = []

  for (const key of keys) {
    try {
      const res = await fetch('https://api.apify.com/v2/users/me/limits', {
        headers: { Authorization: `Bearer ${key.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const monthlyLimit = data.data?.limits?.maxMonthlyUsageUsd ?? 5
        const currentUsage = data.data?.current?.monthlyUsageUsd ?? 0
        updateApifyKeyBalance(key.id, currentUsage, monthlyLimit)
        results.push({ id: key.id, label: key.label, remaining: Math.max(0, monthlyLimit - currentUsage), status: 'ok' })
      } else {
        results.push({ id: key.id, label: key.label, status: 'error', error: `HTTP ${res.status}` })
      }
    } catch (error: any) {
      results.push({ id: key.id, label: key.label, status: 'error', error: error.message })
    }
  }

  return NextResponse.json({ results })
}
