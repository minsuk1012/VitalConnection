// app/admin/thumbnail/builder/_components/Step5Export.tsx
'use client'
import { useState } from 'react'
import type { BuilderState, LayoutToken, EffectToken } from '../_types'
import { LANG_LABELS } from '../_types'

interface Props {
  state:      BuilderState
  layouts:    LayoutToken[]
  effects:    EffectToken[]
  onRender:   () => Promise<void>
  onPrev:     () => void
}

export function Step5Export({ state, layouts, effects, onRender, onPrev }: Props) {
  const [rendering, setRendering] = useState(false)

  async function handleRender() {
    setRendering(true)
    try { await onRender() } finally { setRendering(false) }
  }

  const layoutName = layouts.find(l => l.id === state.layoutTokenId)?.name ?? state.layoutTokenId
  const effectName = effects.find(e => e.id === state.effectTokenId)?.name ?? state.effectTokenId
  const langs = Object.entries(LANG_LABELS) as [string, { flag: string; label: string }][]

  const summary = [
    { label: '이미지',   value: `${state.archetype} — ${state.selectedImageFile?.split('/').pop() ?? '-'} (${state.imageType})` },
    { label: '레이아웃', value: layoutName ?? '-' },
    { label: '효과',     value: effectName ?? '-' },
    { label: '언어',     value: 'KO / EN / JA / ZH' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-5">

        {/* 설정 요약 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">설정 요약</h3>
          {summary.map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-gray-400 w-16">{r.label}</span>
              <span className="text-xs text-gray-700 truncate">{r.value}</span>
            </div>
          ))}
        </div>

        {/* 언어별 미리보기 그리드 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">언어별 출력</h3>
          <div className="grid grid-cols-4 gap-2">
            {langs.map(([lang, info]) => (
              <div key={lang} className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
                <div className="absolute bottom-2 left-2 text-white">
                  <div className="text-[8px] opacity-60">{info.flag} {info.label}</div>
                  <div className="text-[10px] font-black leading-tight truncate">
                    {state.texts[lang as keyof typeof state.texts]?.headline || '—'}
                  </div>
                </div>
                {state.rendered && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 렌더링 버튼 */}
        {!state.rendered ? (
          <button
            onClick={handleRender}
            disabled={rendering}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
            {rendering
              ? <><span className="animate-spin">⟳</span> 렌더링 중 (4개 언어)...</>
              : '⬇ 4개 언어 전체 렌더링'}
          </button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-sm font-semibold text-green-800">렌더링 완료</div>
            <div className="text-xs text-green-600 mt-0.5">thumbnail/output/renders/ 에 저장됨</div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-4">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← 텍스트 수정
        </button>
      </div>
    </div>
  )
}
