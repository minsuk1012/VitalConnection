'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Copy, Download, ImageIcon, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SceneToken, TemplateConfig as NewTemplateConfig } from './_types'
import { FlatEditor } from './_components/FlatEditor'
import { DragCanvas } from './_components/DragCanvas'

// ── 타입 ──

interface TemplateEntry {
  id: string
  nameKo: string
  name: string
  layout?: string
  sceneTokenId?: string
  layoutTokenId?: string
  effectTokenId?: string
  baseTemplateId?: string
  version?: number
  tone?: string
  priceStyle?: string
  color?: string
  description?: string
  requiresCutout?: boolean
  source?: 'builder' | 'manual' | 'legacy'
  accentColor?: string
  createdAt?: string
}

interface ControlItem {
  var: string
  label: string
  type: 'range' | 'color' | 'select'
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: { value: string; label: string }[]
}

interface ControlGroup {
  group: string
  items: ControlItem[]
}

interface TemplateConfig {
  vars: Record<string, string>
  controls: ControlGroup[]
}

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const LANG_LABELS: Record<Lang, string> = { ko: 'KO', en: 'EN', ja: 'JA', zh: 'ZH' }

// ── 헬퍼 ──

function varToSection(varName: string): string {
  if (/^headline/.test(varName)) return 'headline'
  if (/^sub/.test(varName)) return 'sub'
  if (/^(tagline)/.test(varName)) return 'tagline'
  if (/^(price|badge|vat)/.test(varName)) return 'price'
  if (/^(brand|logo)/.test(varName)) return 'brand'
  if (/^model/.test(varName)) return 'model'
  return 'style'
}

// ── 재사용 컴포넌트 ──

function SectionPanel({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform duration-150', !open && '-rotate-90')} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

function ControlItemRow({ item, value, onChange }: {
  item: ControlItem; value: string; onChange: (v: string) => void
}) {
  if (item.type === 'range') return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{item.label}</span>
        <span className="text-[10px] text-blue-500 font-mono">{value}</span>
      </div>
      <input type="range" min={item.min} max={item.max} step={item.step ?? 1}
        value={parseFloat(value) || (item.min ?? 0)}
        onChange={e => onChange(e.target.value + (item.unit ?? ''))}
        className="w-full h-1 accent-blue-500 cursor-pointer"
      />
    </div>
  )
  if (item.type === 'select') return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1">{item.label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-6 text-[10px] bg-white border border-gray-200 rounded px-1.5 outline-none focus:border-blue-400 cursor-pointer max-w-[130px]">
        {item.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1">{item.label}</span>
      <input type="color"
        value={value.startsWith('#') ? value : '#ffffff'}
        onChange={e => onChange(e.target.value)}
        className="w-7 h-6 rounded border border-gray-200 bg-white cursor-pointer p-0.5"
      />
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-6 w-20 text-[10px] font-mono" />
    </div>
  )
}

function LayoutTemplateRow({
  template,
  selected,
  onClick,
}: {
  template: TemplateEntry
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md border text-left transition-colors',
        selected
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200'
      )}
    >
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full flex-shrink-0 border',
          selected ? 'border-blue-200' : 'border-gray-200'
        )}
        style={{ background: template.color ?? template.accentColor ?? '#e5e7eb' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium truncate leading-4">
          {template.nameKo}
        </div>
        <div className={cn(
          'flex items-center gap-1.5 text-[10px] truncate leading-4',
          selected ? 'text-blue-500/80' : 'text-gray-400'
        )}>
          <span className="truncate">{template.sceneTokenId ?? template.baseTemplateId ?? template.layoutTokenId ?? template.layout ?? 'scene'}</span>
          {typeof template.version === 'number' && (
            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
              v{template.version}
            </span>
          )}
        </div>
      </div>
      {template.requiresCutout && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
          누끼
        </span>
      )}
    </button>
  )
}

function LayoutGroupSection({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string
  items: TemplateEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (!items.length) return null

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </span>
        <span className="text-[10px] text-gray-300">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map(t => (
          <LayoutTemplateRow
            key={t.id}
            template={t}
            selected={selectedId === t.id}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>
    </section>
  )
}

// ── 메인 페이지 ──

export default function ThumbnailEditorPage() {
  const [templates, setTemplates] = useState<TemplateEntry[]>([])
  const [layoutFilter, setLayoutFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [config, setConfig] = useState<TemplateConfig | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [varOverrides, setVarOverrides] = useState<Record<string, string>>({})
  const [content, setContent] = useState({
    headline: '시술명 예시', sub: '서브 헤드라인', brandEn: 'CLINIC NAME',
    brandKo: '병원명', tagline: '', price: '', priceUnit: '만원', model: '',
  })
  const [cutoutModels, setCutoutModels] = useState<string[]>([])
  const [modelFolderFilter, setModelFolderFilter] = useState('all')
  const [rendering, setRendering] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [iframeSrc, setIframeSrc] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── 신규: BuilderState 기반 템플릿 편집 ──
  const [scenes,          setScenes]         = useState<SceneToken[]>([])
  const [newConfig,       setNewConfig]      = useState<NewTemplateConfig | null>(null)
  const [flatLang,        setFlatLang]       = useState<Lang>('ko')
  const [templateName,    setTemplateName]   = useState('')
  const [flatSaving,      setFlatSaving]     = useState(false)
  const [flatTranslating, setFlatTranslating] = useState(false)
  const [selectedTarget,  setSelectedTarget]  = useState<string | null>(null)
  const [panelLevel,      setPanelLevel]      = useState<'browser' | 'editing'>('browser')
  const [saveMenuOpen,    setSaveMenuOpen]    = useState(false)
  const saveMenuRef = useRef<HTMLDivElement>(null)

  // ── 번역 상태 ──
  const [lang, setLang] = useState<Lang>('ko')
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [translating, setTranslating] = useState(false)

  // 현재 언어 기준 콘텐츠 (미리보기·렌더에 사용)
  const activeContent = useMemo(() => {
    if (lang === 'ko') return content
    const t = translations[lang] ?? {}
    return {
      ...content,
      headline: t.headline ?? content.headline,
      sub:      t.sub      ?? content.sub,
      tagline:  t.tagline  ?? content.tagline,
    }
  }, [lang, content, translations])

  // 현재 선택된 템플릿의 모델 모드 (누끼 vs 일반)
  const [useCutoutMode, setUseCutoutMode] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedId) ?? null,
    [templates, selectedId],
  )

  useEffect(() => {
    if (!saveMenuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setSaveMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSaveMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [saveMenuOpen])

  useEffect(() => {
    if (!newConfig) return
    const scene = scenes.find(s => s.id === newConfig.sceneTokenId)
    if (scene) setUseCutoutMode(scene.requiresCutout ?? false)
  }, [newConfig, scenes])

  const buildLegacyPreviewUrl = useCallback((targetLang: Lang) => {
    if (!selectedId) return ''
    const t = targetLang === 'ko' ? {} : (translations[targetLang] ?? {}) as Record<string, string>
    const c = targetLang === 'ko'
      ? content
      : {
          ...content,
          headline: t.headline ?? content.headline,
          sub:      t.sub      ?? content.sub,
          tagline:  t.tagline  ?? content.tagline,
        }
    const params: Record<string, string> = { layout: selectedId, ...c }
    if (useCutoutMode && c.model) params.cutout = c.model
    if (useCutoutMode && params.model) delete params.model

    return `/api/thumbnail/preview?${new URLSearchParams(params)}`
  }, [selectedId, content, translations, useCutoutMode])

  const buildNewPreviewUrl = useCallback((targetLang: Lang) => {
    if (!selectedId || !newConfig) return ''
    const texts = newConfig.texts[targetLang] ?? newConfig.texts.ko
    const params = new URLSearchParams({
      sceneTokenId: newConfig.sceneTokenId,
      panelColor: newConfig.panelColor,
      elements: JSON.stringify(newConfig.elements),
      headline: texts.headline ?? '',
      headlineKo: texts.headlineKo ?? '',
      sub: texts.subheadline ?? '',
      brandEn: texts.brandEn ?? '',
      brandKo: texts.brandKo ?? '',
      price: texts.price ?? '',
    })
    if (content.model) params.set('model', content.model)
    if (useCutoutMode && content.model) params.set('cutout', content.model)

    return `/api/thumbnail/builder/preview?${params.toString()}`
  }, [selectedId, newConfig, content.model, useCutoutMode])

  // ── 초기 로드 ──

  useEffect(() => {
    fetch('/api/thumbnail/registry')
      .then(r => r.json())
      .then(d => {
        setTemplates(d.templates ?? [])
        if (d.templates?.length) {
          selectTemplate(d.templates[0].id, d.templates)
        }
      })
    fetch('/api/thumbnail/builder/tokens')
      .then(r => r.json())
      .then(d => { setScenes(d.scenes ?? d.layouts ?? []) })
    Promise.all([
      fetch('/api/thumbnail/models?type=models').then(r => r.json()),
      fetch('/api/thumbnail/models?type=cutout').then(r => r.json()),
    ]).then(([modelData, cutoutData]) => {
      setModels(modelData.files ?? [])
      setCutoutModels(cutoutData.files ?? [])
      setContent(c => ({ ...c, model: modelData.files?.[0] ?? '' }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 템플릿 선택 ──

  const selectTemplate = useCallback(async (id: string, tpls: TemplateEntry[] = templates) => {
    setSelectedId(id)
    setSelectedTarget(null)
    setVarOverrides({})
    
    // 템플릿별 기본 설정 반영
    const req = tpls.find(t => t.id === id)?.requiresCutout ?? false
    setUseCutoutMode(req)

    const res = await fetch(`/api/thumbnail/config/${id}`)
    if (res.ok) {
      const data = await res.json()
      const selectedSceneId = (data as { sceneTokenId?: string }).sceneTokenId
        ?? tpls.find(t => t.id === id)?.sceneTokenId
        ?? tpls.find(t => t.id === id)?.baseTemplateId
        ?? id
      if ('sceneTokenId' in data) {
        // 신규 포맷
        setNewConfig(data as NewTemplateConfig)
        const tmpl = tpls.find(t => t.id === id)
        setTemplateName(tmpl?.nameKo ?? '')
        setConfig(null)
      } else {
        // legacy 포맷 → scene 포맷으로 즉시 승격
        setNewConfig({
          sceneTokenId: selectedSceneId,
          panelColor: data.panelColor ?? '#1A1A2E',
          elements: data.elements ?? [],
          texts: data.texts ?? {
            ko: { headline: '', headlineKo: '', subheadline: '', price: '', brandEn: '', brandKo: '' },
          },
        })
        const tmpl = tpls.find(t => t.id === id)
        setTemplateName(tmpl?.nameKo ?? '')
        setConfig(null)
      }
    }
  }, [templates])

  // iframe 전체 리로드 — 템플릿 변경 / 모델 이미지 변경 시에만
  const buildUrlRef = useRef(buildLegacyPreviewUrl)
  useEffect(() => {
    buildUrlRef.current = newConfig ? buildNewPreviewUrl : buildLegacyPreviewUrl
  }, [newConfig, buildNewPreviewUrl, buildLegacyPreviewUrl])

  // 현재 언어 기준 리로드 (template/model 변경 시)
  const reloadPreview = useCallback(() => {
    const previewLang = newConfig ? flatLang : lang
    const url = newConfig
      ? buildNewPreviewUrl(previewLang)
      : buildLegacyPreviewUrl(previewLang)
    if (url) setIframeSrc(url)
  // selectedId / content.model / useCutoutMode / flatLang 변경 시 자동 실행
  }, [newConfig, flatLang, lang, buildNewPreviewUrl, buildLegacyPreviewUrl])

  useEffect(() => { reloadPreview() }, [reloadPreview])

  // iframeSrc 변경 시 ref에 직접 적용 + 로드 후 var 재적용
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !iframeSrc) return
    frame.src = iframeSrc
    frame.onload = () => {
      try {
        const root = frame.contentDocument?.documentElement
        if (!root) return
        Object.entries(varOverrides).forEach(([k, v]) =>
          root.style.setProperty(`--${k}`, v)
        )
      } catch {}
    }
  // iframeSrc 변경 시에만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeSrc])

  // CSS var 변경
  const setVar = (key: string, val: string) => {
    setVarOverrides(prev => ({ ...prev, [key]: val }))
    try {
      frameRef.current?.contentDocument?.documentElement
        .style.setProperty(`--${key}`, val)
    } catch {}
  }

  // KO 콘텐츠 변경 → DOM 업데이트 시도 + 300ms debounce로 안전 reload
  const setContentField = (field: string, value: string) => {
    setContent(prev => ({ ...prev, [field]: value }))

    // 1차: 직접 DOM 조작 (즉시)
    if (lang === 'ko') {
      try {
        const doc = frameRef.current?.contentDocument
        const map: Record<string, string> = {
          headline: '#headline', sub: '#subheadline',
          brandEn: '#brand-en', brandKo: '#brand-ko',
          tagline: '#tagline', price: '#price',
        }
        const el = doc?.querySelector(map[field])
        if (el) el.textContent = value
      } catch {}
    }

    // 2차: 300ms debounce → iframe reload (DOM 조작 실패 대비 & price display 토글)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const url = buildUrlRef.current(lang)
      if (url) setIframeSrc(url)
    }, 300)
  }

  // 번역된 필드 수정 + DOM 업데이트 + debounce reload
  const setTranslationField = (field: string, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: { ...(prev[lang] ?? {}), [field]: value },
    }))
    try {
      const doc = frameRef.current?.contentDocument
      if (!doc) return
      const map: Record<string, string> = {
        headline: '#headline', sub: '#subheadline', tagline: '#tagline',
      }
      const el = doc.querySelector(map[field])
      if (el) el.textContent = value
    } catch {}

    // debounce reload
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const url = buildUrlRef.current(lang)
      if (url) setIframeSrc(url)
    }, 300)
  }

  // ── 번역 ──

  const translateContent = async () => {
    setTranslating(true)
    try {
      const res = await fetch('/api/thumbnail/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: content.headline,
          sub:      content.sub,
          tagline:  content.tagline,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setTranslations(data)
      // 현재 언어가 번역 대상이면 iframe full reload (번역 데이터가 새로 들어왔으므로)
      if (lang !== 'ko' && data[lang]) {
        const t = data[lang] as Record<string, string>
        const c = {
          ...content,
          headline: t.headline ?? content.headline,
          sub: t.sub ?? content.sub,
          tagline: t.tagline ?? content.tagline,
        }
        const params: Record<string, string> = { layout: selectedId!, ...c }
        if (useCutoutMode && c.model) params.cutout = c.model
        if (useCutoutMode && params.model) delete params.model
        setIframeSrc(`/api/thumbnail/preview?${new URLSearchParams(params)}`)
      }
    } catch (e) {
      alert('번역 실패: ' + e)
    } finally {
      setTranslating(false)
    }
  }

  // ── 신규 포맷 번역 ──

  const translateFlatContent = async () => {
    if (!newConfig || flatLang === 'ko') return
    setFlatTranslating(true)
    try {
      const res = await fetch('/api/thumbnail/builder/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ko: newConfig.texts.ko, targetLang: flatLang }),
      })
      const translated = await res.json()
      setNewConfig(prev => prev ? {
        ...prev, texts: { ...prev.texts, [flatLang]: translated },
      } : null)
    } finally {
      setFlatTranslating(false)
    }
  }

  const refreshRegistry = async () => {
    const reg = await fetch('/api/thumbnail/registry').then(r => r.json())
    setTemplates(reg.templates ?? [])
    return reg.templates ?? []
  }

  const buildLegacySavePayload = () => {
    if (!config) return null
    return { ...config, vars: { ...config.vars, ...varOverrides } }
  }

  const buildNewSavePayload = () => {
    if (!newConfig) return null
    const fallbackName = selectedTemplate?.nameKo ?? selectedTemplate?.name ?? selectedId ?? '새 템플릿'
    const nextName = templateName.trim() || fallbackName
    return { ...newConfig, nameKo: nextName, name: nextName }
  }

  const saveCurrentTemplate = async () => {
    if (!selectedId) return
    setFlatSaving(true)
    setSaveMenuOpen(false)
    try {
      if (newConfig) {
        const payload = buildNewSavePayload()
        if (!payload) return
        const res = await fetch(`/api/thumbnail/templates/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.text())
      } else {
        const payload = buildLegacySavePayload()
        if (!payload) return
        const res = await fetch(`/api/thumbnail/config/${selectedId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.text())
        setConfig(payload)
        setVarOverrides({})
      }

      await refreshRegistry()
      setSaveStatus('저장됨')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      alert('저장 실패: ' + e)
    } finally {
      setFlatSaving(false)
    }
  }

  const saveAsNewVersion = async () => {
    if (!selectedId) return
    setFlatSaving(true)
    setSaveMenuOpen(false)
    try {
      if (newConfig) {
        const payload = buildNewSavePayload()
        if (!payload) return
        const res = await fetch(`/api/thumbnail/templates/${selectedId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'new', config: payload, nameKo: payload.nameKo, name: payload.name }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { id: nextId } = await res.json()
        const nextTemplates = await refreshRegistry()
        await selectTemplate(nextId, nextTemplates)
      } else {
        const payload = buildLegacySavePayload()
        if (!payload) return
        const res = await fetch(`/api/thumbnail/templates/${selectedId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'legacy',
            config: payload,
            nameKo: selectedTemplate?.nameKo ?? selectedId,
            name: selectedTemplate?.name ?? selectedId,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { id: nextId } = await res.json()
        const nextTemplates = await refreshRegistry()
        await selectTemplate(nextId, nextTemplates)
      }

      setSaveStatus('새 버전 저장됨')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      alert('새 버전 저장 실패: ' + e)
    } finally {
      setFlatSaving(false)
    }
  }

  const deleteCurrentVersion = async () => {
    if (!selectedId) return
    setSaveMenuOpen(false)
    const ok = window.confirm('현재 템플릿 버전을 삭제할까요?')
    if (!ok) return

    setFlatSaving(true)
    try {
      const res = await fetch(`/api/thumbnail/templates/${selectedId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())

      const nextTemplates = await refreshRegistry()
      if (nextTemplates.length > 0) {
        await selectTemplate(nextTemplates[0].id, nextTemplates)
      } else {
        setSelectedId(null)
        setConfig(null)
        setNewConfig(null)
        setTemplateName('')
        setSelectedTarget(null)
        setIframeSrc('')
        if (frameRef.current) frameRef.current.src = 'about:blank'
      }
      setPanelLevel('browser')
      setSaveStatus('삭제됨')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      alert('삭제 실패: ' + e)
    } finally {
      setFlatSaving(false)
    }
  }

  // ── Legacy 변환 ──

  const convertLegacy = () => {
    setNewConfig({
      sceneTokenId: scenes[0]?.id ?? 'bottom-text-stack',
      panelColor:    '#1A1A2E',
      elements: [
        { type: 'text',  cssTarget: 'headline',    label: '헤드라인',    props: { fontSize: 84,  color: '#ffffff', fontFamily: 'BlackHan' } },
        { type: 'text',  cssTarget: 'subheadline', label: '서브카피',    props: { fontSize: 30,  color: 'rgba(255,255,255,0.85)' } },
        { type: 'price', cssTarget: 'price',       label: '가격',        props: { fontSize: 70,  color: '#FF6B9D' } },
        { type: 'image', cssTarget: 'model',       label: '모델',        props: { brightness: 0.85 } },
      ],
      texts: { ko: { headline: '', headlineKo: '', subheadline: '', price: '', brandKo: '', brandEn: '' } },
    })
    const tmpl = templates.find(t => t.id === selectedId)
    setTemplateName(tmpl?.nameKo ?? '변환된 템플릿')
  }

  // ── 렌더 (WebP 다운로드) ──

  const renderThumbnail = async () => {
    if (!selectedId) return
    setRendering(true)
    try {
      const renderLang = newConfig ? flatLang : lang
      const body = newConfig
        ? {
            sceneTokenId: newConfig.sceneTokenId,
            panelColor: newConfig.panelColor,
            elements: newConfig.elements,
            headline: newConfig.texts[renderLang]?.headline ?? newConfig.texts.ko.headline ?? '',
            headlineKo: newConfig.texts[renderLang]?.headlineKo ?? newConfig.texts.ko.headlineKo ?? '',
            subheadline: newConfig.texts[renderLang]?.subheadline ?? newConfig.texts.ko.subheadline ?? '',
            brandEn: newConfig.texts[renderLang]?.brandEn ?? newConfig.texts.ko.brandEn ?? '',
            brandKo: newConfig.texts[renderLang]?.brandKo ?? newConfig.texts.ko.brandKo ?? '',
            price: newConfig.texts[renderLang]?.price ?? newConfig.texts.ko.price ?? '',
            model: content.model,
            ...(useCutoutMode && content.model ? { cutout: content.model } : {}),
          }
        : {
            layout: selectedId,
            ...activeContent,
            model: content.model,
            ...(useCutoutMode && content.model ? { cutout: content.model } : {}),
          }
      const res = await fetch('/api/thumbnail/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${selectedId}-${renderLang}-${Date.now()}.webp`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('렌더 실패: ' + e)
    } finally {
      setRendering(false)
    }
  }

  // ── 필터링 ──

  const LAYOUT_FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'full-overlay', label: '오버레이' },
    { key: 'split', label: '스플릿' },
    { key: 'solid-bg', label: '단색BG' },
    { key: 'gradient-bg', label: '그라디언트' },
    { key: 'bottom-banner', label: '배너' },
    { key: 'frame', label: '프레임' },
  ]
  const filtered = templates.filter(t => {
    const matchLayout = layoutFilter === 'all' || t.layout === layoutFilter
    const q = searchQuery.trim().toLowerCase()
    const matchSearch = !q || t.nameKo.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    return matchLayout && matchSearch
  })
  const groupedTemplates = LAYOUT_FILTERS
    .filter(f => f.key !== 'all')
    .map(f => ({
      key: f.key,
      label: f.label,
      items: filtered.filter(t => t.layout === f.key),
    }))
    .filter(group => group.items.length > 0)
  const uncategorizedTemplates = filtered.filter(t =>
    !t.layout || !LAYOUT_FILTERS.some(f => f.key === t.layout)
  )

  // ── 모델 그룹핑 ──

  const activeModels = useCutoutMode ? cutoutModels : models
  const modelGroups = activeModels.reduce<Record<string, string[]>>((acc, f) => {
    const parts = f.split('/')
    const group = parts.length > 1 ? parts[0] : '기타'
    ;(acc[group] ??= []).push(f)
    return acc
  }, {})

  // ── 섹션별 컨트롤 맵 ──

  const controlsBySection = useMemo(() => {
    const map: Record<string, ControlItem[]> = {}
    config?.controls.forEach(group => {
      group.items.forEach(item => {
        const sec = varToSection(item.var)
        ;(map[sec] ??= []).push(item)
      })
    })
    return map
  }, [config])

  const previewLang = newConfig ? flatLang : lang
  const previewTexts = newConfig
    ? (newConfig.texts[previewLang] ?? newConfig.texts.ko)
    : null
  const appContextThumbnailUrl = newConfig
    ? buildNewPreviewUrl(previewLang)
    : buildLegacyPreviewUrl(previewLang)
  const appContextHeadline = newConfig ? (previewTexts?.headline ?? '') : activeContent.headline
  const appContextBrandName = newConfig
    ? (previewTexts?.brandKo || previewTexts?.brandEn || '')
    : (content.brandKo || content.brandEn)
  const appContextPrice = newConfig ? (previewTexts?.price ?? '') : content.price
  const appContextPriceUnit = newConfig ? '' : content.priceUnit

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden">

      {/* ── 상단 툴바 ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin" />}
          className="text-gray-500 hover:text-gray-900 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />Admin
        </Button>
        <Separator orientation="vertical" className="h-5 bg-gray-200" />
        <h1 className="text-sm font-semibold text-gray-800">썸네일 생성기</h1>

        <div className="ml-auto flex items-center gap-2">
          {saveStatus && <span className="text-xs text-emerald-600 font-medium">{saveStatus}</span>}
          <div className="relative flex items-center gap-1" ref={saveMenuRef}>
            <Button variant="outline" size="sm" onClick={saveCurrentTemplate}
              disabled={flatSaving || !selectedId || (!config && !newConfig)}
              className="text-xs h-7">
              {flatSaving ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSaveMenuOpen(o => !o)}
              disabled={flatSaving || !selectedId}
              className="h-7 w-7 p-0 text-gray-500">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
            {saveMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg p-1 z-20">
                <button
                  onClick={saveAsNewVersion}
                  disabled={flatSaving || !selectedId || (!config && !newConfig)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Copy className="w-3.5 h-3.5" />
                  새 버전으로 저장
                </button>
                <button
                  onClick={deleteCurrentVersion}
                  disabled={flatSaving || !selectedId}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="w-3.5 h-3.5" />
                  현재 버전 삭제
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" nativeButton={false}
            render={<Link href="/admin/thumbnail/gallery" />}
            className="text-xs h-7 gap-1.5">
            <ImageIcon className="w-3 h-3" />갤러리
          </Button>
          <Button size="sm" onClick={renderThumbnail} disabled={rendering || !selectedId}
            className="text-xs h-7 gap-1.5">
            {rendering
              ? <><RefreshCw className="w-3 h-3 animate-spin" />렌더 중...</>
              : <><Download className="w-3 h-3" />WebP 저장</>}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── 왼쪽: 단일 슬라이딩 패널 (L1 브라우저 + L2 편집) ── */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden relative">

          {/* ── L1: 템플릿 브라우저 ── */}
          <div className="absolute inset-0 flex flex-col transition-transform duration-150 ease-in-out"
            style={{ transform: panelLevel === 'browser' ? 'translateX(0)' : 'translateX(-100%)' }}>

            <div className="p-2 border-b border-gray-100 flex flex-col gap-2 shrink-0">
              <Input
                placeholder="템플릿 이름 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-gray-50 focus-visible:ring-1"
              />
              <div className="flex flex-wrap gap-1">
                {LAYOUT_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setLayoutFilter(f.key)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md border transition-colors',
                      layoutFilter === f.key
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                    )}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {groupedTemplates.map(group => (
                <LayoutGroupSection
                  key={group.key}
                  title={group.label}
                  items={group.items}
                  selectedId={selectedId}
                  onSelect={id => { selectTemplate(id); setPanelLevel('editing') }}
                />
              ))}
              {uncategorizedTemplates.length > 0 && (
                <LayoutGroupSection
                  title="기타"
                  items={uncategorizedTemplates}
                  selectedId={selectedId}
                  onSelect={id => { selectTemplate(id); setPanelLevel('editing') }}
                />
              )}
            </div>
          </div>

          {/* ── L2: 편집 패널 ── */}
          <div className="absolute inset-0 transition-transform duration-150 ease-in-out"
            style={{ transform: panelLevel === 'editing' ? 'translateX(0)' : 'translateX(100%)' }}>
            {newConfig !== null ? (
              <FlatEditor
                scenes={scenes}
                config={newConfig}
                templateName={templateName}
                lang={flatLang}
                onLangChange={setFlatLang}
                onConfigChange={patch => setNewConfig(prev => prev ? { ...prev, ...patch } : null)}
                onTemplateNameChange={setTemplateName}
                onTranslate={translateFlatContent}
                translating={flatTranslating}
                selectedTarget={selectedTarget}
                onSelectTarget={setSelectedTarget}
                onBack={() => { setPanelLevel('browser'); setSelectedTarget(null) }}
              />
            ) : (
              <>
                {/* Legacy 컨트롤 — 뒤로가기 헤더만 추가 */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
                  <button
                    onClick={() => setPanelLevel('browser')}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    템플릿
                  </button>
                </div>
                {/* 기존 legacy 컨트롤 내용 */}
                <div className="flex-1 overflow-y-auto">

                  {/* 언어 탭 */}
                  <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          className={cn('text-[10px] font-semibold px-2.5 py-1 rounded border transition-colors',
                            lang === l ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400')}>
                          {LANG_LABELS[l]}
                        </button>
                      ))}
                      {lang === 'ko' ? (
                        <button onClick={translateContent} disabled={translating}
                          className={cn('ml-auto text-[10px] font-semibold px-2.5 py-1 rounded border transition-colors',
                            translating ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600')}>
                          {translating ? '번역 중...' : '번역하기 →'}
                        </button>
                      ) : (
                        <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded',
                          translations[lang] ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50')}>
                          {translations[lang] ? '번역됨' : '미번역'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 통합 섹션 */}
                  <div className="flex-1 overflow-y-auto">

                    {/* 모델 */}
                    <SectionPanel title="모델">
                      <div className="space-y-1.5">
                        {useCutoutMode && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">누끼</span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => setModelFolderFilter('all')}
                            className={cn('text-[10px] px-2 py-0.5 rounded border transition-colors',
                              modelFolderFilter === 'all' ? 'bg-gray-700 border-gray-700 text-white'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400')}>전체</button>
                          {Object.keys(modelGroups).map(g => (
                            <button key={g} onClick={() => setModelFolderFilter(g)}
                              className={cn('text-[10px] px-2 py-0.5 rounded border transition-colors',
                                modelFolderFilter === g ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400')}>{g}</button>
                          ))}
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-2 pr-0.5">
                          {Object.entries(modelGroups)
                            .filter(([g]) => modelFolderFilter === 'all' || g === modelFolderFilter)
                            .map(([group, files]) => (
                              <div key={group}>
                                {modelFolderFilter === 'all' && (
                                  <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-0.5 mb-1">{group}</div>
                                )}
                                <div className="grid grid-cols-4 gap-1">
                                  {files.map(f => {
                                    const assetDir = useCutoutMode ? 'models-cutout' : 'models'
                                    const imgUrl = `/api/thumbnail/asset/${assetDir}/${f.split('/').map(encodeURIComponent).join('/')}`
                                    const isSelected = content.model === f
                                    return (
                                      <button key={f} title={f.split('/').pop()}
                                        onClick={() => setContent(c => ({ ...c, model: f }))}
                                        className={cn('relative aspect-square rounded-md overflow-hidden border-2 transition-all',
                                          isSelected ? 'border-blue-500 ring-1 ring-blue-300' : 'border-transparent hover:border-gray-300')}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imgUrl} alt={f.split('/').pop()} className="w-full h-full object-cover" />
                                        {isSelected && <div className="absolute inset-0 bg-blue-500/10" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      {(controlsBySection.model ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 헤드라인 */}
                    <SectionPanel title="헤드라인">
                      {(() => {
                        const isKo = lang === 'ko'
                        const value = isKo ? content.headline : (translations[lang]?.headline ?? '')
                        return (
                          <Input value={value} placeholder="헤드라인"
                            onChange={e => isKo ? setContentField('headline', e.target.value) : setTranslationField('headline', e.target.value)}
                            className="h-7 text-xs" />
                        )
                      })()}
                      {(controlsBySection.headline ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 서브헤드라인 */}
                    <SectionPanel title="서브헤드라인" defaultOpen={false}>
                      {(() => {
                        const isKo = lang === 'ko'
                        const value = isKo ? content.sub : (translations[lang]?.sub ?? '')
                        return (
                          <Input value={value} placeholder="서브헤드라인"
                            onChange={e => isKo ? setContentField('sub', e.target.value) : setTranslationField('sub', e.target.value)}
                            className="h-7 text-xs" />
                        )
                      })()}
                      {(controlsBySection.sub ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 태그라인 */}
                    <SectionPanel title="태그라인" defaultOpen={false}>
                      {(() => {
                        const isKo = lang === 'ko'
                        const value = isKo ? content.tagline : (translations[lang]?.tagline ?? '')
                        return (
                          <Input value={value} placeholder="태그라인"
                            onChange={e => isKo ? setContentField('tagline', e.target.value) : setTranslationField('tagline', e.target.value)}
                            className="h-7 text-xs" />
                        )
                      })()}
                      {(controlsBySection.tagline ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 가격 */}
                    <SectionPanel title="가격" defaultOpen={false}>
                      <div className="flex gap-2">
                        <Input value={content.price} placeholder="가격"
                          onChange={e => setContentField('price', e.target.value)}
                          className="h-7 text-xs flex-1" />
                        <Input value={content.priceUnit} placeholder="단위"
                          onChange={e => setContentField('priceUnit', e.target.value)}
                          className="h-7 text-xs w-16" />
                      </div>
                      {(controlsBySection.price ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 브랜드 */}
                    <SectionPanel title="브랜드" defaultOpen={false}>
                      <Input value={content.brandEn} placeholder="병원명 (영문)"
                        onChange={e => setContentField('brandEn', e.target.value)}
                        className="h-7 text-xs" />
                      <Input value={content.brandKo} placeholder="병원명 (한글)"
                        onChange={e => setContentField('brandKo', e.target.value)}
                        className="h-7 text-xs" />
                      {(controlsBySection.brand ?? []).map(item => (
                        <ControlItemRow key={item.var} item={item}
                          value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                          onChange={v => setVar(item.var, v)} />
                      ))}
                    </SectionPanel>

                    {/* 배경 & 스타일 */}
                    <SectionPanel title="배경 & 스타일" defaultOpen={false}>
                      {config ? (
                        (controlsBySection.style ?? []).map(item => (
                          <ControlItemRow key={item.var} item={item}
                            value={varOverrides[item.var] ?? config?.vars[item.var] ?? ''}
                            onChange={v => setVar(item.var, v)} />
                        ))
                      ) : (
                        <div className="space-y-2">
                          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                      )}
                    </SectionPanel>

                  </div>
                </div>
              </>
            )}
          </div>

        </aside>

        {/* ── 중앙: 썸네일 미리보기 ── */}
        <main className="flex-1 bg-gray-100 flex flex-col items-center justify-center gap-3 p-6 overflow-auto min-w-0">
          {selectedId ? (
            <>
              <div className="relative rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-200 flex-shrink-0"
                style={{ width: 480, height: 480 }}>
                <iframe ref={frameRef}
                  style={{ width: 1080, height: 1080, transform: 'scale(0.4444)', transformOrigin: 'top left', border: 'none' }}
                />
                {/* 새 포맷: 드래그 핸들 오버레이 */}
                {newConfig && (
                  <DragCanvas
                    elements={newConfig.elements ?? []}
                    frameRef={frameRef}
                    canvasSize={480}
                    sourceSize={1080}
                    onElementMove={(cssTarget, x, y) => {
                      const next = (newConfig.elements ?? []).map(el =>
                        el.cssTarget === cssTarget
                          ? { ...el, props: { ...el.props, x, y } }
                          : el
                      )
                      setNewConfig(prev => prev ? { ...prev, elements: next } : null)
                    }}
                    selectedTarget={selectedTarget}
                    onSelectTarget={setSelectedTarget}
                    onElementResize={(cssTarget, maxWidth) => {
                      const next = (newConfig.elements ?? []).map(el =>
                        el.cssTarget === cssTarget
                          ? { ...el, props: { ...el.props, maxWidth } }
                          : el
                      )
                      setNewConfig(prev => prev ? { ...prev, elements: next } : null)
                    }}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Badge variant="outline" className="text-[10px] text-gray-400">{selectedId}</Badge>
                <Badge variant="outline" className="text-[10px] text-blue-500">{LANG_LABELS[lang]}</Badge>
                <Button variant="ghost" size="sm" onClick={reloadPreview}
                  className="text-gray-400 hover:text-gray-600 h-6 text-xs gap-1">
                  <RefreshCw className="w-3 h-3" />새로고침
                </Button>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">← 템플릿을 선택하세요</div>
          )}
        </main>

        {/* ── 우측: 앱 컨텍스트 미리보기 패널 ── */}
        <aside className="w-96 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">앱 미리보기</span>
          </div>
          {selectedId ? (
            <div className="p-3">
              <AppContextPreview
                thumbnailUrl={appContextThumbnailUrl}
                headline={appContextHeadline}
                brandName={appContextBrandName}
                price={appContextPrice}
                priceUnit={appContextPriceUnit}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-300 text-xs">
              템플릿 선택 후 표시
            </div>
          )}
        </aside>
      </div>

      {/* Legacy 변환 배너 — newConfig=null이고 legacy 템플릿 선택된 경우 */}
      {newConfig === null && selectedId && templates.find(t => t.id === selectedId)?.source === 'legacy' && scenes.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-3">
          <span className="text-xs text-amber-700">⚠️ 구형 포맷 템플릿입니다.</span>
          <button onClick={convertLegacy}
            className="text-xs text-amber-900 underline font-medium">
            새 포맷으로 변환
          </button>
        </div>
      )}

    </div>
  )
}

// ── 앱 컨텍스트 미리보기 ──

interface AppContextPreviewProps {
  thumbnailUrl: string
  headline: string
  brandName: string
  price: string
  priceUnit: string
}

function ThumbnailFrame({ src, width, height }: { src: string; width: number; height?: number }) {
  const scale = width / 1080
  const h = height ?? width
  return (
    <div className="overflow-hidden flex-shrink-0 bg-gray-100"
      style={{ width, height: h, position: 'relative' }}>
      <iframe src={src}
        style={{
          width: 1080, height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
          position: 'absolute', top: 0, left: 0,
        }}
      />
    </div>
  )
}

function AppContextPreview({ thumbnailUrl, headline, brandName, price, priceUnit }: AppContextPreviewProps) {
  const displayPrice = formatPriceLabel(price, priceUnit)

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* 0. 시술 상세 (GallerySlider — full-width × h-72) */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">시술 상세</span>
        </div>
        {/* 360×270 — 앱 h-72(288px) / w-full(390px) 비율 유지 */}
        <ThumbnailFrame src={thumbnailUrl} width={360} height={270} />
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0" />
            <p className="text-xs text-gray-400 truncate">{brandName}</p>
          </div>
          <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">{headline}</h2>
          {displayPrice && <p className="text-base font-bold text-gray-900">{displayPrice}</p>}
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 text-xs leading-none">★★★★★</span>
            <span className="text-xs text-gray-400">4.9 · 리뷰 215</span>
          </div>
        </div>
      </div>

      {/* 1. 홈 · 인기 시술 (ProcedureCard 92×92) */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">홈 · 인기 시술</span>
        </div>
        <div className="flex items-start gap-4 px-4 pb-4" style={{ height: 108 }}>
          <ThumbnailFrame src={thumbnailUrl} width={108} />
          <div className="flex-1 min-w-0 flex flex-col justify-center h-[108px] gap-1">
            <p className="text-xs text-gray-400 truncate">{brandName}</p>
            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{headline}</h4>
            {displayPrice && <p className="text-sm font-bold text-pink-500">{displayPrice}~</p>}
          </div>
        </div>
      </div>

      {/* 2. 시술 목록 (ProcedureListItem 100×100) */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">시술 목록</span>
        </div>
        <div className="flex gap-3 px-4 pb-4">
          <ThumbnailFrame src={thumbnailUrl} width={120} />
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 truncate">{brandName}</p>
            <h3 className="text-sm text-gray-900 leading-snug line-clamp-2">{headline}</h3>
            {displayPrice && <p className="text-sm font-semibold text-gray-900">{displayPrice}</p>}
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-yellow-400 text-xs leading-none">★★★★★</span>
              <span className="text-xs text-gray-400">4.9 · 리뷰 128</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 추천 카드 (HorizontalProductCard 140×140) */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">추천 시술 카드</span>
        </div>
        <div className="px-4 pb-4">
          <div style={{ width: 180 }}>
            <ThumbnailFrame src={thumbnailUrl} width={180} />
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-gray-400 truncate">{brandName}</p>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{headline}</h4>
              {displayPrice && <p className="text-sm font-semibold text-gray-900">{displayPrice}</p>}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function formatPriceLabel(price: string, priceUnit: string) {
  const trimmed = price.trim()
  if (!trimmed) return null
  if (!/^[\d.,-]+$/.test(trimmed)) return trimmed

  const numeric = Number(trimmed.replace(/,/g, ''))
  if (!Number.isFinite(numeric)) return trimmed

  const unit = priceUnit.trim()
  return `₩${numeric.toLocaleString()}${unit ? ` ${unit}` : ''}`
}
