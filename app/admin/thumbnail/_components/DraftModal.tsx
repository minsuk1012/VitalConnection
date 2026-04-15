// app/admin/thumbnail/_components/DraftModal.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { DraftResult } from '../_types'

interface Props {
  onClose:  () => void
  onApply:  (draft: DraftResult) => void
}

type Tab = 'text' | 'image'

export function DraftModal({ onClose, onApply }: Props) {
  const [tab, setTab]         = useState<Tab>('text')
  const [prompt, setPrompt]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  async function handleTextDraft() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/thumbnail/templates/draft/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data: DraftResult = await res.json()
      onApply(data)
      onClose()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageDraft() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/thumbnail/templates/draft/image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data: DraftResult = await res.json()
      onApply(data)
      onClose()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-[420px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">LLM 초안 생성</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none w-6 h-6 flex items-center justify-center">
            ×
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {(['text', 'image'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                tab === t ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'text' ? '✏️ 텍스트 설명' : '🖼 이미지 레퍼런스'}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">원하는 스타일을 자유롭게 설명하세요</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="예: 프리미엄 다크 스타일, 울쎄라 시술, 고급스러운 느낌"
              className="w-full h-24 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTextDraft() }}
            />
            <Button onClick={handleTextDraft} disabled={loading || !prompt.trim()}
              className="w-full mt-3 text-xs h-8">
              {loading ? '생성 중...' : '초안 생성'}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">경쟁사 광고, 무드보드 등 레퍼런스 이미지를 업로드하세요</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg h-24 cursor-pointer hover:border-gray-400 transition-colors">
              {fileName ? (
                <span className="text-xs text-gray-600 font-medium">{fileName}</span>
              ) : (
                <>
                  <span className="text-xs text-gray-400">클릭하여 이미지 선택</span>
                  <span className="text-[10px] text-gray-300 mt-1">JPG, PNG, WebP</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => setFileName(e.target.files?.[0]?.name ?? null)} />
            </label>
            <Button onClick={handleImageDraft} disabled={loading || !fileName}
              className="w-full mt-3 text-xs h-8">
              {loading ? '분석 중...' : '이미지로 초안 생성'}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-500 bg-red-50 rounded px-2 py-1">{error}</p>
        )}
      </div>
    </div>
  )
}
