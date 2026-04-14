/**
 * 모델 이미지 누끼 처리
 * output/models/ → output/models-cutout/ (PNG, 투명 배경)
 *
 * Run: npm run cutout
 * 첫 실행 시 ONNX 모델 다운로드 (~50MB)
 */
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR  = path.join(__dirname, '../../thumbnail/output/models');
const OUTPUT_DIR = path.join(__dirname, '../../thumbnail/output/models-cutout');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function processImage(filename: string): Promise<void> {
  const inputPath  = path.join(INPUT_DIR, filename);
  const outputName = filename.replace(/\.(webp|jpg|jpeg|png)$/i, '.png');
  const outputPath = path.join(OUTPUT_DIR, outputName);

  if (fs.existsSync(outputPath)) {
    console.log(`  ⏭  이미 존재: ${outputName}`);
    return;
  }

  console.log(`  ✂️  누끼 처리 중: ${filename}`);
  const startMs = Date.now();

  try {
    // WebP → PNG 변환 후 처리 (background-removal-node가 WebP 미지원)
    const pngBuffer = await sharp(inputPath).png().toBuffer();
    const blob = new Blob([pngBuffer], { type: 'image/png' });

    const resultBlob = await removeBackground(blob, {
      model: 'medium',           // small | medium | large
      output: { format: 'image/png', quality: 1.0 },
    });

    const buffer = Buffer.from(await resultBlob.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✅ 완료: ${outputName} (${((Date.now() - startMs) / 1000).toFixed(1)}s)`);
  } catch (e) {
    console.error(`  ❌ 실패: ${filename}`, e);
  }
}

async function main() {
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f));

  if (files.length === 0) {
    console.log('모델 이미지 없음. npm run generate 먼저 실행하세요.');
    return;
  }

  // --test 플래그: 첫 장만
  const targets = process.argv.includes('--test') ? [files[0]] : files;

  console.log(`\n✂️  누끼 처리 시작 (${process.argv.includes('--test') ? '테스트 1장' : `총 ${targets.length}장`})\n`);

  for (const file of targets) {
    await processImage(file);
  }

  const done = fs.readdirSync(OUTPUT_DIR).length;
  console.log(`\n✅ 완료! output/models-cutout/ 에 ${done}장 저장됨\n`);
}

main().catch(console.error);
