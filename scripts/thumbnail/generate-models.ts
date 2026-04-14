/**
 * AI 모델 이미지 생성
 * Replicate Flux Pro v1.1 → output/models/ 저장
 *
 * Run: npm run generate
 * Run (test 1장): npm run generate:test
 */
import 'dotenv/config';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archetypes from './archetypes.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN이 .env에 없습니다');

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

const OUTPUT_DIR = path.join(__dirname, '../../thumbnail/output/models');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MODEL = 'black-forest-labs/flux-1.1-pro';
const WIDTH = 1080;
const HEIGHT = 1080;

// Flux Pro v1.1: $0.04/megapixel (올림)
const PRICE_PER_MP = 0.04;
const costPerImage = Math.ceil((WIDTH * HEIGHT) / 1_000_000) * PRICE_PER_MP;

// ── 이미지 생성 ──

async function generateImage(variantId: string, prompt: string): Promise<boolean> {
  const outPath = path.join(OUTPUT_DIR, `${variantId}.webp`);

  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  이미 존재: ${variantId}`);
    return false; // 생성 안 함 → 비용 없음
  }

  console.log(`  🎨 생성 중: ${variantId}...`);
  const startMs = Date.now();

  const output = await replicate.run(MODEL, {
    input: {
      prompt,
      width: WIDTH,
      height: HEIGHT,
      output_format: 'webp',
      output_quality: 90,
      safety_tolerance: 2,
    },
  });

  // Replicate SDK v1: FileOutput 객체 또는 배열
  const fileOutput: any = Array.isArray(output) ? output[0] : output;
  let buffer: Buffer;
  if (typeof fileOutput === 'string') {
    const res = await fetch(fileOutput);
    buffer = Buffer.from(await res.arrayBuffer());
  } else if (typeof fileOutput?.url === 'function') {
    const res = await fetch(fileOutput.url());
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    const blob = await fileOutput.blob();
    buffer = Buffer.from(await blob.arrayBuffer());
  }

  fs.writeFileSync(outPath, buffer);
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`  ✅ 저장: ${variantId}.webp  (${elapsed}s, $${costPerImage.toFixed(3)})`);
  return true;
}

// ── 메인 ──

async function main() {
  const isTest  = process.argv.includes('--test');
  const idFlag  = process.argv.find(a => a.startsWith('--id='))?.replace('--id=', '');
  const allVariants = archetypes.flatMap((a: any) => a.variants);

  let targets: typeof allVariants;
  if (idFlag) {
    const found = allVariants.find(v => v.id === idFlag);
    if (!found) { console.error(`❌ variant "${idFlag}" 없음\n가능한 ID:\n${allVariants.map(v => `  ${v.id}`).join('\n')}`); process.exit(1); }
    targets = [found];
  } else {
    targets = isTest ? [allVariants[0]] : allVariants;
  }

  const label = idFlag ? `--id=${idFlag}` : isTest ? '테스트 1장' : `총 ${targets.length}장`;
  console.log(`\n🚀 AI 모델 이미지 생성 시작 (${label})`);
  console.log(`   모델: ${MODEL}  |  해상도: ${WIDTH}×${HEIGHT}  |  장당 $${costPerImage.toFixed(3)}`);
  if (!isTest && !idFlag) console.log(`   예상 총비용: $${(targets.length * costPerImage).toFixed(2)}\n`);

  let generated = 0;

  for (const archetype of archetypes) {
    const variants = archetype.variants.filter(v => targets.includes(v));
    if (variants.length === 0) continue;
    console.log(`\n[${archetype.label}]`);
    for (const variant of variants) {
      const didGenerate = await generateImage(variant.id, variant.prompt);
      if (didGenerate) generated++;
    }
  }

  const totalCost = generated * costPerImage;
  console.log(`\n✅ 완료!`);
  console.log(`   생성: ${generated}장  |  실제 비용: $${totalCost.toFixed(3)}`);
  console.log(`   output/models/ 에서 확인하세요.\n`);
}

main().catch(console.error);
