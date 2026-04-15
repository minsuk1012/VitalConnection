# Panel Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 템플릿 브라우저와 편집 패널을 288px 단일 패널로 통합하고, 템플릿 선택 → 편집 → 요소 컨트롤의 3단계 슬라이드 네비게이션을 구현한다.

**Architecture:** `page.tsx`에서 `panelLevel('browser'|'editing')` 상태로 L1↔L2 슬라이드를 관리하고, `FlatEditor` 내부에서 `selectedTarget` prop으로 L2↔L3 슬라이드를 관리한다. `ElementControls`는 신규 컴포넌트로 분리해 요소별 스텝 인풋/폰트 셀렉터/컬러 팔레트를 담당한다.

**Tech Stack:** React useState/useCallback, TypeScript, Tailwind CSS (transition-transform)

---

## File Map

| 파일 | 변경 | 역할 |
|------|------|------|
| `app/admin/thumbnail/_components/DragCanvas.tsx` | 수정 | 버그 수정: 요소 핸들 onClick stopPropagation |
| `app/admin/thumbnail/_components/ElementControls.tsx` | **신규** | L3: 요소별 스타일 컨트롤 (StepInput, FontSelector, ColorRow) |
| `app/admin/thumbnail/_components/FlatEditor.tsx` | 수정 | L2: 뒤로가기 헤더 + 요소 nav 행 + L3 슬라이드 컨테이너 |
| `app/admin/thumbnail/page.tsx` | 수정 | 두 aside를 하나로 통합, panelLevel 상태 추가 |
| `stories/PanelDesign.stories.tsx` | 삭제 | 브레인스토밍 전용 임시 파일 |

---

## Task 1: DragCanvas 버그 수정 — onClick stopPropagation

**Files:**
- Modify: `app/admin/thumbnail/_components/DragCanvas.tsx` (드래그 핸들 div, 약 327번째 줄)

**배경:** 요소 핸들 div에 `onMouseDown`이 있어 `stopPropagation` 처리됐지만, mousedown→mouseup 후 발생하는 `click` 이벤트는 외부 컨테이너까지 버블링돼 `onSelectTarget(null)`이 즉시 호출된다.

- [ ] **Step 1: 드래그 핸들 div에 onClick stopPropagation 추가**

`positionedEls.map(el => { ... return (<div ... onMouseDown={...}>` 블록에서 외부 div에 `onClick` 추가:

```tsx
<div
  key={el.cssTarget}
  style={{
    position:  'absolute',
    left:      x * scale,
    top:       y * scale,
    transform: 'translate(-4px, -4px)',
    zIndex:    isActive ? 20 : 10,
  }}
  onMouseDown={e => handleMouseDown(e, el)}
  onClick={e => e.stopPropagation()}
>
```

- [ ] **Step 2: 빌드 에러 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/_components/DragCanvas.tsx
git commit -m "fix(thumbnail): DragCanvas — 요소 클릭 시 선택 즉시 해제 버그 수정"
```

---

## Task 2: ElementControls 신규 컴포넌트

**Files:**
- Create: `app/admin/thumbnail/_components/ElementControls.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// app/admin/thumbnail/_components/ElementControls.tsx
'use client'

import { useState } from 'react'
import { ELEMENT_TYPES, PROP_META, FONT_OPTIONS } from '@/lib/thumbnail-element-schema'
import type { ElementInstance } from '@/lib/thumbnail-element-schema'

interface Props {
  element:      ElementInstance
  onBack:       () => void
  onPropChange: (prop: string, value: string | number) => void
}

// 팔레트 (템플릿에서 자주 쓰이는 색상)
const PALETTE = ['#ffffff', '#000000', '#1a1a2e', '#ff6b9d', '#ffd700', '#00d4aa', '#6366f1', '#f43f5e']

const ELEMENT_COLORS: Record<string, string> = {
  'brand-ko': '#6366f1', 'headline': '#2563eb',
  'headline-ko': '#7c3aed', 'subheadline': '#059669', 'price': '#db2777',
}

// prop → 섹션 분류
const TYPOGRAPHY_PROPS = new Set(['fontSize', 'fontFamily', 'lineHeight', 'letterSpacing'])
const COLOR_PROPS      = new Set(['color', 'bgColor', 'unitColor'])

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

// ── ColorRow ──
function ColorRow({ prop, value, onChange }: {
  prop: string; value: string; onChange: (v: string) => void
}) {
  const label = PROP_META[prop]?.label ?? prop
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 flex-1">{label}</span>
        <input type="color"
          value={value.startsWith('#') ? value : '#ffffff'}
          onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5" />
        <span className="text-[10px] text-gray-400 font-mono w-14 truncate">{value}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={`w-5 h-5 rounded border-2 transition-all ${value === c ? 'border-blue-400 scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} />
        ))}
      </div>
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
            <div className="space-y-3">
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
```

- [ ] **Step 2: 빌드 에러 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/_components/ElementControls.tsx
git commit -m "feat(thumbnail): add ElementControls — step input + font selector + color palette"
```

---

## Task 3: FlatEditor 리팩토링 — nav 행 + L2/L3 슬라이드

**Files:**
- Modify: `app/admin/thumbnail/_components/FlatEditor.tsx`

**변경 사항:**
1. Props에 `onBack` 추가
2. 기존 아코디언 요소 섹션 → nav 행으로 교체 (클릭 시 `onSelectTarget`)
3. `<div>` 슬라이드 컨테이너로 L2/L3 전환
4. `ElementControls` import 및 렌더링

- [ ] **Step 1: onBack prop 추가**

`Props` 인터페이스에 추가:

```tsx
onBack: () => void
```

`FlatEditor` 함수 파라미터에 추가:

```tsx
saving, translating, isLegacy, onConvertLegacy,
selectedTarget, onSelectTarget,
onBack,
```

- [ ] **Step 2: ElementControls import 추가**

파일 상단 import 블록에 추가:

```tsx
import { ElementControls } from './ElementControls'
```

- [ ] **Step 3: return 전체를 슬라이드 컨테이너로 교체**

현재 `return (` 아래 전체를 다음으로 교체:

```tsx
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
            const color     = ELEMENT_COLORS_MAP[el.cssTarget] ?? '#6b7280'
            const hintSize  = el.props.fontSize ? `${el.props.fontSize}px` : ''
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
```

단, 이 step에서 기존 `return (` 안의 내용 **전부**를 위 코드로 교체한다. 기존 `if (!config) return (...)` 분기는 함수 상단에 그대로 유지.

- [ ] **Step 4: 빌드 에러 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add app/admin/thumbnail/_components/FlatEditor.tsx
git commit -m "feat(thumbnail): FlatEditor — 3depth 슬라이드 네비 + ElementControls 연동"
```

---

## Task 4: page.tsx — 단일 패널 레이아웃

**Files:**
- Modify: `app/admin/thumbnail/page.tsx`

**변경 사항:**
1. `panelLevel` state 추가
2. 템플릿 클릭 핸들러에 `setPanelLevel('editing')` 추가
3. `w-56` 템플릿 브라우저 aside 제거
4. `w-72` aside 내부를 슬라이딩 두 레이어로 교체
5. FlatEditor에 `onBack` prop 전달

- [ ] **Step 1: panelLevel state 추가**

기존 `const [selectedTarget, setSelectedTarget] = useState<string | null>(null)` 바로 아래:

```tsx
const [panelLevel, setPanelLevel] = useState<'browser' | 'editing'>('browser')
```

- [ ] **Step 2: 템플릿 클릭 핸들러 분리**

`return` 블록 안 템플릿 목록 버튼의 `onClick`을 수정:

```tsx
// 기존
onClick={() => selectTemplate(t.id)}

// 변경 후
onClick={() => { selectTemplate(t.id); setPanelLevel('editing') }}
```

- [ ] **Step 3: selectTemplate 함수에서 panelLevel 초기화 제거 확인**

`selectTemplate` 함수 안에 `setPanelLevel` 호출이 없는지 확인 (auto-select 시 패널 전환 방지). 있으면 제거.

- [ ] **Step 4: w-56 템플릿 브라우저 aside 전체 제거**

```tsx
{/* 제거 대상 — 시작 */}
<aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
  ...
</aside>
{/* 제거 대상 — 끝 */}
```

- [ ] **Step 5: w-72 aside를 슬라이딩 구조로 교체**

현재:
```tsx
<aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
{newConfig !== null ? (
  <FlatEditor
    ...
  />
) : (<>
  ...legacy controls...
</>)}
</aside>
```

교체 후:
```tsx
<aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden relative">

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

    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {filtered.map(t => (
        <button key={t.id}
          onClick={() => { selectTemplate(t.id); setPanelLevel('editing') }}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors',
            selectedId === t.id
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200'
          )}>
          <div className="w-6 h-6 rounded flex-shrink-0 border border-gray-200 shadow-sm"
            style={{ background: t.color ?? t.accentColor ?? '#e5e7eb' }} />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{t.nameKo}</div>
            <div className="text-[10px] text-gray-400 truncate">{t.layout}</div>
          </div>
        </button>
      ))}
    </div>
  </div>

  {/* ── L2: 편집 패널 ── */}
  <div className="absolute inset-0 transition-transform duration-150 ease-in-out"
    style={{ transform: panelLevel === 'editing' ? 'translateX(0)' : 'translateX(100%)' }}>
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
        {/* 기존 legacy 컨트롤 내용 그대로 유지 (언어탭, 섹션들) */}
        <div className="flex-1 overflow-y-auto">
          {/* 이 div 안에 기존 legacy controls JSX를 그대로 넣는다 */}
        </div>
      </>
    )}
  </div>

</aside>
```

**중요:** legacy controls (`newConfig === null`) 분기의 기존 JSX(언어 탭, 섹션별 컨트롤 등)는 위 `{/* 기존 legacy controls JSX를 그대로 넣는다 */}` 위치에 그대로 유지한다.

- [ ] **Step 6: 빌드 에러 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: 출력 없음

- [ ] **Step 7: 커밋**

```bash
git add app/admin/thumbnail/page.tsx
git commit -m "feat(thumbnail): page — 단일 288px 패널 + 템플릿브라우저↔편집패널 슬라이드"
```

---

## Task 5: Storybook 브레인스토밍 파일 정리

**Files:**
- Delete: `stories/PanelDesign.stories.tsx`

- [ ] **Step 1: 파일 삭제**

```bash
rm stories/PanelDesign.stories.tsx
git commit -m "chore: remove brainstorming story files" --allow-empty || true
```

(파일이 git에 추적되지 않을 수 있으므로 `--allow-empty` 사용)

---

## Self-Review

### Spec coverage
- [x] 288px 단일 패널 → Task 4 (w-56 제거, w-72 유지)
- [x] L1 템플릿 브라우저 → L2 편집 패널 슬라이드 → Task 4
- [x] L2 편집 패널 → L3 요소 컨트롤 슬라이드 → Task 3
- [x] 뒤로가기 버튼 (편집→브라우저) → Task 4 Step 5 `onBack`
- [x] 뒤로가기 버튼 (요소→편집) → Task 3 `ElementControls onBack`
- [x] 스텝 인풋 ([−] 값 [+]) → Task 2 `StepInput`
- [x] 폰트 미리보기 셀렉터 → Task 2 `FontSelector`
- [x] 팔레트 퀵픽 → Task 2 `ColorRow`
- [x] 타이포그래피/색상/레이아웃 섹션 분리 → Task 2 `ElementControls`
- [x] x/y 위치 표시 → Task 2 (읽기 전용)
- [x] DragCanvas 클릭 선택 해제 버그 → Task 1

### Type consistency
- `onBack: () => void` — FlatEditor Props (Task 3 Step 1), page.tsx 전달 (Task 4 Step 5) 일치
- `onPropChange: (prop: string, value: string | number) => void` — ElementControls Props (Task 2), FlatEditor 호출 (Task 3 `handlePropChange`) 일치
- `selectedTarget: string | null` — 기존 FlatEditor Props, ElementControls의 `element.cssTarget` 참조 일치

### 알려진 한계
- Legacy 템플릿 분기의 기존 컨트롤(섹션별 슬라이더)은 새 ElementControls로 교체되지 않음 — legacy는 점진적 마이그레이션
- x/y 넛지 버튼은 이번 구현에서 제외 (캔버스 드래그 안내 메시지로 대체)
