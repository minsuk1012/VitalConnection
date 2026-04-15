/**
 * 레퍼런스 이미지 전체 분석 → design-vocabulary.json 생성
 * Gemini Vision으로 각 이미지의 디자인 요소를 카테고리별로 추출해 풀을 구성
 *
 * Run: npm run thumbnail:extract-vocab
 * Run (테스트 1장): npm run thumbnail:extract-vocab -- --test
 * Run (카테고리): npm run thumbnail:extract-vocab -- --cat=overlay
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

const REF_DIR = path.join(__dirname, '../../thumbnail/references');
const VOCAB_PATH = path.join(__dirname, '../../thumbnail/design-vocabulary.json');

const CATEGORIES = ['overlay', 'a_text', 'nukki', 'overlay_effect'] as const;
type Category = typeof CATEGORIES[number];

// ── 타입 ──────────────────────────────────────────────────

interface TextBlock {
  id: string;
  position: string;       // "bottom-left" | "bottom-right" | "top-left" | "center-bottom" 등
  layout: string;         // "stacked-2line" | "headline-only" | "headline+price" 등
  sizeClass: string;      // "large" | "medium" | "small"
  color: string;          // "white" | "black" | "pink" 등
  source: string;         // "overlay/img-002"
}

interface DecorativeAccent {
  id: string;
  type: string;           // "vertical-line" | "horizontal-rule" | "corner-bracket" | "badge" | "circle" | "none"
  placement: string;      // "left-edge" | "above-text" | "top-left-corner" 등
  color: string;
  source: string;
}

interface Overlay {
  id: string;
  type: string;           // "none" | "dark-gradient" | "light-wash" | "color-tint" | "vignette"
  direction?: string;     // "left-to-right" | "bottom-to-top" 등
  opacity?: string;       // "light" | "medium" | "heavy"
  source: string;
}

interface ModelComposition {
  id: string;
  present: boolean;
  framing?: string;       // "close-up-portrait" | "half-body" | "three-quarter" | "full-body"
  position?: string;      // "right-center" | "left" | "center"
  poseDirection?: string; // "facing-camera" | "side-profile" | "three-quarter-turn"
  source: string;
}

interface ColorMood {
  id: string;
  mood: string;           // "monochrome" | "warm-pink" | "gold-black" | "cool-white" | "vibrant"
  primaryColor: string;   // hex
  accentColor: string;    // hex
  source: string;
}

export interface DesignVocabulary {
  extractedAt: string;
  totalRefs: number;
  textBlocks: TextBlock[];
  decorativeAccents: DecorativeAccent[];
  overlays: Overlay[];
  modelCompositions: ModelComposition[];
  colorMoods: ColorMood[];
}

// ── 추출 스키마 ────────────────────────────────────────────

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    textBlock: {
      type: Type.OBJECT,
      properties: {
        position:  { type: Type.STRING },
        layout:    { type: Type.STRING },
        sizeClass: { type: Type.STRING },
        color:     { type: Type.STRING },
      },
      required: ['position', 'layout', 'sizeClass', 'color'],
    },
    decorativeAccent: {
      type: Type.OBJECT,
      properties: {
        type:      { type: Type.STRING },
        placement: { type: Type.STRING },
        color:     { type: Type.STRING },
      },
      required: ['type', 'placement', 'color'],
    },
    overlay: {
      type: Type.OBJECT,
      properties: {
        type:      { type: Type.STRING },
        direction: { type: Type.STRING },
        opacity:   { type: Type.STRING },
      },
      required: ['type'],
    },
    modelComposition: {
      type: Type.OBJECT,
      properties: {
        present:       { type: Type.BOOLEAN },
        framing:       { type: Type.STRING },
        position:      { type: Type.STRING },
        poseDirection: { type: Type.STRING },
      },
      required: ['present'],
    },
    colorMood: {
      type: Type.OBJECT,
      properties: {
        mood:         { type: Type.STRING },
        primaryColor: { type: Type.STRING },
        accentColor:  { type: Type.STRING },
      },
      required: ['mood', 'primaryColor', 'accentColor'],
    },
  },
  required: ['textBlock', 'decorativeAccent', 'overlay', 'modelComposition', 'colorMood'],
};

// ── 단일 이미지 분석 ───────────────────────────────────────

async function extractElements(
  imagePath: string
): Promise<{
  textBlock: Omit<TextBlock, 'id' | 'source'>;
  decorativeAccent: Omit<DecorativeAccent, 'id' | 'source'>;
  overlay: Omit<Overlay, 'id' | 'source'>;
  modelComposition: Omit<ModelComposition, 'id' | 'source'>;
  colorMood: Omit<ColorMood, 'id' | 'source'>;
}> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [
      { inlineData: { mimeType, data: base64 } },
      { text: `Analyze this Korean beauty clinic thumbnail and extract design elements.

textBlock: How text is arranged (position on canvas, layout style, size, color)
decorativeAccent: Non-text decorative element (line, shape, badge, frame) — type "none" if absent
overlay: Any color/gradient overlay on the photo background — type "none" if absent
modelComposition: Person/model in the image (present or not, framing, position, pose)
colorMood: Overall color palette mood and dominant colors as hex codes` }
    ]}],
    config: {
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    }
  });

  return JSON.parse(response.text ?? '{}');
}

// ── 메인 ──────────────────────────────────────────────────

async function main() {
  const isTest = process.argv.includes('--test');
  const catFlag = process.argv.find(a => a.startsWith('--cat='))?.replace('--cat=', '') as Category | undefined;

  // 기존 vocabulary 로드 (incremental 추출 지원)
  let vocab: DesignVocabulary = fs.existsSync(VOCAB_PATH)
    ? JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'))
    : { extractedAt: '', totalRefs: 0, textBlocks: [], decorativeAccents: [], overlays: [], modelCompositions: [], colorMoods: [] };

  const existingIds = new Set([
    ...vocab.textBlocks.map(t => t.source),
    ...vocab.decorativeAccents.map(d => d.source),
  ]);

  const categories = catFlag ? [catFlag] : [...CATEGORIES];
  let processed = 0;

  for (const category of categories) {
    const dir = path.join(REF_DIR, category);
    if (!fs.existsSync(dir)) continue;

    const images = fs.readdirSync(dir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.'))
      .sort()
      .map(f => ({ file: f, sourceId: `${category}/${f.replace(/\.[^.]+$/, '')}` }));

    const targets = isTest ? [images[0]] : images;
    if (!targets?.length) continue;

    console.log(`\n[${category}] ${targets.length}장 분석`);

    for (const { file, sourceId } of targets) {
      if (existingIds.has(sourceId)) {
        console.log(`  ⏭  스킵 (이미 추출됨): ${sourceId}`);
        continue;
      }

      process.stdout.write(`  🔍 ${file} ... `);
      try {
        const imagePath = path.join(dir, file);
        const elements = await extractElements(imagePath);

        const idx = String(vocab.textBlocks.length + 1).padStart(3, '0');

        vocab.textBlocks.push({ id: `tb-${idx}`, source: sourceId, ...elements.textBlock });
        vocab.decorativeAccents.push({ id: `da-${idx}`, source: sourceId, ...elements.decorativeAccent });
        vocab.overlays.push({ id: `ov-${idx}`, source: sourceId, ...elements.overlay });
        vocab.modelCompositions.push({ id: `mc-${idx}`, source: sourceId, ...elements.modelComposition });
        vocab.colorMoods.push({ id: `cm-${idx}`, source: sourceId, ...elements.colorMood });

        existingIds.add(sourceId);
        processed++;
        console.log(`✅`);

        // 중간 저장 (중단 시 유실 방지)
        vocab.extractedAt = new Date().toISOString();
        vocab.totalRefs = vocab.textBlocks.length;
        fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocab, null, 2));

      } catch (e: any) {
        console.log(`❌ ${e.message?.slice(0, 60)}`);
      }
    }
  }

  vocab.extractedAt = new Date().toISOString();
  vocab.totalRefs = vocab.textBlocks.length;
  fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocab, null, 2));

  console.log(`\n✅ 완료! 총 ${vocab.totalRefs}개 레퍼런스 추출됨`);
  console.log(`   저장: thumbnail/design-vocabulary.json\n`);
}

main().catch(console.error);
