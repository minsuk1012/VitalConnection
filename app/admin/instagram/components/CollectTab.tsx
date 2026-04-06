'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

type CollectType = 'hashtag' | 'profile' | 'location' | 'keyword'

const MODES: { id: CollectType; label: string }[] = [
  { id: 'hashtag', label: '해시태그' },
  { id: 'profile', label: '프로필' },
  { id: 'location', label: '위치' },
  { id: 'keyword', label: '키워드' },
]

type ProgressItem = { query: string; status: 'pending' | 'collecting' | 'done' | 'error'; count?: number; error?: string }

export default function CollectTab() {
  const [mode, setMode] = useState<CollectType>('hashtag')
  const [tags, setTags] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [limit, setLimit] = useState(30)
  const [isCollecting, setIsCollecting] = useState(false)
  const [progress, setProgress] = useState<ProgressItem[]>([])

  function addTag(value: string) {
    const trimmed = value.trim().replace(/^[#@]/, '')
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInputValue('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  async function startCollect() {
    if (tags.length === 0 || isCollecting) return

    setIsCollecting(true)
    const items: ProgressItem[] = tags.map(q => ({ query: q, status: 'pending' }))
    setProgress(items)

    for (let i = 0; i < items.length; i++) {
      items[i] = { ...items[i], status: 'collecting' }
      setProgress([...items])

      try {
        const res = await fetch('/api/instagram/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: mode, query: items[i].query, limit }),
        })
        const data = await res.json()

        if (res.ok) {
          items[i] = { ...items[i], status: 'done', count: data.inserted }
        } else {
          items[i] = { ...items[i], status: 'error', error: data.error }
        }
      } catch (err: any) {
        items[i] = { ...items[i], status: 'error', error: err.message }
      }
      setProgress([...items])
    }

    setIsCollecting(false)
  }

  const estimatedCost = (tags.length * limit * 0.01).toFixed(2)

  return (
    <div className="space-y-6">
      {/* 수집 방식 */}
      <div className="space-y-2">
        <Label>수집 방식</Label>
        <ToggleGroup
          value={[mode]}
          onValueChange={(v: string[]) => { if (v.length > 0) setMode(v[v.length - 1] as CollectType) }}
          className="justify-start"
        >
          {MODES.map(m => (
            <ToggleGroupItem key={m.id} value={m.id} size="sm">
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* 검색어 입력 */}
      <div className="space-y-2">
        <Label>검색어 입력</Label>
        <div className="flex flex-wrap gap-2 items-center border rounded-lg p-3 min-h-[48px] bg-background">
          {tags.map(tag => (
            <Badge key={tag} variant="default" className="gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-1 hover:opacity-70">✕</button>
            </Badge>
          ))}
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="입력 후 Enter..."
            disabled={isCollecting}
            className="flex-1 min-w-[150px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
          />
        </div>
      </div>

      {/* 설정 + 시작 */}
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="limit">건수/항목당</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            min={1}
            max={100}
            disabled={isCollecting}
            className="w-20"
          />
        </div>

        <Button
          onClick={startCollect}
          disabled={tags.length === 0 || isCollecting}
        >
          {isCollecting ? '수집중...' : '수집 시작'}
        </Button>

        <span className="text-sm text-muted-foreground pb-2">
          예상 크레딧: ~${estimatedCost}
        </span>
      </div>

      {/* 진행 상황 */}
      {progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">수집 진행 상황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.map(item => (
              <div key={item.query} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{mode === 'hashtag' ? '#' : ''}{item.query}</span>
                  <span className={cn(
                    item.status === 'done' && 'text-green-600',
                    item.status === 'collecting' && 'text-primary',
                    item.status === 'error' && 'text-destructive',
                    item.status === 'pending' && 'text-muted-foreground',
                  )}>
                    {item.status === 'done' ? `${item.count}건 완료` :
                     item.status === 'collecting' ? '수집중...' :
                     item.status === 'error' ? item.error :
                     '대기중'}
                  </span>
                </div>
                <Progress
                  value={
                    item.status === 'done' || item.status === 'error' ? 100 :
                    item.status === 'collecting' ? 50 : 0
                  }
                  className={cn(
                    'h-1.5',
                    item.status === 'done' && '[&>div]:bg-green-500',
                    item.status === 'error' && '[&>div]:bg-destructive',
                    item.status === 'collecting' && 'animate-pulse',
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
