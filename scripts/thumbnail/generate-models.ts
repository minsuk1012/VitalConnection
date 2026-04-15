/**
 * AI 모델 이미지 생성
 * Gemini gemini-3.1-flash-image-preview (Nano Banana 2) → output/models/ 저장
 *
 * Run: npm run thumbnail:generate
 * Run (test 1장): npm run thumbnail:generate:test
 * Run (특정 variant): npm run thumbnail:generate -- --id=dewy-glow-1
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archetypes from './archetypes.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GEMINI_API_KEY = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY가 .env.local에 없습니다');

const OUTPUT_DIR = path.join(__dirname, '../../thumbnail/output/models');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MODEL = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── 이미지 생성 ──

async function generateImage(variantId: string, prompt: string): Promise<boolean> {
  const outPath = path.join(OUTPUT_DIR, `${variantId}.webp`);

  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  이미 존재: ${variantId}`);
    return false;
  }

  console.log(`  🎨 생성 중: ${variantId}...`);
  const startMs = Date.now();

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        candidateCount: 1,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(`Gemini API error (${res.status}): ${err?.error?.message}`);
  }

  const data = await res.json() as any;
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);

  if (!imagePart) {
    console.warn(`  ⚠️  이미지 없음: ${variantId}  parts=${JSON.stringify(parts.map((p: any) => Object.keys(p)))}`);
    return false;
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // webp로 변환 저장 (sharp)
  const sharp = (await import('sharp')).default;
  await sharp(buffer)
    .resize(1080, 1080, { fit: 'cover' })
    .webp({ quality: 90 })
    .toFile(outPath);

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`  ✅ 저장: ${variantId}.webp  (${elapsed}s)`);
  return true;
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
