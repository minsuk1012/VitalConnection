'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ApifyKey {
  id: number
  token: string
  label: string
  monthlyLimit: number
  currentUsage: number
  remaining: number
  isActive: number
}

export default function ApifyKeyManager() {
  const [keys, setKeys] = useState<ApifyKey[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [newLabel, setNewLabel] = useState('')

  async function fetchKeys() {
    try {
      const res = await fetch('/api/admin/apify-keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys)
      }
    } catch {}
  }

  async function addKey() {
    if (!newToken || !newLabel) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/apify-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken, label: newLabel }),
      })
      if (res.ok) {
        setNewToken('')
        setNewLabel('')
        await fetchKeys()
      } else {
        const data = await res.json()
        alert(data.error || '추가 실패')
      }
    } catch {
      alert('키 추가 중 오류 발생')
    } finally {
      setAdding(false)
    }
  }

  async function removeKey(id: number) {
    if (!confirm('이 키를 삭제하시겠습니까?')) return
    try {
      const res = await fetch('/api/admin/apify-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        await fetchKeys()
      }
    } catch {}
  }

  async function refreshAll() {
    setLoading(true)
    try {
      await fetch('/api/admin/apify-keys/refresh', { method: 'POST' })
      await fetchKeys()
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Apify API 키 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key list */}
        {keys.map(key => (
          <div key={key.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{key.label}</span>
                <span className="text-xs text-muted-foreground">{key.token}</span>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      key.remaining > 3 ? 'bg-green-500' :
                      key.remaining > 1 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (key.remaining / key.monthlyLimit) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  ${key.remaining?.toFixed(2)} / ${key.monthlyLimit?.toFixed(2)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeKey(key.id)}
              className="text-muted-foreground hover:text-destructive text-xs">
              삭제
            </Button>
          </div>
        ))}

        {keys.length === 0 && (
          <p className="text-sm text-muted-foreground">.env.local의 APIFY_TOKEN을 사용 중입니다.</p>
        )}

        {/* Total remaining */}
        {keys.length > 0 && (
          <div className="text-sm font-medium pt-2 border-t">
            총 잔액: ${keys.reduce((sum, k) => sum + (k.remaining ?? 0), 0).toFixed(2)}
          </div>
        )}

        {/* Add form */}
        <div className="flex gap-2 pt-2">
          <Input placeholder="API 토큰" value={newToken} onChange={e => setNewToken(e.target.value)} className="flex-1 text-xs" />
          <Input placeholder="라벨" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-24 text-xs" />
          <Button size="sm" onClick={addKey} disabled={adding || !newToken || !newLabel}>
            {adding ? '확인중...' : '추가'}
          </Button>
        </div>

        {/* Refresh button */}
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading} className="w-full">
          {loading ? '새로고침 중...' : '잔액 새로고침'}
        </Button>
      </CardContent>
    </Card>
  )
}
