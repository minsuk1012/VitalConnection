'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ApifyKey {
  id: number
  token: string
  label: string
  monthlyLimit: number
  currentUsage: number
  remaining: number
  isActive: number
  isSelected: number
  lastChecked: string
}

type ConfirmAction = { type: 'select' | 'sync' | 'delete'; key: ApifyKey } | null

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApifyKey[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction>(null)

  async function fetchKeys() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/apify-keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys)
      }
    } catch {}
    setLoading(false)
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

  async function executeAction() {
    if (!confirm) return
    const { type, key } = confirm
    setConfirm(null)

    if (type === 'select') {
      await fetch('/api/admin/apify-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key.id }),
      })
      await fetchKeys()
    } else if (type === 'sync') {
      setSyncingId(key.id)
      try {
        await fetch('/api/admin/apify-keys/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key.id }),
        })
        await fetchKeys()
      } catch {}
      setSyncingId(null)
    } else if (type === 'delete') {
      await fetch('/api/admin/apify-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key.id }),
      })
      await fetchKeys()
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const totalRemaining = keys.reduce((sum, k) => sum + (k.remaining ?? 0), 0)
  const totalLimit = keys.reduce((sum, k) => sum + (k.monthlyLimit ?? 0), 0)

  const confirmMessages: Record<string, { title: string; desc: string; action: string; destructive?: boolean }> = {
    select: { title: '키 변경', desc: `"${confirm?.key.label}" 키를 사용하시겠습니까? 기존 선택된 키는 해제됩니다.`, action: '변경' },
    sync: { title: '잔액 동기화', desc: `"${confirm?.key.label}" 키의 잔액을 Apify API에서 가져옵니다.`, action: '동기화' },
    delete: { title: '키 삭제', desc: `"${confirm?.key.label}" 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, action: '삭제', destructive: true },
  }
  const msg = confirm ? confirmMessages[confirm.type] : null

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
      {/* 확인 모달 */}
      <AlertDialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{msg?.title}</AlertDialogTitle>
            <AlertDialogDescription>{msg?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} className={msg?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {msg?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apify API 키 관리</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            프로덕션에서는 DB에 등록된 키를 사용합니다. 선택된 키를 우선 사용하고, 한도 초과 시 자동 스위칭됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 요약 */}
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-muted-foreground">등록 키</div>
              <div className="text-2xl font-bold">{keys.length}개</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">총 잔액</div>
              <div className="text-2xl font-bold">${totalRemaining.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">월 한도</div>
              <div className="text-2xl font-bold">${totalLimit.toFixed(2)}</div>
            </div>
          </div>

          {/* 키 목록 테이블 */}
          {keys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>라벨</TableHead>
                  <TableHead>토큰</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                  <TableHead className="text-right">한도</TableHead>
                  <TableHead>사용률</TableHead>
                  <TableHead>마지막 동기화</TableHead>
                  <TableHead className="w-44"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(key => {
                  const usagePercent = key.monthlyLimit > 0 ? ((key.currentUsage / key.monthlyLimit) * 100) : 0
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.label}
                        {key.isSelected ? <Badge variant="default" className="ml-2">사용중</Badge> : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{key.token}</TableCell>
                      <TableCell className="text-right">
                        <span className={key.remaining < 1 ? 'text-destructive font-medium' : key.remaining < 3 ? 'text-yellow-600 font-medium' : ''}>
                          ${key.remaining?.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">${key.monthlyLimit?.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-20">
                            <div
                              className={`h-full rounded-full ${
                                usagePercent > 90 ? 'bg-red-500' :
                                usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{usagePercent.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {key.lastChecked ? (
                          <span title={key.lastChecked}>
                            {new Date(key.lastChecked).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <Badge variant="secondary">미확인</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!key.isSelected && (
                            <Button variant="ghost" size="xs" onClick={() => setConfirm({ type: 'select', key })} className="text-xs">
                              선택
                            </Button>
                          )}
                          <Button variant="ghost" size="xs" onClick={() => setConfirm({ type: 'sync', key })} disabled={syncingId === key.id} className="text-xs">
                            {syncingId === key.id ? '동기화중...' : '동기화'}
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => setConfirm({ type: 'delete', key })} className="text-xs text-muted-foreground hover:text-destructive">
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {loading ? '로딩중...' : '등록된 키가 없습니다. 개발 환경에서는 .env.local의 APIFY_TOKEN을 사용합니다.'}
            </p>
          )}

          {/* 키 추가 폼 */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">새 키 추가</Label>
            <div className="flex gap-2">
              <Input placeholder="apify_api_..." value={newToken} onChange={e => setNewToken(e.target.value)} className="flex-1 font-mono text-xs" />
              <Input placeholder="라벨 (예: 개인계정)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-40" />
              <Button onClick={addKey} disabled={adding || !newToken || !newLabel}>
                {adding ? '검증중...' : '추가'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              추가 시 Apify API로 토큰 유효성을 검증하고 잔액을 자동으로 가져옵니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
