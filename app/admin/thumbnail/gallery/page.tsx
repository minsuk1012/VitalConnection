'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Scissors, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type TabType = 'models' | 'raw' | 'cutout'

interface GalleryData {
  models: string[]
  raw: string[]
  cutout: string[]
}

export default function ThumbnailGalleryPage() {
  const [data, setData] = useState<GalleryData>({ models: [], raw: [], cutout: [] })
  const [loading, setLoading] = useState(true)
  const [cutoutSet, setCutoutSet] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [m, r, c] = await Promise.all([
      fetch('/api/thumbnail/models?type=models').then(res => res.json()),
      fetch('/api/thumbnail/models-raw').then(res => res.json()),
      fetch('/api/thumbnail/models?type=cutout').then(res => res.json()),
    ])
    const models  = m.files ?? []
    const raw     = r.files ?? []
    const cutout  = c.files ?? []
    setData({ models, raw, cutout })
    // 누끼 완료 여부 set
    setCutoutSet(new Set(cutout.map((f: string) => f.replace(/\.(webp|jpg|jpeg|png)$/i, ''))))
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const showToast = (msg: string, isError = false) => {
    setToast((isError ? '❌ ' : '✓ ') + msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── 리네임 ──
  const rename = async (file: string, type: TabType) => {
    const newBaseName = renaming[file]?.trim()
    if (!newBaseName) return
    const folder = file.includes('/') ? file.split('/')[0] + '/' : ''
    const ext    = file.match(/\.(webp|jpg|jpeg|png)$/i)?.[0] ?? ''
    const to     = folder + newBaseName.replace(/[^\w가-힣\-_.]/g, '_') + ext
    if (to === file) return

    const res = await fetch('/api/thumbnail/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: file, to, type }),
    })
    if (res.ok) { showToast('이름 변경됨'); await loadAll() }
    else showToast(await res.text(), true)
  }

  // ── 누끼 처리 ──
  const makeCutout = async (file: string) => {
    setProcessing(prev => new Set(prev).add(file))
    const res = await fetch('/api/thumbnail/cutout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, source: 'raw' }),
    })
    setProcessing(prev => { const s = new Set(prev); s.delete(file); return s })
    if (res.ok) { showToast('누끼 처리 완료!'); await loadAll() }
    else showToast(await res.text(), true)
  }

  // ── 이미지 그리드 렌더 ──
  const renderGrid = (files: string[], type: TabType) => {
    if (loading) return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
      </div>
    )
    if (!files.length) return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">이미지 없음</div>
    )

    // 폴더별 그룹핑
    const groups: Record<string, string[]> = {}
    for (const f of files) {
      const g = f.includes('/') ? f.split('/')[0] : '기타'
      ;(groups[g] ??= []).push(f)
    }

    const assetBase = type === 'cutout' ? 'models-cutout'
                    : type === 'raw'    ? 'models-raw'
                    : 'models'

    return (
      <div className="overflow-y-auto flex-1 p-4 space-y-6">
        {Object.entries(groups).map(([group, imgs]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group}</span>
              <span className="text-xs text-gray-300">{imgs.length}장</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {imgs.map(f => {
                const nameNoExt = f.replace(/\.(webp|jpg|jpeg|png)$/i, '')
                const hasCutout = cutoutSet.has(nameNoExt)
                const isProcessing = processing.has(f)
                const encodedPath = f.split('/').map(encodeURIComponent).join('/')
                const imgSrc = `/api/thumbnail/asset/${assetBase}/${encodedPath}`

                return (
                  <div key={f} className={cn(
                    'rounded-lg border bg-white overflow-hidden transition-shadow hover:shadow-md',
                    hasCutout ? 'border-green-200' : 'border-gray-200'
                  )}>
                    {/* 이미지 */}
                    <div className="relative aspect-square bg-[repeating-conic-gradient(#f0f0f0_0%_25%,white_0%_50%)] bg-[length:16px_16px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc} alt={f}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                      />
                      {hasCutout && (
                        <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          누끼✓
                        </span>
                      )}
                    </div>

                    {/* 카드 하단 */}
                    <div className="p-2 space-y-1.5">
                      <p className="text-[10px] text-gray-400 truncate" title={f}>
                        {f.split('/').pop()}
                      </p>
                      {/* 리네임 */}
                      <div className="flex gap-1">
                        <Input
                          value={renaming[f] ?? nameNoExt.split('/').pop() ?? ''}
                          onChange={e => setRenaming(prev => ({ ...prev, [f]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && rename(f, type)}
                          className="h-6 text-[10px] px-1.5 flex-1 min-w-0"
                          placeholder="새 이름"
                        />
                        <Button size="xs" variant="outline"
                          onClick={() => rename(f, type)}
                          className="h-6 px-1.5 text-[10px] flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                      {/* 누끼 처리 (raw 탭만) */}
                      {type === 'raw' && (
                        <Button
                          size="xs"
                          variant={hasCutout ? 'secondary' : 'outline'}
                          onClick={() => !hasCutout && makeCutout(f)}
                          disabled={isProcessing || hasCutout}
                          className={cn('w-full h-6 text-[10px] gap-1',
                            hasCutout && 'text-green-600 border-green-200'
                          )}>
                          {isProcessing
                            ? <><RefreshCw className="w-3 h-3 animate-spin" />처리 중...</>
                            : hasCutout
                              ? <><Check className="w-3 h-3" />완료</>
                              : <><Scissors className="w-3 h-3" />누끼 처리</>}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <Button variant="ghost" size="sm" render={<Link href="/admin/thumbnail" />}
          className="text-gray-500 hover:text-gray-900 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />에디터
        </Button>
        <h1 className="text-sm font-semibold text-gray-800">모델 갤러리</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5 text-xs h-7">
            <RefreshCw className="w-3 h-3" />새로고침
          </Button>
          <Badge variant="outline" className="text-xs text-gray-500">
            {data.models.length + data.raw.length + data.cutout.length}장
          </Badge>
        </div>
      </header>

      {/* 탭 */}
      <Tabs defaultValue="models" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-gray-200 bg-white flex-shrink-0 h-10 justify-start px-4 gap-2">
          <TabsTrigger value="models" className="text-xs gap-1.5">
            일반 모델 <Badge variant="outline" className="text-[10px] h-4 px-1">{data.models.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs gap-1.5">
            누끼 원본 <Badge variant="outline" className="text-[10px] h-4 px-1">{data.raw.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cutout" className="text-xs gap-1.5">
            누끼 완료 <Badge variant="outline" className="text-[10px] h-4 px-1">{data.cutout.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="flex-1 overflow-hidden flex flex-col mt-0">
          {renderGrid(data.models, 'models')}
        </TabsContent>
        <TabsContent value="raw" className="flex-1 overflow-hidden flex flex-col mt-0">
          {renderGrid(data.raw, 'raw')}
        </TabsContent>
        <TabsContent value="cutout" className="flex-1 overflow-hidden flex flex-col mt-0">
          {renderGrid(data.cutout, 'cutout')}
        </TabsContent>
      </Tabs>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
