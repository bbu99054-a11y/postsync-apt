/**
 * Google Indexing API Batch Submitter
 * Open Source Implementation (Zero External Dependencies)
 * Reads sitemap.xml and submits all URLs to Google Indexing API in batch.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const KEY_PATH = path.join(__dirname, '..', 'service_account.json');

// Base64Url helper
function base64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// 1. Check Service Account Key
if (!fs.existsSync(KEY_PATH)) {
  console.log('================================================================');
  console.log('⚠️ [구글 색인 자동화 안내] service_account.json 키 파일이 필요합니다.');
  console.log('================================================================');
  console.log('구글 Indexing API 키 발급 순서 (3분 소요):');
  console.log('1. Google Cloud Console (https://console.cloud.google.com/) 접속');
  console.log('2. 새 프로젝트 생성 ➡️ [API 및 서비스] ➡️ [라이브러리]');
  console.log('   ➡️ "Web Search Indexing API" 검색 후 [사용 설정]');
  console.log('3. [IAM 및 관리자] ➡️ [서비스 계정] ➡️ [서비스 계정 만들기]');
  console.log('   ➡️ 역할: [소유자(Owner)] 선택 ➡️ 생성 완료');
  console.log('4. 생성된 서비스 계정 클릭 ➡️ [키] 탭 ➡️ [키 추가] ➡️ [새 키 만들기(JSON)]');
  console.log('5. 다운로드된 JSON 파일 이름을 "service_account.json"으로 변경하여');
  console.log('   프로젝트 루트 폴더(C:\\workspace\\apt)에 넣어주시면 됩니다.');
  console.log('6. 마지막으로, Google Search Console (https://search.google.com/search-console)의');
  console.log('   [설정] ➡️ [사용자 및 권한]에서 위 서비스 계정 이메일을 [소유자]로 추가해주세요.');
  console.log('================================================================');
  process.exit(0);
}

const keyData = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

// 2. Read sitemap.xml & extract URLs
if (!fs.existsSync(SITEMAP_PATH)) {
  console.error('❌ sitemap.xml 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
const urls = [];
let match;
while ((match = urlRegex.exec(sitemapContent)) !== null) {
  urls.push(match[1]);
}

console.log(`📡 sitemap.xml에서 총 ${urls.length}개의 URL을 감지했습니다.`);

// 3. Generate OAuth 2.0 JWT Access Token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: keyData.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64Url(JSON.stringify(header));
    const encodedClaim = base64Url(JSON.stringify(claim));
    const unsignedToken = `${encodedHeader}.${encodedClaim}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign(keyData.private_key, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signature}`;
    const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`OAuth Token Error: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 4. Submit Single URL to Google Indexing API
function submitUrl(url, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      url: url,
      type: 'URL_UPDATED'
    });

    const req = https.request('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ url, success: true, status: 200 });
        } else {
          resolve({ url, success: false, status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', err => resolve({ url, success: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

// 5. Main Execution
async function run() {
  console.log('🔑 구글 인증 토큰 획득 중...');
  let token;
  try {
    token = await getAccessToken();
    console.log('✅ 구글 인증 성공 (Service Account: ' + keyData.client_email + ')');
  } catch (err) {
    console.error('❌ 인증 토큰 획득 실패:', err.message);
    process.exit(1);
  }

  console.log(`\n🚀 ${urls.length}개 URL 일괄 색인 요청 시작...\n`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const targetUrl = urls[i];
    const res = await submitUrl(targetUrl, token);
    if (res.success) {
      successCount++;
      console.log(`[${i + 1}/${urls.length}] ✅ 색인 요청 성공: ${targetUrl}`);
    } else {
      failCount++;
      console.error(`[${i + 1}/${urls.length}] ❌ 요청 실패: ${targetUrl} (Status: ${res.status})`);
      if (res.error) console.error(`   상세 사유: ${res.error}`);
    }

    // Rate-limit buffer (100ms)
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n================================================================');
  console.log(`🎉 색인 요청 완료! 성공: ${successCount}건 / 실패: ${failCount}건`);
  console.log('구글 로봇(Googlebot)이 수시간 내 사이트맵 및 페이지들을 우선 크롤링합니다.');
  console.log('================================================================');
}

run();
