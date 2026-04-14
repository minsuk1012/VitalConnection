/**
 * 배치 썸네일 생성
 * procedures.json × archetypes → 전체 썸네일 자동 생성
 *
 * Run: npm run batch
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archetypes from './archetypes.json' with { type: 'json' };
import { renderTemplate, closeBrowser, type LayoutType } from '../../lib/thumbnail-renderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 설정 ──

const PARTNER_DATA_DIR = path.join(
  __dirname,
  '../../beautypass-develop/backend-nest/scripts/partner-data',
);

// 시술명(ko) → 영문명 매핑 (없으면 한글 그대로 사용)
const PROCEDURE_NAME_MAP: Record<string, string> = {
  '리쥬란힐러': 'Juvelook',
  '리쥬란HB': 'Juvelook HB',
  '아이리쥬란': 'Eye Rejuran',
  '울쎄라': 'Ulthera',
  '울쎄라피 PRIME': 'Ultherapy Prime',
  '써마지 FLX': 'Thermage FLX',
  '아이써마지 FLX': 'Eye Thermage FLX',
  '인모드': 'InMode',
  '슈링크유니버스': 'Shrink Universe',
  '보톡스': 'Botox',
  '주름보톡스': 'Anti-Wrinkle',
  '사각턱보톡스': 'Jaw Botox',
  '리프팅보톡스': 'Lifting Botox',
  '스킨보톡스': 'Skin Botox',
  '입술필러': 'Lip Filler',
  '코필러': 'Nose Filler',
  '물광주사': 'Glow Injection',
  '스킨부스터': 'Skin Booster',
  '엑소좀': 'Exosome',
  '영양주사': 'Nutrient IV',
  '줄기세포': 'Stem Cell',
  '지방흡입': 'Liposuction',
  '체형관리': 'Body Care',
  '제모': 'Hair Removal',
  '모공치료': 'Pore Care',
  '기미치료': 'Pigmentation',
  '레이저토닝': 'Laser Toning',
  '피코토닝': 'Pico Toning',
  '프락셀': 'Fraxel',
  '포텐자': 'Potenza',
  '쌍꺼풀': 'Double Eyelid',
  '눈매교정': 'Eye Correction',
  '안면윤곽': 'Facial Contouring',
  '실리프팅': 'Thread Lift',
  '피부관리': 'Skin Care',
};

// 아키타입별 레이아웃 + 액센트 컬러
const ARCHETYPE_TEMPLATE: Record<string, { layout: LayoutType; accentColor: string }> = {
  'dewy-glow': { layout: 'left-split', accentColor: '#FF6B9D' },
  'clear-tone': { layout: 'minimal-editorial', accentColor: '#0EA5E9' },
  'vline-sharp': { layout: 'diagonal-split', accentColor: '#38BDF8' },
  'lip-gloss': { layout: 'left-split', accentColor: '#DB2777' },
  'bold-eye': { layout: 'minimal-editorial', accentColor: '#7C3AED' },
  'body-line': { layout: 'full-overlay', accentColor: '#7C3AED' },
};

// ── 시술명 → 아키타입 매핑 ──

function findArchetype(procedureName: string): typeof archetypes[0] | undefined {
  for (const arch of archetypes) {
    if (arch.procedures.some((p) => procedureName.includes(p))) return arch;
  }
  return archetypes[0]; // 기본값: dewy-glow
}

function toEnName(koName: string): string {
  for (const [key, val] of Object.entries(PROCEDURE_NAME_MAP)) {
    if (koName.includes(key)) return val;
  }
  return koName; // 매핑 없으면 한글 그대로
}

// ── 병원 정보 ──

interface HospitalMeta {
  clinicNameEn: string;
  clinicNameKo: string;
}

function getHospitalMeta(dirName: string): HospitalMeta {
  const map: Record<string, HospitalMeta> = {
    anz_derm: { clinicNameEn: 'ANZ DERMATOLOGY', clinicNameKo: '안즈피부과' },
    btq_derm: { clinicNameEn: 'BTQ CLINIC', clinicNameKo: 'BTQ의원' },
    dayview_derm: { clinicNameEn: 'DAYVIEW DERM', clinicNameKo: '데이뷰피부과' },
    opera_ps: { clinicNameEn: 'OPERA PS', clinicNameKo: '오페라성형외과' },
    repic_derm: { clinicNameEn: 'REPIC CLINIC', clinicNameKo: '레픽의원' },
  };
  return map[dirName] ?? { clinicNameEn: dirName.toUpperCase(), clinicNameKo: dirName };
}

// ── 메인 ──

async function main() {
  if (!fs.existsSync(PARTNER_DATA_DIR)) {
    console.error(`partner-data 경로를 찾을 수 없습니다: ${PARTNER_DATA_DIR}`);
    console.error('PARTNER_DATA_DIR 경로를 실제 경로에 맞게 수정하세요.');
    process.exit(1);
  }

  const hospitals = fs.readdirSync(PARTNER_DATA_DIR);
  let total = 0;
  let skipped = 0;

  for (const hospital of hospitals) {
    const jsonPath = path.join(PARTNER_DATA_DIR, hospital, 'procedures.json');
    if (!fs.existsSync(jsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const procedures: { procedureName: string }[] = data.procedures ?? [];
    const meta = getHospitalMeta(hospital);

    console.log(`\n[${meta.clinicNameKo}] ${procedures.length}개 시술`);

    for (const proc of procedures) {
      const koName = proc.procedureName;
      const enName = toEnName(koName);
      const archetype = findArchetype(koName);
      if (!archetype) continue;

      // 아키타입의 첫 번째 variant 사용 (또는 랜덤)
      const variantIdx = total % archetype.variants.length;
      const variant = archetype.variants[variantIdx];
      const modelPath = path.join(__dirname, `output/models/${variant.id}.webp`);

      if (!fs.existsSync(modelPath)) {
        console.log(`  ⚠️  모델 이미지 없음: ${variant.id} (npm run generate 먼저 실행)`);
        skipped++;
        continue;
      }

      const templateConf = ARCHETYPE_TEMPLATE[archetype.id];
      const outPath = path.join(
        __dirname,
        `output/thumbnails/${hospital}`,
        `${koName.replace(/[/\s]/g, '_')}.webp`,
      );

      if (fs.existsSync(outPath)) {
        skipped++;
        continue;
      }

      await renderTemplate(templateConf.layout, {
        headline: enName,
        brandEn: meta.clinicNameEn,
        brandKo: meta.clinicNameKo,
        model:   modelPath,
      }, outPath);

      total++;
      process.stdout.write(`  ✅ ${koName} → ${enName}\n`);
    }
  }

  console.log(`\n🎉 완료! 생성: ${total}장, 스킵: ${skipped}장`);
  console.log(`   output/thumbnails/ 에서 확인하세요.\n`);
}

main().catch(console.error);
