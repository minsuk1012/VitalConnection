// app/admin/thumbnail/builder/_components/Step3EffectSelect.tsx
'use client'
import { cn } from '@/lib/utils'
import type { BuilderState, EffectToken, LayoutToken } from '../_types'

interface Props {
  state:    BuilderState
  effects:  EffectToken[]
  layouts:  LayoutToken[]
  onChange: (patch: Partial<BuilderState>) => void
  onNext:   () => void
  onPrev:   () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  overlay: '오버레이', split: '스플릿', frame: '프레임',
  gradient: '그라디언트', solid: '단색 배경',
}

export function Step3EffectSelect({ state, effects, layouts, onChange, onNext, onPrev }: Props) {
  const currentLayout = layouts.find(l => l.id === state.layoutTokenId)
  const compatible = currentLayout?.compatibleEffects ?? effects.map(e => e.id)

  const grouped = effects.reduce<Record<string, EffectToken[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = []
    acc[e.category].push(e)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-6">
        {Object.entries(grouped).map(([category, items]) => {
          const available = items.filter(e => compatible.includes(e.id))
          if (available.length === 0) return null
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {available.map(e => (
                  <button key={e.id}
                    onClick={() => onChange({ effectTokenId: e.id })}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      state.effectTokenId === e.id
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}>
                    <div className="text-[12px] font-semibold">{e.name}</div>
                    <div className={cn('text-[10px] mt-0.5', state.effectTokenId === e.id ? 'text-gray-300' : 'text-gray-400')}>
                      {e.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← 레이아웃 변경
        </button>
        <button
          onClick={onNext}
          disabled={!state.effectTokenId}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30">
          다음: 텍스트 편집 →
        </button>
      </div>
    </div>
  )
}
