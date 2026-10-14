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
    name: '공동주택 시설물',
    main_category: '공용부',
    sub_category: '기타',
    cycle: 10,
    rate: 100,
    repair_type: '전면/부분'
  };

  const rule = ruleMap.get(preset.categoryId) || {
    type: 'B',
    type_name: '기능적 구분 (B타입)',
    min_unit: '해당 설비 1단위 또는 독립 구획',
    below_min_unit_fund: '수선유지비',
    guideline_note: '최소단위 미달 국소보수 및 소모성 자재는 관리비(수선유지비)로 집행 가능합니다.'
  };

  // Select relevant audit case
  const auditCase = auditCases[index % auditCases.length];

  const slug = preset.id.toLowerCase();
  const fileName = `${slug}.html`;
  const canonicalUrl = `https://apt.postsyncapp.com/repair/${fileName}`;
  generatedUrls.push(canonicalUrl);

  const isReserve = preset.badge === '장충금';
  const badgeColorBg = isReserve ? '#1e3a8a' : '#047857';
  const badgeColorBorder = isReserve ? '#3b82f6' : '#10b981';
  const badgeTitle = isReserve ? '장기수선충당금 필수 집행 대상' : '수선유지비(관리비) 집행 가능 항목';
  const badgeSub = isReserve 
    ? '입주자대표회의 의결 및 장기수선계획 반영 필수 (소유자 부담)' 
    : '일상적 보수 또는 최소단위 미달 공사 (입주자/세입자 부담 관리비)';

  const pageTitle = `${escapeHtml(preset.title)} - 장기수선충당금 vs 수선유지비 판별 | 국토부 가이드라인`;
  const pageDesc = `${escapeHtml(preset.title)} 판별 결과: [${preset.badge}]. 공동주택관리법 [별표 1] 및 국토교통부 실무 가이드라인 기준 회계 계정과목 및 감사 지적 예방 체크리스트.`;

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
    .pseo-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px 80px 20px;
    }
    .pseo-breadcrumb {
      display: flex;
      gap: 8px;
      font-size: 13px;
      color: var(--text-tertiary);
      margin-bottom: 24px;
      align-items: center;
    }
    .pseo-breadcrumb a {
      color: var(--navy-300);
      text-decoration: none;
    }
    .pseo-hero-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .pseo-badge-pill {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      background: ${badgeColorBg};
      color: #ffffff;
      border: 1px solid ${badgeColorBorder};
    }
    .pseo-h1 {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .pseo-verdict-box {
      background: rgba(255, 255, 255, 0.04);
      border-left: 4px solid ${badgeColorBorder};
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-top: 20px;
    }
    .pseo-verdict-title {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 6px;
    }
    .pseo-verdict-sub {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .pseo-section {
      background: #ffffff;
      color: #1e293b;
      border-radius: 14px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .pseo-sec-title {
      font-size: 19px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pseo-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 14px;
    }
    .pseo-table th {
      background: #f8fafc;
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
      width: 28%;
    }
    .pseo-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
    }
    .pseo-audit-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 18px 20px;
      border-radius: 0 10px 10px 0;
      margin-top: 16px;
    }
    .pseo-audit-title {
      font-weight: 700;
      color: #b45309;
      margin-bottom: 6px;
      font-size: 15px;
    }
    .pseo-cta-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin-top: 36px;
    }
    .pseo-cta-btn {
      display: inline-block;
      margin-top: 20px;
      background: #3b82f6;
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .pseo-cta-btn:hover {
      background: #2563eb;
      transform: translateY(-2px);
    }
    .pseo-back-nav {
      margin-top: 28px;
      text-align: center;
    }
    .pseo-back-nav a {
      color: var(--text-tertiary);
      text-decoration: none;
      font-size: 14px;
    }
    .pseo-back-nav a:hover {
      color: #ffffff;
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
            "item": "https://apt.postsyncapp.com/#database"
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
              "text": "${escapeHtml(rule.type_name)} 적용 대상이며 최소 단위는 [${escapeHtml(rule.min_unit)}]입니다. ${escapeHtml(rule.guideline_note)}"
            }
          }
        ]
      }
    ]
  }
  </script>
</head>
<body style="background: #0b1120; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <div class="pseo-container">
    <!-- Breadcrumb -->
    <nav class="pseo-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">🏠 홈</a>
      <span>›</span>
      <span>공종별 실무 판별 백과</span>
      <span>›</span>
      <span style="color: #94a3b8;">${escapeHtml(category.sub_category)}</span>
    </nav>

    <!-- Hero Verdict Card -->
    <header class="pseo-hero-card">
      <div class="pseo-badge-pill">${escapeHtml(category.main_category)} · ${escapeHtml(category.sub_category)}</div>
      <h1 class="pseo-h1">${escapeHtml(preset.title)}<br><span style="font-size: 20px; color: #93c5fd; font-weight: 600;">장기수선충당금 vs 수선유지비 판별 결과</span></h1>
      
      <div class="pseo-verdict-box">
        <div class="pseo-verdict-title">${badgeTitle}</div>
        <div class="pseo-verdict-sub">${badgeSub}</div>
        <div style="margin-top: 10px; font-size: 14px; color: #e2e8f0; font-weight: 500;">
          💡 <strong>핵심 판별 근거:</strong> ${escapeHtml(preset.hint)}
        </div>
      </div>
    </header>

    <!-- Main Content 1: Legal & Technical Specifications -->
    <section class="pseo-section">
      <h2 class="pseo-sec-title">🏛️ 공동주택관리법 시행규칙 [별표 1] 법적 기준</h2>
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
            <th>부분수리 인정 여부</th>
            <td>${category.has_partial_repair ? '부분수리 법정 기준 있음' : '부분수리 미규정 (국토부 가이드라인 A/B/C 원칙 적용)'}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Main Content 2: MOLIT Guideline Analysis -->
    <section class="pseo-section">
      <h2 class="pseo-sec-title">📐 국토교통부 실무 가이드라인 (A/B/C 유형) 적용</h2>
      <div style="background: #f1f5f9; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #1e3a8a; font-size: 15px; margin-bottom: 6px;">
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
      <h2 class="pseo-sec-title">⚠️ 관련 지자체 감사 적발 및 과태료 예방 사례</h2>
      <div class="pseo-audit-box">
        <div class="pseo-audit-title">지적 유형: ${escapeHtml(auditCase.category)}</div>
        <div style="font-weight: 700; color: #78350f; font-size: 14px; margin-bottom: 6px;">${escapeHtml(auditCase.title)}</div>
        <p style="font-size: 13px; color: #92400e; line-height: 1.6; margin-bottom: 8px;">
          ${escapeHtml(auditCase.case_summary)}
        </p>
        <div style="font-size: 13px; color: #b91c1c; font-weight: 600; margin-bottom: 8px;">
          🚨 처분 결과: ${escapeHtml(auditCase.penalty)}
        </div>
        <div style="font-size: 13px; color: #047857; font-weight: 600;">
          🛡️ 실무 예방 팁: ${escapeHtml(auditCase.prevention_tip)}
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
      <a href="../index.html">← 판별기 메인 화면으로 돌아가기</a>
    </div>
  </div>

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
    <lastmod>2026-10-14</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=evaluator</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=guideline</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=table1</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://apt.postsyncapp.com/?tab=audit</loc>
    <lastmod>2026-10-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Programmatic SEO Pages (100+ repair cases) -->
`;

generatedUrls.forEach(url => {
  sitemapContent += `  <url>
    <loc>${url}</loc>
    <lastmod>2026-10-14</lastmod>
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
      const badgeBg = isReserve ? '#1e3a8a' : '#047857';
      const slug = p.id.toLowerCase();

      gridCardsHtml += `              <a href="repair/${slug}.html" style="display: block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: inherit; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform 0.15s ease, border-color 0.15s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${escapeHtml(cat.main_category)} · ${escapeHtml(cat.sub_category)}</span>
                  <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: #ffffff;">${escapeHtml(p.badge)}</span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b; line-height: 1.4; margin-bottom: 6px;">${escapeHtml(p.title)}</div>
                <div style="font-size: 0.8rem; color: #64748b; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(p.hint)}</div>
              </a>\n`;
    });

    const before = indexHtml.substring(0, indexHtml.indexOf(startMarker) + startMarker.length);
    const after = indexHtml.substring(indexHtml.indexOf(endMarker));
    indexHtml = before + gridCardsHtml + '              ' + after;

    fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
    console.log(`Updated index.html dictionary grid with ${presets.length} discovery cards.`);
  }
}

