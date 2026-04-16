// app/admin/thumbnail/_components/ElementControls.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ELEMENT_TYPES, PROP_META, FONT_OPTIONS } from '@/lib/thumbnail-element-schema'
import type { ElementInstance } from '@/lib/thumbnail-element-schema'

interface Props {
  element:      ElementInstance
  onBack:       () => void
  onPropChange: (prop: string, value: string | number) => void
}

const ELEMENT_COLORS: Record<string, string> = {
  'brand-ko': '#6366f1', 'headline': '#2563eb',
  'headline-ko': '#7c3aed', 'subheadline': '#059669', 'price': '#db2777',
}

const TYPOGRAPHY_PROPS = new Set(['fontSize', 'fontFamily', 'lineHeight', 'letterSpacing'])
const COLOR_PROPS      = new Set(['color', 'bgColor', 'unitColor'])

// ── 색상 헬퍼 ──
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ── StepInput ──
function StepInput({ prop, value, onChange }: {
  prop: string
  value: number
  onChange: (v: number) => void
}) {
  const meta  = PROP_META[prop]
  if (!meta) return null
  const step  = meta.step ?? 1
  const min   = meta.min  ?? 0
  const max   = meta.max  ?? 9999
  const unit  = meta.unit ?? ''
  const label = meta.label

  const dec = () => onChange(parseFloat(Math.max(min, value - step).toFixed(4)))
  const inc = () => onChange(parseFloat(Math.min(max, value + step).toFixed(4)))

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1 truncate">{label}</span>
      <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
        <button onClick={dec}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-xs border-r border-gray-200 transition-colors">−</button>
        <span className="w-14 text-center text-[11px] font-mono text-gray-700 tabular-nums select-none">
          {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}{unit}
        </span>
        <button onClick={inc}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-xs border-l border-gray-200 transition-colors">+</button>
      </div>
    </div>
  )
}

// ── ColorRow — Swatch 클릭 → Popover (Hex + RGB 슬라이더) ──
const CH_COLORS = { r: '#ef4444', g: '#22c55e', b: '#3b82f6' } as const

function ColorRow({ prop, value, onChange }: {
  prop: string; value: string; onChange: (v: string) => void
}) {
  const label = PROP_META[prop]?.label ?? prop
  const [open, setOpen]   = useState(false)
  const [hex,  setHex]    = useState(value.startsWith('#') ? value : '#ffffff')
  const triggerRef        = useRef<HTMLButtonElement>(null)
  const popoverRef        = useRef<HTMLDivElement>(null)
  const [pos, setPos]     = useState({ top: 0, right: 0 })

  // 외부 값 변경 동기화
  useEffect(() => {
    if (value.startsWith('#')) setHex(value)
  }, [value])

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(o => !o)
  }

  const handleHexInput = (v: string) => {
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 }

  const handleRgb = (ch: 'r' | 'g' | 'b', v: number) => {
    const next = { ...rgb, [ch]: v }
    const h = rgbToHex(next.r, next.g, next.b)
    setHex(h)
    onChange(h)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1 truncate">{label}</span>
      <button ref={triggerRef} onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded hover:border-gray-400 transition-colors shrink-0">
        <span className="w-3.5 h-3.5 rounded-sm border border-black/10 shrink-0"
          style={{ background: hex }} />
        <span className="text-[10px] font-mono text-gray-600">{hex}</span>
        <svg className={`w-2.5 h-2.5 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-52 bg-white border border-gray-200 rounded-lg shadow-xl p-3 space-y-3">

          {/* 프리뷰 + Hex 인풋 */}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md border border-gray-200 shrink-0 shadow-sm"
              style={{ background: hex }} />
            <input
              value={hex}
              onChange={e => handleHexInput(e.target.value)}
              className="flex-1 text-[11px] font-mono border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 uppercase tracking-wider"
              placeholder="#ffffff"
              maxLength={7}
              spellCheck={false}
            />
          </div>

          {/* RGB 슬라이더 */}
          {(['r', 'g', 'b'] as const).map(ch => (
            <div key={ch} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-3 shrink-0 tabular-nums"
                style={{ color: CH_COLORS[ch] }}>
                {ch.toUpperCase()}
              </span>
              <input type="range" min={0} max={255} step={1}
                value={rgb[ch]}
                onChange={e => handleRgb(ch, parseInt(e.target.value))}
                className="flex-1 h-1 cursor-pointer rounded-full appearance-none"
                style={{ accentColor: CH_COLORS[ch] }}
              />
              <span className="text-[10px] font-mono text-gray-500 w-7 text-right tabular-nums shrink-0">
                {rgb[ch]}
              </span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── FontSelector ──
function FontSelector({ value, onChange }: {
  value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = FONT_OPTIONS.find(f => f.value === value) ?? FONT_OPTIONS[0]

  const FONT_FACES: Record<string, string> = {
    BlackHan:   "'Black Han Sans', sans-serif",
    Noto:       "'Noto Sans KR', sans-serif",
    Bebas:      "'Bebas Neue', cursive",
    Pretendard: "'Pretendard', sans-serif",
    Montserrat: "'Montserrat', sans-serif",
    Playfair:   "'Playfair Display', serif",
    PlayfairI:  "'Playfair Display', serif",
    NotoSerif:  "'Noto Serif', serif",
  }
  const sample = (val: string) => ['BlackHan','Noto','Pretendard','NotoSerif'].includes(val) ? '안녕 Hello' : 'Hello World'

  return (
    <div className="space-y-1">
      <span className="text-[10px] text-gray-400">폰트</span>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-gray-200 rounded bg-white hover:border-gray-400 transition-colors">
        <span className="text-sm text-gray-700" style={{ fontFamily: FONT_FACES[value] }}>
          {sample(value)}
        </span>
        <span className="text-[9px] text-gray-400 ml-2 shrink-0">{current.label} ▾</span>
      </button>
      {open && (
        <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-lg z-50">
          {FONT_OPTIONS.map(f => (
            <button key={f.value}
              onClick={() => { onChange(f.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${value === f.value ? 'bg-blue-50' : ''}`}>
              <span className="text-sm text-gray-800" style={{ fontFamily: FONT_FACES[f.value] }}>
                {sample(f.value)}
              </span>
              <span className="text-[9px] text-gray-400 shrink-0 ml-2">{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 섹션 헤더 ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// ── 메인 컴포넌트 ──
export function ElementControls({ element, onBack, onPropChange }: Props) {
  const schema = ELEMENT_TYPES[element.type]
  if (!schema) return null

  const color        = ELEMENT_COLORS[element.cssTarget] ?? '#6b7280'
  const schemaProps  = schema.props
  const typographyPs = schemaProps.filter(p => TYPOGRAPHY_PROPS.has(p))
  const colorPs      = schemaProps.filter(p => COLOR_PROPS.has(p))
  const layoutPs     = schemaProps.filter(p => !TYPOGRAPHY_PROPS.has(p) && !COLOR_PROPS.has(p))

  const val = (prop: string): string | number => element.props[prop] ?? 0

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          편집
        </button>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{element.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* 타이포그래피 */}
        {typographyPs.length > 0 && (
          <div>
            <SectionLabel>타이포그래피</SectionLabel>
            <div className="space-y-2.5">
              {typographyPs.map(prop =>
                prop === 'fontFamily'
                  ? <FontSelector key={prop}
                      value={String(val(prop) || 'BlackHan')}
                      onChange={v => onPropChange(prop, v)} />
                  : <StepInput key={prop} prop={prop}
                      value={Number(val(prop))}
                      onChange={v => onPropChange(prop, v)} />
              )}
            </div>
          </div>
        )}

        {/* 색상 */}
        {colorPs.length > 0 && (
          <div>
            <SectionLabel>색상</SectionLabel>
            <div className="space-y-2.5">
              {colorPs.map(prop =>
                <ColorRow key={prop} prop={prop}
                  value={String(val(prop) || '#ffffff')}
                  onChange={v => onPropChange(prop, v)} />
              )}
            </div>
          </div>
        )}

        {/* 레이아웃 */}
        {layoutPs.length > 0 && (
          <div>
            <SectionLabel>레이아웃</SectionLabel>
            <div className="space-y-2">
              {layoutPs.map(prop =>
                <StepInput key={prop} prop={prop}
                  value={Number(val(prop))}
                  onChange={v => onPropChange(prop, v)} />
              )}
            </div>
          </div>
        )}

        {/* 위치 (x/y — 읽기 전용 표시) */}
        {element.props.x !== undefined && (
          <div>
            <SectionLabel>위치</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['x','y'] as const).map(axis => (
                <div key={axis} className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <span className="w-6 flex items-center justify-center text-[10px] text-gray-400 border-r border-gray-200 h-6">{axis.toUpperCase()}</span>
                  <span className="flex-1 text-center text-[10px] font-mono text-gray-500 tabular-nums">
                    {Math.round(Number(element.props[axis]))}px
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-300 mt-1.5">위치는 캔버스 드래그로 조정하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
