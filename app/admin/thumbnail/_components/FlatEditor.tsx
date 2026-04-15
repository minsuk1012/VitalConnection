// app/admin/thumbnail/_components/FlatEditor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'
import type { TemplateConfig, TextContent, Lang } from '../_types'
import { LANG_LABELS } from '../_types'
import { ElementControls } from './ElementControls'

interface Props {
  layouts:              LayoutToken[]
  effects:              EffectToken[]
  config:               TemplateConfig | null
  templateName:         string
  lang:                 Lang
  onLangChange:         (lang: Lang) => void
  onConfigChange:       (patch: Partial<TemplateConfig>) => void
  onTemplateNameChange: (name: string) => void
  onSave:               () => void
  onTranslate:          () => void
  saving:               boolean
  translating:          boolean
  isLegacy?:            boolean
  onConvertLegacy?:     () => void
  selectedTarget?:      string | null
  onSelectTarget?:      (t: string | null) => void
  onBack:               () => void
}

const LANGS = ['ko', 'en', 'ja', 'zh'] as Lang[]

const TEXT_FIELDS: { key: keyof TextContent; label: string; placeholder: string }[] = [
  { key: 'headline',    label: '헤드라인 (영문/상단)', placeholder: 'ASCE+' },
  { key: 'headlineKo',  label: '헤드라인 (한글/하단)', placeholder: '엑소좀' },
  { key: 'subheadline', label: '서브 카피',             placeholder: '부연 설명' },
  { key: 'price',       label: '가격',                  placeholder: '3.9만원' },
  { key: 'brandKo',     label: '병원명 (한글)',          placeholder: 'OO피부과' },
  { key: 'brandEn',     label: '병원명 (영문)',          placeholder: 'OO CLINIC' },
]

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}

export function FlatEditor({
  layouts, effects, config, templateName, lang, onLangChange,
  onConfigChange, onTemplateNameChange, onSave, onTranslate,
  saving, translating, isLegacy, onConvertLegacy,
  selectedTarget, onSelectTarget,
  onBack,
}: Props) {
  if (!config) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 text-center px-4">
        템플릿을 선택하거나<br />LLM 초안을 생성하세요
      </div>
    )
  }

  const currentLayout = layouts.find(l => l.id === config.layoutTokenId)
  const compatibleEffects = currentLayout?.compatibleEffects
    ? effects.filter(e => currentLayout.compatibleEffects.includes(e.id))
    : effects

  const currentTexts = config.texts[lang] ?? config.texts.ko

  function updateText(key: keyof TextContent, value: string) {
    const prev = config.texts[lang] ?? { headline: '', headlineKo: '', subheadline: '', price: '', brandKo: '', brandEn: '' }
    onConfigChange({ texts: { ...config.texts, [lang]: { ...prev, [key]: value } } })
  }

  function updateElementProp(idx: number, prop: string, value: string | number) {
    const next = config.elements.map((el, i) =>
      i === idx ? { ...el, props: { ...el.props, [prop]: value } } : el
    )
    onConfigChange({ elements: next })
  }

  // 선택된 요소 인덱스
  const selectedIdx = selectedTarget
    ? config.elements.findIndex(el => el.cssTarget === selectedTarget)
    : -1
  const selectedElement = selectedIdx >= 0 ? config.elements[selectedIdx] : null

  function handlePropChange(prop: string, value: string | number) {
    if (selectedIdx < 0) return
    updateElementProp(selectedIdx, prop, value)
  }

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── L2: 편집 패널 본문 ── */}
      <div className="absolute inset-0 flex flex-col overflow-hidden transition-transform duration-150 ease-in-out"
        style={{ transform: selectedTarget ? 'translateX(-100%)' : 'translateX(0)' }}>

        {/* Legacy 배너 */}
        {isLegacy && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-amber-700">⚠️ 구형 포맷 템플릿입니다.</span>
            <button onClick={onConvertLegacy}
              className="text-xs text-amber-800 underline font-medium ml-auto">
              새 포맷으로 변환
            </button>
          </div>
        )}

        {/* 뒤로가기 헤더 */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
          <button onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            템플릿
          </button>
          <span className="text-xs font-semibold text-gray-800 truncate flex-1">{config.texts.ko.headline || '편집 중'}</span>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* 언어 탭 */}
          <div className="flex items-center border-b border-gray-100 px-2 pt-2 pb-1 gap-1 flex-shrink-0">
            {LANGS.map(l => {
              const { flag, label } = LANG_LABELS[l]
              return (
                <button key={l} onClick={() => onLangChange(l)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    lang === l ? 'bg-white shadow-sm font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {flag} {label}
                </button>
              )
            })}
            {lang !== 'ko' && (
              <Button variant="ghost" size="sm" onClick={onTranslate} disabled={translating}
                className="ml-auto text-xs h-6 text-blue-600 hover:text-blue-700 px-2">
                {translating ? '번역 중...' : '번역'}
              </Button>
            )}
          </div>

          {/* 레이아웃 */}
          <Section label="레이아웃">
            <div className="grid grid-cols-2 gap-1.5">
              {layouts.map(l => (
                <button key={l.id} onClick={() => onConfigChange({ layoutTokenId: l.id })}
                  className={`text-left p-2 rounded border text-xs transition-colors ${
                    config.layoutTokenId === l.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}>
                  <div className="font-medium mb-0.5">{l.name}</div>
                  <div className="opacity-60 text-[10px] line-clamp-2">{l.description}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* 이펙트 */}
          <Section label="이펙트">
            <div className="grid grid-cols-2 gap-1.5">
              {compatibleEffects.map(e => (
                <button key={e.id} onClick={() => onConfigChange({ effectTokenId: e.id })}
                  className={`text-left p-2 rounded border text-xs transition-colors ${
                    config.effectTokenId === e.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}>
                  <div className="font-medium mb-0.5">{e.name}</div>
                  <div className="opacity-60 text-[10px]">{e.description}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* 배경색 */}
          <Section label="배경">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 flex-1">배경색</span>
              <input type="color"
                value={config.panelColor}
                onChange={e => onConfigChange({ panelColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5"
              />
              <span className="text-[10px] text-gray-400 font-mono">{config.panelColor}</span>
            </div>
          </Section>

          {/* 요소 목록 — 네비게이션 행 */}
          <div className="border-b border-gray-100 px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">요소 스타일</p>
          </div>
          {config.elements.map(el => {
            const ELEMENT_COLORS_MAP: Record<string, string> = {
              'brand-ko': '#6366f1', 'headline': '#2563eb',
              'headline-ko': '#7c3aed', 'subheadline': '#059669', 'price': '#db2777',
            }
            const color    = ELEMENT_COLORS_MAP[el.cssTarget] ?? '#6b7280'
            const hintSize = el.props.fontSize ? `${el.props.fontSize}px` : ''
            return (
              <button key={el.cssTarget}
                onClick={() => onSelectTarget?.(el.cssTarget)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 group">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-gray-700 flex-1 text-left">{el.label}</span>
                {hintSize && <span className="text-[10px] text-gray-300 group-hover:text-gray-400 font-mono">{hintSize}</span>}
                <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}

          {/* 텍스트 */}
          <Section label="텍스트">
            <div className="space-y-1.5">
              {TEXT_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="text-[10px] text-gray-400 block mb-0.5">{field.label}</label>
                  <Input
                    value={currentTexts?.[field.key] ?? ''}
                    onChange={e => updateText(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* 저장 */}
          <div className="p-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
            <Input
              value={templateName}
              onChange={e => onTemplateNameChange(e.target.value)}
              placeholder="템플릿 이름"
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" onClick={onSave} disabled={saving}
              className="text-xs h-7 shrink-0">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── L3: 요소 컨트롤 ── */}
      <div className="absolute inset-0 transition-transform duration-150 ease-in-out"
        style={{ transform: selectedTarget ? 'translateX(0)' : 'translateX(100%)' }}>
        {selectedElement && (
          <ElementControls
            element={selectedElement}
            onBack={() => onSelectTarget?.(null)}
            onPropChange={handlePropChange}
          />
        )}
      </div>

    </div>
  )
}
