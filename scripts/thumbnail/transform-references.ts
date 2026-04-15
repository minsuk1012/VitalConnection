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

function getOutputPath(category: string, index: number): string {
  const outDir = path.join(OUT_DIR, category);
  fs.mkdirSync(outDir, { recursive: true });
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

  if (fileFlag) {
    const [category, filename] = fileFlag.split('/');
    if (!CATEGORIES.includes(category as Category)) {
      console.error(`❌ 유효하지 않은 카테고리: ${category}. 허용값: ${CATEGORIES.join(', ')}`);
      process.exit(1);
    }
    const refPath = path.join(REF_DIR, category, filename);
    if (!fs.existsSync(refPath)) {
      console.error(`❌ 파일 없음: ${refPath}`);
      process.exit(1);
    }
    const outPath = getOutputPath(category, 0);
    const prompt = buildPrompt(category as Category);
    await transformImage(refPath, outPath, prompt);
    return;
  }

  const categories = catFlag ? [catFlag as Category] : [...CATEGORIES];
  let generated = 0;

  for (const category of categories) {
    const images = await getRefImages(category);
    if (images.length === 0) {
      console.log(`\n[${category}] 이미지 없음, 스킵`);
      continue;
    }

    const targets = isTest ? [images[0]] : images;
    const prompt = buildPrompt(category);

    console.log(`\n[${category}] ${targets.length}장 처리`);

    for (let i = 0; i < targets.length; i++) {
      const outPath = getOutputPath(category, i);
      const did = await transformImage(targets[i], outPath, prompt);
      if (did) generated++;
    }
  }

  console.log(`\n✅ 완료!  생성: ${generated}장`);
  console.log(`   thumbnail/references-transformed/ 에서 확인 후 approved/ 폴더로 이동하세요.\n`);
}

main().catch(console.error);
