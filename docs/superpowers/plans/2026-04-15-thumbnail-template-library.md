# 썸네일 템플릿 라이브러리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/thumbnail` 에디터를 BuilderState 기반 통합 템플릿 라이브러리로 개편한다. LLM 초안 생성(텍스트/이미지), 빌더 저장 연결, 기존 legacy 템플릿과 병존을 포함한다.

**Architecture:** 기존 4패널 레이아웃을 유지하면서 중앙 편집 패널만 교체한다. 템플릿 format을 CSS 변수 딕셔너리에서 BuilderState 기반 TemplateConfig로 전환한다. 기존 36개 템플릿은 `source: 'legacy'` 태그로 병존하며, 신규 템플릿만 새 FlatEditor 패널로 편집된다. 미리보기는 기존 `/api/thumbnail/builder/preview` (composeHtml)를 재사용한다.

**Tech Stack:** Next.js App Router, TypeScript, @google/genai (Gemini 2.5 Flash), Tailwind CSS, Base UI

---

## 파일 맵

### 신규 생성

| 파일 | 역할 |
|------|------|
| `app/admin/thumbnail/_types.ts` | TemplateConfig (새 포맷), NewTemplateEntry 타입 |
| `app/admin/thumbnail/_components/FlatEditor.tsx` | BuilderState 기반 플랫 편집 패널 |
| `app/admin/thumbnail/_components/DraftModal.tsx` | LLM 초안 생성 모달 (텍스트/이미지 탭) |
| `app/api/thumbnail/templates/route.ts` | POST: 템플릿 저장 |
| `app/api/thumbnail/templates/[id]/route.ts` | PUT: 템플릿 수정 |
| `app/api/thumbnail/templates/draft/text/route.ts` | POST: 텍스트 → BuilderState 초안 |
| `app/api/thumbnail/templates/draft/image/route.ts` | POST: 이미지 → BuilderState 초안 |

### 수정

| 파일 | 변경 내용 |
|------|---------|
| `thumbnail/template-registry.json` | 기존 36개 엔트리에 `source: 'legacy'`, `createdAt` 추가 |
| `app/admin/thumbnail/page.tsx` | 새 상태 추가, 중앙 패널 조건부 렌더링, 툴바 버튼 추가 |
| `app/admin/thumbnail/builder/_components/Step5Export.tsx` | "템플릿으로 저장" 버튼 추가 |

---

## Task 1: 새 타입 정의

**Files:**
- Create: `app/admin/thumbnail/_types.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
// app/admin/thumbnail/_types.ts
import type { TextContent } from '@/app/admin/thumbnail/builder/_types'

export type { TextContent }

/** 새 포맷 템플릿 설정 (BuilderState 기반) */
export interface TemplateConfig {
  layoutTokenId: string   // 'bottom-text-stack'
  effectTokenId: string   // 'overlay-dark'
  fontFamily:    string   // 'BlackHan'
  accentColor:   string   // '#FF6B9D'
  panelColor:    string   // '#1A1A2E'
  texts: {
    ko:   TextContent
    en?:  TextContent
    ja?:  TextContent
    zh?:  TextContent
  }
}

/** 템플릿 레지스트리 엔트리 (신규 + legacy 공용) */
export interface TemplateEntry {
  id:           string
  nameKo:       string
  name:         string
  source:       'llm-text' | 'llm-image' | 'builder' | 'legacy'
  layoutTokenId?: string   // 신규 전용
  effectTokenId?: string   // 신규 전용
  accentColor:  string     // 신규: accentColor, legacy: color 필드 재활용
  createdAt:    string
  // legacy 호환 필드
  layout?:          string
  tone?:            string
  priceStyle?:      string
  tags?:            string[]
  description?:     string
  color?:           string
  requiresCutout?:  boolean
}

/** LLM 초안 응답 (draft API 공통 출력) */
export interface DraftResult {
  layoutTokenId:  string
  effectTokenId:  string
  fontFamily:     string
  accentColor:    string
  panelColor:     string
  templateNameKo: string
  reason:         string
  texts: {
    ko: TextContent
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음 (또는 기존 오류만)

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/_types.ts
git commit -m "feat(template-lib): TemplateConfig, TemplateEntry, DraftResult 타입 추가"
```

---

## Task 2: Registry 마이그레이션

**Files:**
- Modify: `thumbnail/template-registry.json`

- [ ] **Step 1: 현재 엔트리 수 확인**

```bash
cat thumbnail/template-registry.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['templates']), 'templates')"
```

Expected: `36 templates`

- [ ] **Step 2: migration 스크립트 실행**

```bash
node -e "
const fs = require('fs');
const reg = JSON.parse(fs.readFileSync('thumbnail/template-registry.json', 'utf-8'));
reg.templates = reg.templates.map(t => ({
  ...t,
  source: t.source ?? 'legacy',
  accentColor: t.accentColor ?? t.color ?? '#1a1a2e',
  createdAt: t.createdAt ?? '2025-01-01T00:00:00.000Z',
}));
fs.writeFileSync('thumbnail/template-registry.json', JSON.stringify(reg, null, 2));
console.log('done:', reg.templates.length, 'entries');
"
```

Expected: `done: 36 entries`

- [ ] **Step 3: 결과 확인 (첫 엔트리에 source, accentColor, createdAt 있는지)**

```bash
cat thumbnail/template-registry.json | python3 -c "import sys,json; d=json.load(sys.stdin); t=d['templates'][0]; print(t.get('source'), t.get('accentColor'), t.get('createdAt'))"
```

Expected: `legacy #1a1a2e 2025-01-01T00:00:00.000Z`

- [ ] **Step 4: 커밋**

```bash
git add thumbnail/template-registry.json
git commit -m "chore(template-lib): 기존 36개 템플릿에 source:legacy 태그 추가"
```

---

## Task 3: 템플릿 저장 API (POST)

**Files:**
- Create: `app/api/thumbnail/templates/route.ts`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// app/api/thumbnail/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, saveConfig, PATHS } from '@/lib/thumbnail'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await req.json()
  const { nameKo, source, layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts } = body

  if (!layoutTokenId || !effectTokenId || !fontFamily || !accentColor || !panelColor || !texts?.ko) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const id = `custom-${Date.now()}`
  const config = { layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts }
  saveConfig(id, config)

  const registry = getRegistry()
  registry.templates.push({
    id,
    nameKo: nameKo || '새 템플릿',
    name:   nameKo || 'New Template',
    source: source || 'manual',
    layoutTokenId,
    effectTokenId,
    accentColor,
    createdAt: new Date().toISOString(),
  })
  fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')

  return NextResponse.json({ id })
}
```

- [ ] **Step 2: API 동작 확인 (dev 서버 실행 중 상태에서)**

```bash
curl -s -X POST http://localhost:2999/api/thumbnail/templates \
  -H 'Content-Type: application/json' \
  -d '{
    "nameKo": "테스트 템플릿",
    "source": "manual",
    "layoutTokenId": "bottom-text-stack",
    "effectTokenId": "overlay-dark",
    "fontFamily": "BlackHan",
    "accentColor": "#FF6B9D",
    "panelColor": "#1A1A2E",
    "texts": {"ko": {"headline":"테스트","subheadline":"서브","price":"3.9만원","brandKo":"피부과","brandEn":"CLINIC"}}
  }' | python3 -m json.tool
```

Expected: `{ "id": "custom-XXXX" }`

- [ ] **Step 3: 저장 파일 확인**

```bash
ls thumbnail/configs/ | grep custom
```

Expected: `custom-XXXX.json` 파일 존재

- [ ] **Step 4: 커밋**

```bash
git add app/api/thumbnail/templates/route.ts
git commit -m "feat(template-lib): POST /api/thumbnail/templates — 템플릿 저장 API"
```

---

## Task 4: 템플릿 수정 API (PUT)

**Files:**
- Create: `app/api/thumbnail/templates/[id]/route.ts`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// app/api/thumbnail/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, getConfig, saveConfig, PATHS } from '@/lib/thumbnail'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await params
  const existing = getConfig(id)
  if (!existing) return NextResponse.json({ error: '템플릿 없음' }, { status: 404 })

  const body = await req.json()
  const { nameKo, layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts } = body

  saveConfig(id, { layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts })

  if (nameKo) {
    const registry = getRegistry()
    const entry = registry.templates.find((t: { id: string }) => t.id === id)
    if (entry) {
      entry.nameKo = nameKo
      entry.name   = nameKo
      if (accentColor) entry.accentColor = accentColor
      fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: API 동작 확인 (Task 3에서 만든 id 사용)**

```bash
# Task 3에서 생성된 id로 교체
ID=$(ls thumbnail/configs/ | grep custom | tail -1 | sed 's/.json//')
curl -s -X PUT http://localhost:2999/api/thumbnail/templates/$ID \
  -H 'Content-Type: application/json' \
  -d '{
    "nameKo": "수정된 템플릿",
    "layoutTokenId": "left-text-stack",
    "effectTokenId": "overlay-dark",
    "fontFamily": "Pretendard",
    "accentColor": "#FFD700",
    "panelColor": "#000000",
    "texts": {"ko": {"headline":"수정됨","subheadline":"","price":"","brandKo":"","brandEn":""}}
  }' | python3 -m json.tool
```

Expected: `{ "ok": true }`

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/templates/[id]/route.ts
git commit -m "feat(template-lib): PUT /api/thumbnail/templates/[id] — 템플릿 수정 API"
```

---

## Task 5: LLM 초안 생성 API — 텍스트 입력

**Files:**
- Create: `app/api/thumbnail/templates/draft/text/route.ts`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// app/api/thumbnail/templates/draft/text/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'
import { getLayoutTokens, getEffectTokens } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt 필수' }, { status: 400 })

  const layouts = getLayoutTokens()
  const effects  = getEffectTokens()

  const layoutList = layouts.map(l => `- id: "${l.id}", 이름: "${l.name}", 설명: "${l.description}"`).join('\n')
  const effectList = effects.map(e => `- id: "${e.id}", 이름: "${e.name}", 설명: "${e.description}"`).join('\n')

  const systemPrompt = `당신은 K-Beauty 뷰티 광고 썸네일 디자인 전문가입니다.
다음 스타일 설명을 읽고 어울리는 템플릿 설정을 JSON으로 생성하세요.

스타일 설명: "${prompt}"

레이아웃 목록:
${layoutList}

이펙트 목록:
${effectList}

폰트 선택지: BlackHan (임팩트 고딕), Pretendard (모던 고딕), Playfair (세리프 럭셔리), Bebas (영문 임팩트), Montserrat (영문 모던), NotoSerif (세리프), Noto (기본 고딕)

텍스트는 K-Beauty 뷰티 시술 광고에 어울리는 한국어 샘플로 채워주세요. templateNameKo는 스타일을 잘 표현하는 짧은 이름으로.`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layoutTokenId:  { type: Type.STRING },
            effectTokenId:  { type: Type.STRING },
            fontFamily:     { type: Type.STRING },
            accentColor:    { type: Type.STRING },
            panelColor:     { type: Type.STRING },
            templateNameKo: { type: Type.STRING },
            reason:         { type: Type.STRING },
            texts: {
              type: Type.OBJECT,
              properties: {
                ko: {
                  type: Type.OBJECT,
                  properties: {
                    headline:    { type: Type.STRING },
                    subheadline: { type: Type.STRING },
                    price:       { type: Type.STRING },
                    brandKo:     { type: Type.STRING },
                    brandEn:     { type: Type.STRING },
                  },
                  required: ['headline', 'subheadline', 'price', 'brandKo', 'brandEn'],
                },
              },
              required: ['ko'],
            },
          },
          required: ['layoutTokenId', 'effectTokenId', 'fontFamily', 'accentColor', 'panelColor', 'templateNameKo', 'reason', 'texts'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    const data = JSON.parse(text)

    // 유효한 토큰 ID 검증
    const validLayoutIds = new Set(layouts.map(l => l.id))
    const validEffectIds = new Set(effects.map(e => e.id))
    if (!validLayoutIds.has(data.layoutTokenId)) data.layoutTokenId = layouts[0].id
    if (!validEffectIds.has(data.effectTokenId)) data.effectTokenId = effects[0].id

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[draft/text] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: API 동작 확인**

```bash
curl -s -X POST http://localhost:2999/api/thumbnail/templates/draft/text \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "프리미엄 다크 스타일, 울쎄라 시술 광고"}' \
  | python3 -m json.tool
```

Expected: layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, templateNameKo, reason, texts.ko 필드 포함 JSON

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/templates/draft/text/route.ts
git commit -m "feat(template-lib): POST /api/thumbnail/templates/draft/text — 텍스트 LLM 초안 API"
```

---

## Task 6: LLM 초안 생성 API — 이미지 업로드

**Files:**
- Create: `app/api/thumbnail/templates/draft/image/route.ts`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// app/api/thumbnail/templates/draft/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'
import { getLayoutTokens, getEffectTokens } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image 파일 필수' }, { status: 400 })

  const layouts = getLayoutTokens()
  const effects  = getEffectTokens()

  const layoutList = layouts.map(l => `- id: "${l.id}", 이름: "${l.name}", 설명: "${l.description}"`).join('\n')
  const effectList = effects.map(e => `- id: "${e.id}", 이름: "${e.name}", 설명: "${e.description}"`).join('\n')

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

  const prompt = `당신은 K-Beauty 뷰티 광고 썸네일 디자인 전문가입니다.
이 이미지를 레퍼런스로 분석하여 가장 잘 어울리는 썸네일 템플릿 설정을 JSON으로 생성하세요.

분석 기준:
- 이미지의 전반적인 색감, 톤, 분위기
- 배경 밝기 및 텍스트 가독성
- 고급스러움/활동적/미니멀 등 스타일 특성

레이아웃 목록:
${layoutList}

이펙트 목록:
${effectList}

폰트 선택지: BlackHan (임팩트 고딕), Pretendard (모던 고딕), Playfair (세리프 럭셔리), Bebas (영문 임팩트), Montserrat (영문 모던), NotoSerif (세리프), Noto (기본 고딕)

텍스트는 K-Beauty 뷰티 시술 광고에 어울리는 한국어 샘플로 채워주세요.`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layoutTokenId:  { type: Type.STRING },
            effectTokenId:  { type: Type.STRING },
            fontFamily:     { type: Type.STRING },
            accentColor:    { type: Type.STRING },
            panelColor:     { type: Type.STRING },
            templateNameKo: { type: Type.STRING },
            reason:         { type: Type.STRING },
            texts: {
              type: Type.OBJECT,
              properties: {
                ko: {
                  type: Type.OBJECT,
                  properties: {
                    headline:    { type: Type.STRING },
                    subheadline: { type: Type.STRING },
                    price:       { type: Type.STRING },
                    brandKo:     { type: Type.STRING },
                    brandEn:     { type: Type.STRING },
                  },
                  required: ['headline', 'subheadline', 'price', 'brandKo', 'brandEn'],
                },
              },
              required: ['ko'],
            },
          },
          required: ['layoutTokenId', 'effectTokenId', 'fontFamily', 'accentColor', 'panelColor', 'templateNameKo', 'reason', 'texts'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    const data = JSON.parse(text)

    const validLayoutIds = new Set(layouts.map(l => l.id))
    const validEffectIds = new Set(effects.map(e => e.id))
    if (!validLayoutIds.has(data.layoutTokenId)) data.layoutTokenId = layouts[0].id
    if (!validEffectIds.has(data.effectTokenId)) data.effectTokenId = effects[0].id

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[draft/image] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: API 동작 확인**

```bash
# 임의 이미지로 테스트
curl -s -X POST http://localhost:2999/api/thumbnail/templates/draft/image \
  -F "image=@thumbnail/output/models/$(ls thumbnail/output/models/ | head -1)/$(ls thumbnail/output/models/$(ls thumbnail/output/models/ | head -1)/ | head -1)" \
  | python3 -m json.tool
```

Expected: Task 5와 동일한 JSON 구조

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/templates/draft/image/route.ts
git commit -m "feat(template-lib): POST /api/thumbnail/templates/draft/image — 이미지 LLM 초안 API"
```

---

## Task 7: FlatEditor 컴포넌트

**Files:**
- Create: `app/admin/thumbnail/_components/FlatEditor.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// app/admin/thumbnail/_components/FlatEditor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'
import type { TemplateConfig } from '../_types'
import type { Lang } from '@/app/admin/thumbnail/builder/_types'
import { FONT_OPTIONS, LANG_LABELS } from '@/app/admin/thumbnail/builder/_types'

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

const LANGS = (['ko', 'en', 'ja', 'zh'] as Lang[])
const ACCENT_COLORS = ['#FF6B9D', '#FFD700', '#00D4AA', '#FF4757', '#7B68EE', '#FF8C00']
const TEXT_FIELDS: { key: keyof import('@/app/admin/thumbnail/builder/_types').TextContent; label: string; placeholder: string }[] = [
  { key: 'headline',    label: '헤드라인',    placeholder: '시술명' },
  { key: 'subheadline', label: '서브 카피',   placeholder: '부연 설명' },
  { key: 'price',       label: '가격',        placeholder: '3.9만원' },
  { key: 'brandKo',     label: '병원명 (한글)', placeholder: 'OO피부과' },
  { key: 'brandEn',     label: '병원명 (영문)', placeholder: 'OO CLINIC' },
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
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        템플릿을 선택하거나 LLM 초안을 생성하세요
      </div>
    )
  }

  const currentLayout = layouts.find(l => l.id === config.layoutTokenId)
  const compatibleEffects = currentLayout?.compatibleEffects
    ? effects.filter(e => currentLayout.compatibleEffects.includes(e.id))
    : effects

  const currentTexts = config.texts[lang] ?? config.texts.ko

  function updateText(key: string, value: string) {
    const prev = config.texts[lang] ?? { headline: '', subheadline: '', price: '', brandKo: '', brandEn: '' }
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
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm tsc --noEmit 2>&1 | grep FlatEditor
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/_components/FlatEditor.tsx
git commit -m "feat(template-lib): FlatEditor 컴포넌트 — BuilderState 기반 플랫 편집 패널"
```

---

## Task 8: DraftModal 컴포넌트

**Files:**
- Create: `app/admin/thumbnail/_components/DraftModal.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// app/admin/thumbnail/_components/DraftModal.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { DraftResult } from '../_types'

interface Props {
  onClose:  () => void
  onApply:  (draft: DraftResult) => void
}

type Tab = 'text' | 'image'

export function DraftModal({ onClose, onApply }: Props) {
  const [tab, setTab]         = useState<Tab>('text')
  const [prompt, setPrompt]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [reason, setReason]   = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  async function handleTextDraft() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/thumbnail/templates/draft/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data: DraftResult = await res.json()
      setReason(data.reason)
      onApply(data)
      onClose()
    } catch (e: any) {
      setError(e.message ?? '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageDraft() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/thumbnail/templates/draft/image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data: DraftResult = await res.json()
      onApply(data)
      onClose()
    } catch (e: any) {
      setError(e.message ?? '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">LLM 초안 생성</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {(['text', 'image'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                tab === t ? 'bg-white shadow-sm font-medium' : 'text-gray-500'
              }`}>
              {t === 'text' ? '✏️ 텍스트 설명' : '🖼 이미지 레퍼런스'}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">원하는 스타일을 자유롭게 설명하세요</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="예: 프리미엄 다크 스타일, 울쎄라 시술, 고급스러운 느낌"
              className="w-full h-24 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <Button onClick={handleTextDraft} disabled={loading || !prompt.trim()}
              className="w-full mt-3 text-xs h-8">
              {loading ? '생성 중...' : '초안 생성'}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">경쟁사 광고, 무드보드 등 레퍼런스 이미지를 업로드하세요</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg h-24 cursor-pointer hover:border-gray-400 transition-colors">
              <span className="text-xs text-gray-400">클릭하여 이미지 선택</span>
              <span className="text-[10px] text-gray-300 mt-1">JPG, PNG, WebP</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" />
            </label>
            <Button onClick={handleImageDraft} disabled={loading}
              className="w-full mt-3 text-xs h-8">
              {loading ? '분석 중...' : '이미지로 초안 생성'}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm tsc --noEmit 2>&1 | grep DraftModal
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/_components/DraftModal.tsx
git commit -m "feat(template-lib): DraftModal 컴포넌트 — 텍스트/이미지 LLM 초안 생성 모달"
```

---

## Task 9: page.tsx 통합

**Files:**
- Modify: `app/admin/thumbnail/page.tsx`

- [ ] **Step 1: 상단 import 추가**

`page.tsx` 상단의 import 블록에 추가:

```tsx
import type { TemplateConfig, TemplateEntry as NewTemplateEntry, DraftResult } from './_types'
import { FlatEditor } from './_components/FlatEditor'
import { DraftModal } from './_components/DraftModal'
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'
```

- [ ] **Step 2: 상태 추가**

기존 `useState` 선언들 아래에 추가 (기존 상태 수정 없음):

```tsx
// ── 신규: BuilderState 기반 템플릿 편집 ──
const [layouts,          setLayouts]         = useState<LayoutToken[]>([])
const [effects,          setEffects]         = useState<EffectToken[]>([])
const [newConfig,        setNewConfig]       = useState<TemplateConfig | null>(null)
const [flatLang,         setFlatLang]        = useState<Lang>('ko')
const [templateName,     setTemplateName]    = useState('')
const [flatSaving,       setFlatSaving]      = useState(false)
const [flatTranslating,  setFlatTranslating] = useState(false)
const [showDraftModal,   setShowDraftModal]  = useState(false)
```

- [ ] **Step 3: layouts/effects 초기 로드 추가**

기존 `useEffect` (templates, models 로드) 안에 추가:

```tsx
// 토큰 로드 (기존 fetch들과 함께)
fetch('/api/thumbnail/builder/tokens')
  .then(r => r.json())
  .then(d => { setLayouts(d.layouts ?? []); setEffects(d.effects ?? []) })
```

- [ ] **Step 4: 템플릿 선택 로직 확장**

기존 `selectTemplate` 함수 안에서 config 로드 후, 포맷 감지 분기 추가:

```tsx
// 기존: const data = await res.json(); setConfig(data); ...
// 교체:
const data = await res.json()
if ('layoutTokenId' in data) {
  // 신규 포맷
  setNewConfig(data as TemplateConfig)
  setTemplateName(tmpl.nameKo)
  setConfig(null)
} else {
  // legacy 포맷 (기존 동작 유지)
  setConfig(data)
  setNewConfig(null)
}
```

- [ ] **Step 5: FlatEditor 헬퍼 함수 추가**

`saveConfig` 함수 아래에 추가:

```tsx
async function saveFlatConfig() {
  if (!newConfig || !selectedId) return
  setFlatSaving(true)
  try {
    const tmpl = templates.find(t => t.id === selectedId)
    const isNew = !tmpl || tmpl.source === 'legacy'
    if (isNew) {
      const res = await fetch('/api/thumbnail/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newConfig, nameKo: templateName, source: 'manual' }),
      })
      const { id } = await res.json()
      // 레지스트리 갱신
      const reg = await fetch('/api/thumbnail/registry').then(r => r.json())
      setTemplates(reg.templates ?? [])
      setSelectedId(id)
    } else {
      await fetch(`/api/thumbnail/templates/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newConfig, nameKo: templateName }),
      })
    }
    setSaveStatus('저장됨')
    setTimeout(() => setSaveStatus(''), 2000)
  } finally {
    setFlatSaving(false)
  }
}

async function translateFlatContent() {
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
      ...prev,
      texts: { ...prev.texts, [flatLang]: translated },
    } : null)
  } finally {
    setFlatTranslating(false)
  }
}

function applyDraft(draft: DraftResult) {
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
  setSelectedId(null)  // 미저장 상태
}
```

- [ ] **Step 6: 툴바에 "LLM 초안 생성" 버튼 추가**

툴바 `<div className="ml-auto ...">` 안, 첫 번째 버튼 앞에 추가:

```tsx
<Button variant="outline" size="sm" onClick={() => setShowDraftModal(true)}
  className="text-xs h-7 gap-1.5">
  ✨ LLM 초안 생성
</Button>
```

- [ ] **Step 5b: convertLegacy 함수 추가** (`saveFlatConfig` 아래에)

```tsx
function convertLegacy() {
  // 기본 BuilderState로 초기화 — 사용자가 FlatEditor에서 직접 선택하도록 유도
  setNewConfig({
    layoutTokenId: layouts[0]?.id ?? 'bottom-text-stack',
    effectTokenId: effects[0]?.id ?? 'overlay-dark',
    fontFamily:    'BlackHan',
    accentColor:   '#FF6B9D',
    panelColor:    '#1A1A2E',
    texts: {
      ko: { headline: '', subheadline: '', price: '', brandKo: '', brandEn: '' },
    },
  })
  setTemplateName(templates.find(t => t.id === selectedId)?.nameKo ?? '변환된 템플릿')
}
```

- [ ] **Step 7: 중앙 패널 조건부 렌더링**

page.tsx에서 중앙 패널 div를 찾는다. 해당 div는 `className`에 `w-72`와 `border-r`을 포함한다.
그 div의 **여는 태그 바로 다음**에 FlatEditor 분기를 삽입하고, 기존 내용 전체를 else 분기로 감싼다:

```tsx
{/* 중앙 편집 패널 — 신규 포맷이면 FlatEditor, legacy면 기존 CSS 편집기 */}
<div className="w-72 border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
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
      isLegacy={false}
    />
  ) : (
    <>
      {/* Legacy 변환 배너 — legacy 템플릿이 선택된 경우 */}
      {selectedId && templates.find(t => t.id === selectedId)?.source === 'legacy' && layouts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-amber-700">⚠️ 구형 포맷 템플릿입니다.</span>
          <button onClick={convertLegacy}
            className="text-xs text-amber-800 underline font-medium ml-auto">
            새 포맷으로 변환
          </button>
        </div>
      )}
      {/* 기존 CSS 변수 편집 패널 — 내용 변경 없음, 위치만 이동 */}
      {/* ↓ 여기에 기존 중앙 패널 div의 모든 자식 JSX를 그대로 유지 ↓ */}
    </>
  )}
</div>
```

적용 방법: 기존 `<div className="w-72 border-r ...">` 태그를 위 코드로 교체하되,
`{/* ↓ 여기에 기존 ... ↓ */}` 주석 자리에 원래 있던 모든 자식 JSX (언어탭, 모델섹션, 헤드라인 input 등)를 그대로 붙여넣는다.

- [ ] **Step 8: DraftModal 렌더링 추가**

JSX 최하단 (return 닫는 태그 바로 위):

```tsx
{showDraftModal && (
  <DraftModal
    onClose={() => setShowDraftModal(false)}
    onApply={applyDraft}
  />
)}
```

- [ ] **Step 9: 신규 포맷 미리보기 URL 처리**

기존 `iframeSrc` 빌드 로직 근처에, newConfig가 있을 때의 URL 생성 추가:

```tsx
// newConfig가 있으면 builder/preview 엔드포인트 사용
useEffect(() => {
  if (!newConfig) return
  const params = new URLSearchParams({
    layoutToken: newConfig.layoutTokenId,
    effectToken: newConfig.effectTokenId,
    fontFamily:  newConfig.fontFamily,
    accentColor: newConfig.accentColor,
    panelColor:  newConfig.panelColor,
    headline:    newConfig.texts[flatLang]?.headline    ?? newConfig.texts.ko.headline,
    sub:         newConfig.texts[flatLang]?.subheadline ?? newConfig.texts.ko.subheadline,
    price:       newConfig.texts[flatLang]?.price       ?? newConfig.texts.ko.price,
    brandKo:     newConfig.texts[flatLang]?.brandKo     ?? newConfig.texts.ko.brandKo,
    brandEn:     newConfig.texts[flatLang]?.brandEn     ?? newConfig.texts.ko.brandEn,
  })
  setIframeSrc(`/api/thumbnail/builder/preview?${params}`)
}, [newConfig, flatLang])
```

- [ ] **Step 10: 브라우저에서 동작 확인**

1. `http://localhost:2999/admin/thumbnail` 접속
2. 툴바에 "✨ LLM 초안 생성" 버튼 확인
3. 버튼 클릭 → 모달 열림
4. 텍스트 탭에서 프롬프트 입력 → "초안 생성" → 중앙 패널에 FlatEditor 표시
5. 레이아웃/이펙트 카드 선택 → 미리보기 업데이트 확인
6. 저장 버튼 → 좌측 목록에 새 템플릿 추가 확인

- [ ] **Step 11: 커밋**

```bash
git add app/admin/thumbnail/page.tsx
git commit -m "feat(template-lib): admin/thumbnail page에 FlatEditor, DraftModal 통합"
```

---

## Task 10: 빌더 Step5 — "템플릿으로 저장" 버튼

**Files:**
- Modify: `app/admin/thumbnail/builder/_components/Step5Export.tsx`

- [ ] **Step 1: Step5Export.tsx 현재 코드 확인**

```bash
head -60 app/admin/thumbnail/builder/_components/Step5Export.tsx
```

- [ ] **Step 2: 상태 및 핸들러 추가**

컴포넌트 함수 내부 상단에 추가:

```tsx
const [savingTemplate,   setSavingTemplate]   = useState(false)
const [savedTemplateName, setSavedTemplateName] = useState('')
const [templateSaved,    setTemplateSaved]    = useState(false)

async function handleSaveAsTemplate() {
  if (!state.layoutTokenId || !state.effectTokenId) return
  const name = savedTemplateName || state.texts.ko.headline || '새 템플릿'
  setSavingTemplate(true)
  try {
    await fetch('/api/thumbnail/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nameKo:        name,
        source:        'builder',
        layoutTokenId: state.layoutTokenId,
        effectTokenId: state.effectTokenId,
        fontFamily:    state.fontFamily,
        accentColor:   state.accentColor,
        panelColor:    state.panelColor,
        texts:         state.texts,
      }),
    })
    setTemplateSaved(true)
  } finally {
    setSavingTemplate(false)
  }
}
```

- [ ] **Step 3: JSX에 템플릿 저장 섹션 추가**

렌더링 버튼 섹션 아래에 추가:

```tsx
{/* 템플릿으로 저장 */}
<div className="mt-4 border-t border-gray-100 pt-4">
  <p className="text-xs text-gray-500 mb-2 font-medium">템플릿으로 저장</p>
  {templateSaved ? (
    <div className="flex items-center gap-2 text-xs text-emerald-600">
      ✓ 템플릿 라이브러리에 저장되었습니다.
      <a href="/admin/thumbnail" className="underline">라이브러리 보기</a>
    </div>
  ) : (
    <div className="flex gap-2">
      <input
        type="text"
        value={savedTemplateName}
        onChange={e => setSavedTemplateName(e.target.value)}
        placeholder={state.texts.ko.headline || '템플릿 이름'}
        className="flex-1 h-7 text-xs border border-gray-200 rounded px-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
      <Button size="sm" variant="outline" onClick={handleSaveAsTemplate}
        disabled={savingTemplate || !state.layoutTokenId || !state.effectTokenId}
        className="text-xs h-7 shrink-0">
        {savingTemplate ? '저장 중...' : '템플릿 저장'}
      </Button>
    </div>
  )}
</div>
```

- [ ] **Step 4: 브라우저에서 동작 확인**

1. `http://localhost:2999/admin/thumbnail/builder` 접속
2. Step 1~4 완료 후 Step 5 이동
3. "템플릿 저장" 버튼 확인
4. 이름 입력 후 저장 → "라이브러리 보기" 링크 확인
5. 링크 클릭 → `/admin/thumbnail`에서 새 템플릿 좌측 목록에 표시 확인

- [ ] **Step 5: 커밋**

```bash
git add app/admin/thumbnail/builder/_components/Step5Export.tsx
git commit -m "feat(template-lib): 빌더 Step5에 '템플릿으로 저장' 버튼 추가"
```

---

## 최종 검증

- [ ] `/admin/thumbnail` — "LLM 초안 생성" → 텍스트 입력 → FlatEditor 채워짐 → 저장 → 좌측 목록 추가
- [ ] `/admin/thumbnail` — "LLM 초안 생성" → 이미지 업로드 → FlatEditor 채워짐
- [ ] `/admin/thumbnail` — legacy 템플릿 선택 → 기존 CSS 편집기 표시 (기존 동작 보존)
- [ ] `/admin/thumbnail` — 신규 템플릿 선택 → FlatEditor 표시 → 수정 후 저장
- [ ] `/admin/thumbnail/builder` → Step 5 → "템플릿 저장" → `/admin/thumbnail`에 반영
- [ ] `pnpm tsc --noEmit` 오류 없음

```bash
git tag feat/template-library-complete
```
