# Thumbnail Builder — Step-by-Step Flow 설계 스펙

**날짜:** 2026-04-14  
**범위:** 기존 `/admin/thumbnail` 에디터와 공존하는 새 빌더 플로우  
**출력 언어:** 한국어·영어·일본어·중국어 썸네일 자동 생성

---

## 1. 개요

기존 에디터는 "템플릿 선택 → 텍스트 미세조정" 단일 플로우다.  
새 빌더는 썸네일 구성 요소를 **5개 원자 단위**로 쪼개고, 순서대로 쌓아가되 자유롭게 오가며 조립한다.

핵심 아키텍처 결정: **레이아웃 토큰과 효과 토큰을 분리한다.**  
기존 32개 모놀리식 HTML 템플릿을 레이아웃 토큰(텍스트 배치) + 효과 토큰(시각 처리)으로 해체하고,  
빌더는 두 토큰을 독립적으로 선택·조합해 썸네일을 생성한다.

---

## 2. 원자 단위 (Atomic Units)

| 단위 | 역할 | 저장하는 것 |
|------|------|------------|
| **ImageUnit** | AI 이미지 | imageType + archetype + variantIdx |
| **TextLayoutUnit** | 텍스트 위치·계층 구조 | layoutTokenId (Gemini 추천) |
| **EffectUnit** | 시각적 분위기·처리 | effectTokenId (사용자 선택) |
| **TextContentUnit** | 4개 언어 텍스트 내용 | texts Record<Lang, TextContent> |
| **StyleUnit** | 폰트·포인트 컬러 | fontFamily + accentColor |

레이아웃과 효과는 독립 축이므로 각각 별도 토큰으로 관리한다.  
두 토큰의 조합이 최종 썸네일 비주얼을 결정한다.

---

## 3. 템플릿 원자화 (Phase 0 — 선행 작업)

빌더 구현 전에 기존 32개 HTML 템플릿을 레이아웃 토큰 + 효과 토큰으로 해체한다.

### 3-1. 레이아웃 토큰 (LayoutToken)

텍스트 블록의 위치·계층·정렬만 담당한다. 배경 처리나 시각 효과는 포함하지 않는다.

```typescript
interface LayoutToken {
  id:         string                  // e.g. 'left-panel-stack'
  name:       string                  // e.g. '좌측 패널 세로 스택'
  textBlocks: TextBlockDef[]
  cssFile:    string                  // templates/layouts/{id}.css
}

interface TextBlockDef {
  element:  'headline' | 'sub' | 'price' | 'brand' | 'badge' | 'tagline'
  position: { x: number; y: number } // canvas % 기준
  align:    'left' | 'center' | 'right'
  maxWidth: number                    // canvas % 기준
  zIndex:   number
}
```

**추출할 레이아웃 토큰 목록** (기존 템플릿 분석 결과):

| id | 설명 | 기존 템플릿 |
|----|------|------------|
| `bottom-text-stack` | 하단 텍스트 세로 스택 | full-overlay-dark, full-overlay-light |
| `left-text-stack` | 좌측 패널 텍스트 세로 스택 | full-overlay-gradient, left-split, split-right-*, vertical-split-gold |
| `left-fade-text` | 좌측 페이드 영역 텍스트 | full-overlay-left-fade |
| `center-text` | 중앙 텍스트 | overlay-dark-center |
| `bottom-left-editorial` | 좌하단 초대형 에디토리얼 | overlay-line-bottom, minimal-editorial |
| `top-left-editorial` | 좌상단 에디토리얼 | overlay-line-top |
| `bottom-banner` | 하단 독립 배너 영역 | bottom-banner, bottom-banner-circle |
| `frame-inner-text` | 프레임 내부 상하 텍스트 | center-frame-circle, center-frame-sparkle, arch-frame-editorial |
| `card-right-text` | 카드 우측 텍스트 스택 | card-frame-white, card-frame-dark |
| `stacked-center-cutout` | 누끼 모델 + 중앙 세로 스택 | solid-bg-cutout, solid-bg-stacked, solid-bg-dual-tag 등 |
| `text-only` | 모델 없음, 텍스트 전용 배치 | text-only-minimal, text-only-bold |
| `diagonal-text` | 대각선 분할 텍스트 | diagonal-split |

### 3-2. 효과 토큰 (EffectToken)

배경 처리·분위기·시각 레이어만 담당한다. 텍스트 위치는 포함하지 않는다.

```typescript
interface EffectToken {
  id:       string                          // e.g. 'overlay-dark'
  category: 'overlay' | 'split' | 'frame' | 'gradient' | 'solid'
  name:     string
  cssFile:  string                          // templates/effects/{id}.css
  compatibleLayouts: string[]               // 함께 쓸 수 있는 layoutToken id 목록
}
```

**추출할 효과 토큰 목록**:

| id | category | 설명 |
|----|----------|------|
| `overlay-dark` | overlay | 어두운 그라디언트 오버레이 |
| `overlay-light` | overlay | 밝은 오버레이 |
| `overlay-gradient` | overlay | 컬러 그라디언트 오버레이 |
| `overlay-fade-left` | overlay | 좌측 방향 페이드 |
| `overlay-line` | overlay | 세로 라인 + 미니멀 오버레이 |
| `split-light` | split | 밝은 패널 분할 |
| `split-dark` | split | 어두운 패널 분할 |
| `split-diagonal` | split | 대각선 분할 |
| `split-gold` | split | 골드 프레임 분할 |
| `frame-circle` | frame | 원형 프레임 |
| `frame-arch` | frame | 아치형 프레임 |
| `frame-card-light` | frame | 밝은 카드 프레임 |
| `frame-card-dark` | frame | 어두운 카드 프레임 |
| `frame-sparkle` | frame | 스파클 타원 프레임 |
| `solid-bg` | solid | 단색 배경 (컬러 변수 주입) |
| `gradient-mesh` | gradient | 메쉬 그라디언트 배경 |
| `gradient-glassmorphism` | gradient | 글래스모피즘 배경 |
| `gradient-spotlight` | gradient | 다크 스팟라이트 그라디언트 |
| `gradient-stroke` | gradient | 스트로크 클리핑 마스크 |
| `banner-solid` | solid | 하단 단색 배너 영역 |

### 3-3. 합성 렌더링 파이프라인

기존 `buildTemplateHtml(layoutId, input)` → 새 `composeHtml(layoutTokenId, effectTokenId, input)`

```typescript
// lib/thumbnail.ts 교체
export function composeHtml(
  layoutTokenId: string,
  effectTokenId: string,
  input: TemplateInput
): string {
  const layoutCss = loadCss(`templates/layouts/${layoutTokenId}.css`)
  const effectCss = loadCss(`templates/effects/${effectTokenId}.css`)
  const baseHtml  = loadHtml('templates/base.html')

  return baseHtml
    .replace('{{LAYOUT_CSS}}',  layoutCss)
    .replace('{{EFFECT_CSS}}',  effectCss)
    .replace('{{CSS_VARS}}',    buildCssVars(input))
    // ... 기존 텍스트 치환 동일
}
```

`templates/base.html` — 공통 캔버스 구조 (1080×1080, 모델 이미지 레이어, 텍스트 컨테이너)

### 3-4. 호환성 매트릭스

모든 레이아웃 × 효과 조합이 의미 있지 않다. `compatibleLayouts` 필드로 관리한다.

예시:
- `frame-*` 효과는 `frame-inner-text` 레이아웃과만 조합 가능
- `split-*` 효과는 `left-text-stack`, `card-right-text`와 조합 가능
- `overlay-*` 효과는 `bottom-text-stack`, `left-text-stack`, `center-text` 등과 자유 조합

---

## 4. 5단계 빌더 플로우

### Step 1 — 이미지 선택

```
ImageType:  'full' | 'cutout'
Archetype:  'dewy-glow' | 'clear-tone' | 'vline-sharp' | 'lip-gloss' | 'bold-eye' | 'body-line' | 'cutout-full' | 'cutout-half'
Variant:    1 | 2 | 3
```

- `cutout` 타입 선택 시 이후 단계에서 `stacked-center-cutout` 레이아웃 토큰 우선 노출
- 선택 즉시 우측 미리보기 업데이트

### Step 2 — Gemini 레이아웃 추천

**입력:** 선택된 이미지 + 레이아웃 토큰 목록

**Gemini 프롬프트 구조:**
```
이미지를 분석하여 아래 레이아웃 토큰 목록 중 가장 잘 어울리는 3개를 추천하라.
- 모델 시선 방향, 여백 위치, 피사체 구도를 고려
- 텍스트 위치 배치(레이아웃)만 평가하라. 배경 색상/효과는 고려하지 않는다.
- 각 추천: layoutTokenId, confidence(0-100), reason(한국어 1문장), 권장 fontFamily

레이아웃 토큰 목록: [{ id, name, description }, ...]
```

**출력:** `LayoutSuggestion[]` — 각 레이아웃에 기본 효과(`overlay-dark`)를 얹어 GUI 미리보기

```typescript
interface LayoutSuggestion {
  layoutTokenId: string
  confidence:    number
  reason:        string
  fontFamily:    string
}
```

- 재시도: 동일 입력으로 Gemini 재호출 → 다른 추천 3종
- 우측 패널: 추천 3종을 실시간 미리보기로 동시 표시

### Step 3 — 효과 선택

레이아웃 토큰은 고정된 상태에서 효과 토큰만 교체한다.

- Step 2에서 선택된 레이아웃과 `compatibleLayouts`가 겹치는 효과 토큰만 표시
- 카테고리별 그리드 (overlay / split / frame / gradient / solid)
- 선택 즉시 미리보기에 합성 결과 반영

### Step 4 — 텍스트 편집

**4개 언어 탭:** ko · en · ja · zh

**Gemini 텍스트 생성:**
- 입력: `시술명(ko)` + `병원명(ko)` + 대상 언어 목록
- 출력: `{ headline, sub, price, brand }` × 4개 언어
- 재시도 가능, 수동 수정 가능

**StyleUnit 조정:**
- 폰트 패밀리 (Step 2 Gemini 권장값 기본, 교체 가능)
- 포인트 컬러 팔레트 (5종 + 커스텀 hex)

### Step 5 — 내보내기

- 선택 요약: 이미지 / 레이아웃 토큰 / 효과 토큰 / 언어
- 4개 언어 미리보기 그리드
- 렌더링: `composeHtml(layoutTokenId, effectTokenId, input)` × 4회 → Puppeteer → webp
- 출력 경로: `thumbnail/output/renders/{timestamp}/`

---

## 5. 데이터 모델

### BuilderState (클라이언트 상태)

```typescript
interface BuilderState {
  // Step 1
  imageType:     'full' | 'cutout' | null
  archetype:     string | null
  variantIdx:    number | null

  // Step 2
  suggestions:   LayoutSuggestion[]
  layoutTokenId: string | null          // 선택된 레이아웃 토큰

  // Step 3
  effectTokenId: string | null          // 선택된 효과 토큰

  // Step 4
  texts:         Record<Lang, TextContent>
  fontFamily:    string
  accentColor:   string

  // Step 5
  rendered:      boolean
}

type Lang = 'ko' | 'en' | 'ja' | 'zh'

interface TextContent {
  headline: string
  sub:      string
  price:    string
  brand:    string
}
```

### 토큰 레지스트리 파일

```
thumbnail/
  layout-tokens.json    — LayoutToken[] 목록
  effect-tokens.json    — EffectToken[] 목록
  templates/
    layouts/            — {id}.css (레이아웃 토큰 CSS)
    effects/            — {id}.css (효과 토큰 CSS)
    base.html           — 공통 캔버스 구조
```

기존 `template-registry.json` + `templates/*.html`은 유지하되 레거시로 분류한다.  
기존 에디터(`/admin/thumbnail`)는 레거시 파이프라인을 계속 사용한다.

---

## 6. API 설계

### 기존 재사용

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /api/thumbnail/models?type=cutout\|models` | 이미지 목록 |
| `GET /api/thumbnail/preview` | iframe 미리보기 |

### 신규 추가

| 엔드포인트 | 입력 | 출력 |
|-----------|------|------|
| `POST /api/thumbnail/builder/analyze` | `{ imageUrl, layoutTokens[] }` | `LayoutSuggestion[]` |
| `POST /api/thumbnail/builder/generate-text` | `{ procedure, brand, langs[] }` | `Record<Lang, TextContent>` |
| `POST /api/thumbnail/builder/render` | `{ layoutTokenId, effectTokenId, text, lang }` | webp binary |
| `GET /api/thumbnail/builder/tokens` | — | `{ layouts, effects }` |

---

## 7. 라우팅

```
/admin/thumbnail          — 기존 에디터 (레거시, 유지)
/admin/thumbnail/builder  — 새 Step-by-Step 빌더 (신규)
/admin/thumbnail/gallery  — 이미지 갤러리 (공유)
```

기존 에디터에 "처음부터 만들기 →" 버튼 추가

---

## 8. 파일 구조 (신규 생성 대상)

```
thumbnail/
  layout-tokens.json
  effect-tokens.json
  templates/
    base.html
    layouts/          — {id}.css × 12종
    effects/          — {id}.css × 20종

lib/
  thumbnail-compose.ts   — composeHtml() 신규 함수 (기존 thumbnail.ts와 공존)

app/
  admin/thumbnail/builder/
    page.tsx
    _components/
      StepSidebar.tsx
      PreviewPane.tsx
      Step1ImageSelect.tsx
      Step2LayoutSuggest.tsx
      Step3EffectSelect.tsx
      Step4TextEdit.tsx
      Step5Export.tsx

app/api/thumbnail/builder/
  analyze/route.ts
  generate-text/route.ts
  render/route.ts
  tokens/route.ts
```

---

## 9. 구현 단계

| Phase | 내용 | 선행 조건 |
|-------|------|----------|
| **Phase 0** | 템플릿 원자화 — 기존 32개 HTML을 레이아웃 토큰 + 효과 토큰으로 해체, 토큰 CSS 파일 + base.html 작성, `composeHtml()` 구현 | 없음 |
| **Phase 1** | Builder UI — 5단계 페이지 + StepSidebar + PreviewPane | Phase 0 완료 |
| **Phase 2** | Gemini 연동 — analyze API (레이아웃 추천) + generate-text API (다국어 텍스트) | Phase 1 완료 |
| **Phase 3** | 내보내기 — builder/render API, 4개 언어 배치 렌더링 | Phase 2 완료 |

---

## 10. 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 기존 에디터 | 레거시로 공존 유지 | 빠른 편집 시나리오 커버 |
| 스텝 내비게이션 | 자유 탐색 | 진입한 단계는 언제든 수정 |
| 템플릿 원자화 | 즉시 분리 (Phase 0) | 레이아웃/효과 독립 추천·교체를 위한 전제 |
| 레거시 파이프라인 | 기존 template-registry.json + HTML 유지 | 기존 에디터 동작 보장 |
| Gemini 레이아웃 추천 | 레이아웃 토큰만 평가 | 효과는 사용자 선택 영역 분리 |
| 재시도 | Gemini analyze 재호출 | 같은 입력, 다른 추천 3종 |
| 최종 출력 | Gemini 텍스트 초안 → 수동 수정 → 렌더 | 언어별 품질 보장 |
