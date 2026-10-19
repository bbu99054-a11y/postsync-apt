/**
 * 공사 재원 판별시스템 - 메인 컨트롤러 v2.7
 * 개선: 옵션 변경 시 화면 튕김/자동 스크롤 전면 차단
 * [검토 실행] 버튼을 명시적으로 눌렀을 때만 결과 생성 및 부드러운 스크롤 이동
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Decision Engine
  const engine = new RepairDecisionEngine(window.APP_DATA);

  // GA4 Event Tracking Helper
  function trackEvent(eventName, params = {}) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  // 1. Navigation & Tab Switching
  const navLinks = document.querySelectorAll('.sidebar-nav-list .navy-nav-link');
  const tabButtons = document.querySelectorAll('.tab-nav-row .work-tab-button');
  const tabViews = document.querySelectorAll('.tab-content-view');

  // 2. Evaluator Form Elements
  const workInput = document.getElementById('work-input-field');
  const dropdown = document.getElementById('candidates-dropdown-box');
  const chipButtons = document.querySelectorAll('.clean-chip-btn');
  const evaluateBtn = document.getElementById('btn-trigger-evaluate');
  const dynamicHintBox = document.getElementById('dynamic-hint-box');
  const hintText = document.getElementById('hint-text');

  // Dynamic Work Presets Elements
  const workPresetsContainer = document.getElementById('work-presets-container');
  const presetsChipsGrid = document.getElementById('presets-chips-grid');
  const presetsCountBadge = document.getElementById('presets-count-badge');

  // Accordion Toggle Elements
  const criteriaToggleHeader = document.getElementById('criteria-toggle-header');
  const btnToggleAccordion = document.getElementById('btn-toggle-accordion');
  const accordionToggleText = document.getElementById('accordion-toggle-text');
  const accordionToggleIcon = document.getElementById('accordion-toggle-icon');
  const criteriaOptionsGrid = document.getElementById('criteria-options-grid');
  const summaryLocationChip = document.getElementById('summary-location-chip');
  const summaryScopeChip = document.getElementById('summary-scope-chip');
  const summaryPlanChip = document.getElementById('summary-plan-chip');
  const summaryEmergencyChip = document.getElementById('summary-emergency-chip');

  // Option Segmented Buttons
  const locationButtons = document.querySelectorAll('#location-toggle-group .segment-btn');
  const scopeButtons = document.querySelectorAll('#scope-toggle-group .segment-btn');
  const planButtons = document.querySelectorAll('#plan-toggle-group .segment-btn');
  const emergencyButtons = document.querySelectorAll('#emergency-toggle-group .segment-btn');

  // 3. Official Report Elements
  const reportWorkTitle = document.getElementById('report-work-title');
  const sealBadge = document.getElementById('report-seal-badge');
  const sealIcon = document.getElementById('seal-icon');
  const sealText = document.getElementById('seal-text');
  const quickFundPayer = document.getElementById('quick-fund-payer');
  const quickProcedureAuth = document.getElementById('quick-procedure-auth');
  const quickAuditRisk = document.getElementById('quick-audit-risk');
  const tableFundType = document.getElementById('table-fund-type');
  const tablePayerType = document.getElementById('table-payer-type');
  const tableLegalBasis = document.getElementById('table-legal-basis');
  const tableGuidelineUnit = document.getElementById('table-guideline-unit');
  const tableSummaryOpinion = document.getElementById('table-summary-opinion');
  const tableAuditWarning = document.getElementById('table-audit-warning');
  const tableProcessChecklist = document.getElementById('table-process-checklist');
  const officialReportCard = document.getElementById('official-report-card');

  // 4. Action Buttons
  const copyKakaoBtn = document.getElementById('btn-copy-kakao-summary');
  const copyFullDocBtn = document.getElementById('btn-copy-full-doc');
  const downloadPdfBtn = document.getElementById('btn-download-pdf');
  const printBtn = document.getElementById('btn-print-report-doc');
  const navPrintBtn = document.getElementById('nav-print-direct');
  const toast = document.getElementById('matte-toast');
  const toastText = document.getElementById('toast-message-text');

  // 5. Views & External Links
  const table1SearchInput = document.getElementById('table1-search-input');
  const table1TbodyContainer = document.getElementById('table1-tbody-container');
  const guidelineFilterGroup = document.getElementById('guideline-filter-group');
  const guidelineSearchInput = document.getElementById('guideline-search-input');
  const guidelineTbodyContainer = document.getElementById('guideline-tbody-container');
  const auditListContainer = document.getElementById('audit-list-container');
  const linkShowTable1 = document.getElementById('link-show-table1');
  const linkViewAuditAll = document.getElementById('link-view-audit-all');
  let currentGuidelineFilter = 'all';

  // State
  let currentCategoryId = null;
  let currentPresetId = null;
  let isCommonArea = true;
  let currentScope = 'full_min_unit';
  let currentInPlan = true;
  let currentEmergency = false;
  let latestResult = null;
  let latestWorkName = '';

  // Smart Keyword Dictionaries for Auto-Detection
  const partialKeywords = [
    // 승강기 빈출 부품
    'smps', '멀티빔', '안전빔', '세이프티슈', '도어슈', '가이드슈', '인버터', '조속기스위치', 
    '도어인버터', '도어모터', '인디케이터', '버튼', '위치표시기', '홀버튼', '카내버튼', 
    '비상호출기', '인터폰', '카도어센서', '리미트스위치', '릴레이', '콘덴서', '트랜스', 
    '전자접촉기', '마그네트', '브레이크패드', '라이닝', '권상기오일', '감속기오일', 
    '쉬브홈가공', '로프윤활', '와이어그리스', '카도어', '홀도어',
    // 전기·소방·설비 부품
    '기판', 'pcb', '모듈', '센서', '감지기', '발신기', '수신기기판', '안정기', 
    '램프', '전구', '소켓', 'led모듈', '차단기교체', '누전차단기', '배선용차단기', 
    '계량기', '마그네틱', '솔레노이드', '솔레노이드밸브', '볼탑', '정수위밸브고무', 
    '체크밸브', '감압밸브', '스트레이너', '드레인밸브', '에어벤트', '압력계', '온도계', 
    '패킹', '가스켓', '커플링', '임펠러', '메카니컬씰', '오일씰', '베어링',
    // 영선·주차·토목 부품 및 작업
    '차단기봉', '바교체', '루프코일', '경광등', '리모컨', '도어락수리', '힌지', '플로어힌지', 
    '손잡이', '손스침', '유리교체', '실리콘', '코킹', '크랙', '균열보수', '부분도색', 
    '덧칠', '보수', '수리', '부품', '소모품', '단품', '모터수리', '봉'
  ];

  // 명시적 전면수선 키워드 (1대 전체, 건물 전체 등)
  const explicitFullKeywords = ['전체', '전면', '1대', '신설', '재도장', '리모델링', '완제품', '완전'];
  // 일반 전면 키워드 ('교체' 등 - 단, 부분 부품명이 없을 때만 적용)
  const generalFullKeywords = ['교체', '교환'];
  const exclusiveKeywords = ['세대', '전유', '싱크대', '도어락', '발코니', '거실', '안방', '양변기'];
  const emergencyKeywords = ['긴급', '누수', '동파', '파열', '침수', '역류', '화재'];

  // =========================================================================
  // 1. Tab & Navigation System
  // =========================================================================
  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    navLinks.forEach(link => {
      if (link.dataset.tab) {
        link.classList.toggle('active', link.dataset.tab === tabId);
      }
    });

    tabViews.forEach(view => {
      view.classList.remove('active');
    });

    if (tabId === 'tab-evaluator') {
      document.getElementById('view-evaluator').classList.add('active');
    } else if (tabId === 'tab-table1') {
      document.getElementById('view-table1').classList.add('active');
      renderTable1();
    } else if (tabId === 'tab-guideline') {
      document.getElementById('view-guideline').classList.add('active');
      renderGuideline(currentGuidelineFilter, guidelineSearchInput ? guidelineSearchInput.value : '');
    } else if (tabId === 'tab-audit') {
      document.getElementById('view-audit').classList.add('active');
      renderAuditCases();
    } else if (tabId === 'tab-dictionary') {
      const viewDict = document.getElementById('view-dictionary');
      if (viewDict) viewDict.classList.add('active');
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (link.id === 'nav-print-direct') {
        window.print();
        return;
      }
      if (link.dataset.tab) {
        switchTab(link.dataset.tab);
      }
    });
  });

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  if (linkShowTable1) {
    linkShowTable1.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-table1');
    });
  }

  if (linkViewAuditAll) {
    linkViewAuditAll.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-audit');
    });
  }

  // =========================================================================
  // 2. Options Segmented Controls & Summary Status (조용히 상태만 변경)
  // =========================================================================
  function updateSummaryChips() {
    if (summaryLocationChip) {
      summaryLocationChip.textContent = isCommonArea ? '🏢 공용부분' : '🏠 세대 내부(전유)';
    }
    if (summaryScopeChip) {
      summaryScopeChip.textContent = (currentScope === 'full_min_unit') ? '전면 (1대/전체)' : '부분 (단품/국소)';
    }
    if (summaryPlanChip) {
      summaryPlanChip.textContent = currentInPlan ? '계획서 등재됨' : '계획서 미등재';
    }
    if (summaryEmergencyChip) {
      summaryEmergencyChip.textContent = currentEmergency ? '긴급 응급조치' : '일반 계획공사';
    }
  }

  // Accordion Toggle
  let isAccordionExpanded = false;
  function toggleAccordion(expand) {
    if (expand !== undefined) {
      isAccordionExpanded = expand;
    } else {
      isAccordionExpanded = !isAccordionExpanded;
    }
    if (criteriaOptionsGrid) {
      criteriaOptionsGrid.style.display = isAccordionExpanded ? 'grid' : 'none';
    }
    if (accordionToggleText) {
      accordionToggleText.textContent = isAccordionExpanded ? '세부 조건 접기' : '직접 세부조정 펼치기';
    }
    if (accordionToggleIcon) {
      accordionToggleIcon.textContent = isAccordionExpanded ? '▲' : '▼';
    }
  }

  if (criteriaToggleHeader) {
    criteriaToggleHeader.addEventListener('click', () => toggleAccordion());
  }
  if (btnToggleAccordion) {
    btnToggleAccordion.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccordion();
    });
  }

  function setSegmentActive(buttons, targetValue) {
    buttons.forEach(btn => {
      const val = btn.dataset.location || btn.dataset.scope || btn.dataset.plan || btn.dataset.emergency;
      btn.classList.toggle('active', val === targetValue);
    });
    updateSummaryChips();
  }

  function setupSegmentGroup(buttons, callback) {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.location || btn.dataset.scope || btn.dataset.plan || btn.dataset.emergency;
        callback(val);
        updateSummaryChips();
        // 사용자 피드백 반영: 버튼 클릭 시에는 자동으로 실행하거나 스크롤하지 않고 조용히 옵션만 유지
      });
    });
  }

  setupSegmentGroup(locationButtons, (v) => { isCommonArea = (v === 'common'); });
  setupSegmentGroup(scopeButtons, (v) => { currentScope = v; });
  setupSegmentGroup(planButtons, (v) => { currentInPlan = (v === 'true'); });
  setupSegmentGroup(emergencyButtons, (v) => { currentEmergency = (v === 'true'); });

  // summaryScopeChip 원터치 토글 기능 설정
  if (summaryScopeChip) {
    summaryScopeChip.classList.add('clickable-scope-chip');
    summaryScopeChip.setAttribute('role', 'button');
    summaryScopeChip.setAttribute('tabindex', '0');
    summaryScopeChip.setAttribute('title', '클릭 시 [전면] ⇄ [부분] 즉시 전환');

    const toggleScopeDirectly = (e) => {
      if (e) e.stopPropagation();
      currentScope = (currentScope === 'full_min_unit') ? 'partial_sub_unit' : 'full_min_unit';
      setSegmentActive(scopeButtons, currentScope);
      trackEvent('toggle_scope_chip', { new_scope: currentScope });
      
      // 이미 검토 결과 카드가 열려있는 상태라면 바로 재계산 반영
      if (officialReportCard && officialReportCard.style.display !== 'none') {
        runEvaluation(false);
      }
    };

    summaryScopeChip.addEventListener('click', toggleScopeDirectly);
    summaryScopeChip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleScopeDirectly(e);
      }
    });
  }

  // =========================================================================
  // 2-1. Dynamic Work Presets (단골 세부작업 원클릭 선택기)
  // =========================================================================
  function applyPresetWork(preset) {
    if (!preset) return;
    workInput.value = preset.title;
    currentPresetId = preset.id;
    currentCategoryId = preset.categoryId;
    isCommonArea = preset.isCommon;
    currentScope = preset.scope;
    currentInPlan = preset.inPlan;
    currentEmergency = preset.isEmergency;

    // Update controls
    setSegmentActive(locationButtons, isCommonArea ? 'common' : 'exclusive');
    setSegmentActive(scopeButtons, currentScope);
    setSegmentActive(planButtons, currentInPlan ? 'true' : 'false');
    setSegmentActive(emergencyButtons, currentEmergency ? 'true' : 'false');
    updateSummaryChips();

    // Update hint
    dynamicHintBox.style.display = 'flex';
    hintText.innerHTML = `<strong>[선택 작업: ${preset.title}]</strong><br>👉 <em>${preset.hint}</em>`;
  }

  function renderPresets(categoryId, keyword) {
    if (!workPresetsContainer || !presetsChipsGrid) return;

    const presets = engine.getPresets(categoryId, keyword);
    if (!presets || presets.length === 0) {
      workPresetsContainer.style.display = 'none';
      return;
    }

    workPresetsContainer.style.display = 'block';
    if (presetsCountBadge) {
      presetsCountBadge.textContent = `단골 작업 ${presets.length}개`;
    }

    let html = '';
    presets.forEach(p => {
      const badgeText = p.badge === '장충금' ? '🔵 장충금' : (p.badge === '수선비' ? '🟢 수선비' : '🟠 세대부담');
      html += `
        <button type="button" class="preset-action-chip" data-preset-id="${p.id}">
          <div class="chip-main-info">
            <span class="chip-action-title">${p.title}</span>
            <span class="chip-action-desc">${p.hint.split(':')[0] || '국토부 기준'}</span>
          </div>
          <span class="chip-fund-badge ${p.badgeClass}">${badgeText}</span>
        </button>
      `;
    });

    html += `
      <button type="button" class="preset-custom-chip" id="btn-custom-action-toggle">
        <span class="chip-custom-icon">⚙️</span>
        <span class="chip-action-title">기타 세부작업 직접 설정</span>
      </button>
    `;

    presetsChipsGrid.innerHTML = html;

    // Attach click listeners to chips
    const chipElements = presetsChipsGrid.querySelectorAll('.preset-action-chip');
    chipElements.forEach(chip => {
      chip.addEventListener('click', () => {
        const pId = chip.dataset.presetId;
        const preset = presets.find(p => p.id === pId);
        if (!preset) return;

        chipElements.forEach(c => c.classList.remove('active'));
        const customBtn = document.getElementById('btn-custom-action-toggle');
        if (customBtn) customBtn.classList.remove('active');
        applyPresetWork(preset);
      });
    });

    const customBtn = document.getElementById('btn-custom-action-toggle');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        chipElements.forEach(c => c.classList.remove('active'));
        customBtn.classList.add('active');
        toggleAccordion(true);
        criteriaOptionsGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  // Quick Chip Click: 추천어 클릭 시 인풋에 채우고 스마트 힌트 및 프리셋 띄움
  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const keyword = chip.dataset.keyword;
      workInput.value = keyword;
      analyzeAndSelectCandidate(keyword, false);
    });
  });

  // =========================================================================
  // 3. Smart Keyword Detection & Dynamic Hint (힌트와 프리셋만 띄우고 조용히 대기)
  // =========================================================================
  function analyzeAndSelectCandidate(query, autoExecute = false) {
    const clean = query.trim().toLowerCase();

    // 1. Detect Location (공용 vs 세대 전유)
    if (exclusiveKeywords.some(kw => clean.includes(kw))) {
      isCommonArea = false;
      setSegmentActive(locationButtons, 'exclusive');
    } else {
      isCommonArea = true;
      setSegmentActive(locationButtons, 'common');
    }

    // 2. Detect Scope (전면 vs 부분) - 가중치 기반 정밀 분류
    const hasExplicitFull = explicitFullKeywords.some(kw => clean.includes(kw));
    const hasPartial = partialKeywords.some(kw => clean.includes(kw));
    const hasGeneralFull = generalFullKeywords.some(kw => clean.includes(kw));

    if (hasExplicitFull) {
      // "승강기 1대 교체", "1개동 외벽 전체 재도장" 등 명시적 전면 수선
      currentScope = 'full_min_unit';
      setSegmentActive(scopeButtons, 'full_min_unit');
    } else if (hasPartial) {
      // "승강기 smps 교체", "배수펌프 베어링 교체" 등 부품명 포함 시 우선 부분수리 판정
      currentScope = 'partial_sub_unit';
      setSegmentActive(scopeButtons, 'partial_sub_unit');
    } else if (hasGeneralFull) {
      // "배수펌프 교체", "변압기 교체" 등 장비명+교체 조합
      currentScope = 'full_min_unit';
      setSegmentActive(scopeButtons, 'full_min_unit');
    }

    // 3. Detect Emergency
    if (emergencyKeywords.some(kw => clean.includes(kw))) {
      currentEmergency = true;
      setSegmentActive(emergencyButtons, 'true');
    } else {
      currentEmergency = false;
      setSegmentActive(emergencyButtons, 'false');
    }

    // 4. Find Category & Presets
    const matches = engine.search(clean);
    if (matches && matches.length > 0) {
      currentCategoryId = matches[0].id;
      updateDynamicHint(matches[0]);
      renderPresets(currentCategoryId, clean);
    } else {
      currentCategoryId = null;
      updateDynamicHint(null, clean);
      renderPresets(null, clean);
    }

    updateSummaryChips();

    // 오직 명시적으로 autoExecute가 true일 때만 실행 (엔터키 등)
    if (autoExecute) {
      runEvaluation(true);
    }
  }

  function updateDynamicHint(cat, freeText) {
    if (!cat) {
      if (freeText) {
        dynamicHintBox.style.display = 'flex';
        hintText.innerHTML = `
          <div class="unlisted-hint-wrapper">
            <div><strong>'${freeText}'</strong>: 법정 [별표 1]에 없는 공종·부품입니다.</div>
            <div class="quick-scope-selector">
              <span class="selector-label">성격 빠른 선택:</span>
              <button type="button" class="btn-quick-scope ${currentScope === 'partial_sub_unit' ? 'active' : ''}" data-target-scope="partial_sub_unit">
                🟢 단순 소모품 부품 (수선유지비)
              </button>
              <button type="button" class="btn-quick-scope ${currentScope === 'full_min_unit' ? 'active' : ''}" data-target-scope="full_min_unit">
                🔵 고액 시설 신설 (장기수선충당금)
              </button>
            </div>
          </div>
        `;

        // Bind quick scope buttons
        const quickBtns = hintText.querySelectorAll('.btn-quick-scope');
        quickBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetScope = btn.dataset.targetScope;
            currentScope = targetScope;
            setSegmentActive(scopeButtons, targetScope);
            quickBtns.forEach(b => b.classList.toggle('active', b.dataset.targetScope === targetScope));
            trackEvent('click_quick_scope_hint', { target_scope: targetScope, keyword: freeText });
            if (officialReportCard && officialReportCard.style.display !== 'none') {
              runEvaluation(false);
            }
          });
        });
      } else {
        dynamicHintBox.style.display = 'none';
      }
      return;
    }

    const rule = engine.ruleMap.get(cat.id);
    dynamicHintBox.style.display = 'flex';

    if (rule) {
      hintText.innerHTML = `<strong>국토부 가이드라인 기준 (${rule.type_name})</strong>: 최소단위는 <strong>[${rule.min_unit}]</strong>입니다.<br>👉 <em>${rule.guideline_note}</em>`;
    } else {
      hintText.innerHTML = `<strong>[${cat.name}]</strong>: 법정 수선주기 ${cat.cycle}년, 수선율 ${cat.rate}%, 수선구분: ${cat.repair_type}`;
    }
  }

  // Search Input Handlers
  workInput.addEventListener('input', () => {
    const query = workInput.value.trim();
    if (!query) {
      dropdown.style.display = 'none';
      dynamicHintBox.style.display = 'none';
      if (workPresetsContainer) workPresetsContainer.style.display = 'none';
      currentCategoryId = null;
      return;
    }

    const matches = engine.search(query);
    renderDropdown(matches, query);
  });

  // 엔터키를 눌렀을 때만 평가 실행 및 스크롤
  workInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dropdown.style.display = 'none';
      analyzeAndSelectCandidate(workInput.value, true);
    }
  });

  document.addEventListener('click', (e) => {
    if (!workInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  function renderDropdown(matches, query) {
    if (!matches || matches.length === 0) {
      dropdown.innerHTML = `
        <div class="candidate-item" data-id="" data-name="${query}">
          <div>
            <div class="candidate-title">'${query}' (별표 1 외 공사로 검토)</div>
            <div class="candidate-sub">법정 73개 공종에 미포함된 일반 시설물</div>
          </div>
          <span class="candidate-badge">기타 시설</span>
        </div>
      `;
      dropdown.style.display = 'block';
      bindDropdownItems();
      return;
    }

    dropdown.innerHTML = matches.map(cat => `
      <div class="candidate-item" data-id="${cat.id}" data-name="${cat.name}">
        <div>
          <div class="candidate-title">${cat.name}</div>
          <div class="candidate-sub">${cat.main_category} &rsaquo; ${cat.sub_category} (주기 ${cat.cycle}년)</div>
        </div>
        <span class="candidate-badge">${cat.repair_type}</span>
      </div>
    `).join('');

    dropdown.style.display = 'block';
    bindDropdownItems();
  }

  function bindDropdownItems() {
    dropdown.querySelectorAll('.candidate-item').forEach(item => {
      item.addEventListener('click', () => {
        const catId = item.dataset.id || null;
        currentCategoryId = catId;
        workInput.value = item.dataset.name;
        dropdown.style.display = 'none';
        
        const cat = catId ? engine.catMap.get(catId) : null;
        updateDynamicHint(cat, item.dataset.name);
        renderPresets(catId, item.dataset.name);
        // 드롭다운 선택 시에는 힌트와 프리셋만 띄우고 결과로 튕기지 않음!
      });
    });
  }

  // =========================================================================
  // 4. Decision Evaluation Execution (검토 실행 버튼 클릭 시에만 스크롤!)
  // =========================================================================
  evaluateBtn.addEventListener('click', () => {
    runEvaluation(true); // 명시적 클릭 시에만 부드러운 스크롤 이동
  });

  function runEvaluation(shouldScroll = false) {
    const workName = workInput.value.trim() || '입력된 공사';
    latestWorkName = workName;

    if (!currentCategoryId && workName) {
      const candidates = engine.search(workName);
      if (candidates && candidates.length > 0) {
        currentCategoryId = candidates[0].id;
        updateDynamicHint(candidates[0]);
      }
    }

    const result = engine.evaluate({
      categoryId: currentCategoryId,
      customWorkName: workName,
      scopeType: currentScope,
      inPlan: currentInPlan,
      isEmergency: currentEmergency,
      isCommonArea: isCommonArea
    });

    latestResult = result;
    renderOfficialReport(result, workName, shouldScroll);
  }

  function renderOfficialReport(res, workName, shouldScroll) {
    reportWorkTitle.textContent = workName;

    // 1. 3-Second Quick Summary Trio Cards
    quickFundPayer.textContent = `${res.fundType} (${res.payerName})`;
    quickProcedureAuth.textContent = res.procedureAuth;
    quickAuditRisk.textContent = res.riskLevel;

    // Color accents
    if (res.fundType.includes('장기수선충당금') || res.fundType.includes('장기수선계획')) {
      quickFundPayer.style.color = '#1d4ed8';
      tableFundType.style.color = '#1d4ed8';
      tablePayerType.innerHTML = `<span style="color: #1d4ed8; font-weight: 700;">${res.payerName}</span>`;
    } else if (res.fundType.includes('수선유지비')) {
      quickFundPayer.style.color = '#047857';
      tableFundType.style.color = '#047857';
      tablePayerType.innerHTML = `<span style="color: #047857; font-weight: 700;">${res.payerName}</span>`;
    } else {
      quickFundPayer.style.color = '#b91c1c';
      tableFundType.style.color = '#b91c1c';
      tablePayerType.innerHTML = `<span style="color: #b91c1c; font-weight: 700;">${res.payerName}</span>`;
    }

    // Seal Badge
    sealBadge.className = `official-seal-badge ${res.badgeClass.replace('badge-', 'seal-')}`;
    sealIcon.textContent = res.badgeIcon;
    sealText.textContent = res.fundType;

    // Standard Table
    tableFundType.textContent = res.fundType;
    tableLegalBasis.textContent = res.legalBasis;
    tableGuidelineUnit.textContent = res.guidelineRule;
    tableSummaryOpinion.textContent = res.summaryText;
    tableAuditWarning.textContent = res.auditWarning;

    // Process Checklist
    tableProcessChecklist.innerHTML = (res.actionChecklist || []).map((step, idx) => `
      <li class="checklist-item">
        <span class="step-badge">${idx + 1}</span>
        <span>${step}</span>
      </li>
    `).join('');

    // 결과 카드 노출
    officialReportCard.style.display = 'block';

    // 사용자가 '검토 실행' 버튼을 명시적으로 눌렀을 때만 부드럽게 스크롤 이동
    if (shouldScroll) {
      officialReportCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      trackEvent('evaluator_run', {
        work_name: workName,
        fund_type: res.fundType
      });
    }
  }

  // =========================================================================
  // 5. Dual Copy Actions & PDF Download
  // =========================================================================
  function getShareUrl() {
    let url = 'https://apt.postsyncapp.com/';
    if (currentPresetId) {
      url += `?preset=${encodeURIComponent(currentPresetId)}`;
    } else if (currentCategoryId) {
      url += `?category=${encodeURIComponent(currentCategoryId)}`;
    }
    return url;
  }

  copyKakaoBtn.addEventListener('click', () => {
    if (!latestResult) return;
    const shareUrl = getShareUrl();
    const kakaoText = engine.formatKakaoSummary(latestResult, latestWorkName) + 
      `\n\n🔗 이 판별 결과 바로가기:\n${shareUrl}`;
    copyTextToClipboard(kakaoText, '📱 동대표 카톡용 요약 및 복원 링크가 복사되었습니다!');
    trackEvent('copy_summary', { work_name: latestWorkName, format: 'kakao' });
  });

  copyFullDocBtn.addEventListener('click', () => {
    if (!latestResult) return;
    const shareUrl = getShareUrl();
    const fullText = engine.formatFullDocText(latestResult, latestWorkName) + 
      `\n\n[온라인 실시간 검토 링크]\n${shareUrl}`;
    copyTextToClipboard(fullText, '📄 검토의견서 전문 및 바로가기 링크가 복사되었습니다.');
    trackEvent('copy_summary', { work_name: latestWorkName, format: 'full_doc' });
  });

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      if (!officialReportCard || !latestResult) return;

      if (typeof html2pdf === 'undefined') {
        showToast('⚠️ PDF 엔진 로딩 중입니다. 인쇄창으로 전환합니다.');
        window.print();
        return;
      }

      const origText = downloadPdfBtn.innerHTML;
      downloadPdfBtn.innerHTML = '<span>⏳</span> PDF 생성 중...';
      downloadPdfBtn.disabled = true;

      // 1. A4 출력을 위한 독립 클론 엘리먼트 생성 (스크롤 및 상단 여백 오프셋 버그 원천 차단)
      const clone = officialReportCard.cloneNode(true);
      clone.classList.add('pdf-print-mode');

      // 불필요한 액션 버튼 제거
      const cloneActionBtns = clone.querySelector('.report-action-buttons');
      if (cloneActionBtns) cloneActionBtns.remove();

      // 인쇄/PDF 전용 A4 최적화 스타일 주입
      clone.style.margin = '0';
      clone.style.padding = '24px 28px';
      clone.style.width = '750px';
      clone.style.boxSizing = 'border-box';
      clone.style.background = '#ffffff';
      clone.style.border = '2px solid #0f172a';
      clone.style.borderRadius = '0px';
      clone.style.boxShadow = 'none';

      // 2. 화면 최상단(0, 0) 독립 오프스크린 샌드박스에 부착 (html2canvas 좌표계 (0,0) 보장)
      const container = document.createElement('div');
      container.id = 'pdf-render-sandbox';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '750px';
      container.style.zIndex = '-9999';
      container.style.background = '#ffffff';
      container.style.overflow = 'visible';
      container.style.pointerEvents = 'none';
      container.appendChild(clone);
      document.body.appendChild(container);

      const fileName = `공사의견서_${(latestWorkName || '공사재원검토').replace(/[^\w가-힣]/g, '_')}.pdf`;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 750
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(clone).save().then(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        downloadPdfBtn.innerHTML = origText;
        downloadPdfBtn.disabled = false;
        showToast('💾 공문서 PDF 저장이 완료되었습니다!');
        trackEvent('pdf_download', { work_name: latestWorkName });
      }).catch(err => {
        console.error('PDF generation error:', err);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        downloadPdfBtn.innerHTML = origText;
        downloadPdfBtn.disabled = false;
        window.print();
      });
    });
  }

  function copyTextToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
      }).catch(() => fallbackCopy(text, successMessage));
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMessage);
  }

  printBtn.addEventListener('click', () => {
    window.print();
  });

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // =========================================================================
  // 6. View 2: Table 1 Master Table Filter
  // =========================================================================
  function renderTable1(filterText = '') {
    const categories = window.APP_DATA.categories || [];
    const filter = filterText.toLowerCase().replace(/\s+/g, '');

    const filtered = categories.filter(c => {
      if (!filter) return true;
      return (
        c.name.toLowerCase().includes(filter) ||
        c.main_category.toLowerCase().includes(filter) ||
        c.sub_category.toLowerCase().includes(filter)
      );
    });

    table1TbodyContainer.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>${c.main_category}</strong></td>
        <td>${c.sub_category}</td>
        <td><strong style="color: #1e293b;">${c.name}</strong></td>
        <td>${c.cycle}년</td>
        <td>${c.rate}%</td>
        <td>
          <span style="font-size: 0.78rem; font-weight: 700; color: ${c.has_partial_repair ? '#1d4ed8' : '#64748b'};">
            ${c.repair_type}
          </span>
        </td>
        <td>
          <button type="button" class="clean-chip-btn btn-table-eval" data-id="${c.id}" data-name="${c.name}" style="background: #1a2b4c; color: #ffffff; border-color: #15233c;">
            선택하기 &rsaquo;
          </button>
        </td>
      </tr>
    `).join('');

    table1TbodyContainer.querySelectorAll('.btn-table-eval').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.id;
        const catName = btn.dataset.name;
        switchTab('tab-evaluator');
        workInput.value = catName;
        currentCategoryId = catId;
        const cat = engine.catMap.get(catId);
        updateDynamicHint(cat, catName);
        // 결과로 튕기지 않고 검색창에 채우기만 함! 사용자가 옵션 확인 후 버튼 누르면 됨!
      });
    });
  }

  if (table1SearchInput) {
    table1SearchInput.addEventListener('input', () => {
      renderTable1(table1SearchInput.value);
    });
  }

  // =========================================================================
  // 7. View 3: Guideline (A/B/C Type) Master Filter & Table
  // =========================================================================
  function renderGuideline(filterType = 'all', filterSearch = '') {
    if (!guidelineTbodyContainer) return;

    const rules = window.APP_DATA.rules || [];
    const search = filterSearch.toLowerCase().replace(/\s+/g, '');

    const filtered = rules.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) {
        return false;
      }
      if (search) {
        const cat = engine.catMap.get(r.category_id);
        const catName = cat ? cat.name.toLowerCase().replace(/\s+/g, '') : '';
        const minUnit = (r.min_unit || '').toLowerCase().replace(/\s+/g, '');
        const note = (r.guideline_note || '').toLowerCase().replace(/\s+/g, '');
        const belowFund = (r.below_min_unit_fund || '').toLowerCase().replace(/\s+/g, '');
        return catName.includes(search) || minUnit.includes(search) || note.includes(search) || belowFund.includes(search);
      }
      return true;
    });

    guidelineTbodyContainer.innerHTML = filtered.map(r => {
      const cat = engine.catMap.get(r.category_id);
      const catName = cat ? cat.name : r.category_id;
      const pillClass = r.type === 'A' ? 'pill-a' : r.type === 'B' ? 'pill-b' : 'pill-c';
      const isReserveFund = r.below_min_unit_fund.includes('장기수선충당금');
      const fundBadgeColor = isReserveFund ? '#1e3a8a' : '#047857';
      const fundBgColor = isReserveFund ? '#eff6ff' : '#ecfdf5';

      return `
        <tr>
          <td><strong style="color: #1e293b;">${catName}</strong></td>
          <td>
            <span class="type-pill ${pillClass}">
              ${r.type}타입 (${r.type === 'A' ? '공간' : r.type === 'B' ? '기능' : '단지'})
            </span>
          </td>
          <td>
            <div style="font-size: 0.84rem; font-weight: 700; color: #1e3a8a; line-height: 1.4;">
              ${r.min_unit}
            </div>
          </td>
          <td>
            <span style="font-size: 0.78rem; font-weight: 700; background: ${fundBgColor}; color: ${fundBadgeColor}; padding: 3px 8px; border-radius: 4px; display: inline-block;">
              ${r.below_min_unit_fund}
            </span>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #475569; line-height: 1.45;">
              ${r.guideline_note}
            </div>
          </td>
          <td>
            <button type="button" class="clean-chip-btn btn-guideline-eval" data-id="${r.category_id}" data-name="${catName}" style="background: #1a2b4c; color: #ffffff; border-color: #15233c;">
              판별하기 &rsaquo;
            </button>
          </td>
        </tr>
      `;
    }).join('');

    guidelineTbodyContainer.querySelectorAll('.btn-guideline-eval').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.id;
        const catName = btn.dataset.name;
        switchTab('tab-evaluator');
        workInput.value = catName;
        currentCategoryId = catId;
        const cat = engine.catMap.get(catId);
        updateDynamicHint(cat, catName);
      });
    });
  }

  if (guidelineFilterGroup) {
    guidelineFilterGroup.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        guidelineFilterGroup.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGuidelineFilter = btn.dataset.filter;
        renderGuideline(currentGuidelineFilter, guidelineSearchInput ? guidelineSearchInput.value : '');
      });
    });
  }

  if (guidelineSearchInput) {
    guidelineSearchInput.addEventListener('input', () => {
      renderGuideline(currentGuidelineFilter, guidelineSearchInput.value);
    });
  }

  // =========================================================================
  // 8. View 4: Audit Cases List
  // =========================================================================
  function renderAuditCases() {
    const auditCases = window.APP_DATA.auditCases || [];
    auditListContainer.innerHTML = auditCases.map(a => `
      <div class="audit-risk-banner" style="border-left-color: #dc2626; background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid #dc2626; padding: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="background: #fef2f2; color: #dc2626; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">${a.category}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #b91c1c;">${a.penalty}</span>
        </div>
        <h4 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin-bottom: 6px;">${a.title}</h4>
        <p style="font-size: 0.88rem; color: #475569; margin-bottom: 10px; line-height: 1.5;">${a.case_summary}</p>
        <div style="background: #eff6ff; padding: 10px 14px; border-radius: 6px; font-size: 0.82rem; color: #1e40af; line-height: 1.5;">
          <strong>🛡️ 지자체 감사 예방 가이드:</strong> ${a.prevention_tip}
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 9. View 5: 113선 공종별 백과사전 실시간 검색 & 카테고리 필터
  // =========================================================================
  function initDictionarySearch() {
    const searchInput = document.getElementById('dict-search-input');
    const clearBtn = document.getElementById('dict-search-clear');
    const chipButtons = document.querySelectorAll('#dict-filter-chips .dict-chip');
    const countDisplay = document.getElementById('dict-count-display');
    const emptyState = document.getElementById('dict-empty-state');
    const grid = document.getElementById('dictionary-list-grid');

    if (!searchInput || !grid) return;

    let activeFilter = 'all';

    function filterDictionaryCards() {
      const query = searchInput.value.trim().toLowerCase();
      const cards = grid.querySelectorAll('.dictionary-card');
      let visibleCount = 0;

      if (clearBtn) {
        clearBtn.style.display = query ? 'flex' : 'none';
      }

      cards.forEach(card => {
        const title = (card.dataset.title || card.textContent || '').toLowerCase();
        const badge = (card.dataset.badge || '').toLowerCase();
        const mainCat = (card.dataset.main || '').toLowerCase();
        const subCat = (card.dataset.sub || '').toLowerCase();
        const hint = (card.dataset.hint || '').toLowerCase();

        // 1. Category Chip Matching
        let matchesCategory = false;
        if (activeFilter === 'all') {
          matchesCategory = true;
        } else if (activeFilter === 'reserve') {
          matchesCategory = badge === '장충금';
        } else if (activeFilter === 'repair') {
          matchesCategory = badge === '수선비' || badge === '수선유지비';
        } else if (activeFilter === 'household') {
          matchesCategory = badge === '세대부담';
        } else {
          matchesCategory = mainCat.includes(activeFilter.toLowerCase()) || subCat.includes(activeFilter.toLowerCase());
        }

        // 2. Text Search Query Matching
        let matchesQuery = true;
        if (query) {
          matchesQuery = title.includes(query) || hint.includes(query) || mainCat.includes(query) || subCat.includes(query);
        }

        if (matchesCategory && matchesQuery) {
          card.style.display = 'block';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (countDisplay) {
        countDisplay.textContent = visibleCount;
      }

      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    let searchDebounceTimer;
    searchInput.addEventListener('input', () => {
      filterDictionaryCards();
      const q = searchInput.value.trim();
      clearTimeout(searchDebounceTimer);
      if (q.length >= 2) {
        searchDebounceTimer = setTimeout(() => {
          trackEvent('dict_search', { search_term: q });
        }, 800);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        filterDictionaryCards();
      });
    }

    chipButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        chipButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter || 'all';
        filterDictionaryCards();
      });
    });
  }

  initDictionarySearch();

  // 초기 상태 및 URL 파라미터 연동 (?preset=PRESET-EXT01-1, ?tab=dictionary 등)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const presetParam = urlParams.get('preset');

  if (tabParam) {
    const formattedTab = tabParam.startsWith('tab-') ? tabParam : 'tab-' + tabParam;
    switchTab(formattedTab);
  }

  if (presetParam && window.APP_DATA && Array.isArray(window.APP_DATA.workPresets)) {
    const targetPreset = window.APP_DATA.workPresets.find(p => p.id.toUpperCase() === presetParam.toUpperCase());
    if (targetPreset) {
      applyPresetWork(targetPreset);
      renderPresets(targetPreset.categoryId, targetPreset.title);
      const activeChip = presetsChipsGrid ? presetsChipsGrid.querySelector(`[data-preset-id="${targetPreset.id}"]`) : null;
      if (activeChip) activeChip.classList.add('active');
      runEvaluation(true);
    } else {
      workInput.value = '지하주차장 배수펌프 1대 교체';
      analyzeAndSelectCandidate('지하주차장 배수펌프 1대 교체', false);
    }
  } else {
    workInput.value = '지하주차장 배수펌프 1대 교체';
    analyzeAndSelectCandidate('지하주차장 배수펌프 1대 교체', false);
  }
});
