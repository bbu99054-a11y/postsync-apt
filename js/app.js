/**
 * 공사 재원 판별시스템 - 메인 컨트롤러 v2.7
 * 개선: 옵션 변경 시 화면 튕김/자동 스크롤 전면 차단
 * [검토 실행] 버튼을 명시적으로 눌렀을 때만 결과 생성 및 부드러운 스크롤 이동
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Decision Engine
  const engine = new RepairDecisionEngine(window.APP_DATA);

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
  let isCommonArea = true;
  let currentScope = 'full_min_unit';
  let currentInPlan = true;
  let currentEmergency = false;
  let latestResult = null;
  let latestWorkName = '';

  // Smart Keyword Dictionaries for Auto-Detection
  const partialKeywords = ['봉', '기판', '센서', '수리', '보수', '덧칠', '패킹', '모터수리', '부품', '크랙', '손잡이', '힌지', '밸브', '전구', '램프'];
  const fullKeywords = ['전체', '교체', '신설', '1대', '재도장', '전면'];
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

  // =========================================================================
  // 2-1. Dynamic Work Presets (단골 세부작업 원클릭 선택기)
  // =========================================================================
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
        chip.classList.add('active');

        // Set input value
        workInput.value = preset.title;

        // Set state
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

    // 2. Detect Scope (전면 vs 부분)
    if (partialKeywords.some(kw => clean.includes(kw))) {
      currentScope = 'partial_sub_unit';
      setSegmentActive(scopeButtons, 'partial_sub_unit');
    } else if (fullKeywords.some(kw => clean.includes(kw))) {
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
        hintText.innerHTML = `<strong>'${freeText}'</strong>: 법정 [별표 1] 미명시 공종입니다. 자본적 지출이면 <strong>[장기수선계획 조정 후 장충금]</strong>, 소모성이면 <strong>[수선유지비]</strong>를 권장합니다.`;
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
    }
  }

  // =========================================================================
  // 5. Dual Copy Actions
  // =========================================================================
  copyKakaoBtn.addEventListener('click', () => {
    if (!latestResult) return;
    const kakaoText = engine.formatKakaoSummary(latestResult, latestWorkName);
    copyTextToClipboard(kakaoText, '📱 동대표 카톡 전송용 3줄 요약이 복사되었습니다!');
  });

  copyFullDocBtn.addEventListener('click', () => {
    if (!latestResult) return;
    const fullText = engine.formatFullDocText(latestResult, latestWorkName);
    copyTextToClipboard(fullText, '📄 검토의견서 전문이 복사되었습니다. (결재문/품의서용)');
  });

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

  // 초기 상태: 예시 단어를 기본 입력창에 살짝 넣어두되, 결과 화면으로 자동 스크롤하지 않고 조용히 대기
  workInput.value = '지하주차장 배수펌프 1대 교체';
  analyzeAndSelectCandidate('지하주차장 배수펌프 1대 교체', false);
});
