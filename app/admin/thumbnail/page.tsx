'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Download, ImageIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TemplateConfig as NewTemplateConfig, DraftResult } from './_types'
import { FlatEditor } from './_components/FlatEditor'
import { DraftModal } from './_components/DraftModal'
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'

// ── 타입 ──

interface TemplateEntry {
  id: string
  nameKo: string
  name: string
  layout: string
  tone: string
  priceStyle: string
  color: string
  description: string
  requiresCutout?: boolean
  source?: 'llm-text' | 'llm-image' | 'builder' | 'manual' | 'legacy'
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
  const [layouts,         setLayouts]        = useState<LayoutToken[]>([])
  const [effects,         setEffects]        = useState<EffectToken[]>([])
  const [newConfig,       setNewConfig]      = useState<NewTemplateConfig | null>(null)
  const [flatLang,        setFlatLang]       = useState<Lang>('ko')
  const [templateName,    setTemplateName]   = useState('')
  const [flatSaving,      setFlatSaving]     = useState(false)
  const [flatTranslating, setFlatTranslating] = useState(false)
  const [showDraftModal,  setShowDraftModal] = useState(false)

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
      .then(d => { setLayouts(d.layouts ?? []); setEffects(d.effects ?? []) })
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
    setVarOverrides({})
    
    // 템플릿별 기본 설정 반영
    const req = tpls.find(t => t.id === id)?.requiresCutout ?? false
    setUseCutoutMode(req)

    const res = await fetch(`/api/thumbnail/config/${id}`)
    if (res.ok) {
      const data = await res.json()
      if ('layoutTokenId' in data) {
        // 신규 포맷
        setNewConfig(data as NewTemplateConfig)
        const tmpl = tpls.find(t => t.id === id)
        setTemplateName(tmpl?.nameKo ?? '')
        setConfig(null)
      } else {
        // legacy 포맷 (기존 동작 유지)
        setConfig(data)
        setNewConfig(null)
      }
    }
  }, [templates])

  // iframe 전체 리로드 — 템플릿 변경 / 모델 이미지 변경 시에만
  // 특정 언어 기준으로 URL 빌드
  const buildUrl = useCallback((targetLang: Lang) => {
    if (!selectedId) return ''
    const t = targetLang === 'ko' ? {} : (translations[targetLang] ?? {}) as Record<string, string>
    const c = targetLang === 'ko' ? content : {
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

  // buildUrl ref — 항상 최신 참조 유지
  const buildUrlRef = useRef(buildUrl)
  useEffect(() => { buildUrlRef.current = buildUrl }, [buildUrl])

  // 현재 언어 기준 리로드 (template/model 변경 시)
  const reloadPreview = useCallback(() => {
    const url = buildUrl(lang)
    if (url) setIframeSrc(url)
  // selectedId / content.model / useCutoutMode 변경 시에만 자동 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, content.model, useCutoutMode])

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
        const c = { ...content, headline: t.headline ?? content.headline, sub: t.sub ?? content.sub, tagline: t.tagline ?? content.tagline }
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

  // ── 신규 포맷 미리보기 URL ──

  useEffect(() => {
    if (!newConfig) return
    const texts  = newConfig.texts[flatLang] ?? newConfig.texts.ko
    const params = new URLSearchParams({
      layoutToken: newConfig.layoutTokenId,
      effectToken: newConfig.effectTokenId,
      fontFamily:  newConfig.fontFamily,
      accentColor: newConfig.accentColor,
      panelColor:  newConfig.panelColor,
      ...(newConfig.textColor ? { textColor:  newConfig.textColor  } : {}),
      ...(newConfig.subColor  ? { subColor:   newConfig.subColor   } : {}),
      headline:    texts.headline,
      headlineKo:  texts.headlineKo,
      sub:         texts.subheadline,
      price:       texts.price,
      brandKo:     texts.brandKo,
      brandEn:     texts.brandEn,
    })
    setIframeSrc(`/api/thumbnail/builder/preview?${params}`)
  }, [newConfig, flatLang])

  // ── 신규 포맷 저장 ──

  const saveFlatConfig = async () => {
    if (!newConfig) return
    setFlatSaving(true)
    try {
      const tmpl = templates.find(t => t.id === selectedId)
      const isExistingNew = tmpl && tmpl.source !== 'legacy'
      if (isExistingNew && selectedId) {
        await fetch(`/api/thumbnail/templates/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newConfig, nameKo: templateName }),
        })
      } else {
        const res = await fetch('/api/thumbnail/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newConfig, nameKo: templateName || '새 템플릿', source: 'manual' }),
        })
        const { id } = await res.json()
        const reg = await fetch('/api/thumbnail/registry').then(r => r.json())
        setTemplates(reg.templates ?? [])
        setSelectedId(id)
      }
      setSaveStatus('저장됨')
      setTimeout(() => setSaveStatus(''), 2000)
    } finally {
      setFlatSaving(false)
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

  // ── LLM 초안 적용 ──

  const applyDraft = (draft: DraftResult) => {
    const { templateNameKo, reason: _reason, ...config } = draft
    setNewConfig({
      layoutTokenId: config.layoutTokenId,
      effectTokenId: config.effectTokenId,
      fontFamily:    config.fontFamily,
      accentColor:   config.accentColor,
      panelColor:    config.panelColor,
      texts:         config.texts,
    })
    setTemplateName(templateNameKo)
    setSaveStatus(`✨ "${templateNameKo}" 초안 생성 완료`)
    setTimeout(() => setSaveStatus(''), 3000)
    // selectedId는 유지 — 우측 앱 컨텍스트 패널이 사라지지 않도록
  }

  // ── Legacy 변환 ──

  const convertLegacy = () => {
    setNewConfig({
      layoutTokenId: layouts[0]?.id ?? 'bottom-text-stack',
      effectTokenId: effects[0]?.id ?? 'overlay-dark',
      fontFamily:    'BlackHan',
      accentColor:   '#FF6B9D',
      panelColor:    '#1A1A2E',
      texts: { ko: { headline: '', headlineKo: '', subheadline: '', price: '', brandKo: '', brandEn: '' } },
    })
    const tmpl = templates.find(t => t.id === selectedId)
    setTemplateName(tmpl?.nameKo ?? '변환된 템플릿')
  }

  // ── Config 저장 ──

  const saveConfig = async () => {
    if (!selectedId || !config) return
    const updated = { ...config, vars: { ...config.vars, ...varOverrides } }
    await fetch(`/api/thumbnail/config/${selectedId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setConfig(updated)
    setVarOverrides({})
    setSaveStatus('저장됨')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  // ── 렌더 (WebP 다운로드) ──

  const renderThumbnail = async () => {
    if (!selectedId) return
    setRendering(true)
    try {
      const res = await fetch('/api/thumbnail/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: selectedId, ...activeContent }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${selectedId}-${lang}-${Date.now()}.webp`
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
    { key: 'text-only', label: '텍스트' },
    { key: 'diagonal', label: '대각선' },
  ]
  const filtered = templates.filter(t => {
    const matchLayout = layoutFilter === 'all' || t.layout === layoutFilter
    const q = searchQuery.trim().toLowerCase()
    const matchSearch = !q || t.nameKo.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    return matchLayout && matchSearch
  })

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
          <Button variant="outline" size="sm" onClick={() => setShowDraftModal(true)}
            className="text-xs h-7 gap-1.5">
            ✨ LLM 초안 생성
          </Button>
          <Button variant="outline" size="sm" onClick={saveConfig}
            className="text-xs h-7">
            Config 저장
          </Button>
          <Button variant="outline" size="sm" nativeButton={false}
            render={<Link href="/admin/thumbnail/gallery" />}
            className="text-xs h-7 gap-1.5">
            <ImageIcon className="w-3 h-3" />갤러리
          </Button>
          <Button size="sm" nativeButton={false}
            render={<Link href="/admin/thumbnail/builder" />}
            className="text-xs h-7 gap-1.5 bg-gray-900 text-white hover:bg-gray-700">
            + 새 썸네일 만들기
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

        {/* ── 왼쪽: 템플릿 브라우저 ── */}
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex flex-col gap-2">
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

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors',
                  selectedId === t.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200'
                )}>
                <div className="w-6 h-6 rounded flex-shrink-0 border border-gray-200 shadow-sm"
                  style={{ background: t.color }} />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{t.nameKo}</div>
                  <div className="text-[10px] text-gray-400 truncate">{t.layout}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── 가운데: 통합 사이드바 ── */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {newConfig !== null ? (
          <FlatEditor
            layouts={layouts}
            effects={effects}
            config={newConfig}
            templateName={templateName}
            lang={flatLang}
            onLangChange={setFlatLang}
            onConfigChange={patch => setNewConfig(prev => prev ? { ...prev, ...patch } : null)}
            onTemplateNameChange={setTemplateName}
            onSave={saveFlatConfig}
            onTranslate={translateFlatContent}
            saving={flatSaving}
            translating={flatTranslating}
          />
        ) : (<>

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
                {/* 폴더 필터 */}
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
                {/* 이미지 그리드 */}
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
              {/* model-* style controls */}
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
        </>)}
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
                thumbnailUrl={buildUrl(lang)}
                headline={activeContent.headline}
                brandName={content.brandKo || content.brandEn}
                price={content.price}
                priceUnit={content.priceUnit}
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
      {newConfig === null && selectedId && templates.find(t => t.id === selectedId)?.source === 'legacy' && layouts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-3">
          <span className="text-xs text-amber-700">⚠️ 구형 포맷 템플릿입니다.</span>
          <button onClick={convertLegacy}
            className="text-xs text-amber-900 underline font-medium">
            새 포맷으로 변환
          </button>
        </div>
      )}

      {showDraftModal && (
        <DraftModal
          onClose={() => setShowDraftModal(false)}
          onApply={applyDraft}
        />
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
  const displayPrice = price
    ? `₩${Number(price).toLocaleString()}${priceUnit ? ` ${priceUnit}` : ''}`
    : null

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
