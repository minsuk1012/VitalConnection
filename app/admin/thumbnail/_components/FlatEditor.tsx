// app/admin/thumbnail/_components/FlatEditor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'
import type { TemplateConfig, TextContent, Lang } from '../_types'
import { FONT_OPTIONS, LANG_LABELS } from '../_types'

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
}

const LANGS = ['ko', 'en', 'ja', 'zh'] as Lang[]

const ACCENT_COLORS = ['#FF6B9D', '#FFD700', '#00D4AA', '#FF4757', '#7B68EE', '#FF8C00']

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

  return (
    <div className="flex flex-col h-full overflow-y-auto">
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

      {/* 스타일 */}
      <Section label="스타일">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">폰트</span>
            <select value={config.fontFamily}
              onChange={e => onConfigChange({ fontFamily: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 h-7 flex-1 bg-white">
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">포인트</span>
            <div className="flex items-center gap-1 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button key={c} onClick={() => onConfigChange({ accentColor: c })}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    config.accentColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`} />
              ))}
              <input type="color" value={config.accentColor}
                onChange={e => onConfigChange({ accentColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-200" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">패널색</span>
            <input type="color" value={config.panelColor}
              onChange={e => onConfigChange({ panelColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200" />
            <span className="text-[10px] text-gray-400">{config.panelColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">헤드1색</span>
            <input type="color" value={config.textColor ?? '#2B7DB8'}
              onChange={e => onConfigChange({ textColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200" />
            <span className="text-[10px] text-gray-400">{config.textColor ?? '기본'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">헤드2색</span>
            <input type="color" value={config.subColor ?? '#6B35A0'}
              onChange={e => onConfigChange({ subColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200" />
            <span className="text-[10px] text-gray-400">{config.subColor ?? '기본'}</span>
          </div>
        </div>
      </Section>

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
      <div className="p-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 mt-auto">
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
  )
}
