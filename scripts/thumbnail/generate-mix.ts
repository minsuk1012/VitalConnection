/**
 * design-vocabulary.json에서 요소를 랜덤 조합 → 새 썸네일 이미지 생성
 * 각 디자인 요소를 다른 레퍼런스에서 가져와 섞기 때문에 어떤 레퍼런스와도 1:1 대응 안 됨
 *
 * Run: npm run thumbnail:mix
 * Run (N장): npm run thumbnail:mix -- --count=5
 * Run (시드 고정): npm run thumbnail:mix -- --seed=42
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, '../../.env.local') });
config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenAI } from '@google/genai';
// 타입 로컬 정의 (extract-vocab 모듈 로드 방지)
interface DesignVocabulary {
  extractedAt: string;
  totalRefs: number;
  textBlocks: { id: string; position: string; layout: string; sizeClass: string; color: string; source: string }[];
  decorativeAccents: { id: string; type: string; placement: string; color: string; source: string }[];
  overlays: { id: string; type: string; direction?: string; opacity?: string; source: string }[];
  modelCompositions: { id: string; present: boolean; framing?: string; position?: string; poseDirection?: string; source: string }[];
  colorMoods: { id: string; mood: string; primaryColor: string; accentColor: string; source: string }[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 .env.local에 없습니다');

const MODEL = 'gemini-3.1-flash-image-preview';
const VOCAB_PATH = path.join(__dirname, '../../thumbnail/design-vocabulary.json');
const OUT_DIR = path.join(__dirname, '../../thumbnail/references-transformed/mixed');

// ── 랜덤 샘플링 ────────────────────────────────────────────

function pick<T>(arr: T[], seed?: number): T {
  if (seed !== undefined) {
    // 단순 시드 기반 선택 (재현 가능)
    return arr[seed % arr.length];
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 프롬프트 조합 ──────────────────────────────────────────

function buildMixPrompt(vocab: DesignVocabulary): { prompt: string; recipe: object } {
  const textBlock      = pick(vocab.textBlocks);
  const accent         = pick(vocab.decorativeAccents);
  const overlay        = pick(vocab.overlays);
  const model          = pick(vocab.modelCompositions);
  const colorMood      = pick(vocab.colorMoods);

  // 소스 다양성 보장: 같은 레퍼런스에서 전부 나오지 않도록
  const sources = new Set([textBlock.source, accent.source, overlay.source, model.source, colorMood.source]);
  const diversity = sources.size; // 5면 완전히 다른 소스

  const recipe = {
    textBlock: { ...textBlock },
    accent: { ...accent },
    overlay: { ...overlay },
    model: { ...model },
    colorMood: { ...colorMood },
    sourceDiversity: `${diversity}/5 distinct sources`,
  };

  const modelDesc = model.present
    ? `${model.framing ?? 'portrait'} Korean beauty model, positioned ${model.position ?? 'right'}, ${model.poseDirection ?? 'facing camera'}`
    : 'no model/person — product or abstract visual only';

  const accentDesc = accent.type === 'none'
    ? 'no decorative accent'
    : `${accent.type} at ${accent.placement}, color: ${accent.color}`;

  const overlayDesc = overlay.type === 'none'
    ? 'no overlay — clean background'
    : `${overlay.type}${overlay.direction ? ` (${overlay.direction})` : ''}${overlay.opacity ? `, ${overlay.opacity} opacity` : ''}`;

  const prompt = `Create a Korean beauty clinic SNS thumbnail (1:1 square, 1080x1080).

Compose using these specific design elements:

TEXT BLOCK
- Position: ${textBlock.position} of canvas
- Layout: ${textBlock.layout} (e.g. stacked 2-line headline + subtext)
- Size: ${textBlock.sizeClass}
- Color: ${textBlock.color}
- Replace all text content with: [HEADLINE] and [SUBTEXT] (and [PRICE] if layout includes price)

DECORATIVE ACCENT
- ${accentDesc}

BACKGROUND OVERLAY
- ${overlayDesc}

MODEL / SUBJECT
- ${modelDesc}

COLOR MOOD
- Overall mood: ${colorMood.mood}
- Primary color: ${colorMood.primaryColor}
- Accent color: ${colorMood.accentColor}

RULES
- Use a completely original Korean beauty model (not copied from any source)
- All text must be placeholder labels only — never real Korean or English words
- Maintain professional Korean beauty clinic aesthetic
- If any elements conflict spatially, let the model composition take priority and adjust other elements naturally
- Output must be 100% original creative work`;

  return { prompt, recipe };
}

// ── 이미지 생성 ────────────────────────────────────────────

async function generateMix(prompt: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: { responseModalities: ['IMAGE'] }
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart) throw new Error('이미지 응답 없음');

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ── 메인 ──────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(VOCAB_PATH)) {
    console.error('❌ design-vocabulary.json 없음. 먼저 npm run thumbnail:extract-vocab 실행하세요.');
    process.exit(1);
  }

  const vocab: DesignVocabulary = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'));
  console.log(`📚 vocabulary 로드: ${vocab.totalRefs}개 레퍼런스`);

  const countArg = process.argv.find(a => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.replace('--count=', ''), 10) : 1;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'approved'), { recursive: true });

  const MAX_RETRIES = 3;

  for (let i = 0; i < count; i++) {
    const { prompt, recipe } = buildMixPrompt(vocab);
    const padded = String(i + 1).padStart(3, '0');
    const outPath = path.join(OUT_DIR, `mix-${padded}.webp`);
    const recipePath = path.join(OUT_DIR, `mix-${padded}.recipe.json`);

    console.log(`\n[${i + 1}/${count}] 생성 중...`);
    console.log(`  소스 다양성: ${(recipe as any).sourceDiversity}`);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const imageBuffer = await generateMix(prompt);

        const sharp = (await import('sharp')).default;
        await sharp(imageBuffer)
          .resize(1080, 1080, { fit: 'cover' })
          .webp({ quality: 90 })
          .toFile(outPath);

        // 레시피 저장 (어떤 조합으로 만들어졌는지 추적)
        fs.writeFileSync(recipePath, JSON.stringify({ recipe, prompt }, null, 2));
        console.log(`  ✅ 저장: mix-${padded}.webp`);
        break;
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          console.warn(`  ↩️  재시도 ${attempt}/${MAX_RETRIES}`);
          await new Promise(r => setTimeout(r, 3000 * attempt));
        }
      }
    }
    if (lastError && !fs.existsSync(outPath)) {
      console.error(`  ❌ 실패: ${lastError.message.slice(0, 80)}`);
    }
  }

  console.log(`\n✅ 완료! thumbnail/references-transformed/mixed/ 에서 확인하세요.`);
  console.log(`   각 이미지 옆 .recipe.json 에서 어떤 요소 조합인지 확인 가능\n`);
}

main().catch(console.error);
