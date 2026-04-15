# Thumbnail Element Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 5개 전역 CSS 변수(fontFamily, accentColor, panelColor, textColor, subColor)를 "요소 배열(elements[])"로 교체해, 에디터에 요소를 추가하면 해당 요소 타입에 맞는 컨트롤이 자동으로 제공되는 구조를 구현한다.

**Architecture:** 새 파일 `lib/thumbnail-element-schema.ts`에 요소 타입 스키마(ELEMENT_TYPES, PROP_META)를 정의하고, TemplateConfig의 `elements[]` 배열에서 CSS 변수를 `--{cssTarget}-{prop-kebab}` 규칙으로 자동 생성한다. 레이아웃 CSS 파일들은 이 변수를 fallback 기본값과 함께 참조하도록 업데이트한다. 레거시 포맷(vars/controls)은 손대지 않는다.

**Tech Stack:** TypeScript, Next.js App Router, CSS Custom Properties

---

## 파일 맵

| 액션 | 파일 | 역할 |
|---|---|---|
| **Create** | `lib/thumbnail-element-schema.ts` | PROP_META, ELEMENT_TYPES, CSS 변수 생성 함수 |
| **Modify** | `app/admin/thumbnail/_types.ts` | ElementInstance 추가, TemplateConfig 재정의 |
| **Modify** | `lib/thumbnail-compose.ts` | buildCssVars → elementsToCssVars 교체 |
| **Modify** | `thumbnail/templates/base.html` | model brightness CSS var 추가 |
| **Modify** | `thumbnail/templates/layouts/*.css` (6개) | 하드코딩 값 → CSS var 참조로 교체 |
| **Modify** | `thumbnail/configs/sample-asce-exosome.json` | 기존 5-var 포맷 → elements[] 포맷 마이그레이션 |
| **Modify** | `app/admin/thumbnail/_components/FlatEditor.tsx` | 5개 컬러 섹션 → elements 기반 컨트롤 UI |
| **Modify** | `app/api/thumbnail/builder/preview/route.ts` | `elements` JSON 파라미터 수신 및 전달 |
| **Modify** | `app/admin/thumbnail/page.tsx` | newConfig 미리보기 URL 빌드 로직 업데이트 |

---

## Task 1: Element Schema 정의

**Files:**
- Create: `lib/thumbnail-element-schema.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// lib/thumbnail-element-schema.ts

export interface ControlDef {
  type:     'range' | 'color' | 'select'
  label:    string
  unit?:    string
  min?:     number
  max?:     number
  step?:    number
  options?: { value: string; label: string }[]
}

export const FONT_OPTIONS = [
  { value: 'BlackHan',    label: 'Black Han Sans' },
  { value: 'Noto',        label: 'Noto Sans KR' },
  { value: 'Pretendard',  label: 'Pretendard Bold' },
  { value: 'Bebas',       label: 'Bebas Neue' },
  { value: 'Montserrat',  label: 'Montserrat' },
  { value: 'Playfair',    label: 'Playfair Display' },
  { value: 'PlayfairI',   label: 'Playfair Italic' },
  { value: 'NotoSerif',   label: 'Noto Serif' },
] as const

/** 모든 prop의 컨트롤 정의 */
export const PROP_META: Record<string, ControlDef> = {
  // 공통
  opacity:       { type: 'range',  label: '불투명도', min: 0,    max: 1,    step: 0.05, unit: '' },
  zIndex:        { type: 'range',  label: '레이어',   min: 0,    max: 20,   step: 1,    unit: '' },
  // 텍스트
  fontSize:      { type: 'range',  label: '폰트 크기',  min: 12,  max: 200,  step: 1,    unit: 'px' },
  color:         { type: 'color',  label: '색상',       unit: '' },
  fontFamily:    { type: 'select', label: '폰트',        unit: '', options: FONT_OPTIONS },
  maxWidth:      { type: 'range',  label: '최대 너비',  min: 100, max: 1080, step: 10,   unit: 'px' },
  lineHeight:    { type: 'range',  label: '줄 간격',    min: 0.8, max: 2.0,  step: 0.05, unit: '' },
  letterSpacing: { type: 'range',  label: '자간',       min: -5,  max: 20,   step: 0.5,  unit: 'px' },
  bgColor:       { type: 'color',  label: '배경색',     unit: '' },
  // 가격 전용
  unitSize:      { type: 'range',  label: '단위 크기',  min: 12,  max: 80,   step: 1,    unit: 'px' },
  unitColor:     { type: 'color',  label: '단위 색상',  unit: '' },
  skew:          { type: 'range',  label: '기울기',     min: -30, max: 30,   step: 1,    unit: 'deg' },
  // 이미지 전용
  brightness:    { type: 'range',  label: '밝기',       min: 0.3, max: 1.5,  step: 0.05, unit: '' },
}

/** 요소 타입별 허용 prop 목록 */
export const ELEMENT_TYPES: Record<string, { label: string; props: string[] }> = {
  text: {
    label: '텍스트',
    props: ['fontSize', 'color', 'fontFamily', 'maxWidth', 'lineHeight', 'letterSpacing', 'bgColor', 'opacity'],
  },
  price: {
    label: '가격',
    props: ['fontSize', 'color', 'unitSize', 'unitColor', 'skew', 'opacity'],
  },
  image: {
    label: '이미지',
    props: ['brightness', 'opacity', 'zIndex'],
  },
}

/** camelCase prop + cssTarget → CSS 변수명
 * propToCssVar('headline', 'fontSize') → '--headline-font-size'
 * propToCssVar('headline-ko', 'color') → '--headline-ko-color'
 */
export function propToCssVar(cssTarget: string, prop: string): string {
  const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `--${cssTarget}-${kebab}`
}

/** prop 값을 CSS 값 문자열로 변환 */
export function formatPropValue(prop: string, value: string | number): string {
  if (prop === 'fontFamily') return `'${value}'`
  const meta = PROP_META[prop]
  const unit = meta?.unit ?? ''
  return `${value}${unit}`
}

/** elements 배열 → CSS 변수 문자열 (composeHtml에서 사용) */
export function elementsToCssVars(elements: ElementInstance[]): string {
  const vars: string[] = []
  for (const el of elements) {
    for (const [prop, value] of Object.entries(el.props)) {
      vars.push(`${propToCssVar(el.cssTarget, prop)}: ${formatPropValue(prop, value)}`)
    }
  }
  return vars.join('; ')
}

export interface ElementInstance {
  type:      'text' | 'price' | 'image'
  cssTarget: string
  label:     string
  props:     Record<string, string | number>
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection
npx tsc --noEmit 2>&1 | head -20
```
Expected: 에러 없음 (또는 기존과 동일한 에러만)

- [ ] **Step 3: Commit**

```bash
git add lib/thumbnail-element-schema.ts
git commit -m "feat(thumbnail): element schema 정의 — PROP_META, ELEMENT_TYPES, CSS var 생성 함수"
```

---

## Task 2: _types.ts 업데이트

**Files:**
- Modify: `app/admin/thumbnail/_types.ts`

- [ ] **Step 1: ElementInstance import 추가 + TemplateConfig 재정의**

`app/admin/thumbnail/_types.ts` 전체를 다음으로 교체:

```typescript
// app/admin/thumbnail/_types.ts
export type { ElementInstance } from '@/lib/thumbnail-element-schema'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

export const LANG_LABELS: Record<Lang, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  ja: { flag: '🇯🇵', label: 'JA' },
  zh: { flag: '🇨🇳', label: 'ZH' },
}

export { FONT_OPTIONS } from '@/lib/thumbnail-element-schema'

export interface TextContent {
  headline:    string
  headlineKo:  string
  subheadline: string
  price:       string
  brandEn:     string
  brandKo:     string
}

/** 신규 토큰 포맷 템플릿 설정 */
export interface TemplateConfig {
  layoutTokenId: string
  effectTokenId: string
  panelColor:    string
  elements:      import('@/lib/thumbnail-element-schema').ElementInstance[]
  texts: {
    ko:   TextContent
    en?:  TextContent
    ja?:  TextContent
    zh?:  TextContent
  }
}

/** 템플릿 레지스트리 엔트리 */
export interface TemplateEntry {
  id:           string
  nameKo:       string
  name:         string
  source:       'builder' | 'manual' | 'legacy'
  layoutTokenId?: string
  effectTokenId?: string
  accentColor:  string
  createdAt:    string
  layout?:          string
  tone?:            string
  priceStyle?:      string
  tags?:            string[]
  description?:     string
  color?:           string
  requiresCutout?:  boolean
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```
Expected: `_types.ts` 관련 에러 없음. FlatEditor.tsx에서 타입 불일치 에러가 나올 수 있음 (다음 태스크에서 수정).

- [ ] **Step 3: Commit**

```bash
git add app/admin/thumbnail/_types.ts
git commit -m "refactor(thumbnail): TemplateConfig — 5개 전역 var → elements[] + panelColor"
```

---

## Task 3: thumbnail-compose.ts 업데이트

**Files:**
- Modify: `lib/thumbnail-compose.ts`

- [ ] **Step 1: elementsToCssVars import + buildCssVars 교체**

`lib/thumbnail-compose.ts` 상단 import에 추가:
```typescript
import { elementsToCssVars, type ElementInstance } from './thumbnail-element-schema'
```

`TemplateInput` 인터페이스에 `elements` 필드 추가:
```typescript
export interface TemplateInput {
  // ...기존 필드 유지...
  elements?: ElementInstance[]
}
```

`buildCssVars` 함수 전체를 교체:
```typescript
function buildCssVars(input: TemplateInput): string {
  const vars: string[] = []

  // panelColor는 효과 토큰 레벨 변수 (body 배경)
  if (input.panelColor) vars.push(`--panel-color: ${input.panelColor}`)

  // 하위 호환: 기존 단일 var 필드 지원 (마이그레이션 완료 전까지)
  if (input.fontFamily)  vars.push(`--headline-font: '${input.fontFamily}'`)
  if (input.accentColor) vars.push(`--accent-color: ${input.accentColor}`)
  if (input.textColor)   vars.push(`--text-color: ${input.textColor}`)
  if (input.subColor)    vars.push(`--sub-color: ${input.subColor}`)

  // 신규: elements 배열에서 CSS var 생성
  if (input.elements?.length) {
    vars.push(elementsToCssVars(input.elements))
  }

  return vars.join('; ')
}
```

- [ ] **Step 2: composeHtml 시그니처 확인**

`composeHtml` 함수는 `input: TemplateInput`을 받으므로 변경 불필요. `TemplateInput`에 `elements?` 추가됐으므로 기존 호출은 그대로 동작.

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "thumbnail-compose" | head -10
```
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add lib/thumbnail-compose.ts
git commit -m "feat(thumbnail): composeHtml에 elements[] → CSS var 주입 지원"
```

---

## Task 4: base.html — model brightness CSS var

**Files:**
- Modify: `thumbnail/templates/base.html`

- [ ] **Step 1: model-layer img에 brightness var 추가**

`base.html`의 `.model-layer img` 스타일을 찾아:
```css
.model-layer img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
```

다음으로 교체:
```css
.model-layer img { width: 100%; height: 100%; object-fit: cover; object-position: center top; filter: brightness(var(--model-brightness, 1)); }
```

- [ ] **Step 2: Commit**

```bash
git add thumbnail/templates/base.html
git commit -m "feat(thumbnail): base.html — model brightness CSS var 지원"
```

---

## Task 5: 레이아웃 CSS — CSS var 참조 추가

**Files:**
- Modify: `thumbnail/templates/layouts/bottom-text-stack.css`
- Modify: `thumbnail/templates/layouts/left-text-stack.css`
- Modify: `thumbnail/templates/layouts/stacked-center-cutout.css`
- Modify: `thumbnail/templates/layouts/bottom-banner.css`
- Modify: `thumbnail/templates/layouts/top-left-editorial.css`
- Modify: `thumbnail/templates/layouts/solid-text-left.css`

각 파일의 모든 하드코딩된 텍스트 스타일 값을 `var(--{cssTarget}-{prop}, <기존값>)` 형태로 교체. **기존값을 fallback으로 유지하므로 기존 동작이 깨지지 않는다.**

- [ ] **Step 1: bottom-text-stack.css 업데이트**

전체 내용을 교체:
```css
/* bottom-text-stack.css */
.text-layer {
  position: absolute;
  bottom: 60px;
  left: 64px;
  right: 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.headline    { font-size: var(--headline-font-size, 84px); color: var(--headline-color, var(--text-color, #fff)); font-family: var(--headline-font-family, var(--headline-font, 'BlackHan')); max-width: var(--headline-max-width, 900px); line-height: var(--headline-line-height, 1.05); letter-spacing: var(--headline-letter-spacing, 0px); }
.headline-ko { font-size: var(--headline-ko-font-size, 84px); color: var(--headline-ko-color, var(--sub-color, #6B35A0)); max-width: var(--headline-ko-max-width, 900px); }
.subheadline { font-size: var(--subheadline-font-size, 30px); color: var(--subheadline-color, var(--sub-color, rgba(255,255,255,0.85))); }
.price-block { margin-top: 6px; }
.price       { font-size: var(--price-font-size, 70px); color: var(--price-color, var(--accent-color, #FF6B9D)); }
.price-unit  { font-size: var(--price-unit-size, 28px); color: var(--price-unit-color, rgba(255,255,255,0.8)); }
.brand-en    { font-size: 16px; margin-top: 6px; }
```

- [ ] **Step 2: left-text-stack.css 업데이트**

전체 내용을 교체:
```css
/* left-text-stack.css */
.text-layer {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 52px;
  gap: 14px;
  background: var(--panel-color);
}
.headline    { font-size: var(--headline-font-size, 60px); color: var(--headline-color, var(--text-color, #fff)); font-family: var(--headline-font-family, var(--headline-font, 'BlackHan')); max-width: var(--headline-max-width, 400px); }
.headline-ko { font-size: var(--headline-ko-font-size, 60px); color: var(--headline-ko-color, var(--sub-color, #6B35A0)); }
.subheadline { font-size: var(--subheadline-font-size, 26px); color: var(--subheadline-color, var(--sub-color, rgba(255,255,255,0.85))); }
.price-block { margin-top: 8px; }
.price       { font-size: var(--price-font-size, 58px); color: var(--price-color, var(--accent-color, #FF6B9D)); }
.price-unit  { font-size: var(--price-unit-size, 24px); color: var(--price-unit-color, rgba(255,255,255,0.8)); }
.brand-en    { font-size: 14px; margin-top: 10px; }
```

- [ ] **Step 3: stacked-center-cutout.css 업데이트**

전체 내용을 교체:
```css
/* stacked-center-cutout.css */
.model-layer {
  left: 45%;
  width: 55%;
}
.model-layer img {
  object-position: top center;
  height: 100%;
  width: 100%;
  object-fit: contain;
}
.text-layer {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 48px;
  gap: 16px;
}
.headline    { font-size: var(--headline-font-size, 68px); color: var(--headline-color, var(--text-color, #fff)); font-family: var(--headline-font-family, var(--headline-font, 'BlackHan')); max-width: var(--headline-max-width, 440px); }
.headline-ko { font-size: var(--headline-ko-font-size, 68px); color: var(--headline-ko-color, var(--sub-color, #6B35A0)); }
.subheadline { font-size: var(--subheadline-font-size, 24px); color: var(--subheadline-color, var(--sub-color, rgba(255,255,255,0.85))); }
.price-block { margin-top: 12px; }
.price       { font-size: var(--price-font-size, 62px); color: var(--price-color, var(--accent-color, #FF6B9D)); }
.price-unit  { font-size: var(--price-unit-size, 24px); color: var(--price-unit-color, rgba(255,255,255,0.8)); }
.brand-en    { font-size: 14px; margin-top: 10px; }
```

- [ ] **Step 4: bottom-banner.css 업데이트**

파일 읽기 후 `.headline`, `.subheadline`, `.price`, `.price-unit` 에만 var 추가. 나머지 레이아웃 구조(position, width, background 등)는 그대로 유지.

```bash
cat /Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection/thumbnail/templates/layouts/bottom-banner.css
```

파일 내 각 셀렉터에 아래 패턴 적용:
- `font-size: Xpx` → `font-size: var(--{target}-font-size, Xpx)` (target: headline/subheadline/price/price-unit → cssTarget과 일치)

- [ ] **Step 5: top-left-editorial.css 업데이트**

```bash
cat /Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection/thumbnail/templates/layouts/top-left-editorial.css
```

동일 패턴 적용.

- [ ] **Step 6: solid-text-left.css 업데이트**

전체 내용을 교체:
```css
/* solid-text-left.css */
.model-layer { display: none; }

.text-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 72px;
  gap: 0;
}

.brand-ko {
  font-size: 22px;
  font-family: var(--brand-ko-font-family, var(--headline-font, 'Pretendard'));
  color: var(--brand-ko-color, var(--text-color, #333333));
  font-weight: 400;
  margin-bottom: 20px;
  opacity: 0.75;
}

.headline {
  font-size: var(--headline-font-size, 140px);
  line-height: var(--headline-line-height, 1.0);
  color: var(--headline-color, var(--text-color, #2B7DB8));
  font-family: var(--headline-font-family, var(--headline-font, 'BlackHan'));
  letter-spacing: var(--headline-letter-spacing, -2px);
  max-width: var(--headline-max-width, 900px);
}

.headline-ko {
  font-size: var(--headline-ko-font-size, 136px);
  line-height: var(--headline-ko-line-height, 1.0);
  color: var(--headline-ko-color, var(--sub-color, #6B35A0));
  font-family: var(--headline-ko-font-family, var(--headline-font, 'BlackHan'));
  letter-spacing: var(--headline-ko-letter-spacing, -2px);
  max-width: var(--headline-ko-max-width, 900px);
  margin-bottom: 28px;
}

.subheadline {
  font-size: var(--subheadline-font-size, 22px);
  font-weight: 400;
  color: var(--subheadline-color, #333333);
  background: var(--subheadline-bg-color, var(--accent-color, #B8E8D0));
  display: inline-block;
  padding: 6px 16px;
  border-radius: 4px;
  margin-bottom: 56px;
  align-self: flex-start;
}

.price-block { margin-top: 0; }
.price      { font-size: var(--price-font-size, 118px); line-height: 1.0; color: var(--price-color, var(--accent-color, #FF6B9D)); }
.price-unit { font-size: var(--price-unit-size, 52px); color: var(--price-unit-color, var(--sub-color, rgba(255,255,255,0.8))); }

.brand-en   { display: none; }
```

- [ ] **Step 7: Commit**

```bash
git add thumbnail/templates/layouts/
git commit -m "feat(thumbnail): 레이아웃 CSS — 하드코딩 값 → CSS var 참조 (fallback 유지)"
```

---

## Task 6: sample-asce-exosome.json 마이그레이션

**Files:**
- Modify: `thumbnail/configs/sample-asce-exosome.json`

- [ ] **Step 1: 기존 포맷 → elements[] 포맷으로 교체**

```json
{
  "layoutTokenId": "solid-text-left",
  "effectTokenId": "solid-bg",
  "panelColor": "#E8E5F0",
  "elements": [
    {
      "type": "text",
      "cssTarget": "headline",
      "label": "헤드라인 (영문)",
      "props": { "fontSize": 140, "color": "#2B7DB8", "fontFamily": "BlackHan", "lineHeight": 1.0, "letterSpacing": -2 }
    },
    {
      "type": "text",
      "cssTarget": "headline-ko",
      "label": "헤드라인 (한글)",
      "props": { "fontSize": 136, "color": "#6B35A0", "lineHeight": 1.0, "letterSpacing": -2 }
    },
    {
      "type": "text",
      "cssTarget": "subheadline",
      "label": "서브카피",
      "props": { "fontSize": 22, "bgColor": "#B8E8D0" }
    },
    {
      "type": "price",
      "cssTarget": "price",
      "label": "가격",
      "props": { "fontSize": 118, "color": "#FF6B9D" }
    }
  ],
  "texts": {
    "ko": {
      "headline": "ASCE+",
      "headlineKo": "엑소좀",
      "subheadline": "피부탄력, 수분조절, 안티에이징",
      "price": "25.0만원",
      "brandKo": "반짝반짝 빛나는 광채피부!",
      "brandEn": ""
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add thumbnail/configs/sample-asce-exosome.json
git commit -m "feat(thumbnail): sample-asce-exosome — elements[] 포맷으로 마이그레이션"
```

---

## Task 7: FlatEditor.tsx — Elements 기반 컨트롤 UI

**Files:**
- Modify: `app/admin/thumbnail/_components/FlatEditor.tsx`

기존 "스타일" 섹션(폰트, 포인트색, 패널색, 헤드1색, 헤드2색)을 제거하고, `elements[]`를 순회하는 동적 컨트롤로 교체한다.

- [ ] **Step 1: import 추가**

파일 상단 import에 추가:
```typescript
import { ELEMENT_TYPES, PROP_META, type ElementInstance } from '@/lib/thumbnail-element-schema'
import type { ControlDef } from '@/lib/thumbnail-element-schema'
```

- [ ] **Step 2: Props 인터페이스 업데이트**

기존 `interface Props` 내 `onConfigChange: (patch: Partial<TemplateConfig>) => void` 는 그대로 유지. TemplateConfig가 이미 `elements[]`를 포함하므로 추가 변경 없음.

- [ ] **Step 3: 기존 ACCENT_COLORS 상수 제거**

`const ACCENT_COLORS = [...]` 줄 삭제.

- [ ] **Step 4: 컨트롤 렌더 헬퍼 추가**

`Section` 컴포넌트 아래에 추가:
```typescript
function PropControl({ prop, value, onChange }: {
  prop: string
  value: string | number | undefined
  onChange: (v: string | number) => void
}) {
  const meta = PROP_META[prop]
  if (!meta) return null

  const strVal = String(value ?? '')

  if (meta.type === 'color') return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1">{meta.label}</span>
      <input type="color"
        value={strVal.startsWith('#') ? strVal : '#ffffff'}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5"
      />
      <span className="text-[10px] text-gray-400 font-mono w-16 truncate">{strVal}</span>
    </div>
  )

  if (meta.type === 'select') return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 flex-1">{meta.label}</span>
      <select value={strVal}
        onChange={e => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded px-1.5 h-6 bg-white flex-shrink-0 max-w-[120px]">
        {meta.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  // range
  const numVal = parseFloat(strVal) || meta.min || 0
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{meta.label}</span>
        <span className="text-[10px] text-blue-500 font-mono">{strVal || numVal}{meta.unit}</span>
      </div>
      <input type="range" min={meta.min} max={meta.max} step={meta.step ?? 1}
        value={numVal}
        onChange={e => {
          const raw = parseFloat(e.target.value)
          onChange(meta.unit ? raw : raw)
        }}
        className="w-full h-1 accent-blue-500 cursor-pointer"
      />
    </div>
  )
}
```

- [ ] **Step 5: 기존 "스타일" Section 제거 + Elements Section 추가**

기존 `{/* 스타일 */}` 섹션 전체(폰트 select, 포인트 컬러 스와치, 패널색, 헤드1색, 헤드2색)를 삭제하고, 다음으로 교체:

```typescript
{/* 패널 배경색 */}
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

{/* 요소별 컨트롤 */}
{config.elements.map((el, idx) => {
  const schema = ELEMENT_TYPES[el.type]
  if (!schema) return null
  return (
    <Section key={el.cssTarget} label={el.label}>
      <div className="space-y-2">
        {schema.props.map(prop => (
          <PropControl
            key={prop}
            prop={prop}
            value={el.props[prop]}
            onChange={val => {
              const next = config.elements.map((e, i) =>
                i === idx ? { ...e, props: { ...e.props, [prop]: val } } : e
              )
              onConfigChange({ elements: next })
            }}
          />
        ))}
      </div>
    </Section>
  )
})}
```

- [ ] **Step 6: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "FlatEditor" | head -20
```
Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add app/admin/thumbnail/_components/FlatEditor.tsx
git commit -m "feat(thumbnail): FlatEditor — elements[] 기반 동적 컨트롤 UI"
```

---

## Task 8: builder/preview route — elements 파라미터 지원

**Files:**
- Modify: `app/api/thumbnail/builder/preview/route.ts`

- [ ] **Step 1: elements 파라미터 파싱 추가**

기존 `composeHtml` 호출 앞에 추가:
```typescript
// elements JSON 파라미터 파싱 (있는 경우)
const elementsParam = s.get('elements')
const elements = elementsParam ? JSON.parse(elementsParam) : undefined
```

`composeHtml` 호출에 `elements` 추가:
```typescript
const html = composeHtml(layoutToken, effectToken, {
  // ...기존 파라미터...
  elements,
  panelColor:  s.get('panelColor') ?? undefined,
  baseUrl,
})
```

- [ ] **Step 2: Commit**

```bash
git add app/api/thumbnail/builder/preview/route.ts
git commit -m "feat(thumbnail): preview route — elements JSON 파라미터 지원"
```

---

## Task 9: page.tsx — 신규 포맷 미리보기 URL 업데이트

**Files:**
- Modify: `app/admin/thumbnail/page.tsx`

- [ ] **Step 1: newConfig 미리보기 URL 빌드 로직 수정**

기존 `useEffect`의 `params` 빌드 부분을 찾아 (`// ── 신규 포맷 미리보기 URL ──` 주석 아래):

```typescript
// 기존 코드 (삭제 대상):
const params = new URLSearchParams({
  layoutToken: newConfig.layoutTokenId,
  effectToken: newConfig.effectTokenId,
  fontFamily:  newConfig.fontFamily,
  accentColor: newConfig.accentColor,
  panelColor:  newConfig.panelColor,
  ...(newConfig.textColor ? { textColor:  newConfig.textColor  } : {}),
  ...(newConfig.subColor  ? { subColor:   newConfig.subColor   } : {}),
  ...
})
```

다음으로 교체:
```typescript
const params = new URLSearchParams({
  layoutToken: newConfig.layoutTokenId,
  effectToken: newConfig.effectTokenId,
  panelColor:  newConfig.panelColor,
  elements:    JSON.stringify(newConfig.elements),
  headline:    texts.headline    ?? '',
  sub:         texts.subheadline ?? '',
  price:       texts.price       ?? '',
  brandKo:     texts.brandKo     ?? '',
  brandEn:     texts.brandEn     ?? '',
  ...(texts.headlineKo ? { headlineKo: texts.headlineKo } : {}),
})
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add app/admin/thumbnail/page.tsx
git commit -m "feat(thumbnail): page.tsx — 신규 포맷 미리보기 URL에 elements JSON 전달"
```

---

## 동작 확인

- [ ] **개발 서버 실행 후 에디터 접속**

```bash
npm run dev
# /admin/thumbnail 접속 → sample-asce-exosome 선택
```

확인 항목:
1. 에디터 좌측에 "헤드라인 (영문)", "헤드라인 (한글)", "서브카피", "가격" 섹션이 각각 보인다
2. "헤드라인 (영문)" 섹션에 폰트 크기/색상/폰트/최대너비/줄간격/자간/배경색/불투명도 컨트롤이 보인다
3. "가격" 섹션에 폰트 크기/색상/단위 크기/단위 색상/기울기/불투명도가 보인다
4. 값 변경 시 미리보기 iframe에 즉시 반영된다

---

## Self-Review

**Spec coverage:**
- ✅ 요소 타입별 base controls (text: fontSize/color/fontFamily/maxWidth/lineHeight/letterSpacing/bgColor/opacity)
- ✅ 특수 요소 전용 controls (price: unitSize/unitColor/skew, image: brightness)
- ✅ CSS var 자동 생성 (`--{cssTarget}-{prop}`)
- ✅ 레이아웃 CSS var 참조 + fallback (기존 동작 유지)
- ✅ 레거시 포맷 미변경 (vars/controls 그대로)
- ✅ sample-asce-exosome 마이그레이션
- ✅ 미리보기 route elements 지원

**미포함 (의도적 제외):**
- 에디터에서 요소 추가/삭제 버튼 (layout-tokens.json의 기본 elements 정의 필요 — 별도 태스크)
- 레거시 템플릿 일괄 마이그레이션 (별도 태스크)
- render route (WebP 다운로드) elements 지원 — `buildTemplateHtml`은 레거시 전용이므로 신규 포맷 렌더는 별도 route 필요
