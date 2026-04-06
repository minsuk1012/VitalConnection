'use client'

import { useState } from 'react'

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
    const newTags = [...new Set([...tags, ...preset.tags])]
    setTags(newTags)
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
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">빠른 프리셋</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-4 py-2 rounded-full text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 수집 방식 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">수집 방식</label>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden w-fit">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                mode === m.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색어 입력 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">검색어 입력</label>
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center min-h-[48px]">
          {tags.map(tag => (
            <span key={tag} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-purple-200">✕</button>
            </span>
          ))}
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="입력 후 Enter..."
            disabled={isCollecting}
            className="flex-1 min-w-[150px] outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* 설정 + 시작 */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">건수/항목당</label>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            min={1}
            max={100}
            disabled={isCollecting}
            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={startCollect}
          disabled={tags.length === 0 || isCollecting}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCollecting ? '수집중...' : '수집 시작'}
        </button>

        <span className="text-sm text-gray-400">
          예상 크레딧: ~${estimatedCost}
        </span>
      </div>

      {/* 진행 상황 */}
      {progress.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">수집 진행 상황</h3>
          <div className="space-y-3">
            {progress.map(item => (
              <div key={item.query}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{mode === 'hashtag' ? '#' : ''}{item.query}</span>
                  <span className={
                    item.status === 'done' ? 'text-green-600' :
                    item.status === 'collecting' ? 'text-purple-600' :
                    item.status === 'error' ? 'text-red-500' :
                    'text-gray-400'
                  }>
                    {item.status === 'done' ? `✓ ${item.count}건 완료` :
                     item.status === 'collecting' ? '수집중...' :
                     item.status === 'error' ? `✕ ${item.error}` :
                     '대기중'}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'done' ? 'bg-green-500 w-full' :
                      item.status === 'collecting' ? 'bg-purple-500 w-1/2 animate-pulse' :
                      item.status === 'error' ? 'bg-red-400 w-full' :
                      'w-0'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
