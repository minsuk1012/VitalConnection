/**
 * 모델 이미지 누끼 처리
 * output/models/ → output/models-cutout/ (PNG, 투명 배경)
 *
 * 엔진: rembg (Python) — @imgly/background-removal-node 대비 품질 우수
 * 사전 조건: pip3 install rembg[cpu] Pillow
 *
 * Run: npm run thumbnail:cutout
 * Run (test 1장): npm run thumbnail:cutout:test
 */
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR  = path.join(__dirname, '../../thumbnail/output/models');
const OUTPUT_DIR = path.join(__dirname, '../../thumbnail/output/models-cutout');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// rembg Python 스크립트
const REMBG_SCRIPT = `
import sys
from rembg import remove
from PIL import Image

input_path  = sys.argv[1]
output_path = sys.argv[2]
inp = Image.open(input_path)
out = remove(inp)
out.save(output_path)
`.trim();

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
    // WebP는 rembg가 직접 지원하므로 변환 불필요
    // (Pillow가 WebP를 읽을 수 있음)
    execFileSync('python3', ['-c', REMBG_SCRIPT, inputPath, outputPath], {
      stdio: 'pipe',
    });

    // 출력 최적화: PNG 압축
    const buf = fs.readFileSync(outputPath);
    await sharp(buf).png({ compressionLevel: 8 }).toFile(outputPath + '.tmp');
    fs.renameSync(outputPath + '.tmp', outputPath);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`  ✅ 완료: ${outputName}  (${elapsed}s)`);
  } catch (e: any) {
    console.error(`  ❌ 실패: ${filename}  ${e.message?.slice(0, 80) ?? e}`);
  }
}

async function main() {
  // rembg 설치 여부 확인
  try {
    execFileSync('python3', ['-c', 'import rembg'], { stdio: 'pipe' });
  } catch {
    console.error('❌ rembg가 설치되어 있지 않습니다.');
    console.error('   pip3 install "rembg[cpu]" Pillow');
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f));

  if (files.length === 0) {
    console.log('모델 이미지 없음. npm run thumbnail:generate 먼저 실행하세요.');
    return;
  }

  const isTest  = process.argv.includes('--test');
  const targets = isTest ? [files[0]] : files;

  console.log(`\n✂️  누끼 처리 시작 (${isTest ? '테스트 1장' : `총 ${targets.length}장`})\n`);

  for (const file of targets) {
    await processImage(file);
  }

  const done = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).length;
  console.log(`\n✅ 완료!  output/models-cutout/ 에 ${done}장 저장됨\n`);
}

main().catch(console.error);
