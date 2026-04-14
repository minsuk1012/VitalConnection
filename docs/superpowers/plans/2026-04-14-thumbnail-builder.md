# Thumbnail Builder — Step-by-Step Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 썸네일 구성 요소를 레이아웃 토큰 + 효과 토큰으로 원자화하고, 5단계 Step-by-Step 빌더 UI + Gemini 연동으로 4개 언어 썸네일을 생성하는 시스템 구축

**Architecture:** 기존 32개 모놀리식 HTML 템플릿을 LayoutToken(텍스트 배치 CSS) + EffectToken(시각 처리 CSS)으로 해체한다. `composeHtml(layoutTokenId, effectTokenId, input)` 함수가 두 CSS를 base.html에 주입해 HTML을 생성하고, 기존 Puppeteer 렌더러가 그대로 webp로 변환한다. 빌더 UI는 5단계 자유 탐색 위저드이며 Gemini가 이미지 분석(레이아웃 추천)과 다국어 텍스트 생성을 담당한다.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, `@google/genai` (Gemini 2.5 Flash), Puppeteer Core

---

## Phase 0 — 템플릿 원자화

### Task 1: ComposeInput 타입 정의 + base.html 생성

**Files:**
- Create: `thumbnail/templates/base.html`
- Modify: `lib/thumbnail.ts` (TemplateInput 확장)

- [ ] **Step 1: TemplateInput에 스타일 필드 추가**

`lib/thumbnail.ts` 의 `TemplateInput` 인터페이스에 추가:

```typescript
export interface TemplateInput {
  headline?:      string
  subheadline?:   string
  brandEn?:       string
  brandKo?:       string
  tagline?:       string
  badge?:         string
  price?:         string
  priceUnit?:     string
  model?:         string
  cutout?:        string
  baseUrl?:       string
  // 신규 추가
  fontFamily?:    string   // e.g. 'BlackHan' — layout CSS에서 var(--headline-font)로 참조
  accentColor?:   string   // e.g. '#FF6B9D' — var(--accent-color)
  panelColor?:    string   // e.g. '#1A1A2E' — var(--panel-color), 패널/배경 색
  textColor?:     string   // e.g. '#ffffff' — var(--text-color)
  subColor?:      string   // e.g. 'rgba(255,255,255,0.8)' — var(--sub-color)
}
```

- [ ] **Step 2: base.html 생성**

`thumbnail/templates/base.html` 을 생성한다. 이 파일이 모든 토큰 조합의 캔버스 구조가 된다:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px;
    overflow: hidden;
    background: var(--panel-color, #1a1a2e);
    font-family: var(--headline-font, 'BlackHan'), sans-serif;
  }
  .canvas { width: 1080px; height: 1080px; position: relative; overflow: hidden; }

  /* Model layer — 기본: full-bleed cover */
  .model-layer { position: absolute; inset: 0; z-index: 1; }
  .model-layer img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }

  /* Effect layer (model 위, text 아래) */
  .effect-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; }

  /* Text layer */
  .text-layer { position: absolute; inset: 0; z-index: 3; }

  /* Text element 기본값 — layout CSS가 override */
  .brand-ko    { font-size: 22px; font-family: var(--headline-font,'Pretendard'); color: var(--sub-color,rgba(255,255,255,0.7)); }
  .headline    { font-size: 76px; font-weight: 900; font-family: var(--headline-font,'BlackHan'); color: var(--text-color,#fff); line-height: 1.05; word-break: keep-all; }
  .subheadline { font-size: 30px; color: var(--sub-color,rgba(255,255,255,0.85)); line-height: 1.4; word-break: keep-all; }
  .price-block { display: flex; align-items: baseline; gap: 6px; }
  .price       { font-size: 64px; font-weight: 900; font-family: var(--headline-font,'BlackHan'); color: var(--accent-color,#FF6B9D); }
  .price-unit  { font-size: 26px; color: var(--sub-color,rgba(255,255,255,0.8)); }
  .brand-en    { font-size: 16px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sub-color,rgba(255,255,255,0.55)); }
</style>

<!-- 폰트 선언 -->
<style>{{FONT_FACES}}</style>

<!-- 효과 토큰 CSS (색상 테마 기본값 설정) -->
<style>{{EFFECT_CSS}}</style>

<!-- 사용자 CSS 변수 (효과 토큰 기본값 override) -->
<style>:root { {{CSS_VARS}} }</style>

<!-- 레이아웃 토큰 CSS (텍스트 위치/계층 정의) -->
<style>{{LAYOUT_CSS}}</style>
</head>
<body>
<div class="canvas">
  <div class="model-layer">
    <img src="{{MODEL_PATH}}" alt="" onerror="this.style.display='none'">
  </div>
  <div class="effect-layer"></div>
  <div class="text-layer">
    <span class="brand-ko" style="display:{{BRAND_KO_DISPLAY}}">{{BRAND_KO}}</span>
    <h1 class="headline">{{HEADLINE}}</h1>
    <p class="subheadline" style="display:{{SUB_DISPLAY}}">{{SUBHEADLINE}}</p>
    <div class="price-block" style="display:{{PRICE_DISPLAY}}">
      <span class="price">{{PRICE}}</span>
      <span class="price-unit">{{PRICE_UNIT}}</span>
    </div>
    <div class="brand-block">
      <span class="brand-en">{{BRAND_EN}}</span>
    </div>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 3: 커밋**

```bash
git add thumbnail/templates/base.html lib/thumbnail.ts
git commit -m "feat(compose): base.html 캔버스 + TemplateInput 스타일 필드 추가"
```

---

### Task 2: 레이아웃 토큰 CSS 5종 작성

**Files:**
- Create: `thumbnail/templates/layouts/bottom-text-stack.css`
- Create: `thumbnail/templates/layouts/left-text-stack.css`
- Create: `thumbnail/templates/layouts/stacked-center-cutout.css`
- Create: `thumbnail/templates/layouts/bottom-banner.css`
- Create: `thumbnail/templates/layouts/top-left-editorial.css`

- [ ] **Step 1: `bottom-text-stack.css` — 하단 텍스트 세로 스택 (오버레이 계열)**

```css
/* bottom-text-stack.css
   사용 사례: full-overlay-dark, full-overlay-light
   모델이 캔버스 전체를 채우고 텍스트는 하단에 세로로 쌓인다 */
.text-layer {
  position: absolute;
  bottom: 60px;
  left: 64px;
  right: 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.headline    { font-size: 84px; }
.subheadline { font-size: 30px; }
.price-block { margin-top: 6px; }
.price       { font-size: 70px; }
.price-unit  { font-size: 28px; }
.brand-en    { font-size: 16px; margin-top: 6px; }
```

- [ ] **Step 2: `left-text-stack.css` — 좌측 반투명 패널 + 텍스트 (스플릿 계열)**

```css
/* left-text-stack.css
   사용 사례: left-split, split-right-light, split-right-dark
   좌측 460px에 패널 배경 + 텍스트, 모델이 우측에 노출 */
.text-layer {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 52px;
  gap: 14px;
  background: var(--panel-color, rgba(26,26,46,0.94));
}
.headline    { font-size: 60px; }
.subheadline { font-size: 26px; }
.price-block { margin-top: 8px; }
.price       { font-size: 58px; }
.price-unit  { font-size: 24px; }
.brand-en    { font-size: 14px; margin-top: 10px; }
```

- [ ] **Step 3: `stacked-center-cutout.css` — 누끼 모델 우측 + 좌측 텍스트**

```css
/* stacked-center-cutout.css
   사용 사례: solid-bg-cutout, solid-bg-stacked
   단색/그라디언트 배경 위에 누끼 모델이 우측에, 텍스트는 좌측에 세로 정렬 */

/* 모델을 우측 55%로 제한 */
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
.headline    { font-size: 68px; }
.subheadline { font-size: 24px; }
.price-block { margin-top: 12px; }
.price       { font-size: 62px; }
.price-unit  { font-size: 24px; }
.brand-en    { font-size: 14px; margin-top: 10px; }
```

- [ ] **Step 4: `bottom-banner.css` — 하단 색상 배너**

```css
/* bottom-banner.css
   사용 사례: bottom-banner, bottom-banner-circle
   모델 상단, 하단 280px 배너 영역에 시술명/가격 */
.text-layer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 28px 60px;
  gap: 6px;
  background: var(--panel-color, #FF6B9D);
}
.headline    { font-size: 70px; color: var(--text-color, #ffffff); }
.subheadline { font-size: 26px; }
.price-block { margin-top: 4px; }
.price       { font-size: 58px; }
.price-unit  { font-size: 22px; }
.brand-en    { font-size: 13px; margin-top: 6px; }
```

- [ ] **Step 5: `top-left-editorial.css` — 좌상단 에디토리얼**

```css
/* top-left-editorial.css
   사용 사례: minimal-editorial, overlay-line-bottom 변형
   좌상단에 액센트 라인과 함께 초대형 헤드라인 */
.text-layer {
  position: absolute;
  top: 64px;
  left: 60px;
  right: 60px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 세로 액센트 라인 */
.text-layer::before {
  content: '';
  display: block;
  width: 5px;
  height: 52px;
  background: var(--accent-color, #FF6B9D);
  margin-bottom: 6px;
  border-radius: 2px;
}
.brand-ko    { font-size: 20px; }
.headline    { font-size: 90px; line-height: 1.0; }
.subheadline { font-size: 28px; margin-top: 4px; }
.price-block { margin-top: 14px; }
.price       { font-size: 58px; }
.price-unit  { font-size: 22px; }
.brand-en    { font-size: 14px; margin-top: 12px; }
```

- [ ] **Step 6: 커밋**

```bash
git add thumbnail/templates/layouts/
git commit -m "feat(compose): 레이아웃 토큰 CSS 5종 추가 (bottom-text-stack, left-text-stack, stacked-center-cutout, bottom-banner, top-left-editorial)"
```

---

### Task 3: 효과 토큰 CSS 5종 작성

**Files:**
- Create: `thumbnail/templates/effects/overlay-dark.css`
- Create: `thumbnail/templates/effects/overlay-gradient.css`
- Create: `thumbnail/templates/effects/split-light.css`
- Create: `thumbnail/templates/effects/split-dark.css`
- Create: `thumbnail/templates/effects/solid-bg.css`

- [ ] **Step 1: `overlay-dark.css` — 어두운 그라디언트 오버레이**

```css
/* overlay-dark.css
   하단에서 상단으로 어두워지는 그라디언트. bottom-text-stack 레이아웃과 주로 조합 */
:root {
  --text-color:   #ffffff;
  --sub-color:    rgba(255, 255, 255, 0.82);
  --panel-color:  rgba(0, 0, 0, 0.0); /* 패널 없음 — 오버레이로만 처리 */
}
.effect-layer {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.90) 0%,
    rgba(0, 0, 0, 0.44) 48%,
    rgba(0, 0, 0, 0.0)  100%
  );
}
```

- [ ] **Step 2: `overlay-gradient.css` — 컬러 그라디언트 오버레이**

```css
/* overlay-gradient.css
   단색 그라디언트 오버레이. 모델 이미지 위에 색감을 입혀 브랜드 컬러 강조 */
:root {
  --text-color:  #ffffff;
  --sub-color:   rgba(255, 255, 255, 0.85);
}
.effect-layer {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-color, #FF6B9D) 80%, transparent) 0%,
    color-mix(in srgb, var(--panel-color, #7B2FBE) 72%, transparent)  100%
  );
}
```

- [ ] **Step 3: `split-light.css` — 밝은 패널 분할**

```css
/* split-light.css
   left-text-stack 레이아웃과 함께 사용. 좌측 패널을 밝은 색으로 설정 */
:root {
  --panel-color: rgba(248, 246, 242, 0.97);
  --text-color:  #1a1a2e;
  --sub-color:   rgba(26, 26, 46, 0.68);
}
/* 패널과 모델 사이 미세 경계선 */
.effect-layer::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 457px;
  width: 6px;
  background: linear-gradient(to right, rgba(0,0,0,0.08), transparent);
}
```

- [ ] **Step 4: `split-dark.css` — 어두운 패널 분할**

```css
/* split-dark.css
   left-text-stack 레이아웃과 함께 사용. 좌측 패널을 어두운 색으로 설정 */
:root {
  --panel-color: rgba(26, 26, 46, 0.97);
  --text-color:  #ffffff;
  --sub-color:   rgba(255, 255, 255, 0.70);
}
.effect-layer::after {
  content: '';
  position: absolute;
  top: 5%;
  bottom: 5%;
  left: 458px;
  width: 4px;
  background: var(--accent-color, #FF6B9D);
  opacity: 0.75;
  border-radius: 2px;
}
```

- [ ] **Step 5: `solid-bg.css` — 단색 배경 (누끼 전용)**

```css
/* solid-bg.css
   stacked-center-cutout 레이아웃과 함께 사용.
   body 배경을 단색(--panel-color)으로 설정. 누끼 모델이 이 위에 합성됨 */
:root {
  --text-color: #1a1a2e;
  --sub-color:  rgba(26, 26, 46, 0.70);
}
body {
  background: var(--panel-color, #FFBDCD);
}
/* 모델 레이어를 투명하게 (배경이 body color) */
.model-layer {
  background: transparent;
}
```

- [ ] **Step 6: 커밋**

```bash
git add thumbnail/templates/effects/
git commit -m "feat(compose): 효과 토큰 CSS 5종 추가 (overlay-dark, overlay-gradient, split-light, split-dark, solid-bg)"
```

---

### Task 4: 토큰 레지스트리 JSON 파일 작성

**Files:**
- Create: `thumbnail/layout-tokens.json`
- Create: `thumbnail/effect-tokens.json`

- [ ] **Step 1: `layout-tokens.json` 생성**

```json
[
  {
    "id": "bottom-text-stack",
    "name": "하단 텍스트 스택",
    "description": "모델 전체화면 + 하단 텍스트 세로 스택. 오버레이 효과와 조합 권장.",
    "cssFile": "layouts/bottom-text-stack.css",
    "compatibleEffects": ["overlay-dark", "overlay-gradient"]
  },
  {
    "id": "left-text-stack",
    "name": "좌측 패널 텍스트",
    "description": "좌측 460px 패널에 텍스트, 모델 우측 노출. 스플릿 효과와 조합 권장.",
    "cssFile": "layouts/left-text-stack.css",
    "compatibleEffects": ["split-light", "split-dark", "overlay-dark"]
  },
  {
    "id": "stacked-center-cutout",
    "name": "누끼 + 좌측 텍스트",
    "description": "누끼 이미지 전용. 우측 55%에 누끼 모델, 좌측에 텍스트 세로 정렬.",
    "cssFile": "layouts/stacked-center-cutout.css",
    "compatibleEffects": ["solid-bg"],
    "requiresCutout": true
  },
  {
    "id": "bottom-banner",
    "name": "하단 배너",
    "description": "모델 상단 차지, 하단 280px 색상 배너에 시술명/가격.",
    "cssFile": "layouts/bottom-banner.css",
    "compatibleEffects": ["solid-bg", "overlay-dark"]
  },
  {
    "id": "top-left-editorial",
    "name": "좌상단 에디토리얼",
    "description": "좌상단에 액센트 라인 + 초대형 헤드라인. 오버레이 효과와 조합.",
    "cssFile": "layouts/top-left-editorial.css",
    "compatibleEffects": ["overlay-dark", "overlay-gradient"]
  }
]
```

- [ ] **Step 2: `effect-tokens.json` 생성**

```json
[
  {
    "id": "overlay-dark",
    "category": "overlay",
    "name": "다크 오버레이",
    "description": "하단에서 위로 어두워지는 그라디언트. 전체이미지 + 텍스트 가독성 극대화.",
    "cssFile": "effects/overlay-dark.css"
  },
  {
    "id": "overlay-gradient",
    "category": "overlay",
    "name": "컬러 그라디언트 오버레이",
    "description": "브랜드 컬러 135도 그라디언트 오버레이. accent-color + panel-color로 색상 지정.",
    "cssFile": "effects/overlay-gradient.css"
  },
  {
    "id": "split-light",
    "category": "split",
    "name": "라이트 스플릿",
    "description": "좌측 패널 밝은 크림색. left-text-stack 레이아웃 전용.",
    "cssFile": "effects/split-light.css"
  },
  {
    "id": "split-dark",
    "category": "split",
    "name": "다크 스플릿",
    "description": "좌측 패널 어두운 네이비. left-text-stack 레이아웃 전용.",
    "cssFile": "effects/split-dark.css"
  },
  {
    "id": "solid-bg",
    "category": "solid",
    "name": "단색 배경",
    "description": "body 배경을 panel-color 단색으로 설정. 누끼 이미지 합성 전용.",
    "cssFile": "effects/solid-bg.css"
  }
]
```

- [ ] **Step 3: 커밋**

```bash
git add thumbnail/layout-tokens.json thumbnail/effect-tokens.json
git commit -m "feat(compose): 레이아웃/효과 토큰 레지스트리 JSON 추가"
```

---

### Task 5: composeHtml() 함수 구현

**Files:**
- Create: `lib/thumbnail-compose.ts`

- [ ] **Step 1: `lib/thumbnail-compose.ts` 작성**

```typescript
/**
 * 토큰 기반 썸네일 합성 함수
 * composeHtml(layoutTokenId, effectTokenId, input) → HTML 문자열
 * 기존 buildTemplateHtml()과 독립적으로 공존한다.
 */
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE, type TemplateInput } from './thumbnail.js'

export const COMPOSE_PATHS = {
  base:         path.join(THUMBNAIL_BASE, 'templates/base.html'),
  layouts:      path.join(THUMBNAIL_BASE, 'templates/layouts'),
  effects:      path.join(THUMBNAIL_BASE, 'templates/effects'),
  layoutTokens: path.join(THUMBNAIL_BASE, 'layout-tokens.json'),
  effectTokens: path.join(THUMBNAIL_BASE, 'effect-tokens.json'),
}

export interface LayoutToken {
  id:                 string
  name:               string
  description:        string
  cssFile:            string
  compatibleEffects:  string[]
  requiresCutout?:    boolean
}

export interface EffectToken {
  id:          string
  category:    'overlay' | 'split' | 'frame' | 'gradient' | 'solid'
  name:        string
  description: string
  cssFile:     string
}

export function getLayoutTokens(): LayoutToken[] {
  return JSON.parse(fs.readFileSync(COMPOSE_PATHS.layoutTokens, 'utf-8'))
}

export function getEffectTokens(): EffectToken[] {
  return JSON.parse(fs.readFileSync(COMPOSE_PATHS.effectTokens, 'utf-8'))
}

export function composeHtml(
  layoutTokenId: string,
  effectTokenId: string,
  input: TemplateInput,
): string {
  if (!fs.existsSync(COMPOSE_PATHS.base)) {
    throw new Error('base.html 없음: thumbnail/templates/base.html')
  }

  const layoutCssPath = path.join(COMPOSE_PATHS.layouts, `${layoutTokenId}.css`)
  const effectCssPath = path.join(COMPOSE_PATHS.effects, `${effectTokenId}.css`)

  if (!fs.existsSync(layoutCssPath)) throw new Error(`레이아웃 토큰 없음: ${layoutTokenId}`)
  if (!fs.existsSync(effectCssPath)) throw new Error(`효과 토큰 없음: ${effectTokenId}`)

  const base      = fs.readFileSync(COMPOSE_PATHS.base, 'utf-8')
  const layoutCss = fs.readFileSync(layoutCssPath, 'utf-8')
  const effectCss = fs.readFileSync(effectCssPath, 'utf-8')

  const baseUrl    = input.baseUrl ?? 'http://localhost:3000'
  const modelFile  = input.cutout ?? input.model
  const assetDir   = input.cutout ? 'models-cutout' : 'models'
  const modelUrl   = modelFile
    ? `${baseUrl}/api/thumbnail/asset/${assetDir}/${modelFile.split('/').map(encodeURIComponent).join('/')}`
    : ''
  const fontsUrl   = `${baseUrl}/api/thumbnail/asset/fonts`
  const hasPrice   = !!(input.price?.trim())

  const cssVars = buildCssVars(input, fontsUrl)
  const fontFaces = buildComposeFontFaces(fontsUrl)

  return base
    .replace('{{LAYOUT_CSS}}',         layoutCss)
    .replace('{{EFFECT_CSS}}',          effectCss)
    .replace('{{FONT_FACES}}',          fontFaces)
    .replace(':root { {{CSS_VARS}} }',  `:root { ${cssVars} }`)
    .replace(/\{\{MODEL_PATH\}\}/g,     modelUrl)
    .replace(/\{\{HEADLINE\}\}/g,       esc(input.headline    ?? '시술명'))
    .replace(/\{\{SUBHEADLINE\}\}/g,    esc(input.subheadline ?? ''))
    .replace(/\{\{BRAND_EN\}\}/g,       esc(input.brandEn     ?? 'CLINIC'))
    .replace(/\{\{BRAND_KO\}\}/g,       esc(input.brandKo     ?? ''))
    .replace(/\{\{PRICE\}\}/g,          esc(input.price       ?? ''))
    .replace(/\{\{PRICE_UNIT\}\}/g,     esc(input.priceUnit   ?? '만원'))
    .replace(/\{\{BRAND_KO_DISPLAY\}\}/g, input.brandKo    ? 'block' : 'none')
    .replace(/\{\{SUB_DISPLAY\}\}/g,    input.subheadline  ? 'block' : 'none')
    .replace(/\{\{PRICE_DISPLAY\}\}/g,  hasPrice           ? 'flex'  : 'none')
}

function buildCssVars(input: TemplateInput, _fontsUrl: string): string {
  const vars: string[] = []
  if (input.fontFamily)  vars.push(`--headline-font: '${input.fontFamily}'`)
  if (input.accentColor) vars.push(`--accent-color: ${input.accentColor}`)
  if (input.panelColor)  vars.push(`--panel-color: ${input.panelColor}`)
  if (input.textColor)   vars.push(`--text-color: ${input.textColor}`)
  if (input.subColor)    vars.push(`--sub-color: ${input.subColor}`)
  return vars.join('; ')
}

// 기존 thumbnail.ts의 buildFontFaces와 동일하나 독립 유지
function buildComposeFontFaces(fontsUrl: string): string {
  return `
    @font-face { font-family:'Bebas';       src:url('${fontsUrl}/BebasNeue-Regular.ttf');      font-weight:400; }
    @font-face { font-family:'Noto';        src:url('${fontsUrl}/NotoSansKR.ttf');              font-weight:100 900; }
    @font-face { font-family:'NotoSerif';   src:url('${fontsUrl}/NotoSerif-Regular.ttf');       font-weight:400 700; }
    @font-face { font-family:'BlackHan';    src:url('${fontsUrl}/BlackHanSans-Regular.ttf');    font-weight:400; }
    @font-face { font-family:'Playfair';    src:url('${fontsUrl}/PlayfairDisplay.ttf');         font-weight:100 900; }
    @font-face { font-family:'PlayfairI';   src:url('${fontsUrl}/PlayfairDisplay-Italic.ttf');  font-weight:100 900; font-style:italic; }
    @font-face { font-family:'Montserrat';  src:url('${fontsUrl}/Montserrat.ttf');              font-weight:100 900; }
    @font-face { font-family:'Pretendard';  src:url('${fontsUrl}/Pretendard-Bold.woff2');       font-weight:700; }
  `
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 2: 수동 동작 검증**

Next.js 개발 서버(`npm run dev`, 포트 2999)를 실행한 상태에서 Node REPL로 확인:

```bash
node -e "
const {composeHtml} = require('./lib/thumbnail-compose.js');
const html = composeHtml('bottom-text-stack', 'overlay-dark', {
  headline: '보톡스 시술', price: '3.9', baseUrl: 'http://localhost:2999'
});
console.log(html.includes('bottom-text-stack.css') ? 'LAYOUT CSS 없음(파일 인라인됨)' : 'OK');
console.log(html.includes('보톡스 시술') ? 'OK: headline 치환됨' : 'FAIL');
console.log(html.includes('overlay-dark') ? 'LAYOUT CSS 없음(파일 인라인됨)' : 'OK');
console.log(html.includes('linear-gradient') ? 'OK: effect CSS 포함됨' : 'FAIL');
"
```

Expected 출력: `OK: headline 치환됨`, `OK: effect CSS 포함됨` 2줄 확인

- [ ] **Step 3: 커밋**

```bash
git add lib/thumbnail-compose.ts
git commit -m "feat(compose): composeHtml() 토큰 합성 함수 구현"
```

---

### Task 6: 토큰 API 라우트 + 빌더 render 라우트

**Files:**
- Create: `app/api/thumbnail/builder/tokens/route.ts`
- Create: `app/api/thumbnail/builder/render/route.ts`

- [ ] **Step 1: `tokens/route.ts` 작성**

```typescript
// app/api/thumbnail/builder/tokens/route.ts
import { NextResponse } from 'next/server'
import { getLayoutTokens, getEffectTokens } from '@/lib/thumbnail-compose'
import { checkAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  return NextResponse.json({
    layouts: getLayoutTokens(),
    effects: getEffectTokens(),
  })
}
```

- [ ] **Step 2: `render/route.ts` 작성**

```typescript
// app/api/thumbnail/builder/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { composeHtml } from '@/lib/thumbnail-compose'
import puppeteer from 'puppeteer-core'
import os from 'os'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const {
    layoutTokenId,
    effectTokenId,
    headline, subheadline, brandEn, brandKo, price, priceUnit,
    model, cutout,
    fontFamily, accentColor, panelColor,
  } = await req.json()

  if (!layoutTokenId || !effectTokenId) {
    return NextResponse.json({ error: 'layoutTokenId, effectTokenId 필수' }, { status: 400 })
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`

  try {
    const html = composeHtml(layoutTokenId, effectTokenId, {
      headline, subheadline, brandEn, brandKo, price, priceUnit,
      model, cutout, baseUrl, fontFamily, accentColor, panelColor,
    })

    const tmpFile = path.join(os.tmpdir(), `builder-${Date.now()}.html`)
    fs.writeFileSync(tmpFile, html, 'utf-8')

    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle0' })

    const screenshot = await page.screenshot({ type: 'webp', quality: 88 })
    await page.close()
    await browser.close()
    fs.unlinkSync(tmpFile)

    return new NextResponse(screenshot, {
      headers: { 'Content-Type': 'image/webp' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 3: API 동작 확인**

```bash
curl -s http://localhost:2999/api/thumbnail/builder/tokens | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('layouts:', d.layouts.length, d.layouts.map(l=>l.id));
console.log('effects:', d.effects.length, d.effects.map(e=>e.id));
"
```

Expected: `layouts: 5 ['bottom-text-stack', ...]`, `effects: 5 ['overlay-dark', ...]`

- [ ] **Step 4: 커밋**

```bash
git add app/api/thumbnail/builder/
git commit -m "feat(api): 빌더 tokens GET + render POST 라우트 추가"
```

---

## Phase 1 — Builder UI

### Task 7: BuilderState 타입 + 공통 컴포넌트

**Files:**
- Create: `app/admin/thumbnail/builder/_types.ts`
- Create: `app/admin/thumbnail/builder/_components/StepSidebar.tsx`
- Create: `app/admin/thumbnail/builder/_components/PreviewPane.tsx`

- [ ] **Step 1: `_types.ts` 작성**

```typescript
// app/admin/thumbnail/builder/_types.ts
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

export interface TextContent {
  headline:    string
  subheadline: string
  price:       string
  brandEn:     string
  brandKo:     string
}

export interface LayoutSuggestion {
  layoutTokenId: string
  confidence:    number   // 0-100
  reason:        string   // 한국어 1문장
  fontFamily:    string
}

export interface BuilderState {
  // Step 1
  imageType:     'full' | 'cutout' | null
  archetype:     string | null
  variantIdx:    number | null

  // Step 2
  suggestions:   LayoutSuggestion[]
  layoutTokenId: string | null

  // Step 3
  effectTokenId: string | null

  // Step 4
  texts:         Record<Lang, TextContent>
  fontFamily:    string
  accentColor:   string
  panelColor:    string

  // 메타
  rendered:      boolean
}

export const DEFAULT_TEXT: TextContent = {
  headline: '', subheadline: '', price: '', brandEn: '', brandKo: '',
}

export const INITIAL_STATE: BuilderState = {
  imageType: null, archetype: null, variantIdx: null,
  suggestions: [], layoutTokenId: null,
  effectTokenId: null,
  texts: { ko: { ...DEFAULT_TEXT }, en: { ...DEFAULT_TEXT }, ja: { ...DEFAULT_TEXT }, zh: { ...DEFAULT_TEXT } },
  fontFamily: 'BlackHan', accentColor: '#FF6B9D', panelColor: '#1A1A2E',
  rendered: false,
}

export const STEPS = [
  { id: 'image',   label: '이미지 선택',     icon: '🖼' },
  { id: 'layout',  label: '텍스트 레이아웃',  icon: '✦' },
  { id: 'effect',  label: '효과',            icon: '🎨' },
  { id: 'text',    label: '텍스트 편집',      icon: '✏️' },
  { id: 'export',  label: '내보내기',         icon: '⬇' },
] as const

export type StepId = typeof STEPS[number]['id']

export const LANG_LABELS: Record<Lang, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  ja: { flag: '🇯🇵', label: 'JA' },
  zh: { flag: '🇨🇳', label: 'ZH' },
}

export type { LayoutToken, EffectToken }
```

- [ ] **Step 2: `StepSidebar.tsx` 작성**

```tsx
// app/admin/thumbnail/builder/_components/StepSidebar.tsx
'use client'
import { cn } from '@/lib/utils'
import { STEPS, type StepId, type BuilderState } from '../_types'

interface Props {
  activeStep: StepId
  onStepClick: (id: StepId) => void
  state: BuilderState
}

function isStepAccessible(stepId: StepId, state: BuilderState): boolean {
  switch (stepId) {
    case 'image':  return true
    case 'layout': return !!(state.imageType && state.archetype && state.variantIdx !== null)
    case 'effect': return !!state.layoutTokenId
    case 'text':   return !!state.effectTokenId
    case 'export': return Object.values(state.texts.ko).some(v => v.trim())
    default:       return false
  }
}

export function StepSidebar({ activeStep, onStepClick, state }: Props) {
  return (
    <div className="w-52 shrink-0 border-r border-gray-100 bg-white flex flex-col py-4 gap-0.5">
      <div className="px-4 pb-3 mb-1 border-b border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Thumbnail Builder
        </span>
      </div>
      {STEPS.map((s, i) => {
        const accessible = isStepAccessible(s.id, state)
        const active = s.id === activeStep
        return (
          <button
            key={s.id}
            onClick={() => accessible && onStepClick(s.id)}
            disabled={!accessible}
            className={cn(
              'mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-left transition-colors',
              active     && 'bg-gray-900 text-white',
              !active && accessible  && 'text-gray-500 hover:bg-gray-50',
              !accessible && 'text-gray-300 cursor-not-allowed',
            )}
          >
            <span className="text-base">{s.icon}</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium">{s.label}</span>
              <span className={cn('text-[9px]', active ? 'text-gray-300' : 'opacity-40')}>
                Step {i + 1}
              </span>
            </div>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: `PreviewPane.tsx` 작성**

```tsx
// app/admin/thumbnail/builder/_components/PreviewPane.tsx
'use client'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { BuilderState } from '../_types'

interface Props {
  state: BuilderState
}

function buildPreviewUrl(state: BuilderState): string | null {
  if (!state.layoutTokenId || !state.effectTokenId) return null

  const ko = state.texts.ko
  const params = new URLSearchParams({
    layoutToken:  state.layoutTokenId,
    effectToken:  state.effectTokenId,
    headline:     ko.headline    || '시술명',
    sub:          ko.subheadline || '',
    brandEn:      ko.brandEn     || 'CLINIC',
    brandKo:      ko.brandKo     || '',
    price:        ko.price       || '',
    fontFamily:   state.fontFamily,
    accentColor:  state.accentColor,
    panelColor:   state.panelColor,
    ...(state.imageType === 'cutout' && state.archetype && state.variantIdx !== null
      ? { cutout: `${state.archetype}/${state.archetype}-${state.variantIdx}.png` }
      : state.archetype && state.variantIdx !== null
      ? { model:  `${state.archetype}/${state.archetype}-${state.variantIdx}.png` }
      : {}),
  })
  return `/api/thumbnail/builder/preview?${params}`
}

export function PreviewPane({ state }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const url = buildPreviewUrl(state)
    if (url) setSrc(url)
  }, [
    state.layoutTokenId, state.effectTokenId, state.texts.ko,
    state.fontFamily, state.accentColor, state.panelColor,
    state.archetype, state.variantIdx, state.imageType,
  ])

  return (
    <div className="w-72 shrink-0 bg-gray-50 border-l border-gray-100 flex flex-col">
      <div className="p-3 border-b border-gray-100 bg-white">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Preview
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {src ? (
          <iframe
            src={src}
            className="w-full aspect-square rounded-xl shadow-lg border border-gray-200 bg-white"
            style={{ transform: 'scale(0.95)', transformOrigin: 'center' }}
          />
        ) : (
          <Skeleton className="w-full aspect-square rounded-xl" />
        )}
      </div>
      <div className="p-3 text-center">
        <span className="text-[10px] text-gray-400">1080 × 1080</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/admin/thumbnail/builder/
git commit -m "feat(builder): BuilderState 타입 + StepSidebar + PreviewPane 컴포넌트"
```

---

### Task 8: Step1ImageSelect 컴포넌트

**Files:**
- Create: `app/admin/thumbnail/builder/_components/Step1ImageSelect.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// app/admin/thumbnail/builder/_components/Step1ImageSelect.tsx
'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { BuilderState } from '../_types'

const IMAGE_TYPES = [
  { id: 'full',   label: '전체 이미지', desc: '배경 포함 AI 생성 이미지', icon: '📷' },
  { id: 'cutout', label: '누끼 이미지', desc: '배경 제거 + 색상 배경 합성', icon: '✂️' },
] as const

interface Archetype {
  id: string
  label: string
  procedures: string[]
  cutout?: boolean
  variants: { id: string; bgColor: string }[]
}

interface Props {
  state: BuilderState
  onChange: (patch: Partial<BuilderState>) => void
  onNext: () => void
}

export function Step1ImageSelect({ state, onChange, onNext }: Props) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [models, setModels] = useState<string[]>([])
  const [cutouts, setCutouts] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/thumbnail/asset/docs/archetypes.json')
      .then(r => r.json())
      .then(setArchetypes)
      .catch(() => {})
    fetch('/api/thumbnail/models?type=models').then(r => r.json()).then(d => setModels(d.files ?? []))
    fetch('/api/thumbnail/models?type=cutout').then(r => r.json()).then(d => setCutouts(d.files ?? []))
  }, [])

  const filtered = archetypes.filter(a =>
    state.imageType === 'cutout' ? a.cutout : !a.cutout
  )

  const canNext = !!(state.imageType && state.archetype && state.variantIdx !== null)

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-6">

        {/* 이미지 타입 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">이미지 타입</h3>
          <div className="grid grid-cols-2 gap-3">
            {IMAGE_TYPES.map(t => (
              <button key={t.id}
                onClick={() => onChange({ imageType: t.id as 'full' | 'cutout', archetype: null, variantIdx: null })}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  state.imageType === t.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="text-sm font-semibold">{t.label}</div>
                <div className={cn('text-xs mt-0.5', state.imageType === t.id ? 'text-gray-300' : 'text-gray-400')}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 아키타입 */}
        {state.imageType && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">시술 카테고리</h3>
            <p className="text-xs text-gray-400 mb-3">시술과 어울리는 AI 이미지 아키타입</p>
            <div className="grid grid-cols-3 gap-2">
              {filtered.map(a => (
                <button key={a.id}
                  onClick={() => onChange({ archetype: a.id, variantIdx: null })}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    state.archetype === a.id ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-200 hover:border-gray-300',
                  )}>
                  <div className="w-full h-10 rounded-lg mb-2 bg-gray-100 flex items-center justify-center text-lg" />
                  <div className="text-[11px] font-semibold text-gray-800 truncate">{a.label}</div>
                  <div className="text-[9px] text-gray-400 truncate">{a.procedures.slice(0, 3).join(', ')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 변형 선택 */}
        {state.archetype && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">변형 선택</h3>
            <div className="grid grid-cols-3 gap-2">
              {(archetypes.find(a => a.id === state.archetype)?.variants ?? []).map((v, i) => {
                const file = state.imageType === 'cutout'
                  ? cutouts.find(f => f.includes(v.id))
                  : models.find(f => f.includes(v.id))
                const previewUrl = file
                  ? `/api/thumbnail/asset/${state.imageType === 'cutout' ? 'models-cutout' : 'models'}/${encodeURIComponent(file)}`
                  : null
                return (
                  <button key={v.id}
                    onClick={() => onChange({ variantIdx: i })}
                    className={cn(
                      'relative rounded-xl overflow-hidden border-2 transition-all aspect-square',
                      state.variantIdx === i ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-200 hover:border-gray-300',
                    )}>
                    {previewUrl
                      ? <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center text-2xl">🖼</div>}
                    {state.variantIdx === i && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-4 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors">
          다음: 레이아웃 추천 →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/admin/thumbnail/builder/_components/Step1ImageSelect.tsx
git commit -m "feat(builder): Step1ImageSelect 컴포넌트 — 이미지 타입/아키타입/변형 선택"
```

---

### Task 9: Step2LayoutSuggest + Step3EffectSelect

**Files:**
- Create: `app/admin/thumbnail/builder/_components/Step2LayoutSuggest.tsx`
- Create: `app/admin/thumbnail/builder/_components/Step3EffectSelect.tsx`

- [ ] **Step 1: `Step2LayoutSuggest.tsx` 작성 (Gemini 연동 전 UI 골격)**

```tsx
// app/admin/thumbnail/builder/_components/Step2LayoutSuggest.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BuilderState, LayoutToken } from '../_types'

interface Props {
  state:      BuilderState
  layouts:    LayoutToken[]
  onChange:   (patch: Partial<BuilderState>) => void
  onAnalyze:  () => Promise<void>   // Gemini 분석 트리거 (Phase 2에서 구현)
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

        {/* Gemini 추천 결과 */}
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
          // 추천 없음 — 수동 선택
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">레이아웃을 직접 선택하세요</p>
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
```

- [ ] **Step 2: `Step3EffectSelect.tsx` 작성**

```tsx
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
  // 현재 레이아웃 토큰의 compatibleEffects 필터링
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
```

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/builder/_components/Step2LayoutSuggest.tsx app/admin/thumbnail/builder/_components/Step3EffectSelect.tsx
git commit -m "feat(builder): Step2LayoutSuggest + Step3EffectSelect 컴포넌트"
```

---

### Task 10: Step4TextEdit + Step5Export

**Files:**
- Create: `app/admin/thumbnail/builder/_components/Step4TextEdit.tsx`
- Create: `app/admin/thumbnail/builder/_components/Step5Export.tsx`

- [ ] **Step 1: `Step4TextEdit.tsx` 작성**

```tsx
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
  onGenerateText: (lang: Lang) => Promise<void>  // Phase 2에서 구현
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
            disabled={generating || !state.texts.ko.headline}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {generating ? '생성 중...' : '✦ 생성'}
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
```

- [ ] **Step 2: `Step5Export.tsx` 작성**

```tsx
// app/admin/thumbnail/builder/_components/Step5Export.tsx
'use client'
import { useState } from 'react'
import type { BuilderState, LayoutToken, EffectToken } from '../_types'
import { LANG_LABELS } from '../_types'

interface Props {
  state:      BuilderState
  layouts:    LayoutToken[]
  effects:    EffectToken[]
  onRender:   () => Promise<void>
  onPrev:     () => void
}

export function Step5Export({ state, layouts, effects, onRender, onPrev }: Props) {
  const [rendering, setRendering] = useState(false)

  async function handleRender() {
    setRendering(true)
    try { await onRender() } finally { setRendering(false) }
  }

  const layoutName = layouts.find(l => l.id === state.layoutTokenId)?.name ?? state.layoutTokenId
  const effectName = effects.find(e => e.id === state.effectTokenId)?.name ?? state.effectTokenId
  const langs = Object.entries(LANG_LABELS) as [string, { flag: string; label: string }][]

  const summary = [
    { label: '이미지',   value: `${state.archetype} — Variant ${(state.variantIdx ?? 0) + 1} (${state.imageType})` },
    { label: '레이아웃', value: layoutName ?? '-' },
    { label: '효과',     value: effectName ?? '-' },
    { label: '언어',     value: 'KO / EN / JA / ZH' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-5">

        {/* 설정 요약 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">설정 요약</h3>
          {summary.map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-gray-400 w-16">{r.label}</span>
              <span className="text-xs text-gray-700">{r.value}</span>
            </div>
          ))}
        </div>

        {/* 언어별 미리보기 그리드 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">언어별 출력</h3>
          <div className="grid grid-cols-4 gap-2">
            {langs.map(([lang, info]) => (
              <div key={lang} className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
                <div className="absolute bottom-2 left-2 text-white">
                  <div className="text-[8px] opacity-60">{info.flag} {info.label}</div>
                  <div className="text-[10px] font-black leading-tight truncate">
                    {state.texts[lang as keyof typeof state.texts]?.headline || '—'}
                  </div>
                </div>
                {state.rendered && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 렌더링 버튼 */}
        {!state.rendered ? (
          <button
            onClick={handleRender}
            disabled={rendering}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
            {rendering
              ? <><span className="animate-spin">⟳</span> 렌더링 중 (4개 언어)...</>
              : '⬇ 4개 언어 전체 렌더링'}
          </button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-sm font-semibold text-green-800">렌더링 완료</div>
            <div className="text-xs text-green-600 mt-0.5">thumbnail/output/renders/ 에 저장됨</div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-4">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← 텍스트 수정
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/builder/_components/Step4TextEdit.tsx app/admin/thumbnail/builder/_components/Step5Export.tsx
git commit -m "feat(builder): Step4TextEdit + Step5Export 컴포넌트"
```

---

### Task 11: builder/page.tsx + 빌더 preview 라우트 + 기존 에디터 진입점

**Files:**
- Create: `app/admin/thumbnail/builder/page.tsx`
- Create: `app/api/thumbnail/builder/preview/route.ts`
- Modify: `app/admin/thumbnail/page.tsx` (진입 버튼 추가)

- [ ] **Step 1: `builder/preview/route.ts` 작성 (PreviewPane용 iframe HTML 반환)**

```typescript
// app/api/thumbnail/builder/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { composeHtml } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const s = req.nextUrl.searchParams
  const layoutToken = s.get('layoutToken')
  const effectToken = s.get('effectToken')
  if (!layoutToken || !effectToken) {
    return new NextResponse('layoutToken, effectToken 필수', { status: 400 })
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`

  try {
    const html = composeHtml(layoutToken, effectToken, {
      headline:    s.get('headline')    ?? undefined,
      subheadline: s.get('sub')         ?? undefined,
      brandEn:     s.get('brandEn')     ?? undefined,
      brandKo:     s.get('brandKo')     ?? undefined,
      price:       s.get('price')       ?? undefined,
      model:       s.get('model')       ?? undefined,
      cutout:      s.get('cutout')      ?? undefined,
      fontFamily:  s.get('fontFamily')  ?? undefined,
      accentColor: s.get('accentColor') ?? undefined,
      panelColor:  s.get('panelColor')  ?? undefined,
      baseUrl,
    })
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 })
  }
}
```

- [ ] **Step 2: `builder/page.tsx` 작성 (BuilderState 오케스트레이터)**

```tsx
// app/admin/thumbnail/builder/page.tsx
'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StepSidebar } from './_components/StepSidebar'
import { PreviewPane } from './_components/PreviewPane'
import { Step1ImageSelect } from './_components/Step1ImageSelect'
import { Step2LayoutSuggest } from './_components/Step2LayoutSuggest'
import { Step3EffectSelect } from './_components/Step3EffectSelect'
import { Step4TextEdit } from './_components/Step4TextEdit'
import { Step5Export } from './_components/Step5Export'
import { INITIAL_STATE, type BuilderState, type StepId, type Lang } from './_types'
import type { LayoutToken, EffectToken } from './_types'
import { useEffect } from 'react'

export default function BuilderPage() {
  const [state, setState] = useState<BuilderState>(INITIAL_STATE)
  const [step, setStep] = useState<StepId>('image')
  const [layouts, setLayouts] = useState<LayoutToken[]>([])
  const [effects, setEffects] = useState<EffectToken[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingText, setGeneratingText] = useState(false)

  useEffect(() => {
    fetch('/api/thumbnail/builder/tokens')
      .then(r => r.json())
      .then(d => { setLayouts(d.layouts ?? []); setEffects(d.effects ?? []) })
  }, [])

  const patch = useCallback((p: Partial<BuilderState>) => {
    setState(prev => ({ ...prev, ...p }))
  }, [])

  // Phase 2에서 실제 Gemini 호출로 교체
  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/thumbnail/builder/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageType:  state.imageType,
          archetype:  state.archetype,
          variantIdx: state.variantIdx,
          layouts,
        }),
      })
      if (res.ok) {
        const { suggestions } = await res.json()
        patch({ suggestions, layoutTokenId: suggestions[0]?.layoutTokenId ?? null })
      }
    } finally {
      setAnalyzing(false)
    }
  }, [state.imageType, state.archetype, state.variantIdx, layouts, patch])

  // Phase 2에서 실제 Gemini 호출로 교체
  const handleGenerateText = useCallback(async (lang: Lang) => {
    setGeneratingText(true)
    try {
      const res = await fetch('/api/thumbnail/builder/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ko: state.texts.ko, targetLang: lang }),
      })
      if (res.ok) {
        const generated = await res.json()
        patch({ texts: { ...state.texts, [lang]: generated } })
      }
    } finally {
      setGeneratingText(false)
    }
  }, [state.texts, patch])

  const handleRender = useCallback(async () => {
    const langs: Lang[] = ['ko', 'en', 'ja', 'zh']
    for (const lang of langs) {
      await fetch('/api/thumbnail/builder/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutTokenId: state.layoutTokenId,
          effectTokenId: state.effectTokenId,
          ...state.texts[lang],
          fontFamily:  state.fontFamily,
          accentColor: state.accentColor,
          panelColor:  state.panelColor,
          model:  state.imageType !== 'cutout' ? `${state.archetype}/${state.archetype}-${state.variantIdx}.png` : undefined,
          cutout: state.imageType === 'cutout' ? `${state.archetype}/${state.archetype}-${state.variantIdx}.png` : undefined,
        }),
      })
    }
    patch({ rendered: true })
  }, [state, patch])

  const stepProps = { state, onChange: patch }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="h-11 border-b border-gray-100 bg-white flex items-center px-4 gap-3 shrink-0">
        <Link href="/admin/thumbnail" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-3.5 h-3.5" /> 에디터
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-[12px] font-semibold text-gray-700">새 썸네일 만들기</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <StepSidebar activeStep={step} onStepClick={setStep} state={state} />

        <div className="flex flex-1 overflow-hidden">
          {step === 'image'  && <Step1ImageSelect {...stepProps} onNext={() => setStep('layout')} />}
          {step === 'layout' && <Step2LayoutSuggest {...stepProps} layouts={layouts} onAnalyze={handleAnalyze} analyzing={analyzing} onNext={() => setStep('effect')} onPrev={() => setStep('image')} />}
          {step === 'effect' && <Step3EffectSelect {...stepProps} effects={effects} layouts={layouts} onNext={() => setStep('text')} onPrev={() => setStep('layout')} />}
          {step === 'text'   && <Step4TextEdit {...stepProps} onGenerateText={handleGenerateText} generating={generatingText} onNext={() => setStep('export')} onPrev={() => setStep('effect')} />}
          {step === 'export' && <Step5Export {...stepProps} layouts={layouts} effects={effects} onRender={handleRender} onPrev={() => setStep('text')} />}
        </div>

        <PreviewPane state={state} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 기존 에디터 상단에 "새 썸네일 만들기" 버튼 추가**

`app/admin/thumbnail/page.tsx` 의 상단 헤더 부분에서 `ArrowLeft` 버튼 옆에 버튼 추가. 파일에서 다음 부분을 찾아 수정:

```tsx
// 기존 코드에서 ArrowLeft 버튼이 있는 헤더 영역을 찾아
// 그 옆에 Link 추가:
import Link from 'next/link'

// 헤더 내 기존 버튼들 옆에:
<Link href="/admin/thumbnail/builder"
  className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors">
  + 새 썸네일 만들기
</Link>
```

> `app/admin/thumbnail/page.tsx` 가 10,000 토큰 초과 파일이므로 반드시 Read(offset, limit)으로 헤더 섹션(1~50행)을 먼저 읽고 정확한 삽입 위치를 확인한다.

- [ ] **Step 4: 빌더 페이지 브라우저 확인**

`http://localhost:2999/admin/thumbnail/builder` 접속. 확인 사항:
- StepSidebar 5개 스텝 렌더링
- Step 1 이미지 타입 클릭 동작
- PreviewPane 우측 표시
- 콘솔 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add app/admin/thumbnail/builder/page.tsx app/api/thumbnail/builder/preview/ app/admin/thumbnail/page.tsx
git commit -m "feat(builder): 빌더 페이지 + preview route + 기존 에디터 진입 버튼"
```

---

## Phase 2 — Gemini 연동

### Task 12: Gemini 레이아웃 분석 API

**Files:**
- Create: `app/api/thumbnail/builder/analyze/route.ts`

- [ ] **Step 1: `analyze/route.ts` 작성**

```typescript
// app/api/thumbnail/builder/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'
import { PATHS } from '@/lib/thumbnail'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const { imageType, archetype, variantIdx, layouts } = await req.json()
  if (!archetype || variantIdx === null || !layouts?.length) {
    return NextResponse.json({ error: 'archetype, variantIdx, layouts 필수' }, { status: 400 })
  }

  // 이미지 파일 로컬 로드 → base64
  const dir      = imageType === 'cutout' ? PATHS.cutout : PATHS.models
  const allFiles = readdirDeep(dir)
  const imgFile  = allFiles.find(f => f.includes(archetype))
  if (!imgFile) return NextResponse.json({ error: `이미지 없음: ${archetype}` }, { status: 404 })

  const imgPath   = path.join(dir, imgFile)
  const imgData   = fs.readFileSync(imgPath).toString('base64')
  const mimeType  = imgFile.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const layoutList = layouts.map((l: { id: string; name: string; description: string }) =>
    `- id: "${l.id}", 이름: "${l.name}", 설명: "${l.description}"`
  ).join('\n')

  const prompt = `당신은 K-Beauty 뷰티 시술 광고 썸네일 디자인 전문가입니다.
아래 이미지를 분석하여 주어진 레이아웃 토큰 목록 중 가장 잘 어울리는 3개를 추천하세요.

분석 기준:
- 모델의 시선 방향과 여백 위치
- 피사체 구도 (상반신/전신/클로즈업)
- 이미지 전체 밝기와 색감 (어둡다면 overlay, 밝다면 split/solid)
- 텍스트가 가독성 있게 들어갈 수 있는 공간

레이아웃 토큰 목록:
${layoutList}

응답: confidence가 높은 순으로 3개 추천. fontFamily는 아래 중 하나 선택:
BlackHan (임팩트 고딕), Pretendard (모던 고딕), Playfair (세리프 럭셔리), Bebas (영문 전용 임팩트), Montserrat (영문 모던)`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imgData } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  layoutTokenId: { type: Type.STRING },
                  confidence:    { type: Type.NUMBER },
                  reason:        { type: Type.STRING },
                  fontFamily:    { type: Type.STRING },
                },
                required: ['layoutTokenId', 'confidence', 'reason', 'fontFamily'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    const data = JSON.parse(text)
    // 유효한 layoutTokenId만 필터링
    const validIds = new Set(layouts.map((l: { id: string }) => l.id))
    data.suggestions = data.suggestions.filter((s: { layoutTokenId: string }) => validIds.has(s.layoutTokenId))

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[builder/analyze] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}

function readdirDeep(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...readdirDeep(path.join(dir, entry.name)).map(f => `${entry.name}/${f}`))
    } else {
      results.push(entry.name)
    }
  }
  return results
}
```

- [ ] **Step 2: API 수동 테스트**

```bash
curl -s -X POST http://localhost:2999/api/thumbnail/builder/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "imageType": "full",
    "archetype": "dewy_glow",
    "variantIdx": 0,
    "layouts": [
      {"id":"bottom-text-stack","name":"하단 텍스트 스택","description":"모델 전체화면 + 하단 텍스트"},
      {"id":"left-text-stack","name":"좌측 패널 텍스트","description":"좌측 패널 + 모델 우측"},
      {"id":"top-left-editorial","name":"좌상단 에디토리얼","description":"좌상단 대형 헤드라인"}
    ]
  }' | python3 -m json.tool
```

Expected: `{ "suggestions": [{ "layoutTokenId": "...", "confidence": 90, "reason": "...", "fontFamily": "..." }, ...] }`

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/builder/analyze/
git commit -m "feat(gemini): 이미지 분석 레이아웃 추천 API — analyze route"
```

---

### Task 13: Gemini 다국어 텍스트 생성 API

**Files:**
- Create: `app/api/thumbnail/builder/generate-text/route.ts`

- [ ] **Step 1: `generate-text/route.ts` 작성**

```typescript
// app/api/thumbnail/builder/generate-text/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const { ko, targetLang } = await req.json()
  // ko: { headline, subheadline, price, brandEn, brandKo }
  // targetLang: 'en' | 'ja' | 'zh'

  if (!ko?.headline || !targetLang) {
    return NextResponse.json({ error: 'ko.headline, targetLang 필수' }, { status: 400 })
  }

  const LANG_NAMES: Record<string, string> = { en: 'English', ja: 'Japanese', zh: 'Simplified Chinese' }
  const langName = LANG_NAMES[targetLang]
  if (!langName) return NextResponse.json({ error: '지원하지 않는 언어' }, { status: 400 })

  const prompt = `You are a professional translator for Korean beauty clinic marketing.
Translate the following Korean beauty clinic thumbnail texts into ${langName}.

Rules:
- Keep medical/aesthetic procedure names accurate (e.g. 울쎄라→Ulthera, 써마지→Thermage, 보톡스→Botox, 리쥬란→Rejuran, 필러→Filler)
- Maintain the short, punchy promotional tone suitable for social media thumbnails
- brandKo: translate to appropriate romanization or local equivalent
- price: keep as-is (just copy the Korean price string)
- If a field is empty string, return empty string

Korean input:
- headline: "${ko.headline}"
- subheadline: "${ko.subheadline ?? ''}"
- price: "${ko.price ?? ''}"
- brandEn: "${ko.brandEn ?? ''}"
- brandKo: "${ko.brandKo ?? ''}"`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline:    { type: Type.STRING },
            subheadline: { type: Type.STRING },
            price:       { type: Type.STRING },
            brandEn:     { type: Type.STRING },
            brandKo:     { type: Type.STRING },
          },
          required: ['headline', 'subheadline', 'price', 'brandEn', 'brandKo'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    return NextResponse.json(JSON.parse(text))
  } catch (e: any) {
    console.error('[builder/generate-text] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: API 수동 테스트**

```bash
curl -s -X POST http://localhost:2999/api/thumbnail/builder/generate-text \
  -H "Content-Type: application/json" \
  -d '{
    "ko": {
      "headline": "보톡스 시술",
      "subheadline": "자연스럽게 환해지는 얼굴",
      "price": "3.9만원",
      "brandEn": "OO CLINIC",
      "brandKo": "OO피부과"
    },
    "targetLang": "en"
  }' | python3 -m json.tool
```

Expected: `{ "headline": "Botox Treatment", "subheadline": "...", "price": "3.9만원", ... }`

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/builder/generate-text/
git commit -m "feat(gemini): 다국어 텍스트 생성 API — generate-text route"
```

---

## Phase 3 — 내보내기 완성

### Task 14: render/route.ts 파일 저장 + 4개 언어 배치 렌더링

**Files:**
- Modify: `app/api/thumbnail/builder/render/route.ts` (Task 6 작성 파일에 저장 경로 추가)

- [ ] **Step 1: render/route.ts에 파일 저장 로직 추가**

Task 6에서 작성한 `render/route.ts`의 screenshot 이후 부분을 수정해 webp 반환 대신 파일 저장 + 경로 반환으로 변경:

```typescript
// app/api/thumbnail/builder/render/route.ts 의 POST 핸들러 내부
// screenshot 이후 부분 교체:

const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g,'').replace('T','-')
const outputDir = path.join(process.cwd(), 'thumbnail/output/renders', timestamp)
fs.mkdirSync(outputDir, { recursive: true })

const lang = body.lang ?? 'ko'   // body에 lang 필드 추가 필요
const outPath = path.join(outputDir, `${lang}.webp`)

await page.screenshot({
  path: outPath as `${string}.webp`,
  type: 'webp',
  quality: 88,
})
await page.close()
await browser.close()
fs.unlinkSync(tmpFile)

return NextResponse.json({ saved: true, path: outPath, lang })
```

`req.json()` 구조분해에 `lang` 추가:
```typescript
const {
  layoutTokenId, effectTokenId,
  headline, subheadline, brandEn, brandKo, price, priceUnit,
  model, cutout,
  fontFamily, accentColor, panelColor,
  lang,    // 추가
} = await req.json()
```

- [ ] **Step 2: Step5Export의 onRender에서 저장된 파일 경로 확인**

`builder/page.tsx`의 `handleRender` 함수에서 각 언어 render 후 응답을 확인하도록 수정:

```typescript
const handleRender = useCallback(async () => {
  const langs: Lang[] = ['ko', 'en', 'ja', 'zh']
  for (const lang of langs) {
    const res = await fetch('/api/thumbnail/builder/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        layoutTokenId: state.layoutTokenId,
        effectTokenId: state.effectTokenId,
        headline:    state.texts[lang].headline,
        subheadline: state.texts[lang].subheadline,
        brandEn:     state.texts[lang].brandEn,
        brandKo:     state.texts[lang].brandKo,
        price:       state.texts[lang].price,
        fontFamily:  state.fontFamily,
        accentColor: state.accentColor,
        panelColor:  state.panelColor,
        model:  state.imageType !== 'cutout'
          ? `${state.archetype}/${state.archetype}-${state.variantIdx}.png`
          : undefined,
        cutout: state.imageType === 'cutout'
          ? `${state.archetype}/${state.archetype}-${state.variantIdx}.png`
          : undefined,
        lang,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error(`[render/${lang}] failed:`, err)
    }
  }
  patch({ rendered: true })
}, [state, patch])
```

- [ ] **Step 3: 전체 플로우 E2E 수동 테스트**

브라우저에서 `http://localhost:2999/admin/thumbnail/builder` 에 접속해 아래 시나리오 확인:

1. Step 1: 이미지 타입 "전체 이미지" → 아키타입 선택 → 변형 선택 → "다음" 활성화 확인
2. Step 2: "재분석" 클릭 → Gemini 추천 3종 표시 → 1개 선택 → PreviewPane 업데이트 확인
3. Step 3: 효과 선택 → PreviewPane 실시간 반영 확인
4. Step 4: 한국어 텍스트 입력 → "생성" 클릭 → EN 탭에 번역 결과 확인
5. Step 5: "4개 언어 전체 렌더링" 클릭 → `thumbnail/output/renders/` 에 파일 저장 확인

```bash
ls thumbnail/output/renders/
# 최신 타임스탬프 디렉토리에 ko.webp en.webp ja.webp zh.webp 존재 확인
```

- [ ] **Step 4: 최종 커밋**

```bash
git add app/api/thumbnail/builder/render/ app/admin/thumbnail/builder/page.tsx
git commit -m "feat(builder): 4개 언어 배치 렌더링 + 파일 저장 완성"
```

---

## 부록: Phase 0 추가 토큰 (향후 작업)

Phase 0 MVP에서 구현하지 않은 나머지 토큰들. 각각 Task 2/3와 동일한 패턴으로 CSS 파일 작성 후 레지스트리 JSON에 추가한다.

**레이아웃 토큰 미구현:**
- `center-text` — 중앙 세로 스택 (overlay-dark-center)
- `bottom-left-editorial` — 좌하단 초대형 에디토리얼
- `frame-inner-text` — 프레임 내부 텍스트 (**HTML snippet 필요, base.html 확장 요*)
- `card-right-text` — 카드 우측 텍스트
- `text-only` — 모델 없음 텍스트 전용
- `diagonal-text` — 대각선 분할
- `left-fade-text` — 좌측 페이드

**효과 토큰 미구현:**
- `gradient-mesh` — 메쉬 그라디언트 (body background)
- `gradient-glassmorphism` — 글래스모피즘
- `gradient-spotlight` — 네온 스팟라이트
- `gradient-stroke` — 스트로크 타이포
- `overlay-light` — 밝은 오버레이
- `overlay-line` — 세로 라인 오버레이
- `split-diagonal` — 대각선 스플릿
- `split-gold` — 골드 프레임 스플릿
- `banner-solid` — 하단 배너 영역
- `frame-circle`, `frame-arch`, `frame-card-*`, `frame-sparkle` — 프레임 계열 (**HTML snippet 필요*)

> `*` 표시 항목은 CSS 전용이 아닌 HTML 구조 추가가 필요하므로 `base.html`에 `{{EXTRA_HTML}}` 슬롯 추가를 검토해야 한다.
