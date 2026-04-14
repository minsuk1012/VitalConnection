// app/admin/thumbnail/builder/_components/Step2LayoutSuggest.tsx
'use client'
import { cn } from '@/lib/utils'
import type { BuilderState, LayoutToken } from '../_types'

interface Props {
  state:      BuilderState
  layouts:    LayoutToken[]
  onChange:   (patch: Partial<BuilderState>) => void
  onAnalyze:  () => Promise<void>
  analyzing:  boolean
  onNext:     () => void
  onPrev:     () => void
}

export function Step2LayoutSuggest({ state, layouts, onChange, onAnalyze, analyzing, onNext, onPrev }: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Gemini 레이아웃 추천</h3>
            <p className="text-xs text-gray-400 mt-0.5">이미지 구도를 분석해 최적 텍스트 배치를 제안합니다</p>
          </div>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <span className={analyzing ? 'animate-spin inline-block' : ''}>⟳</span>
            {analyzing ? '분석 중...' : '재분석'}
          </button>
        </div>

        {state.suggestions.length > 0 ? (
          <div className="space-y-3">
            {state.suggestions.map((s) => {
              const token = layouts.find(l => l.id === s.layoutTokenId)
              return (
                <button key={s.layoutTokenId}
                  onClick={() => onChange({ layoutTokenId: s.layoutTokenId, fontFamily: s.fontFamily })}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    state.layoutTokenId === s.layoutTokenId
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-800">
                          {token?.name ?? s.layoutTokenId}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          {s.confidence}% 적합
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{s.reason}</p>
                      <span className="text-[10px] text-gray-400 mt-1 inline-block">
                        권장 폰트: <b className="text-gray-600">{s.fontFamily}</b>
                      </span>
                    </div>
                    {state.layoutTokenId === s.layoutTokenId && (
                      <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                        <span className="text-[9px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">레이아웃을 직접 선택하거나 위에서 재분석하세요</p>
            {layouts.map(l => (
              <button key={l.id}
                onClick={() => onChange({ layoutTokenId: l.id })}
                className={cn(
                  'w-full p-3 rounded-xl border-2 text-left text-sm transition-all',
                  state.layoutTokenId === l.id
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}>
                <span className="font-medium text-gray-800">{l.name}</span>
                <span className="text-xs text-gray-400 ml-2">{l.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← 이미지 재선택
        </button>
        <button
          onClick={onNext}
          disabled={!state.layoutTokenId}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed">
          다음: 효과 선택 →
        </button>
      </div>
    </div>
  )
}
