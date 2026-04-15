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
              type:             { type: Type.STRING },
              position:         { type: Type.STRING },
              sizeClass:        { type: Type.STRING },
              fontWeight:       { type: Type.STRING },
              color:            { type: Type.STRING },
              estimatedTopPct:  { type: Type.NUMBER },
              estimatedLeftPct: { type: Type.NUMBER },
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
        console.warn(`  ↩️  재시도 ${attempt}/${MAX_RETRIES}: ${(lastError as Error).message.slice(0, 60)}`);
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

  const categories = catFlag ? [catFlag as Category] : [...CATEGORIES];
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
