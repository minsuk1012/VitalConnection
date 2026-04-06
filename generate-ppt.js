const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();

// ── Global defaults ──
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pptx.author = "VitalConnection";
pptx.title = "VitalConnection - 병원 전문 글로벌 마케팅 에이전시";

const COLORS = {
  blue600: "2563EB",
  blue700: "1D4ED8",
  blue100: "DBEAFE",
  blue50: "EFF6FF",
  cyan500: "06B6D4",
  emerald600: "059669",
  emerald100: "D1FAE5",
  indigo600: "4F46E5",
  purple600: "9333EA",
  gray900: "111827",
  gray800: "1F2937",
  gray700: "374151",
  gray600: "4B5563",
  gray500: "6B7280",
  gray400: "9CA3AF",
  gray100: "F3F4F6",
  gray50: "F9FAFB",
  white: "FFFFFF",
  red500: "EF4444",
};

// ══════════════════════════════════════════════════════════
// SLIDE 1: Cover / Hero
// ══════════════════════════════════════════════════════════
const slide1 = pptx.addSlide();
// Background gradient simulation
slide1.background = { fill: COLORS.blue50 };

// Top decorative bar
slide1.addShape(pptx.ShapeType.rect, {
  x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: COLORS.blue600 },
});

// Badge
slide1.addShape(pptx.ShapeType.roundRect, {
  x: 0.8, y: 1.2, w: 3.2, h: 0.45, rectRadius: 0.2,
  fill: { color: COLORS.blue100 },
});
slide1.addText("병원 전문 글로벌 마케팅 에이전시", {
  x: 0.8, y: 1.2, w: 3.2, h: 0.45,
  fontSize: 11, color: COLORS.blue700, bold: true, align: "center",
});

// Main title
slide1.addText([
  { text: "대한민국의 의료기술,\n", options: { fontSize: 36, bold: true, color: COLORS.gray900, breakType: "none" } },
  { text: "세계와 연결합니다.", options: { fontSize: 36, bold: true, color: COLORS.blue600 } },
], { x: 0.8, y: 2.0, w: 5.5, h: 2.0, lineSpacingMultiple: 1.2 });

// Subtitle
slide1.addText(
  "외국인 환자 유치, 더 이상 고민하지 마세요.\nVitalConnection의 데이터 기반 올인원 솔루션으로\n귀원의 글로벌 브랜딩을 시작하세요.",
  { x: 0.8, y: 4.0, w: 5.5, h: 1.2, fontSize: 14, color: COLORS.gray600, lineSpacingMultiple: 1.5 }
);

// CTA buttons
slide1.addShape(pptx.ShapeType.roundRect, {
  x: 0.8, y: 5.5, w: 2.2, h: 0.6, rectRadius: 0.3,
  fill: { color: COLORS.blue600 },
  shadow: { type: "outer", blur: 10, offset: 3, color: "2563EB", opacity: 0.3 },
});
slide1.addText("입점 문의하기", {
  x: 0.8, y: 5.5, w: 2.2, h: 0.6,
  fontSize: 13, color: COLORS.white, bold: true, align: "center",
});

// Right side stats card
slide1.addShape(pptx.ShapeType.roundRect, {
  x: 7.5, y: 1.8, w: 4.5, h: 2.2, rectRadius: 0.3,
  fill: { color: COLORS.white },
  shadow: { type: "outer", blur: 12, offset: 4, color: "000000", opacity: 0.1 },
});
slide1.addText([
  { text: "월간 문의 ", options: { fontSize: 12, color: COLORS.gray500 } },
  { text: "+245%", options: { fontSize: 28, bold: true, color: COLORS.emerald600 } },
], { x: 7.8, y: 2.0, w: 4.0, h: 0.8 });
slide1.addText([
  { text: "Global Patients\n", options: { fontSize: 16, bold: true, color: COLORS.gray800 } },
  { text: "12 Countries Connected", options: { fontSize: 12, color: COLORS.gray500 } },
], { x: 7.8, y: 2.8, w: 4.0, h: 0.8 });

// Decorative circle
slide1.addShape(pptx.ShapeType.ellipse, {
  x: 10.5, y: 4.5, w: 3.5, h: 3.5,
  fill: { color: COLORS.blue100 }, line: { width: 0 },
});

// Logo / company name
slide1.addText("VitalConnection", {
  x: 0.8, y: 6.7, w: 4, h: 0.5,
  fontSize: 16, bold: true, color: COLORS.gray900,
});


// ══════════════════════════════════════════════════════════
// SLIDE 2: Process - 3-Step System
// ══════════════════════════════════════════════════════════
const slide2 = pptx.addSlide();
slide2.background = { fill: COLORS.white };

// Section label
slide2.addShape(pptx.ShapeType.roundRect, {
  x: 4.8, y: 0.5, w: 1.8, h: 0.4, rectRadius: 0.2,
  fill: { color: COLORS.blue100 },
});
slide2.addText("HOW IT WORKS", {
  x: 4.8, y: 0.5, w: 1.8, h: 0.4,
  fontSize: 10, bold: true, color: COLORS.blue600, align: "center",
});

// Title
slide2.addText([
  { text: "환자가 병원에 도착하기까지\n", options: { fontSize: 26, bold: true, color: COLORS.gray900 } },
  { text: "VitalConnection의 3-Step 시스템", options: { fontSize: 26, bold: true, color: COLORS.blue600 } },
], { x: 1.5, y: 1.0, w: 10, h: 1.4, align: "center", lineSpacingMultiple: 1.2 });

const steps = [
  { title: "정밀 타겟팅", desc: "현지 검색 트렌드와 빅데이터를 분석하여\n한국 의료에 관심 있는 잠재 고객을\n발굴합니다.", color: COLORS.blue600, num: "01" },
  { title: "1:1 밀착 상담", desc: "AI 번역 시스템과 전문 코디네이터가\n언어 장벽 없이 내원 전 신뢰를\n구축합니다.", color: COLORS.indigo600, num: "02" },
  { title: "내원 및 케어", desc: "공항 픽업부터 진료, 사후 관리까지\n끊김 없는(Seamless) 경험을\n제공합니다.", color: COLORS.purple600, num: "03" },
];

// Connecting line
slide2.addShape(pptx.ShapeType.rect, {
  x: 2.5, y: 3.6, w: 8.3, h: 0.06,
  fill: { type: "solid", color: COLORS.blue100 },
});

steps.forEach((step, idx) => {
  const xBase = 1.2 + idx * 4;

  // Card
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: xBase, y: 2.8, w: 3.5, h: 3.8, rectRadius: 0.3,
    fill: { color: COLORS.white },
    shadow: { type: "outer", blur: 10, offset: 4, color: "000000", opacity: 0.08 },
    line: { color: COLORS.gray100, width: 1 },
  });

  // Number badge
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: xBase + 1.15, y: 3.1, w: 1.2, h: 1.2, rectRadius: 0.25,
    fill: { color: step.color },
    shadow: { type: "outer", blur: 8, offset: 3, color: step.color, opacity: 0.3 },
  });
  slide2.addText(step.num, {
    x: xBase + 1.15, y: 3.1, w: 1.2, h: 1.2,
    fontSize: 24, bold: true, color: COLORS.white, align: "center", valign: "middle",
  });

  // Title
  slide2.addText(step.title, {
    x: xBase + 0.3, y: 4.5, w: 2.9, h: 0.5,
    fontSize: 16, bold: true, color: COLORS.gray800, align: "center",
  });

  // Description
  slide2.addText(step.desc, {
    x: xBase + 0.3, y: 5.1, w: 2.9, h: 1.2,
    fontSize: 11, color: COLORS.gray500, align: "center", lineSpacingMultiple: 1.4,
  });
});


// ══════════════════════════════════════════════════════════
// SLIDE 3: Services - All-in-One
// ══════════════════════════════════════════════════════════
const slide3 = pptx.addSlide();
slide3.background = { fill: COLORS.gray50 };

// Section label
slide3.addText("Our Expertise", {
  x: 0, y: 0.5, w: 13.33, h: 0.4,
  fontSize: 11, bold: true, color: COLORS.blue600, align: "center", isTextBox: true,
});

// Title
slide3.addText([
  { text: "병원 맞춤형 ", options: { fontSize: 28, bold: true, color: COLORS.gray900 } },
  { text: "All-in-One", options: { fontSize: 28, bold: true, color: COLORS.blue600 } },
  { text: " 솔루션", options: { fontSize: 28, bold: true, color: COLORS.gray900 } },
], { x: 0, y: 1.0, w: 13.33, h: 0.6, align: "center" });

slide3.addText("단순 광고 대행이 아닙니다. 병원의 특장점을 분석하여\n진성 환자를 유입시키는 전략적 파트너입니다.", {
  x: 2.5, y: 1.7, w: 8.33, h: 0.7, fontSize: 12, color: COLORS.gray500, align: "center", lineSpacingMultiple: 1.4,
});

const services = [
  { title: "타겟 국가 최적화", desc: "국가별 선호 시술 데이터 분석\n및 현지화 마케팅", icon: "G", iconColor: COLORS.blue600 },
  { title: "다국어 SEO/SEM", desc: "구글 상위 노출 및\n키워드 점유 전략", icon: "S", iconColor: COLORS.emerald600 },
  { title: "인플루언서 연계", desc: "해외 뷰티 유튜버/틱톡커\n협업 콘텐츠 제작", icon: "I", iconColor: COLORS.purple600 },
  { title: "실시간 상담 지원", desc: "AI 챗봇 및 현지\n코디네이터 연결 시스템", icon: "C", iconColor: COLORS.indigo600 },
];

services.forEach((svc, idx) => {
  const xBase = 0.8 + idx * 3.1;

  // Card
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: xBase, y: 2.8, w: 2.8, h: 3.6, rectRadius: 0.3,
    fill: { color: COLORS.white },
    shadow: { type: "outer", blur: 10, offset: 4, color: "000000", opacity: 0.08 },
    line: { color: COLORS.gray100, width: 1 },
  });

  // Icon background circle
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: xBase + 0.6, y: 3.1, w: 1.0, h: 1.0, rectRadius: 0.2,
    fill: { color: svc.iconColor },
    shadow: { type: "outer", blur: 6, offset: 2, color: svc.iconColor, opacity: 0.3 },
  });
  slide3.addText(svc.icon, {
    x: xBase + 0.6, y: 3.1, w: 1.0, h: 1.0,
    fontSize: 28, bold: true, align: "center", valign: "middle", color: COLORS.white,
  });

  // Title
  slide3.addText(svc.title, {
    x: xBase + 0.3, y: 4.3, w: 2.2, h: 0.5,
    fontSize: 15, bold: true, color: COLORS.gray800,
  });

  // Description
  slide3.addText(svc.desc, {
    x: xBase + 0.3, y: 4.9, w: 2.2, h: 1.0,
    fontSize: 11, color: COLORS.gray500, lineSpacingMultiple: 1.4,
  });
});


// ══════════════════════════════════════════════════════════
// SLIDE 4: Market Insight - Visitor Growth
// ══════════════════════════════════════════════════════════
const slide4 = pptx.addSlide();
slide4.background = { fill: COLORS.white };

// Section label
slide4.addText("MARKET INSIGHT", {
  x: 0.8, y: 0.5, w: 3, h: 0.4,
  fontSize: 11, bold: true, color: COLORS.blue600,
});

// Title
slide4.addText([
  { text: "급증하는\n", options: { fontSize: 30, bold: true, color: COLORS.gray900 } },
  { text: "방한 외래관광객", options: { fontSize: 30, bold: true, color: COLORS.blue600 } },
], { x: 0.8, y: 1.0, w: 5, h: 1.5, lineSpacingMultiple: 1.2 });

slide4.addText(
  "2024년 11월부터 2025년 10월까지의 데이터는\n폭발적인 관광객 증가세를 보여줍니다.\n지금이 바로 글로벌 환자 유치 마케팅을 시작할 최적의 타이밍입니다.",
  { x: 0.8, y: 2.5, w: 5, h: 1.2, fontSize: 12, color: COLORS.gray600, lineSpacingMultiple: 1.5 }
);

// Chart data as bar chart (simulated with shapes)
const visitorData = [
  { month: "24.11", visitors: 1361076 },
  { month: "12", visitors: 1270863 },
  { month: "25.01", visitors: 1117243 },
  { month: "02", visitors: 1138408 },
  { month: "03", visitors: 1614596 },
  { month: "04", visitors: 1707113 },
  { month: "05", visitors: 1629387 },
  { month: "06", visitors: 1619220 },
  { month: "07", visitors: 1733199 },
  { month: "08", visitors: 1820332 },
  { month: "09", visitors: 1702813 },
  { month: "10", visitors: 1739020 },
];

const maxV = Math.max(...visitorData.map(d => d.visitors));
const chartX = 0.8;
const chartY = 4.0;
const chartW = 11.5;
const chartH = 2.8;
const barW = 0.7;
const gap = (chartW - barW * 12) / 13;

visitorData.forEach((d, idx) => {
  const barH = (d.visitors / maxV) * (chartH - 0.5);
  const xPos = chartX + gap + idx * (barW + gap);
  const yPos = chartY + chartH - barH - 0.3;
  const isMax = d.visitors === maxV;

  // Bar
  slide4.addShape(pptx.ShapeType.roundRect, {
    x: xPos, y: yPos, w: barW, h: barH, rectRadius: 0.08,
    fill: { color: isMax ? COLORS.blue600 : "93C5FD" },
  });

  // Month label
  slide4.addText(d.month, {
    x: xPos - 0.1, y: chartY + chartH - 0.2, w: barW + 0.2, h: 0.3,
    fontSize: 8, color: COLORS.gray500, align: "center",
  });

  // Value on top (only show for max and notable)
  if (isMax) {
    slide4.addText((d.visitors / 10000).toFixed(0) + "만", {
      x: xPos - 0.15, y: yPos - 0.3, w: barW + 0.3, h: 0.3,
      fontSize: 9, bold: true, color: COLORS.blue600, align: "center",
    });
  }
});


// ══════════════════════════════════════════════════════════
// SLIDE 5: Global Targeting - Nationality Chart
// ══════════════════════════════════════════════════════════
const slide5 = pptx.addSlide();
slide5.background = { fill: COLORS.gray50 };

// Section label
slide5.addShape(pptx.ShapeType.roundRect, {
  x: 7.5, y: 0.5, w: 2.2, h: 0.4, rectRadius: 0.2,
  fill: { color: COLORS.emerald100 },
});
slide5.addText("GLOBAL TARGETING", {
  x: 7.5, y: 0.5, w: 2.2, h: 0.4,
  fontSize: 10, bold: true, color: COLORS.emerald600, align: "center",
});

// Title (right side)
slide5.addText([
  { text: "병원의 성장을 만드는\n", options: { fontSize: 26, bold: true, color: COLORS.gray900 } },
  { text: "3대 핵심 타깃", options: { fontSize: 26, bold: true, color: COLORS.emerald600 } },
], { x: 7.5, y: 1.0, w: 5, h: 1.4, lineSpacingMultiple: 1.2 });

slide5.addText(
  "효율적인 해외환자 유치를 위해\n국가별 특성과 소비 패턴을 반영한 전략적 집중이 필요합니다.",
  { x: 7.5, y: 2.4, w: 5, h: 0.8, fontSize: 12, color: COLORS.gray600, lineSpacingMultiple: 1.4 }
);

// Target countries list
const targets = [
  { name: "중국 본토 (Mainland China)", desc: "프리미엄 시술 수요와 높은 전환율", color: COLORS.red500 },
  { name: "대만 · 홍콩 (Taiwan / Hong Kong)", desc: "성형·피부 미용 분야 높은 재유입률", color: COLORS.blue600 },
  { name: "미국 · 영어권 (US / EN Markets)", desc: "지속적으로 새로운 수요가 확대되고 있는 글로벌의 핵심", color: COLORS.indigo600 },
];

targets.forEach((t, idx) => {
  const yPos = 3.5 + idx * 1.1;
  slide5.addShape(pptx.ShapeType.ellipse, {
    x: 7.5, y: yPos, w: 0.35, h: 0.35,
    fill: { color: t.color },
  });
  slide5.addText(t.name, {
    x: 8.05, y: yPos - 0.05, w: 4.5, h: 0.35,
    fontSize: 13, bold: true, color: COLORS.gray900,
  });
  slide5.addText(t.desc, {
    x: 8.05, y: yPos + 0.3, w: 4.5, h: 0.3,
    fontSize: 10, color: COLORS.gray500,
  });
});

// Nationality bar chart (left side)
const nationData = [
  { country: "중국", visitors: 531, raw: "5,313,896", color: COLORS.red500, flag: "🇨🇳" },
  { country: "일본", visitors: 358, raw: "3,577,043", color: COLORS.blue600, flag: "🇯🇵" },
  { country: "대만", visitors: 181, raw: "1,807,323", color: COLORS.emerald600, flag: "🇹🇼" },
  { country: "미국", visitors: 145, raw: "1,449,861", color: COLORS.indigo600, flag: "🇺🇸" },
  { country: "홍콩", visitors: 61, raw: "610,711", color: "F59E0B", flag: "🇭🇰" },
];

// Chart card
slide5.addShape(pptx.ShapeType.roundRect, {
  x: 0.5, y: 0.5, w: 6.5, h: 6.2, rectRadius: 0.3,
  fill: { color: COLORS.white },
  shadow: { type: "outer", blur: 12, offset: 4, color: "000000", opacity: 0.08 },
  line: { color: COLORS.gray100, width: 1 },
});

slide5.addText("국적별 방한 외래객 TOP 5", {
  x: 1.0, y: 0.8, w: 5, h: 0.4,
  fontSize: 15, bold: true, color: COLORS.gray900,
});
slide5.addText("주요 타겟 국가별 방문 규모 (2024~2025 기준)", {
  x: 1.0, y: 1.2, w: 5, h: 0.35,
  fontSize: 10, color: COLORS.gray500,
});

const maxN = Math.max(...nationData.map(d => d.visitors));
nationData.forEach((d, idx) => {
  const yPos = 2.0 + idx * 0.9;
  const barWidth = (d.visitors / maxN) * 4.0;

  // Country label
  slide5.addText(`${d.flag} ${d.country}`, {
    x: 1.0, y: yPos, w: 1.3, h: 0.5,
    fontSize: 12, bold: true, color: COLORS.gray700, valign: "middle",
  });

  // Bar
  slide5.addShape(pptx.ShapeType.roundRect, {
    x: 2.4, y: yPos + 0.05, w: barWidth, h: 0.4, rectRadius: 0.08,
    fill: { color: d.color },
  });

  // Value
  slide5.addText(`${d.raw}명`, {
    x: 2.4 + barWidth + 0.15, y: yPos, w: 1.5, h: 0.5,
    fontSize: 10, color: COLORS.gray500, valign: "middle",
  });
});


// ══════════════════════════════════════════════════════════
// SLIDE 6: FAQ (Top 5)
// ══════════════════════════════════════════════════════════
const slide6 = pptx.addSlide();
slide6.background = { fill: COLORS.white };

slide6.addText("FAQ", {
  x: 0.8, y: 0.4, w: 2, h: 0.4,
  fontSize: 11, bold: true, color: COLORS.blue600,
});

slide6.addText("자주 묻는 질문", {
  x: 0.8, y: 0.8, w: 5, h: 0.6,
  fontSize: 26, bold: true, color: COLORS.gray900,
});

slide6.addText("파트너 병원 원장님들이 가장 궁금해하시는 내용을 정리했습니다.", {
  x: 0.8, y: 1.4, w: 5, h: 0.4,
  fontSize: 11, color: COLORS.gray500,
});

const faqs = [
  { q: "브로커와 무엇이 다른가요?", a: "병원 브랜딩 기반의 콘텐츠·전략으로, 병원이 스스로 성장하는 시스템을 구축합니다." },
  { q: "외국인 상담·통역은 누가 담당하나요?", a: "전담 상담팀이 중국어·영어로 문의 대응, 예약 조율, 사후관리까지 모두 진행합니다." },
  { q: "샤오홍슈 운영도 함께 해주시나요?", a: "공식 계정 개설·인증·운영, 콘텐츠 기획/촬영/편집, 왕홍 협업까지 모두 포함됩니다." },
  { q: "병원 브랜드 방향성이 훼손되진 않을까요?", a: "초기 브랜드 진단 기반으로 톤과 콘셉트에 맞는 콘텐츠·전략만 적용합니다." },
  { q: "비용 구조는 어떻게 되나요?", a: "초기 부담을 줄인 정액제 또는 성과 기반 구조 중 선택 가능합니다." },
];

faqs.forEach((faq, idx) => {
  const yPos = 2.2 + idx * 1.0;

  // Q dot
  slide6.addShape(pptx.ShapeType.ellipse, {
    x: 0.8, y: yPos + 0.08, w: 0.25, h: 0.25,
    fill: { color: COLORS.blue600 },
  });
  slide6.addText("Q", {
    x: 0.8, y: yPos + 0.08, w: 0.25, h: 0.25,
    fontSize: 8, bold: true, color: COLORS.white, align: "center", valign: "middle",
  });

  // Question
  slide6.addText(faq.q, {
    x: 1.2, y: yPos, w: 11, h: 0.35,
    fontSize: 13, bold: true, color: COLORS.gray800,
  });

  // Answer
  slide6.addText(faq.a, {
    x: 1.2, y: yPos + 0.4, w: 11, h: 0.35,
    fontSize: 11, color: COLORS.gray500,
  });

  // Divider
  if (idx < faqs.length - 1) {
    slide6.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: yPos + 0.85, w: 11.5, h: 0.01,
      fill: { color: COLORS.gray100 },
    });
  }
});


// ══════════════════════════════════════════════════════════
// SLIDE 7: Thank You / Footer
// ══════════════════════════════════════════════════════════
const slide8 = pptx.addSlide();
slide8.background = { fill: COLORS.gray900 };

// Decorative circles
slide8.addShape(pptx.ShapeType.ellipse, {
  x: 8, y: -1, w: 7, h: 7,
  fill: { color: COLORS.blue700 },
  line: { width: 0 },
});
slide8.addShape(pptx.ShapeType.ellipse, {
  x: -2, y: 4, w: 5, h: 5,
  fill: { color: "1E3A5F" },
  line: { width: 0 },
});

slide8.addText("Thank You", {
  x: 0, y: 2.0, w: 13.33, h: 1.0,
  fontSize: 48, bold: true, color: COLORS.white, align: "center",
});

slide8.addText("VitalConnection", {
  x: 0, y: 3.2, w: 13.33, h: 0.6,
  fontSize: 20, bold: true, color: "93C5FD", align: "center",
});

slide8.addText("대한민국의 의료기술, 세계와 연결합니다.", {
  x: 0, y: 4.0, w: 13.33, h: 0.5,
  fontSize: 14, color: COLORS.gray400, align: "center",
});

slide8.addText("vitalconnect@naver.com  |  010-5769-2138", {
  x: 0, y: 5.0, w: 13.33, h: 0.4,
  fontSize: 12, color: COLORS.gray500, align: "center",
});

slide8.addText("주식회사 바이탈커넥션  |  사업자번호: 699-86-03698", {
  x: 0, y: 5.5, w: 13.33, h: 0.4,
  fontSize: 10, color: COLORS.gray500, align: "center",
});

slide8.addText("© 2024 VitalConnection Inc. All rights reserved.", {
  x: 0, y: 6.5, w: 13.33, h: 0.3,
  fontSize: 9, color: COLORS.gray500, align: "center",
});


// ── Save ──
const outputPath = "./VitalConnection_Presentation.pptx";
pptx.writeFile({ fileName: outputPath })
  .then(() => console.log(`✅ PPT 생성 완료: ${outputPath}`))
  .catch(err => console.error("❌ 생성 실패:", err));
