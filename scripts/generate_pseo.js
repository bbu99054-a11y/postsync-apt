const fs = require('fs');
const path = require('path');

// 1. Load Data Sources
const DATA_DIR = path.join(__dirname, '..', 'data');
const REPAIR_DIR = path.join(__dirname, '..', 'repair');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

const presets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'work_presets.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'standard_categories.json'), 'utf8'));
const repairRules = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'repair_rules.json'), 'utf8'));
const auditCases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'audit_cases.json'), 'utf8'));

// Build lookup maps
const categoryMap = new Map();
categories.forEach(c => categoryMap.set(c.id, c));

const ruleMap = new Map();
repairRules.forEach(r => ruleMap.set(r.category_id, r));

if (!fs.existsSync(REPAIR_DIR)) {
  fs.mkdirSync(REPAIR_DIR, { recursive: true });
}

console.log(`Loaded ${presets.length} presets, ${categories.length} categories, ${repairRules.length} rules.`);

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
  const category = categoryMap.get(preset.categoryId) || {
    name: '공동주택 주요시설',
    main_category: '공용부',
    sub_category: '기타',
    cycle: 10,
    rate: 100,
    repair_type: '전면/부분'
  };

  const rule = ruleMap.get(preset.categoryId) || {
    type: 'B',
    type_name: '기능별 구분 (B유형)',
    min_unit: '해당 설비 1단위 또는 독립 구획',
    below_min_unit_fund: '수선유지비',
    guideline_note: '최소단위 미달 소액보수 및 소모성 자재는 관리비(수선유지비)로 집행 가능합니다.'
  };

  // Select relevant audit case
  const auditCase = auditCases[index % auditCases.length];

  const slug = preset.id.toLowerCase();
  const fileName = `${slug}.html`;
  const canonicalUrl = `https://apt.postsyncapp.com/repair/${fileName}`;
  generatedUrls.push(canonicalUrl);

  const isReserve = preset.badge === '장충금';
  const badgeBg = isReserve ? '#1d4ed8' : '#059669';
  const badgeLightBg = isReserve ? '#eff6ff' : '#ecfdf5';
  const badgeBorder = isReserve ? '#3b82f6' : '#10b981';
  const badgeTextColor = isReserve ? '#1e40af' : '#065f46';
  const badgeTitle = isReserve ? '장기수선충당금 필수 집행 대상' : '수선유지비(일반관리비) 집행 가능 항목';
  const badgeSub = isReserve 
    ? '입주자대표회의 의결 및 장기수선계획 반영 필수 (소유자 부담)' 
    : '경상적 보수 또는 최소단위 미달 공사 (입주자·세입자 부담 관리비)';

  const pageTitle = `${escapeHtml(preset.title)} - 장기수선충당금 vs 수선유지비 판별 | 국토부 가이드라인`;
  const pageDesc = `${escapeHtml(preset.title)} 판별 결과: [${preset.badge}]. 공동주택관리법 [별표 1] 및 국토교통부 실무 가이드라인 기준 회계 계정과목 및 감사 지적 예방 체크리스트`;

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
      align-items: center;
    }
    .pseo-breadcrumb a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .pseo-breadcrumb a:hover {
      text-decoration: underline;
    }
    .pseo-hero-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .pseo-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 14px;
      background: ${badgeLightBg};
      color: ${badgeTextColor};
      border: 1px solid ${badgeBorder};
    }
    .pseo-h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.4;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .pseo-verdict-box {
      background: ${badgeLightBg};
      border-left: 4px solid ${badgeBorder};
      padding: 18px 20px;
      border-radius: 0 10px 10px 0;
      margin-top: 20px;
    }
    .pseo-verdict-title {
      font-size: 18px;
      font-weight: 700;
      color: ${badgeTextColor};
      margin-bottom: 6px;
    }
    .pseo-verdict-sub {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
    }
    .pseo-section {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 26px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .pseo-sec-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pseo-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .pseo-table th {
      background: #f1f5f9;
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      font-weight: 600;
      width: 32%;
    }
    .pseo-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
    }
    .pseo-table tr:last-child th,
    .pseo-table tr:last-child td {
      border-bottom: none;
    }
    .pseo-audit-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 18px;
    }
    .pseo-audit-title {
      font-size: 14px;
      font-weight: 700;
      color: #b45309;
      margin-bottom: 6px;
    }
    .risk-alert-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 16px;
      font-size: 13.5px;
      color: #991b1b;
      line-height: 1.6;
    }
    .share-action-bar {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
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
    .pseo-cta-card {
      background: linear-gradient(135deg, #1e3a8a, #1e293b);
      color: #ffffff;
      border-radius: 14px;
      padding: 36px 24px;
      text-align: center;
      margin-top: 28px;
      box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.25);
    }
    .pseo-cta-btn {
      display: inline-block;
      margin-top: 18px;
      padding: 14px 28px;
      background: #3b82f6;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
      transition: background 0.15s;
    }
    .pseo-cta-btn:hover {
      background: #2563eb;
    }
    .pseo-back-nav {
      margin-top: 24px;
      text-align: center;
      font-size: 14px;
    }
    .pseo-back-nav a {
      color: #475569;
      text-decoration: none;
      font-weight: 500;
    }
    .pseo-back-nav a:hover {
      color: #0f172a;
      text-decoration: underline;
    }
    @media print {
      body { background: #fff !important; }
      .pseo-breadcrumb, .share-action-bar, .pseo-cta-card, .pseo-back-nav { display: none !important; }
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
              "text": "판별 결과 [${escapeHtml(preset.badge)}] 집행 대상입니다. ${escapeHtml(preset.hint)}"
            }
          },
          {
            "@type": "Question",
            "name": "이 공사의 국토교통부 실무 가이드라인 기준은 무엇인가요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "${escapeHtml(rule.type_name)}에 해당하며 최소단위는 ${escapeHtml(rule.min_unit)}입니다. ${escapeHtml(rule.guideline_note)}"
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
    <nav class="pseo-breadcrumb">
      <a href="../index.html">홈</a>
      <span>&gt;</span>
      <a href="../index.html#tab-dictionary">공종별 백과 113선</a>
      <span>&gt;</span>
      <span>${escapeHtml(category.name)}</span>
    </nav>

    <!-- Header / Verdict Card -->
    <header class="pseo-hero-card">
      <span class="pseo-badge-pill">
        <span>●</span>
        <span>공동주택관리법 [별표 1] 법정 공종</span>
      </span>
      <h1 class="pseo-h1">${escapeHtml(preset.title)}</h1>
      <p style="font-size: 15px; color: #475569; margin: 0; line-height: 1.6;">
        분류: <strong>${escapeHtml(category.main_category)} · ${escapeHtml(category.sub_category)}</strong> (항목코드: ${escapeHtml(category.id)})
      </p>

      <div class="pseo-verdict-box">
        <div class="pseo-verdict-title">판정 결과: [${escapeHtml(preset.badge)}] ${badgeTitle}</div>
        <div class="pseo-verdict-sub">${badgeSub}</div>
        <div style="margin-top: 10px; font-size: 14px; color: #1e293b; font-weight: 600;">
          📌 <strong>핵심 판별 근거:</strong> ${escapeHtml(preset.hint)}
        </div>
      </div>

      <!-- Risk Alert -->
      <div class="risk-alert-box">
        ⚠️ <strong>지자체 감사 과태료 주의:</strong> 장기수선계획에 반영된 공사를 관리비(수선유지비)로 부당 집행하거나, 반대로 소유자 장충금을 일반 수선에 유용할 경우 <strong>공동주택관리법 제90조 제3항 위반으로 최대 1,000만원 이하의 과태료</strong>가 부과될 수 있습니다.
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

    <!-- Main Content 1: Legal & Technical Specifications -->
    <section class="pseo-section">
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
            <td>${category.has_partial_repair ? '부분수리 법정 기준 있음' : '부분수리 미규정 (국토부 가이드라인 A/B/C 원칙 적용)'}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Main Content 2: MOLIT Guideline Analysis -->
    <section class="pseo-section">
      <h2 class="pseo-sec-title">🏛️ 국토교통부 실무 가이드라인 (A/B/C 유형) 적용</h2>
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
      <a href="../index.html?preset=${encodeURIComponent(preset.id)}&category=${encodeURIComponent(preset.categoryId)}" class="pseo-cta-btn">
        🚀 장충금·수선유지비 판별기 바로 실행하기
      </a>
    </section>

    <!-- Bottom Navigation -->
    <div class="pseo-back-nav">
      <a href="../index.html#tab-dictionary">← 공종별 백과 113선 목록으로 돌아가기</a>
    </div>
  </div>

  <script>
    document.getElementById('btn-copy-summary').addEventListener('click', async function() {
      const summaryText = 
\`[아파트 공사 재원 사전검토 의견서]
- 공사명: ${escapeHtml(preset.title).replace(/&#39;/g, "'")}
- 판별결과: [${preset.badge}] ${badgeTitle}
- 핵심근거: ${escapeHtml(preset.hint).replace(/&#39;/g, "'")}
- 법적주의: 공동주택관리법 제90조제3항 오집행 시 과태료 최대 1,000만원
상세보기: ${canonicalUrl}\`;

      try {
        await navigator.clipboard.writeText(summaryText);
        const originalText = this.innerHTML;
        this.innerHTML = '✅ 복사 완료! 단톡방에 붙여넣으세요';
        this.style.background = '#10b981';
        this.style.color = '#ffffff';
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.background = '#fee500';
          this.style.color = '#191919';
        }, 2500);
      } catch (err) {
        alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
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
    <lastmod>2026-10-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=evaluator</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=guideline</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=table1</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=audit</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Programmatic SEO Pages (100+ repair cases) -->
`;

generatedUrls.forEach(url => {
  sitemapContent += `  <url>
    <loc>${url}</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

sitemapContent += `</urlset>\n`;

fs.writeFileSync(SITEMAP_PATH, sitemapContent, 'utf8');
console.log(`Updated sitemap.xml with ${generatedUrls.length + 5} total URLs.`);

// 3. Update index.html dictionary grid for crawling & discovery
const INDEX_PATH = path.join(__dirname, '..', 'index.html');
if (fs.existsSync(INDEX_PATH)) {
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const startMarker = '<!-- DICTIONARY_GRID_START -->';
  const endMarker = '<!-- DICTIONARY_GRID_END -->';

  if (indexHtml.includes(startMarker) && indexHtml.includes(endMarker)) {
    let gridCardsHtml = '\n';
    presets.forEach(p => {
      const cat = categoryMap.get(p.categoryId) || { main_category: '공용부', sub_category: '기타' };
      const isReserve = p.badge === '장충금';
      const badgeBg = isReserve ? '#1d4ed8' : '#059669';
      const badgeClass = isReserve ? 'badge-reserve' : 'badge-repair';
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
