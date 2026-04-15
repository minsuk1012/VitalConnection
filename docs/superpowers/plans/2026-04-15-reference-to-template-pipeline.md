# Reference → Template Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레퍼런스 이미지를 Gemini로 변형 → 텍스트/스타일 레이어 분리 → JSON 토큰화하여 템플릿 자산을 자동 생산하는 배치 파이프라인 구현

**Architecture:** 두 개의 독립 CLI 스크립트(`transform-references.ts`, `split-layers.ts`)로 구성. 모두 기존 `generate-models.ts` 패턴을 기반으로 `inlineData` 이미지 입력을 추가한 형태. 카테고리별 프롬프트 설정을 별도 JSON으로 분리해 관리.

**Tech Stack:** `@google/genai@^1.33.0`, `sharp`, `tsx`, `dotenv`, `gemini-3.1-flash-image-preview`

---

## 파일 구조

```
scripts/thumbnail/
  transform-references.ts     ← 신규: Step 1 (변형 생성)
  split-layers.ts             ← 신규: Step 3+4 (레이어 분리 + 토큰 추출)
  category-prompts.json       ← 신규: 카테고리별 프롬프트 설정
  generate-models.ts          ← 기존 유지 (참고용)

thumbnail/
  references/                 ← 입력 (변경 없음)
  references-transformed/     ← transform-references.ts 출력
    {category}/
      approved/               ← 개발자가 수동으로 이동
  references-layers/          ← split-layers.ts 출력
    {category}/
      img-*-text.webp
      img-*-style.webp
  templates/generated/        ← split-layers.ts JSON 출력
    {category}/
      img-*.json

package.json                  ← scripts 추가
```

---

## Task 1: `category-prompts.json` 작성

**Files:**
- Create: `scripts/thumbnail/category-prompts.json`

- [ ] **Step 1: 파일 생성**

```json
{
  "common": "Korean beauty clinic SNS thumbnail (1080x1080). Keep the exact layout composition and text placement positions from the reference image. Replace ALL visual content with completely original elements. Replace any brand names, logos with generic placeholders. Render text zones as clearly labeled placeholders: [HEADLINE], [SUBTEXT], [PRICE], [BRAND]. Output as a clean, professional Korean beauty clinic advertisement.",

  "overlay": "Keep the overlay type (dark/gradient/light) and opacity level from the reference. Replace the background photo and model with original Korean beauty clinic aesthetic. Keep text placement positions identical.",

  "a_text": "Keep the typographic layout, text hierarchy, and text element positions exactly. Replace background color and pattern with a new Korean beauty aesthetic color scheme (soft pinks, creams, or golds). Replace all brand-specific typography styles.",

  "nukki": "Keep the cutout figure pose direction and framing (left/right/center, full-body/half-body). Replace the model completely with an original Korean beauty model. Regenerate the background with a clean Korean beauty clinic aesthetic.",

  "overlay_effect": "Keep the effect type (glitter, bokeh, gradient sweep, light leak, etc.) and its placement. Replace all colors, the underlying image, and any brand elements."
}
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/thumbnail/category-prompts.json
git commit -m "feat: add category-specific prompts for reference transformation"
```

---

## Task 2: `transform-references.ts` 구현

**Files:**
- Create: `scripts/thumbnail/transform-references.ts`

- [ ] **Step 1: 파일 생성**

```typescript
/**
 * 레퍼런스 이미지를 Gemini로 변형하여 오리지널 자산 생성
 *
 * Run: npm run thumbnail:transform
 * Run (카테고리): npm run thumbnail:transform -- --cat=overlay
 * Run (단일 파일): npm run thumbnail:transform -- --file=overlay/img-002.jpg
 * Run (테스트 1장): npm run thumbnail:transform -- --test
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, '../../.env.local') });
config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenAI } from '@google/genai';
import prompts from './category-prompts.json' with { type: 'json' };

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 .env.local에 없습니다');

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MODEL = 'gemini-3.1-flash-image-preview';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const REF_DIR = path.join(__dirname, '../../thumbnail/references');
const OUT_DIR = path.join(__dirname, '../../thumbnail/references-transformed');

const CATEGORIES = ['overlay', 'a_text', 'nukki', 'overlay_effect'] as const;
type Category = typeof CATEGORIES[number];

function buildPrompt(category: Category): string {
  return `${prompts.common}\n\n${prompts[category]}`;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function getOutputPath(category: string, inputFile: string, index: number): string {
  const outDir = path.join(OUT_DIR, category);
  fs.mkdirSync(outDir, { recursive: true });
  // approved/ 폴더도 미리 생성
  fs.mkdirSync(path.join(outDir, 'approved'), { recursive: true });
  const padded = String(index + 1).padStart(3, '0');
  return path.join(outDir, `img-${padded}.webp`);
}

async function transformImage(
  refPath: string,
  outPath: string,
  prompt: string
): Promise<boolean> {
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  이미 존재: ${path.basename(outPath)}`);
    return false;
  }

  console.log(`  🎨 변형 중: ${path.basename(refPath)} → ${path.basename(outPath)}`);
  const startMs = Date.now();

  const imageBuffer = fs.readFileSync(refPath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = getMimeType(refPath);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: MODEL,
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: prompt }
          ]
        }],
        config: { responseModalities: ['IMAGE'] }
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);

      if (!imagePart) {
        console.warn(`  ⚠️  이미지 응답 없음: ${path.basename(refPath)}`);
        return false;
      }

      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const sharp = (await import('sharp')).default;
      await sharp(buffer)
        .resize(1080, 1080, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(outPath);

      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      console.log(`  ✅ 저장: ${path.basename(outPath)}  (${elapsed}s)`);
      return true;

    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        console.warn(`  ↩️  재시도 ${attempt}/${MAX_RETRIES}: ${lastError.message.slice(0, 60)}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(`변형 실패 (${MAX_RETRIES}회 재시도): ${lastError?.message}`);
}

async function getRefImages(category: string): Promise<string[]> {
  const dir = path.join(REF_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => path.join(dir, f));
}

async function main() {
  const isTest = process.argv.includes('--test');
  const catFlag = process.argv.find(a => a.startsWith('--cat='))?.replace('--cat=', '') as Category | undefined;
  const fileFlag = process.argv.find(a => a.startsWith('--file='))?.replace('--file=', '');

  // 단일 파일 처리
  if (fileFlag) {
    const [category, filename] = fileFlag.split('/');
    if (!CATEGORIES.includes(category as Category)) {
      console.error(`❌ 유효하지 않은 카테고리: ${category}`);
      process.exit(1);
    }
    const refPath = path.join(REF_DIR, category, filename);
    if (!fs.existsSync(refPath)) {
      console.error(`❌ 파일 없음: ${refPath}`);
      process.exit(1);
    }
    const outPath = getOutputPath(category, filename, 0);
    const prompt = buildPrompt(category as Category);
    await transformImage(refPath, outPath, prompt);
    return;
  }

  const categories = catFlag ? [catFlag] : [...CATEGORIES];
  let generated = 0;

  for (const category of categories) {
    const images = await getRefImages(category);
    if (images.length === 0) {
      console.log(`\n[${category}] 이미지 없음, 스킵`);
      continue;
    }

    const targets = isTest ? [images[0]] : images;
    const prompt = buildPrompt(category as Category);

    console.log(`\n[${category}] ${targets.length}장 처리`);

    for (let i = 0; i < targets.length; i++) {
      const outPath = getOutputPath(category, path.basename(targets[i]), i);
      const did = await transformImage(targets[i], outPath, prompt);
      if (did) generated++;
    }
  }

  console.log(`\n✅ 완료!  생성: ${generated}장`);
  console.log(`   thumbnail/references-transformed/ 에서 확인 후 approved/ 폴더로 이동하세요.\n`);
}

main().catch(console.error);
```

- [ ] **Step 2: `package.json`에 스크립트 추가**

`package.json`의 `"scripts"` 블록에 추가:

```json
"thumbnail:transform": "tsx scripts/thumbnail/transform-references.ts",
"thumbnail:transform:test": "tsx scripts/thumbnail/transform-references.ts --test",
```

- [ ] **Step 3: 테스트 실행 (overlay 카테고리 1장)**

```bash
npm run thumbnail:transform -- --test --cat=overlay
```

예상 출력:
```
[overlay] 1장 처리
  🎨 변형 중: img-002.jpg → img-001.webp
  ✅ 저장: img-001.webp  (12.3s)

✅ 완료!  생성: 1장
   thumbnail/references-transformed/ 에서 확인 후 approved/ 폴더로 이동하세요.
```

- [ ] **Step 4: 생성 이미지 확인**

`thumbnail/references-transformed/overlay/img-001.webp` 파일이 존재하고, 1080×1080 WebP인지 확인:

```bash
file thumbnail/references-transformed/overlay/img-001.webp
```

- [ ] **Step 5: 커밋**

```bash
git add scripts/thumbnail/transform-references.ts package.json
git commit -m "feat: add transform-references script for reference image transformation"
```

---

## Task 3: `split-layers.ts` 구현 (레이어 분리 + 토큰 추출)

**Files:**
- Create: `scripts/thumbnail/split-layers.ts`

- [ ] **Step 1: 파일 생성**

```typescript
/**
 * 승인된 변형 이미지를 텍스트/스타일 레이어로 분리하고 JSON 토큰 추출
 *
 * Run: npm run thumbnail:split
 * Run (카테고리): npm run thumbnail:split -- --cat=overlay
 * Run (단일 파일): npm run thumbnail:split -- --file=overlay/img-001.webp
 * Run (테스트 1장): npm run thumbnail:split -- --test
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, '../../.env.local') });
config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 .env.local에 없습니다');

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MODEL = 'gemini-3.1-flash-image-preview';
const VISION_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const APPROVED_BASE = path.join(__dirname, '../../thumbnail/references-transformed');
const LAYERS_DIR = path.join(__dirname, '../../thumbnail/references-layers');
const TOKENS_DIR = path.join(__dirname, '../../thumbnail/templates/generated');

const CATEGORIES = ['overlay', 'a_text', 'nukki', 'overlay_effect'] as const;
type Category = typeof CATEGORIES[number];

const TEXT_LAYER_PROMPT = `Render only the text elements from this thumbnail on a pure white (255,255,255) background.
Preserve the exact positions, sizes, font weights, and colors of each text element.
Replace actual text content with these placeholders in the same font style:
- Main headline → [HEADLINE]
- Subheadline or body text → [SUBTEXT]
- Price → [PRICE] (if present)
- Brand/clinic name → [BRAND] (if present)
- Tags or badges → [TAG] (if present)
No background photo, no model, no decorative shapes or lines. Pure white background with text placeholders only.`;

const STYLE_LAYER_PROMPT = `Remove all text from this thumbnail completely. Show only:
- Background (photo, solid color, or gradient)
- Overlay effects (dark overlay, gradient wash, color tint, etc.)
- Decorative elements (geometric shapes, lines, sparkles, badges without text)
- Model or cutout figure (keep if present)
Inpaint all text areas naturally with surrounding content. No text whatsoever.`;

const TOKEN_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    textLayer: {
      type: Type.OBJECT,
      properties: {
        elements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type:            { type: Type.STRING },
              position:        { type: Type.STRING },
              sizeClass:       { type: Type.STRING },
              fontWeight:      { type: Type.STRING },
              color:           { type: Type.STRING },
              estimatedTopPct: { type: Type.NUMBER },
              estimatedLeftPct:{ type: Type.NUMBER },
            },
            required: ['type', 'position', 'sizeClass', 'color'],
          }
        },
        pricePresent: { type: Type.BOOLEAN },
        tagPresent:   { type: Type.BOOLEAN },
      },
      required: ['elements', 'pricePresent', 'tagPresent'],
    },
    styleLayer: {
      type: Type.OBJECT,
      properties: {
        layoutType:       { type: Type.STRING },
        bgType:           { type: Type.STRING },
        overlayType:      { type: Type.STRING },
        overlayDirection: { type: Type.STRING },
        primaryColor:     { type: Type.STRING },
        accentColor:      { type: Type.STRING },
        effectTokens:     { type: Type.ARRAY, items: { type: Type.STRING } },
        modelPresent:     { type: Type.BOOLEAN },
        modelPosition:    { type: Type.STRING },
      },
      required: ['layoutType', 'bgType', 'primaryColor', 'effectTokens', 'modelPresent'],
    },
  },
  required: ['textLayer', 'styleLayer'],
};

async function generateLayer(
  sourcePath: string,
  outPath: string,
  prompt: string
): Promise<boolean> {
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  이미 존재: ${path.basename(outPath)}`);
    return false;
  }

  const imageBuffer = fs.readFileSync(sourcePath);
  const base64Image = imageBuffer.toString('base64');

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: MODEL,
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/webp', data: base64Image } },
            { text: prompt }
          ]
        }],
        config: { responseModalities: ['IMAGE'] }
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);
      if (!imagePart) return false;

      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const sharp = (await import('sharp')).default;
      await sharp(buffer).webp({ quality: 90 }).toFile(outPath);
      return true;

    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw new Error(`레이어 생성 실패: ${lastError?.message}`);
}

async function extractTokens(
  textLayerPath: string,
  styleLayerPath: string,
  sourceRef: string,
  category: string
): Promise<object> {
  const textBuf = fs.readFileSync(textLayerPath).toString('base64');
  const styleBuf = fs.readFileSync(styleLayerPath).toString('base64');

  const response = await genai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/webp', data: textBuf } },
        { inlineData: { mimeType: 'image/webp', data: styleBuf } },
        { text: `Analyze these two thumbnail layer images and extract design tokens as JSON.
First image: text layer (white bg, text placeholders only).
Second image: style layer (background and visual effects, no text).
Extract layout, typography hierarchy, colors, effects, and model presence.` }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: TOKEN_EXTRACTION_SCHEMA,
    }
  });

  const parsed = JSON.parse(response.text ?? '{}');
  return {
    sourceRef,
    category,
    generatedAt: new Date().toISOString(),
    ...parsed,
  };
}

async function processFile(
  sourcePath: string,
  category: string,
  baseName: string
): Promise<void> {
  const layerDir = path.join(LAYERS_DIR, category);
  const tokenDir = path.join(TOKENS_DIR, category);
  fs.mkdirSync(layerDir, { recursive: true });
  fs.mkdirSync(tokenDir, { recursive: true });

  const stem = path.basename(baseName, path.extname(baseName));
  const textOut  = path.join(layerDir, `${stem}-text.webp`);
  const styleOut = path.join(layerDir, `${stem}-style.webp`);
  const jsonOut  = path.join(tokenDir, `${stem}.json`);

  if (fs.existsSync(jsonOut)) {
    console.log(`  ⏭  이미 처리됨: ${stem}`);
    return;
  }

  console.log(`  🔲 텍스트 레이어 생성: ${stem}`);
  await generateLayer(sourcePath, textOut, TEXT_LAYER_PROMPT);

  console.log(`  🎨 스타일 레이어 생성: ${stem}`);
  await generateLayer(sourcePath, styleOut, STYLE_LAYER_PROMPT);

  console.log(`  📐 토큰 추출: ${stem}`);
  const tokens = await extractTokens(textOut, styleOut, `${category}/${stem}`, category);
  fs.writeFileSync(jsonOut, JSON.stringify(tokens, null, 2));
  console.log(`  ✅ 저장: ${stem}.json`);
}

async function getApprovedFiles(category: string): Promise<string[]> {
  const dir = path.join(APPROVED_BASE, category, 'approved');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => path.join(dir, f));
}

async function main() {
  const isTest = process.argv.includes('--test');
  const catFlag = process.argv.find(a => a.startsWith('--cat='))?.replace('--cat=', '') as Category | undefined;
  const fileFlag = process.argv.find(a => a.startsWith('--file='))?.replace('--file=', '');

  if (fileFlag) {
    const [category, filename] = fileFlag.split('/');
    const filePath = path.join(APPROVED_BASE, category, 'approved', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일 없음: ${filePath}`);
      process.exit(1);
    }
    await processFile(filePath, category, filename);
    return;
  }

  const categories = catFlag ? [catFlag] : [...CATEGORIES];
  let processed = 0;

  for (const category of categories) {
    const files = await getApprovedFiles(category);
    if (files.length === 0) {
      console.log(`\n[${category}] approved/ 파일 없음, 스킵`);
      continue;
    }

    const targets = isTest ? [files[0]] : files;
    console.log(`\n[${category}] ${targets.length}장 처리`);

    for (const filePath of targets) {
      await processFile(filePath, category, path.basename(filePath));
      processed++;
    }
  }

  console.log(`\n✅ 완료!  처리: ${processed}장`);
  console.log(`   thumbnail/templates/generated/ 에서 JSON 토큰을 확인하세요.\n`);
}

main().catch(console.error);
```

- [ ] **Step 2: `package.json`에 스크립트 추가**

```json
"thumbnail:split": "tsx scripts/thumbnail/split-layers.ts",
"thumbnail:split:test": "tsx scripts/thumbnail/split-layers.ts --test",
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/thumbnail/split-layers.ts package.json
git commit -m "feat: add split-layers script for layer separation and token extraction"
```

---

## Task 4: `.gitignore` 업데이트 + 엔드투엔드 테스트

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: `.gitignore`에 생성 자산 폴더 추가**

`.gitignore` 파일에 추가:
```
# Thumbnail pipeline generated assets
thumbnail/references-transformed/
thumbnail/references-layers/
thumbnail/templates/generated/
```

- [ ] **Step 2: 엔드투엔드 테스트**

```bash
# Step 1: overlay에서 1장 변형 생성
npm run thumbnail:transform -- --test --cat=overlay

# Step 2: 생성된 파일 approved/로 이동
mkdir -p thumbnail/references-transformed/overlay/approved
cp thumbnail/references-transformed/overlay/img-001.webp \
   thumbnail/references-transformed/overlay/approved/img-001.webp

# Step 3: 레이어 분리 + 토큰 추출
npm run thumbnail:split -- --test --cat=overlay

# Step 4: 결과 확인
ls thumbnail/references-layers/overlay/
# 예상: img-001-text.webp  img-001-style.webp

cat thumbnail/templates/generated/overlay/img-001.json
# 예상: { "sourceRef": "overlay/img-001", "category": "overlay", "textLayer": {...}, "styleLayer": {...} }
```

- [ ] **Step 3: 커밋**

```bash
git add .gitignore
git commit -m "chore: ignore generated thumbnail pipeline assets"
```

---

## Self-Review

**스펙 커버리지 체크:**
- ✅ 카테고리별 차등 프롬프트 → `category-prompts.json` (Task 1)
- ✅ 변형 생성 배치 스크립트 → `transform-references.ts` (Task 2)
- ✅ `approved/` 수동 이동 방식 → Task 4 Step 2에서 검증
- ✅ 텍스트/스타일 레이어 분리 → `split-layers.ts` (Task 3)
- ✅ JSON 토큰 추출 → `extractTokens()` 함수 (Task 3)
- ✅ `gemini-3.1-flash-image-preview` 단일 모델로 레이어 분리, `gemini-2.5-flash`로 Vision 토큰 추출
- ✅ `inlineData` + `responseModalities: ['IMAGE']` 패턴 명시
- ✅ `.gitignore` 처리 → Task 4

**타입 일관성 체크:**
- `Category` 타입: 모든 파일에서 동일하게 `'overlay' | 'a_text' | 'nukki' | 'overlay_effect'`
- `generateLayer()` 시그니처: `(sourcePath, outPath, prompt) → Promise<boolean>` — Task 3 내에서만 사용, 일관성 문제 없음
- `extractTokens()` 반환값: `object` (JSON.stringify로 저장) — 일관성 문제 없음
