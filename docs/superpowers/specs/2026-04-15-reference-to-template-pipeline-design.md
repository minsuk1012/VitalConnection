# Reference → Template 파이프라인 설계

**Date:** 2026-04-15  
**Status:** Approved

---

## 목표

`thumbnail/references/` 안의 타 플랫폼 레퍼런스 이미지를 직접 자산으로 사용할 수 없으므로,
Gemini 이미지 생성 모델로 변형 → 텍스트/스타일 레이어 분리 → JSON 토큰화하여
기존 `thumbnail/configs/*.json` 포맷과 호환되는 템플릿 자산을 생산한다.

---

## 전체 파이프라인

```
thumbnail/references/{category}/img-*.{jpg,png}
        ↓  [Step 1] 카테고리별 프롬프트로 Gemini 변형 생성
thumbnail/references-transformed/{category}/img-*.webp
        ↓  [Step 2] 개발자 파일 검토 → approved/ 하위 폴더로 수동 이동
thumbnail/references-transformed/{category}/approved/img-*.webp
        ↓  [Step 3] Gemini로 텍스트 레이어 / 스타일 레이어 이미지 분리
thumbnail/references-layers/{category}/img-*-text.webp
thumbnail/references-layers/{category}/img-*-style.webp
        ↓  [Step 4] Gemini Vision으로 각 레이어에서 토큰 추출 → JSON
thumbnail/templates/generated/{category}/img-*.json
```

---

## 처리 대상 카테고리

| 카테고리 | 설명 | 파이프라인 대상 |
|----------|------|----------------|
| `overlay/` | 완성된 썸네일 (사진 + 텍스트 오버레이) | ✅ |
| `a_text/` | 텍스트 중심 레이아웃 | ✅ |
| `nukki/` | 누끼 컷아웃 스타일 | ✅ |
| `overlay_effect/` | 특수 이펙트 오버레이 | ✅ |
| `raw/body`, `raw/plastic` 등 | 텍스트 없는 원본 사진 | ❌ (별도 파이프라인) |

---

## Step 1: 변형 생성 (`transform-references.ts`)

### 모델
`gemini-3.1-flash-image-preview` — 이미지 입력 + 이미지 출력 모두 지원 (편집 포함)

> **`editImage` 메서드와 구분:**  
> `ai.models.editImage()`는 Imagen 3 (`imagen-3.0-capability-001`) 전용이라 사용하지 않음.  
> 우리는 `ai.models.generateContent()`에 `inlineData` + `responseModalities: ['IMAGE']` 조합을 사용.

### API 호출 패턴

```typescript
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 레퍼런스 이미지 읽기
const imageBuffer = fs.readFileSync(refImagePath);
const base64Image = imageBuffer.toString('base64');
const mimeType = refImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

const response = await genai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [{
    parts: [
      {
        inlineData: { mimeType, data: base64Image }   // 이미지 입력
      },
      {
        text: categoryPrompt   // 변형 지시 프롬프트
      }
    ]
  }],
  config: {
    responseModalities: ['IMAGE'],   // 이미지 출력
  }
});

// 이미지 추출 (기존 generate-models.ts 패턴과 동일)
const parts = response.candidates?.[0]?.content?.parts ?? [];
const imagePart = parts.find((p: any) => p.inlineData);
if (imagePart) {
  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  // Sharp으로 WebP 저장
}
```

### 카테고리별 프롬프트 전략

**공통 지침 (모든 카테고리):**
```
Korean beauty clinic SNS thumbnail. Keep the exact layout composition and text placement positions.
Replace ALL visual content with completely original elements:
- Replace model/person with original Korean beauty model
- Replace brand names, logos, and any identifiable text with [HEADLINE], [SUBTEXT], [PRICE] placeholders
- Keep the same number and hierarchy of text elements but render as clearly legible placeholders
Output as 1080x1080 image.
```

**카테고리별 추가 지침:**

| 카테고리 | 추가 지침 |
|----------|-----------|
| `overlay/` | Replace background photo with original Korean beauty clinic aesthetic. Keep overlay type (dark/gradient/light) and opacity level. |
| `a_text/` | Keep typographic layout and text hierarchy. Replace background color/pattern with new color scheme in Korean beauty aesthetic (soft pinks, creams, golds). |
| `nukki/` | Keep cutout pose direction and framing. Replace model completely with original. Regenerate background. |
| `overlay_effect/` | Keep effect type (glitter, bokeh, gradient sweep, etc.). Replace colors and all visual content. |

### 출력
- 경로: `thumbnail/references-transformed/{category}/img-{N:03d}.webp`
- 포맷: WebP, 1080×1080, quality 90
- 재시도: 최대 3회, 3초 지연 (기존 `generate-models.ts` 패턴 동일)
- 이미 존재하면 스킵

### CLI
```bash
npm run thumbnail:transform              # 전체 처리
npm run thumbnail:transform -- --cat=overlay   # 특정 카테고리
npm run thumbnail:transform -- --file=overlay/img-002.jpg  # 단일 파일
```

---

## Step 2: 승인 프로세스 (수동)

- 개발자가 `thumbnail/references-transformed/{category}/` 폴더를 직접 열어 확인
- 마음에 드는 파일은 `approved/` 하위 폴더로 이동
  ```
  thumbnail/references-transformed/overlay/approved/img-002.webp
  ```
- 마음에 안 드는 파일: 삭제하거나 방치 (스크립트는 `approved/`만 처리)

---

## Step 3+4: 레이어 분리 + 토큰 추출 (`split-layers.ts`)

### 입력
`thumbnail/references-transformed/{category}/approved/*.webp`

### 3-1: 텍스트 레이어 이미지 생성

```
Render only the text elements from this thumbnail on a pure white background.
Preserve exact positions, sizes, font weights, and colors of each text element:
- Main headline [HEADLINE]
- Subheadline/body text [SUBTEXT]
- Price tag [PRICE] (if present)
- Brand/clinic name [BRAND] (if present)
- Tag/badge labels (if present)
No background, no model, no decorative elements. Text only.
```

### 3-2: 스타일 레이어 이미지 생성

```
Remove all text from this thumbnail. Show only:
- Background (photo, solid color, or gradient)
- Overlay effects (dark overlay, gradient wash, etc.)
- Decorative elements (shapes, lines, badges, sparkles)
- Model/cutout (if present, keep)
No text whatsoever. Inpaint text areas with surrounding content.
```

### 3-3: 토큰 추출 (Vision 분석)

텍스트 레이어 이미지 + 스타일 레이어 이미지를 각각 Gemini Vision으로 분석하여 JSON 추출.

**출력 JSON 스키마:**
```json
{
  "sourceRef": "overlay/img-002",
  "category": "overlay",
  "generatedAt": "2026-04-15T00:00:00Z",
  "textLayer": {
    "elements": [
      {
        "type": "headline",
        "position": "bottom-left",
        "sizeClass": "large",
        "fontWeight": "bold",
        "color": "#ffffff",
        "estimatedTopPct": 65,
        "estimatedLeftPct": 5
      },
      {
        "type": "sub",
        "position": "above-headline",
        "sizeClass": "small",
        "color": "#ffffffcc"
      }
    ],
    "pricePresent": true,
    "tagPresent": false
  },
  "styleLayer": {
    "layoutType": "full-overlay",
    "bgType": "photo",
    "overlayType": "dark-gradient",
    "overlayDirection": "left-to-right",
    "primaryColor": "#1a1a2e",
    "accentColor": "#e91e8c",
    "effectTokens": ["vignette", "left-fade"],
    "modelPresent": true,
    "modelPosition": "right"
  },
  "configMapping": {
    "suggestedTemplate": "full-overlay",
    "vars": {
      "gradient-opacity": "0.6",
      "headline-left": "24px",
      "headline-top": "360px",
      "headline-size": "81px"
    }
  }
}
```

`configMapping.vars`는 기존 `thumbnail/configs/*.json`의 `vars` 블록에 직접 병합 가능.

### 출력 경로
```
thumbnail/references-layers/{category}/img-*-text.webp
thumbnail/references-layers/{category}/img-*-style.webp
thumbnail/templates/generated/{category}/img-*.json
```

### CLI
```bash
npm run thumbnail:split                         # approved/ 전체 처리
npm run thumbnail:split -- --cat=overlay        # 카테고리 지정
npm run thumbnail:split -- --file=overlay/img-002.webp  # 단일 파일
```

---

## 스크립트 파일 구성

```
scripts/thumbnail/
  transform-references.ts   ← 신규: Step 1
  split-layers.ts           ← 신규: Step 3+4
  generate-models.ts        ← 기존 유지
  remove-background.ts      ← 기존 유지
  batch.ts                  ← 기존 유지
  archetypes.json           ← 기존 유지
```

`package.json` 추가 스크립트:
```json
"thumbnail:transform":       "tsx scripts/thumbnail/transform-references.ts",
"thumbnail:transform:test":  "tsx scripts/thumbnail/transform-references.ts --test",
"thumbnail:split":           "tsx scripts/thumbnail/split-layers.ts",
"thumbnail:split:test":      "tsx scripts/thumbnail/split-layers.ts --test"
```

---

## 디렉토리 구조 (최종)

```
thumbnail/
  references/                          ← 입력 (변경 없음)
    overlay/
    a_text/
    nukki/
    overlay_effect/
    raw/
  references-transformed/              ← Step 1 출력
    overlay/
      img-001.webp
      approved/
        img-001.webp                   ← Step 2 승인본
    a_text/
    nukki/
    overlay_effect/
  references-layers/                   ← Step 3 출력
    overlay/
      img-001-text.webp
      img-001-style.webp
  templates/
    generated/                         ← Step 4 출력
      overlay/
        img-001.json
    (기존 HTML/CSS 템플릿 유지)
```

---

## 기술 제약 및 주의사항

1. **모델**: `gemini-3.1-flash-image-preview` 단일 모델로 전 파이프라인 통일. 이미지 입력(레퍼런스) + 이미지 출력(변형/분리) 모두 지원.
2. **API 비용**: 이미지 입력 + 이미지 출력은 텍스트 대비 토큰 비용 높음. 배치 처리 시 카테고리당 순차 실행.
3. **레이어 분리 한계**: Gemini가 완벽한 인페인팅을 보장하지 않음. 텍스트 제거 후 배경이 어색할 수 있음 — 이 경우 스타일 레이어는 "참고용"으로만 활용하고 실제 템플릿 렌더링은 기존 HTML 템플릿 엔진으로 처리.
4. **`raw/` 폴더 제외**: 원본 사진만 있어 텍스트/스타일 분리 파이프라인 대상 아님.
5. **`.gitignore`**: `references-transformed/`, `references-layers/`는 생성 자산이므로 `.gitignore` 추가 권장.
