'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const PRESETS: Record<string, { label: string; tags: string[] }> = {
  kbeauty: { label: '🇰🇷 K-Beauty', tags: ['kbeauty', 'kbeautyskincare', 'koreanbeauty', 'koreanskincare'] },
  medical_tourism: { label: '🏥 의료관광', tags: ['plasticsurgerykorea', 'koreandermatology', 'gangnamclinic', 'koreamedical'] },
  japan: { label: '🇯🇵 일본', tags: ['韓国美容', '韓国皮膚科', '韓国整形'] },
  thai: { label: '🇹🇭 태국', tags: ['ศัลยกรรมเกาหลี', 'คลินิกเกาหลี'] },
  vietnam: { label: '🇻🇳 베트남', tags: ['thẩmmỹhànquốc', 'dauhanquoc'] },
}

type CollectType = 'hashtag' | 'profile' | 'location' | 'keyword'

const MODES: { id: CollectType; label: string }[] = [
  { id: 'hashtag', label: '#️⃣ 해시태그' },
  { id: 'profile', label: '👤 프로필' },
  { id: 'location', label: '📍 위치' },
  { id: 'keyword', label: '🔍 키워드' },
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

  function applyPreset(key: string) {
    const preset = PRESETS[key]
    if (!preset) return
    setTags([...new Set([...tags, ...preset.tags])])
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
      {/* 프리셋 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">빠른 프리셋</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Button key={key} variant="secondary" size="sm" onClick={() => applyPreset(key)}>
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 수집 방식 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">수집 방식</label>
        <div className="flex gap-1">
          {MODES.map(m => (
            <Button
              key={m.id}
              variant={mode === m.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 검색어 입력 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">검색어 입력</label>
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
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">건수/항목당</label>
          <Input
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
          className="mt-5"
        >
          {isCollecting ? '수집중...' : '수집 시작'}
        </Button>

        <span className="text-sm text-muted-foreground mt-5">
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
                    {item.status === 'done' ? `✓ ${item.count}건 완료` :
                     item.status === 'collecting' ? '수집중...' :
                     item.status === 'error' ? `✕ ${item.error}` :
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
