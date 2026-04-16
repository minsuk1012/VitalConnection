/**
 * AI 모델 이미지 생성
 * Gemini gemini-3.1-flash-image-preview (Nano Banana 2) → output/models/ 저장
 *
 * Run: npm run thumbnail:generate
 * Run (test 1장): npm run thumbnail:generate:test
 * Run (특정 variant): npm run thumbnail:generate -- --id=dewy-glow-1
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archetypes from './archetypes.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Next.js 프로젝트는 .env.local 우선
config({ path: path.resolve(__dirname, '../../.env.local') });
config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 .env.local에 없습니다');

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const OUTPUT_DIR = path.join(__dirname, '../../thumbnail/output/models');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MODEL = 'gemini-3.1-flash-image-preview';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// ── 이미지 생성 ──

async function generateImage(variantId: string, prompt: string): Promise<boolean> {
  const outPath = path.join(OUTPUT_DIR, `${variantId}.webp`);

  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  이미 존재: ${variantId}`);
    return false;
  }

  console.log(`  🎨 생성 중: ${variantId}...`);
  const startMs = Date.now();

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: ['IMAGE'] },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);

      if (!imagePart) {
        console.warn(`  ⚠️  이미지 없음: ${variantId}`);
        return false;
      }

      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const sharp = (await import('sharp')).default;
      await sharp(buffer)
        .resize(1080, 1080, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(outPath);

      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      console.log(`  ✅ 저장: ${variantId}.webp  (${elapsed}s)`);
      return true;

    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        console.warn(`  ↩️  재시도 ${attempt}/${MAX_RETRIES}: ${lastError.message.slice(0, 60)}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(`${variantId} 생성 실패 (${MAX_RETRIES}회 재시도): ${lastError?.message}`);
}

// ── 메인 ──

async function main() {
  const isTest = process.argv.includes('--test');
  const idFlag = process.argv.find(a => a.startsWith('--id='))?.replace('--id=', '');
  const allVariants = (archetypes as any[]).flatMap((a: any) => a.variants);

  let targets: typeof allVariants;
  if (idFlag) {
    const found = allVariants.find((v: any) => v.id === idFlag);
    if (!found) {
      console.error(`❌ variant "${idFlag}" 없음\n가능한 ID:\n${allVariants.map((v: any) => `  ${v.id}`).join('\n')}`);
      process.exit(1);
    }
    targets = [found];
  } else {
    targets = isTest ? [allVariants[0]] : allVariants;
  }

  const label = idFlag ? `--id=${idFlag}` : isTest ? '테스트 1장' : `총 ${targets.length}장`;
  console.log(`\n🚀 AI 모델 이미지 생성 시작 (${label})`);
  console.log(`   모델: ${MODEL}`);
  console.log(`   출력: thumbnail/output/models/\n`);

  let generated = 0;

  for (const archetype of archetypes as any[]) {
    const variants = archetype.variants.filter((v: any) => targets.includes(v));
    if (variants.length === 0) continue;
    console.log(`\n[${archetype.label}]`);
    for (const variant of variants) {
      const didGenerate = await generateImage(variant.id, variant.prompt);
      if (didGenerate) generated++;
    }
  }

  console.log(`\n✅ 완료!  생성: ${generated}장`);
  console.log(`   thumbnail/output/models/ 에서 확인하세요.\n`);
}

main().catch(console.error);
