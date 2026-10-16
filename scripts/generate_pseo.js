const fs = require('fs');
const path = require('path');

// 1. Load Data Sources
const DATA_DIR = path.join(__dirname, '..', 'data');
const REPAIR_DIR = path.join(__dirname, '..', 'repair');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const BUNDLE_PATH = path.join(__dirname, '..', 'js', 'data-bundle.js');
const INDEX_PATH = path.join(__dirname, '..', 'index.html');

const presets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'work_presets.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'standard_categories.json'), 'utf8'));
const repairRules = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'repair_rules.json'), 'utf8'));
const auditCases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'audit_cases.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'synonyms.json'), 'utf8'));

// Build lookup maps
const categoryMap = new Map();
categories.forEach(c => categoryMap.set(c.id, c));

const ruleMap = new Map();
repairRules.forEach(r => ruleMap.set(r.category_id, r));

if (!fs.existsSync(REPAIR_DIR)) {
  fs.mkdirSync(REPAIR_DIR, { recursive: true });
}

console.log(`Loaded ${presets.length} presets, ${categories.length} categories, ${repairRules.length} rules, ${auditCases.length} audit cases.`);

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate Page for each preset
const generatedUrls = [];

presets.forEach((preset, index) => {
  const isHousehold = preset.badge === '세대부담';
  const isReserve = preset.badge === '장충금';

  let category = null;
  let rule = null;
  let auditCase = null;

  if (isHousehold) {
    category = {
      id: 'EXCL-HOUSEHOLD',
      name: '세대 전유부분 설비',
      main_category: '전유부분',
      sub_category: '세대설비',
      cycle: '-',
      rate: '-',
      repair_type: '세대자체수리',
      description: '입주자가 단독으로 사용하는 세대 내부 전유부분으로 공용 관리비 및 장충금 지출 불가'
    };
    rule = {
      type: 'EXCL',
      type_name: '전유부분 (세대 개별 관리)',
      min_unit: '세대 내부 전유 설비 전체',
      below_min_unit_fund: '해당 세대 입주자·소유자 자체 부담',
      guideline_note: '공동주택관리법 시행령 제19조 및 시·도 공동주택 관리규약 준칙에 의거, 전유부분의 유지보수 및 비용 책임은 해당 입주자에게 귀속됩니다.'
    };
    auditCase = {
      id: 'AUDIT-EXCL',
      category: '전유부분 공사비 관리비 편법 부과 지적',
      title: '세대 내부 전유 설비 수리비를 공용 관리비(수선유지비)로 집행',
      case_summary: '세대 내 싱크대 배관 누수 및 전유 도어락 수리비용을 입주민 민원 해소 명목으로 관리사무소에서 아파트 수선유지비로 대신 지출함.',
      penalty: '공동주택관리법 제18조 및 관리규약 위반: 지자체 감사 시정명령, 관리비 환급 조치 및 관리소장 업무상 과실 지적',
      prevention_tip: '전유부분 설비 고장은 관리사무소에서 긴급 밸브 차단 등 안전조치까지만 지원하고, 실질적인 부품 교체 및 수리비는 반드시 해당 세대 입주자(소유자)가 자체 부담하도록 서면 안내해야 합니다.'
    };
  } else {
    category = categoryMap.get(preset.categoryId);
    rule = ruleMap.get(preset.categoryId);

    if (!category) {
      throw new Error(`[DATA INTEGRITY ERROR] Preset ${preset.id} (${preset.title}) references unknown categoryId: ${preset.categoryId}`);
    }
    if (!rule) {
      throw new Error(`[DATA INTEGRITY ERROR] Category ${preset.categoryId} for preset ${preset.id} has no matching rule in repair_rules.json!`);
    }

    auditCase = auditCases.find(ac => ac.relatedCategoryIds && ac.relatedCategoryIds.includes(preset.categoryId)) || auditCases[0];
  }

  const slug = preset.id.toLowerCase();
  const fileName = `${slug}.html`;
  const canonicalUrl = `https://apt.postsyncapp.com/repair/${fileName}`;
  generatedUrls.push(canonicalUrl);

  // Badge styling & wording 3-way branching
  let badgeBg = '#059669';
  let badgeLightBg = '#ecfdf5';
  let badgeBorder = '#10b981';
  let badgeTextColor = '#065f46';
  let badgeTitle = '수선유지비(일반관리비) 집행 가능 항목';
  let badgeSub = '소액·경상적 보수 또는 최소단위 미달 공사 (입주자·세입자 포함 관리비)';

  if (isHousehold) {
    badgeBg = '#475569';
    badgeLightBg = '#f1f5f9';
    badgeBorder = '#cbd5e1';
    badgeTextColor = '#334155';
    badgeTitle = '세대(입주자) 개별 부담 대상 (관리비 집행 불가)';
    badgeSub = '전유부분 설비·소모품으로 공용 관리비 및 장충금 지출 불가 (세대 자체 수리)';
  } else if (isReserve) {
    badgeBg = '#1d4ed8';
    badgeLightBg = '#eff6ff';
    badgeBorder = '#3b82f6';
    badgeTextColor = '#1e40af';
    badgeTitle = '장기수선충당금 집행 검토 대상';
    badgeSub = '입주자대표회의 의결 및 장기수선계획 수시조정 반영 검토 (소유자 부담)';
  }

  const pageTitle = `${escapeHtml(preset.title)} - 장충금 vs 수선비 구분 가이드 | 국토부 실무 기준`;
  const pageDesc = `${escapeHtml(preset.title)} 사전 검토 의견: [${preset.badge}]. 공동주택관리법 시행규칙 [별표 1] 및 국토교통부·중앙공동주택관리지원센터 실무 가이드라인 기준 참고용 사전 검토 자료`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <meta name="keywords" content="${escapeHtml(preset.title)}, 장기수선충당금, 수선유지비, 공동주택관리법 별표1, 국토부 가이드라인, 아파트 공사비 계정과목">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="google-site-verification" content="ugoQGlNSdScisq23rSDCxHIZad-HlZLatf1TUZ5006A">
  <meta name="naver-site-verification" content="e753fc2c2ccfc7188552b45f7e1a4dec559d09f6">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-PWJER4PB2N"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-PWJER4PB2N');
  </script>

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:image" content="https://apt.postsyncapp.com/og-image.jpg">
  <meta property="og:site_name" content="장충금·수선유지비 판별기">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDesc}">
  <meta name="twitter:image" content="https://apt.postsyncapp.com/og-image.jpg">

  <link rel="stylesheet" href="../css/style.css">
  <style>
    body {
      background-color: #f8fafc !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
    }
    .pseo-container {
      max-width: 920px;
      margin: 0 auto;
      padding: 32px 20px 80px 20px;
    }
    .pseo-breadcrumb {
      display: flex;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    .pseo-breadcrumb a {
      color: #64748b;
      text-decoration: none;
    }
    .pseo-breadcrumb a:hover {
      text-decoration: underline;
    }
    .pseo-hero-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 28px 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 24px;
    }
    .pseo-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: ${isHousehold ? '#f1f5f9' : '#eff6ff'};
      color: ${isHousehold ? '#475569' : '#1d4ed8'};
      border: 1px solid ${isHousehold ? '#cbd5e1' : '#bfdbfe'};
      margin-bottom: 14px;
    }
    .pseo-h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
      margin: 0 0 10px 0;
    }
    .pseo-verdict-box {
      margin-top: 20px;
      padding: 18px 20px;
      border-radius: 10px;
      background: ${badgeLightBg};
      border-left: 5px solid ${badgeBorder};
    }
    .pseo-verdict-title {
      font-size: 18px;
      font-weight: 800;
      color: ${badgeTextColor};
      margin-bottom: 4px;
    }
    .pseo-verdict-sub {
      font-size: 13.5px;
      color: #475569;
    }
    .pseo-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .pseo-sec-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pseo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin-top: 12px;
    }
    .pseo-table th, .pseo-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .pseo-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      width: 30%;
    }
    .pseo-table td {
      color: #1e293b;
    }
    .pseo-audit-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px 18px;
      margin-top: 12px;
    }
    .pseo-audit-title {
      font-size: 14px;
      font-weight: 700;
      color: #b45309;
      margin-bottom: 6px;
    }
    .pseo-cta-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 32px 24px;
      text-align: center;
      margin-top: 36px;
    }
    .pseo-cta-btn {
      display: inline-block;
      margin-top: 18px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .pseo-cta-btn:hover {
      background: #1d4ed8;
    }
    .pseo-back-nav {
      margin-top: 24px;
      text-align: center;
    }
    .pseo-back-nav a {
      color: #2563eb;
      font-weight: 600;
      text-decoration: none;
      font-size: 14px;
    }
    .risk-alert-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 16px;
      font-size: 13.5px;
      color: #991b1b;
      line-height: 1.6;
    }
    .pseo-disclaimer-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #64748b;
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 16px;
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
    }
    .share-action-bar {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .share-btn {
      flex: 1;
      min-width: 180px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
      border: none;
    }
    .share-btn-kakao {
      background: #fee500;
      color: #191919;
    }
    .share-btn-kakao:hover {
      background: #fdd835;
    }
    .share-btn-print {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .share-btn-print:hover {
      background: #e2e8f0;
    }
    @media print {
      body { background: #fff !important; }
      .pseo-breadcrumb, .share-action-bar, .pseo-cta-card, .pseo-back-nav, .pseo-disclaimer-box { display: none !important; }
      .pseo-container { padding: 0 !important; max-width: 100% !important; }
      .pseo-hero-card, .pseo-section { border: 1px solid #ccc !important; box-shadow: none !important; margin-bottom: 16px !important; }
    }
  </style>

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "장충금·수선유지비 판별기",
            "item": "https://apt.postsyncapp.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "공종별 판별 백과",
            "item": "https://apt.postsyncapp.com/#tab-dictionary"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "${escapeHtml(preset.title)}",
            "item": "${canonicalUrl}"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "${escapeHtml(preset.title)} 공사는 어떤 재원으로 지출해야 하나요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "사전 검토 의견: [${escapeHtml(preset.badge)}] 구분 대상입니다. ${escapeHtml(preset.hint)}"
            }
          },
          {
            "@type": "Question",
            "name": "공사비 집행 시 법적 주의사항은 무엇인가요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "${isHousehold ? '전유부분 설비 수리비를 공용 관리비나 장충금으로 지출하면 관리규약 위반 및 관리비 횡령 리스크가 발생하므로 세대 자체 부담으로 처리해야 합니다.' : '장기수선계획에 반영된 공사를 수선유지비로 편법 집행하거나 장충금을 목적 외로 사용할 경우 공동주택관리법령(제90조 제3항 및 제102조)에 따라 지자체 감사 시정명령 및 최대 1,000만원 이하의 과태료 처분을 받을 수 있습니다.'}"
            }
          }
        ]
      }
    ]
  }
  </script>
</head>
<body>

  <div class="pseo-container">
    <!-- Breadcrumb -->
    <nav class="pseo-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">홈</a>
      <span>&gt;</span>
      <a href="../index.html#tab-dictionary">공종별 백과 113선</a>
      <span>&gt;</span>
      <span>${escapeHtml(category.main_category)}</span>
      <span>&gt;</span>
      <span>${escapeHtml(category.sub_category)}</span>
      <span>&gt;</span>
      <span>${escapeHtml(category.name)}</span>
    </nav>

    <!-- Header / Verdict Card -->
    <header class="pseo-hero-card">
      <span class="pseo-badge-pill">
        <span>●</span>
        <span>${isHousehold ? '공동주택관리법 제18조 관리규약상 전유부분' : '공동주택관리법 [별표 1] 관련 법정공종'}</span>
      </span>
      <h1 class="pseo-h1">${escapeHtml(preset.title)}</h1>
      <p style="font-size: 15px; color: #475569; margin: 0; line-height: 1.6;">
        ${isHousehold 
          ? `분류: <strong>전유부분 (세대 전유 설비)</strong> (관리비·장충금 부과 대상 제외)`
          : `분류: <strong>${escapeHtml(category.main_category)} · ${escapeHtml(category.sub_category)}</strong> (항목코드: ${escapeHtml(category.id)})`}
      </p>

      <div class="pseo-verdict-box">
        <div class="pseo-verdict-title">검토 의견: [${escapeHtml(preset.badge)}] ${badgeTitle}</div>
        <div class="pseo-verdict-sub">${badgeSub}</div>
        <div style="margin-top: 10px; font-size: 14px; color: #1e293b; font-weight: 600;">
          📌 <strong>핵심 판단 근거:</strong> ${escapeHtml(preset.hint)}
        </div>
      </div>

      <!-- Risk Alert -->
      <div class="risk-alert-box">
        ${isHousehold 
          ? `⚠️ <strong>공사비 집행 시 법적 주의:</strong> 세대 전유부분 공사비를 아파트 공용 관리비(수선유지비)나 장기수선충당금으로 지출할 경우, <strong>공동주택관리법령 및 관리규약 위반(업무상 횡령 및 관리비 환급 시정명령 대상)</strong>이 될 수 있습니다.`
          : `⚠️ <strong>공사비 집행 시 법적 주의:</strong> 장기수선계획에 반영된 공사를 일반 관리비(수선유지비)로 부당 전가하거나 장기수선충당금을 목적 외로 사용할 경우, 공동주택관리법 제90조 제3항 및 제102조에 따라 <strong>지자체 행정지도 및 최대 1,000만원 이하의 과태료 부과 대상</strong>이 될 수 있습니다.`}
      </div>

      <!-- Legal Disclaimer -->
      <div class="pseo-disclaimer-box">
        ⚖️ <strong>법적 면책 고지:</strong> 본 검토 의견은 공동주택관리법령, 시행규칙 [별표 1], 국토교통부·중앙공동주택관리지원센터 발간 「장기수선계획 실무가이드라인」 및 시·도 공동주택 관리규약 준칙을 바탕으로 산출된 <strong>사전 참고용 자료</strong>이며 법적 구속력이 없습니다. 실제 집행 시에는 관할 지자체의 행정지도, 단지 관리규약 및 장기수선계획서를 반드시 최종 대조하시기 바라며, 최종 판단과 집행 책임은 해당 관리주체에 있습니다.
      </div>

      <!-- Action Buttons -->
      <div class="share-action-bar">
        <button type="button" class="share-btn share-btn-kakao" id="btn-copy-summary">
          💬 단톡방 회의용 4줄 요약 복사
        </button>
        <button type="button" class="share-btn share-btn-print" onclick="window.print()">
          🖨️ A4 규격 검토서 인쇄
        </button>
      </div>
    </header>

    <!-- Main Content 1: Legal Specifications -->
    <section class="pseo-section">
      ${isHousehold ? `
      <h2 class="pseo-sec-title">📋 공동주택관리법 제18조 및 관리규약상 법적 기준 (전유부분)</h2>
      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        본 공종은 입주자가 배타적으로 사용하는 <strong>전유부분(세대 내부 설비)</strong>에 해당합니다. 공동주택관리법령상 장기수선계획 수립 대상(공용부분)에서 제외되며, 유지보수 및 비용 부담 의무는 해당 세대에 귀속됩니다.
      </p>

      <table class="pseo-table">
        <tbody>
          <tr>
            <th>구분</th>
            <td><strong>전유부분 (세대 개별 관리 대상)</strong></td>
          </tr>
          <tr>
            <th>부담 주체</th>
            <td><strong style="color: #475569;">해당 세대 입주자(소유자·세입자) 자체 부담</strong></td>
          </tr>
          <tr>
            <th>장기수선계획 수립 여부</th>
            <td>해당 없음 (공용부 주요시설만 수립 대상)</td>
          </tr>
          <tr>
            <th>관리비(수선유지비) 집행 여부</th>
            <td><strong style="color: #dc2626;">집행 불가 (입주자 관리비 횡령·유용 리스크)</strong></td>
          </tr>
          <tr>
            <th>법적 근거</th>
            <td>공동주택관리법 제18조 및 시·도 공동주택 관리규약 준칙 (전유·공용 구분 기준)</td>
          </tr>
        </tbody>
      </table>
      ` : `
      <h2 class="pseo-sec-title">📋 공동주택관리법 시행규칙 [별표 1] 법적 기준</h2>
      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        해당 공종은 공동주택관리법령상 장기수선계획 수립 기준에 등재된 법정 관리 대상입니다. 아래 규정에 따라 계획 수시조정 및 적립금 집행 절차를 준수해야 합니다.
      </p>

      <table class="pseo-table">
        <tbody>
          <tr>
            <th>법정 공종명</th>
            <td><strong>${escapeHtml(category.name)}</strong> (${escapeHtml(category.id)})</td>
          </tr>
          <tr>
            <th>법정 수선주기</th>
            <td><strong>${category.cycle}년</strong></td>
          </tr>
          <tr>
            <th>법정 수선율</th>
            <td><strong>${category.rate}%</strong> (${escapeHtml(category.repair_type)}수선)</td>
          </tr>
          <tr>
            <th>공종 상세 설명</th>
            <td>${escapeHtml(category.description || '공동주택 주요 시설물 보수·교체 기준')}</td>
          </tr>
          <tr>
            <th>부분수리 규정 여부</th>
            <td>${category.has_partial_repair ? '부분수리 법정 기준 있음 (시행규칙 [별표 1])' : '부분수리 미규정 (국토교통부·중앙공동주택관리지원센터 실무가이드라인 A/B/C 원칙 적용)'}</td>
          </tr>
        </tbody>
      </table>
      `}
    </section>

    <!-- Main Content 2: MOLIT Guideline Analysis -->
    <section class="pseo-section">
      ${isHousehold ? `
      <h2 class="pseo-sec-title">🏛️ 국토교통부 행정해석 및 판례 기준</h2>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #334155; font-size: 15px; margin-bottom: 6px;">
          판정 유형: 전유부분 (세대 자율 관리)
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 1.6;">
          <strong>원칙적 부담 주체:</strong> 해당 세대 입주자 또는 소유자<br>
          <strong>공용 관리비 지원 여부:</strong> <span style="color: #dc2626; font-weight: 700;">원칙적 불가 (관리규약상 긴급조치 외 지출 금지)</span>
        </div>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        국토교통부 유권해석 및 법원 판례에 따르면, 세대 내부에 위치하여 특정 세대만 배타적으로 사용하는 설비는 전유부분으로 보며, 해당 공사비용을 전체 입주자가 납부하는 수선유지비나 소유자의 장기수선충당금으로 지출하는 것은 엄격히 금지됩니다.
      </p>
      ` : `
      <h2 class="pseo-sec-title">🏛️ 국토교통부·중앙공동주택관리지원센터 실무가이드라인 (A/B/C 유형) 적용</h2>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #1e40af; font-size: 15px; margin-bottom: 6px;">
          적용 유형: ${escapeHtml(rule.type_name)}
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 1.6;">
          <strong>전면수선 최소단위:</strong> ${escapeHtml(rule.min_unit)}<br>
          <strong>최소단위 미달 시 권장 재원:</strong> <span style="color: #047857; font-weight: 700;">${escapeHtml(rule.below_min_unit_fund)}</span>
        </div>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        ${escapeHtml(rule.guideline_note)}
      </p>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        출처: 국토교통부 & 한국토지주택공사(LH) 중앙공동주택관리지원센터 발간 「장기수선계획 실무가이드라인」
      </div>
      `}
    </section>

    <!-- Main Content 3: Audit Prevention Case -->
    <section class="pseo-section">
      <h2 class="pseo-sec-title">⚖️ 관할 지자체 감사 적발 및 과태료 예방 사례</h2>
      <div class="pseo-audit-box">
        <div class="pseo-audit-title">지적 유형: ${escapeHtml(auditCase.category)}</div>
        <div style="font-weight: 700; color: #92400e; font-size: 14.5px; margin-bottom: 6px;">${escapeHtml(auditCase.title)}</div>
        <p style="font-size: 13.5px; color: #78350f; line-height: 1.6; margin-bottom: 8px;">
          ${escapeHtml(auditCase.case_summary)}
        </p>
        <div style="font-size: 13.5px; color: #dc2626; font-weight: 600; margin-bottom: 8px;">
          🚨 처분 결과: ${escapeHtml(auditCase.penalty)}
        </div>
        <div style="font-size: 13.5px; color: #047857; font-weight: 600;">
          💡 실무 예방 팁: ${escapeHtml(auditCase.prevention_tip)}
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="pseo-cta-card">
      <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 10px;">우리 아파트 조건으로 직접 판별해보시겠습니까?</h2>
      <p style="font-size: 15px; color: #cbd5e1; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        수선 계획 반영 여부, 부분수리 비율, 관리규약 소액지출 한도에 따라 최종 판정 결과가 달라질 수 있습니다.
      </p>
      <a href="../index.html?preset=${encodeURIComponent(preset.id)}${preset.categoryId ? '&category=' + encodeURIComponent(preset.categoryId) : ''}" class="pseo-cta-btn">
        🚀 장충금·수선유지비 판별기 바로 실행하기
      </a>
    </section>

    <!-- Bottom Navigation -->
    <div class="pseo-back-nav">
      <a href="../index.html#tab-dictionary">← 공종별 백과 113선 목록으로 돌아가기</a>
    </div>

    <!-- Bottom Footer -->
    <footer style="margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">
      <div>© 2026 장충금·수선유지비 판별기 · 아파트 공사 재원 사전검토 시스템</div>
      <div style="margin-top: 6px;">
        <a href="../privacy.html" style="color: #475569; text-decoration: none; font-weight: 600;">개인정보처리방침</a>
      </div>
    </footer>
  </div>

  <script>
    document.getElementById('btn-copy-summary').addEventListener('click', async function() {
      const summaryText = 
${isHousehold ? `\`[아파트 공사 재원 사전검토 의견서]
- 공사명: ${escapeHtml(preset.title).replace(/&#39;/g, "'")}
- 검토의견: [${preset.badge}] ${badgeTitle}
- 핵심근거: ${escapeHtml(preset.hint).replace(/&#39;/g, "'")}
- 법적주의: 전유부분은 공용 관리비·장충금 지출 불가 (세대 자체 부담)
상세보기: ${canonicalUrl}\`;` : `\`[아파트 공사 재원 사전검토 의견서]
- 공사명: ${escapeHtml(preset.title).replace(/&#39;/g, "'")}
- 검토의견: [${preset.badge}] ${badgeTitle}
- 핵심근거: ${escapeHtml(preset.hint).replace(/&#39;/g, "'")}
- 법적주의: 장충금·수선비 용도 외 사용 시 지자체 과태료 부과 대상 (참고용 자료)
상세보기: ${canonicalUrl}\`;`}

      let success = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(summaryText);
          success = true;
        } catch (e) {
          success = false;
        }
      }

      if (!success) {
        try {
          const t = document.createElement('textarea');
          t.value = summaryText;
          t.style.position = 'fixed';
          t.style.top = '-9999px';
          t.style.left = '-9999px';
          document.body.appendChild(t);
          t.focus();
          t.select();
          success = document.execCommand('copy');
          document.body.removeChild(t);
        } catch (err) {
          success = false;
        }
      }

      if (success) {
        if (typeof gtag === 'function') {
          gtag('event', 'copy_summary', { work_title: '${escapeHtml(preset.title).replace(/&#39;/g, "\\'")}' });
        }
        const originalText = this.innerHTML;
        this.innerHTML = '✅ 복사 완료! 단톡방에 붙여넣으세요';
        this.style.background = '#10b981';
        this.style.color = '#ffffff';
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.background = '#fee500';
          this.style.color = '#191919';
        }, 2500);
      } else {
        prompt('아래 텍스트를 복사하여 단톡방에 공유하세요:', summaryText);
      }
    });
  </script>

</body>
</html>`;

  fs.writeFileSync(path.join(REPAIR_DIR, fileName), html, 'utf8');
});

console.log(`Successfully generated ${presets.length} pSEO HTML pages in ${REPAIR_DIR}.`);

// 2. Update sitemap.xml
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Application Views -->
  <url>
    <loc>https://apt.postsyncapp.com/</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=evaluator</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=guideline</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=table1</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=audit</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/privacy.html</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Programmatic SEO Pages (113 repair cases) -->
`;

generatedUrls.forEach(url => {
  sitemapContent += `  <url>
    <loc>${url}</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

sitemapContent += `</urlset>\n`;

fs.writeFileSync(SITEMAP_PATH, sitemapContent, 'utf8');
console.log(`Updated sitemap.xml with ${generatedUrls.length + 6} total URLs.`);

// 3. Update index.html dictionary grid for crawling & discovery
if (fs.existsSync(INDEX_PATH)) {
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const startMarker = '<!-- DICTIONARY_GRID_START -->';
  const endMarker = '<!-- DICTIONARY_GRID_END -->';

  if (indexHtml.includes(startMarker) && indexHtml.includes(endMarker)) {
    let gridCardsHtml = '\n';
    presets.forEach(p => {
      const isHousehold = p.badge === '세대부담';
      const isReserve = p.badge === '장충금';
      const cat = isHousehold 
        ? { main_category: '전유부분', sub_category: '세대설비' }
        : (categoryMap.get(p.categoryId) || { main_category: '공용부', sub_category: '기타' });
      const badgeClass = isHousehold ? 'badge-household' : (isReserve ? 'badge-reserve' : 'badge-repair');
      const slug = p.id.toLowerCase();

      gridCardsHtml += `              <a href="repair/${slug}.html" class="dictionary-card" data-title="${escapeHtml(p.title)}" data-badge="${p.badge}" data-main="${escapeHtml(cat.main_category)}" data-sub="${escapeHtml(cat.sub_category)}" data-hint="${escapeHtml(p.hint)}">
                <div class="dict-card-header">
                  <span class="dict-card-cat">${escapeHtml(cat.main_category)} · ${escapeHtml(cat.sub_category)}</span>
                  <span class="dict-card-badge ${badgeClass}">${escapeHtml(p.badge)}</span>
                </div>
                <div class="dict-card-title">${escapeHtml(p.title)}</div>
                <div class="dict-card-hint">${escapeHtml(p.hint)}</div>
              </a>\n`;
    });

    const before = indexHtml.substring(0, indexHtml.indexOf(startMarker) + startMarker.length);
    const after = indexHtml.substring(indexHtml.indexOf(endMarker));
    indexHtml = before + gridCardsHtml + '              ' + after;

    fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
    console.log(`Updated index.html dictionary grid with ${presets.length} discovery cards.`);
  }
}

// 4. Synchronize js/data-bundle.js to guarantee Single Source of Truth
const bundleContent = `// Auto-generated by scripts/generate_pseo.js - DO NOT EDIT MANUALLY
// Master Data bundled for offline & zero-CORS browser support
window.APP_DATA = {
  categories: ${JSON.stringify(categories, null, 2)},
  rules: ${JSON.stringify(repairRules, null, 2)},
  synonyms: ${JSON.stringify(synonyms, null, 2)},
  auditCases: ${JSON.stringify(auditCases, null, 2)},
  workPresets: ${JSON.stringify(presets, null, 2)}
};
`;

fs.writeFileSync(BUNDLE_PATH, bundleContent, 'utf8');
console.log(`Synchronized js/data-bundle.js with master JSON datasets.`);
