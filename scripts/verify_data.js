const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPAIR_DIR = path.join(__dirname, '..', 'repair');
const BUNDLE_PATH = path.join(__dirname, '..', 'js', 'data-bundle.js');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

console.log('====================================================');
console.log('🔍 [PRE-FLIGHT AUDIT] Data & HTML Integrity Verifier');
console.log('====================================================\n');

let errorCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    errorCount++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Check Datasets
const categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'standard_categories.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'repair_rules.json'), 'utf8'));
const presets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'work_presets.json'), 'utf8'));
const auditCases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'audit_cases.json'), 'utf8'));

assert(categories.length === 48, `Categories count must be 48 (Actual: ${categories.length})`);
assert(rules.length === 48, `Repair rules count must be 48 (Actual: ${rules.length})`);
assert(presets.length === 113, `Work presets count must be 113 (Actual: ${presets.length})`);
assert(auditCases.length === 5, `Audit cases count must be 5 (Actual: ${auditCases.length})`);

// 2. 1-to-1 Mapping between Categories and Rules
const ruleMap = new Map(rules.map(r => [r.category_id, r]));
const missingRules = categories.filter(c => !ruleMap.has(c.id));
assert(missingRules.length === 0, `All categories must have repair rules (Missing: ${missingRules.map(c => c.id).join(', ')})`);

// 3. Preset Category Mapping
const catIds = new Set(categories.map(c => c.id));
const householdPresets = presets.filter(p => p.badge === '세대부담');
const commonPresets = presets.filter(p => p.badge !== '세대부담');

assert(householdPresets.length === 4, `Household presets count must be exactly 4 (Actual: ${householdPresets.length})`);
householdPresets.forEach(hp => {
  assert(hp.badgeClass === 'badge-household', `${hp.id} must have badge-household class`);
});

const invalidCommon = commonPresets.filter(p => !catIds.has(p.categoryId));
assert(invalidCommon.length === 0, `All common presets must map to a valid category (Invalid: ${invalidCommon.map(p => p.id).join(', ')})`);

// 4. Audit Cases Coverage
const coveredCatIds = new Set();
auditCases.forEach(ac => {
  if (Array.isArray(ac.relatedCategoryIds)) {
    ac.relatedCategoryIds.forEach(id => coveredCatIds.add(id));
  }
});
const uncoveredCats = categories.filter(c => !coveredCatIds.has(c.id));
assert(uncoveredCats.length === 0, `All 48 categories must map to an audit case (Uncovered: ${uncoveredCats.map(c => c.id).join(', ')})`);

// 5. Data Bundle Sync
const bundleText = fs.readFileSync(BUNDLE_PATH, 'utf8');
const sandbox = {};
try {
  eval(bundleText.replace('window.APP_DATA =', 'sandbox.APP_DATA ='));
  assert(JSON.stringify(sandbox.APP_DATA.categories) === JSON.stringify(categories), 'Bundle categories must match standard_categories.json exactly');
  assert(JSON.stringify(sandbox.APP_DATA.rules) === JSON.stringify(rules), 'Bundle rules must match repair_rules.json exactly');
  assert(JSON.stringify(sandbox.APP_DATA.workPresets) === JSON.stringify(presets), 'Bundle presets must match work_presets.json exactly');
  assert(JSON.stringify(sandbox.APP_DATA.auditCases) === JSON.stringify(auditCases), 'Bundle audit cases must match audit_cases.json exactly');
} catch (e) {
  assert(false, `Failed to parse data-bundle.js: ${e.message}`);
}

// 6. Verify Generated HTML Pages
const htmlFiles = fs.readdirSync(REPAIR_DIR).filter(f => f.endsWith('.html'));
assert(htmlFiles.length === 113, `Generated HTML files must be 113 (Actual: ${htmlFiles.length})`);

let hasDisclaimerCount = 0;
let hasGA4Count = 0;
let fakeHouseholdDataCount = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(REPAIR_DIR, file), 'utf8');
  if (content.includes('법적 면책 고지')) hasDisclaimerCount++;
  if (content.includes('G-QBVSWKN92P')) hasGA4Count++;

  if (file.startsWith('preset-excl-')) {
    // Household pages must NOT have fake legal spec
    if (content.includes('법정 수선주기') || content.includes('법정 수선율') || content.includes('공동주택관리법 [별표 1] 관련 법정공종')) {
      fakeHouseholdDataCount++;
      console.error(`❌ Fake legal spec detected in household file: ${file}`);
    }
  }
});

assert(hasDisclaimerCount === 113, `All 113 pages must contain legal disclaimer box (Found: ${hasDisclaimerCount})`);
assert(hasGA4Count === 113, `All 113 pages must contain GA4 tracking script (Found: ${hasGA4Count})`);
assert(fakeHouseholdDataCount === 0, `Zero household pages should contain fake legal specs (Violations: ${fakeHouseholdDataCount})`);

// 7. Sitemap Verification
const sitemapText = fs.readFileSync(SITEMAP_PATH, 'utf8');
assert(sitemapText.includes('<loc>https://apt.postsyncapp.com/</loc>'), 'Sitemap must contain root URL');
assert(sitemapText.includes('<loc>https://apt.postsyncapp.com/privacy.html</loc>'), 'Sitemap must contain privacy policy URL');
const urlMatches = sitemapText.match(/<loc>/g) || [];
assert(urlMatches.length === 119, `Sitemap must contain 119 total URLs (Actual: ${urlMatches.length})`);

// 8. Tone & Assertive Language Check ("필수 집행" elimination)
const presetsRaw = fs.readFileSync(path.join(DATA_DIR, 'work_presets.json'), 'utf8');
const rulesRaw = fs.readFileSync(path.join(DATA_DIR, 'repair_rules.json'), 'utf8');
const presetsMandatoryMatches = (presetsRaw.match(/필수\s*집행/g) || []).length;
const rulesMandatoryMatches = (rulesRaw.match(/필수\s*집행/g) || []).length;
assert(presetsMandatoryMatches === 0, `work_presets.json must contain 0 instances of '필수 집행' (Found: ${presetsMandatoryMatches})`);
assert(rulesMandatoryMatches === 0, `repair_rules.json must contain 0 instances of '필수 집행' (Found: ${rulesMandatoryMatches})`);

// 9. Vercel Security Headers Verification
const VERCEL_PATH = path.join(__dirname, '..', 'vercel.json');
assert(fs.existsSync(VERCEL_PATH), 'vercel.json must exist in project root');
if (fs.existsSync(VERCEL_PATH)) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(VERCEL_PATH, 'utf8'));
    const allHeaders = (vercelConfig.headers || []).flatMap(h => h.headers || []);
    const xFrameOpt = allHeaders.find(h => h.key === 'X-Frame-Options');
    assert(xFrameOpt && xFrameOpt.value === 'DENY', 'vercel.json must configure X-Frame-Options: DENY');
  } catch (e) {
    assert(false, `vercel.json is invalid JSON: ${e.message}`);
  }
}

console.log('\n====================================================');
if (errorCount === 0) {
  console.log('🎉 ALL INTEGRITY AUDITS PASSED WITH 0 ERRORS! (Ready for promotion)');
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error(`💥 AUDIT FAILED WITH ${errorCount} ERRORS!`);
  console.log('====================================================\n');
  process.exit(1);
}
