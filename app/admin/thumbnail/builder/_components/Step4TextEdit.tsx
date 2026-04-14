// app/admin/thumbnail/builder/_components/Step4TextEdit.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FONT_OPTIONS } from '@/lib/thumbnail'
import type { BuilderState, Lang, TextContent } from '../_types'
import { LANG_LABELS } from '../_types'

interface Props {
  state:          BuilderState
  onChange:       (patch: Partial<BuilderState>) => void
  onGenerateText: (lang: Lang) => Promise<void>
  generating:     boolean
  onNext:         () => void
  onPrev:         () => void
}

const FIELDS: { key: keyof TextContent; label: string; placeholder: string }[] = [
  { key: 'headline',    label: '메인 헤드라인', placeholder: '시술명' },
  { key: 'subheadline', label: '서브 카피',     placeholder: '부연 설명' },
  { key: 'price',       label: '가격',          placeholder: '예: 3.9만원' },
  { key: 'brandKo',     label: '병원명 (한글)', placeholder: 'OO피부과' },
  { key: 'brandEn',     label: '병원명 (영문)', placeholder: 'OO CLINIC' },
]

const ACCENT_COLORS = ['#FF6B9D', '#FFD700', '#00D4AA', '#FF4757', '#7B68EE', '#FF8C00']

export function Step4TextEdit({ state, onChange, onGenerateText, generating, onNext, onPrev }: Props) {
  const [activeLang, setActiveLang] = useState<Lang>('ko')

  function updateText(lang: Lang, key: keyof TextContent, value: string) {
    onChange({ texts: { ...state.texts, [lang]: { ...state.texts[lang], [key]: value } } })
  }

  const langs = Object.entries(LANG_LABELS) as [Lang, { flag: string; label: string }][]
  const canNext = Object.values(state.texts.ko).some(v => v.trim())

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-5">

        {/* 언어 탭 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {langs.map(([lang, info]) => (
            <button key={lang}
              onClick={() => setActiveLang(lang)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeLang === lang ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}>
              {info.flag} {info.label}
            </button>
          ))}
        </div>

        {/* Gemini 생성 */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div>
            <div className="text-[11px] font-semibold text-blue-800">Gemini AI 텍스트 생성</div>
            <div className="text-[10px] text-blue-600 mt-0.5">한국어 입력 기준으로 {activeLang.toUpperCase()} 자동 생성</div>
          </div>
          <button
            onClick={() => onGenerateText(activeLang)}
            disabled={generating || !state.texts.ko.headline || activeLang === 'ko'}
            title={activeLang === 'ko' ? '한국어는 직접 입력하세요' : undefined}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {generating ? '생성 중...' : activeLang === 'ko' ? '직접 입력' : '✦ 생성'}
          </button>
        </div>

        {/* 텍스트 필드 */}
        <div className="space-y-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {f.label}
              </label>
              <input
                value={state.texts[activeLang][f.key]}
                onChange={e => updateText(activeLang, f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
              />
            </div>
          ))}
        </div>

        {/* 스타일 */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">스타일</h3>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 w-20">헤드라인 폰트</span>
            <select
              value={state.fontFamily}
              onChange={e => onChange({ fontFamily: e.target.value })}
              className="flex-1 h-8 text-xs rounded-lg border border-gray-200 px-2 bg-white">
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 w-20">포인트 컬러</span>
            <div className="flex gap-2 items-center">
              {ACCENT_COLORS.map(c => (
                <button key={c}
                  onClick={() => onChange({ accentColor: c })}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    state.accentColor === c ? 'border-gray-800 scale-110' : 'border-white ring-1 ring-gray-200',
                  )}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={state.accentColor}
                onChange={e => onChange({ accentColor: e.target.value })}
                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← 효과 변경
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30">
          다음: 내보내기 →
        </button>
      </div>
    </div>
  )
}
