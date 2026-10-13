/**
 * Apartment Repair Decision Engine (Core Logic)
 * 장기수선충당금 vs 수선유지비 판별 엔진 코어 v2.6
 */
class RepairDecisionEngine {
  constructor(data) {
    this.data = data || (window.APP_DATA || {});
    this.categories = this.data.categories || [];
    this.rules = this.data.rules || [];
    this.synonyms = this.data.synonyms || [];
    this.auditCases = this.data.auditCases || [];
    this.workPresets = this.data.workPresets || [];

    // Map for fast index
    this.catMap = new Map();
    this.categories.forEach(c => this.catMap.set(c.id, c));

    this.ruleMap = new Map();
    this.rules.forEach(r => this.ruleMap.set(r.category_id, r));
  }

  /**
   * Get work action presets for category or keyword
   */
  getPresets(categoryId, keyword) {
    let list = [];
    if (categoryId) {
      list = this.workPresets.filter(p => p.categoryId === categoryId);
    }
    if ((!list || list.length === 0) && keyword) {
      const clean = keyword.trim().toLowerCase().replace(/\s+/g, '');
      const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(t => t.length > 1);

      list = this.workPresets.filter(p => {
        const titleClean = p.title.toLowerCase().replace(/\s+/g, '');
        if (titleClean.includes(clean) || clean.includes(titleClean)) return true;
        if (tokens.length >= 2 && tokens.every(tok => titleClean.includes(tok))) return true;
        return false;
      });
    }
    return list;
  }

  /**
   * Search and match category candidates based on keyword
   */
  search(keyword) {
    if (!keyword || !keyword.trim()) {
      return this.categories.slice(0, 8);
    }
    const clean = keyword.trim().toLowerCase().replace(/\s+/g, '');
    const scored = [];

    for (const cat of this.categories) {
      let score = 0;
      const catNameClean = cat.name.toLowerCase().replace(/\s+/g, '');
      const subCatClean = cat.sub_category.toLowerCase().replace(/\s+/g, '');
      const mainCatClean = cat.main_category.toLowerCase().replace(/\s+/g, '');
      const descClean = cat.description.toLowerCase().replace(/\s+/g, '');

      if (catNameClean === clean) score += 100;
      else if (catNameClean.includes(clean)) score += 60;
      else if (clean.includes(catNameClean)) score += 40;

      if (subCatClean.includes(clean)) score += 30;
      if (mainCatClean.includes(clean)) score += 15;
      if (descClean.includes(clean)) score += 20;

      // Check synonyms
      const synObj = this.synonyms.find(s => s.category_id === cat.id);
      if (synObj) {
        for (const kw of synObj.keywords) {
          const kwClean = kw.toLowerCase().replace(/\s+/g, '');
          if (kwClean === clean) {
            score += 90;
            break;
          } else if (kwClean.includes(clean) || clean.includes(kwClean)) {
            score += 50;
            break;
          }
        }
      }

      if (score > 0) {
        scored.push({ category: cat, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.category);
  }

  /**
   * Evaluate repair work according to official guidelines and law
   */
  evaluate(params) {
    const {
      categoryId,
      customWorkName = '',
      scopeType = 'full_min_unit', // 'full_min_unit' | 'partial_sub_unit'
      isCommonArea = true,
      inPlan = true,
      isEmergency = false,
      isCapitalNature = (scopeType === 'full_min_unit')
    } = params;

    // STEP 1: Exclusive/Common area check (전유부분 vs 공용부분)
    if (!isCommonArea) {
      return {
        fundType: '세대 자체 부담 (전유부분)',
        badgeClass: 'badge-danger',
        badgeIcon: '🚫',
        payerName: '입주자 / 해당 세대 개별 부담',
        procedureAuth: '관리사무소 집행 불가 (세대 자체 처리)',
        riskLevel: '공용 재원 사용 시 업무상 배임 및 과태료',
        conclusion: '입주자(소유자/세입자) 세대 자체 부담 (공용 재원 지출 불가)',
        summaryText: `[${customWorkName || '해당 공사'}]는 공용부분이 아닌 전유부분(개인 세대 내부 전용 공간) 공사로 판별되었습니다. 장기수선충당금과 관리비(수선유지비) 모두 사용이 불가하며 세대에서 전액 개별 부담해야 합니다.`,
        legalBasis: '공동주택관리법 제30조 및 단지 관리규약상 전유부분/공용부분 구분 기준',
        guidelineRule: '전유부분에 해당하는 배관, 창호, 전등, 도어락 등은 공동주택 재원으로 집행할 수 없습니다.',
        auditWarning: '전유부분 보수에 공용 재원(장충금 또는 수선비)을 지출할 경우 업무상 배임 및 관리비 부정 사용으로 과태료 부과 대상이 됩니다.',
        actionChecklist: [
          '단지 관리규약 전유부분/공용부분 구분표 확인',
          '세대 자체 보수 안내 및 공용 재원 지출 불가 고지',
          '누수로 인한 인접 세대 피해 시 원인 세대 일상생활배상책임보험 안내'
        ],
        auditCase: null
      };
    }

    // STEP 2: Lookup category
    const category = categoryId ? this.catMap.get(categoryId) : null;
    const rule = categoryId ? this.ruleMap.get(categoryId) : null;

    // Case: Unlisted item (별표 1에 없는 항목)
    if (!category) {
      if (isCapitalNature) {
        return {
          fundType: '장기수선계획 조정 후 장충금 집행 권고',
          badgeClass: 'badge-warning',
          badgeIcon: '⚠️',
          payerName: '주택 소유자 (구분소유자 부담)',
          procedureAuth: '입주자 과반수 동의 + 장기수선계획 수시조정 필수',
          riskLevel: '수선비 편법 처리 시 과태료 500만 원 (임차인 부당 전가)',
          conclusion: '장기수선계획서 수시조정 후 장기수선충당금 집행',
          summaryText: `[${customWorkName || '해당 공사'}]는 법정 [별표 1]에는 명시되지 않았으나, 자본적 지출(고액, 내구연한 증가, 주요 시설) 성격이 강합니다. 국토부 유권해석에 따라 수선유지비로 편법 처리하기보다는 장기수선계획에 신규 항목으로 반영한 후 장기수선충당금으로 집행하는 것이 안전합니다.`,
          legalBasis: '국토교통부 유권해석 (별표 1에 없는 항목의 장기수선계획 수립 기준)',
          guidelineRule: '별표 1 외의 시설이라도 건물의 안전과 가치 보전을 위해 필요한 주요 공사는 입대의 의결 및 소유자 동의를 거쳐 장기수선계획에 반영 권고',
          auditWarning: '고액의 주요 시설 공사를 장충금 부족이나 절차 번거로움을 이유로 수선유지비로 집행할 경우 임차인에게 부당 전가(과태료 500만~1,000만 원)로 감사 적발됩니다.',
          actionChecklist: [
            '장기수선계획서 수시조정 안건 입대의 상정',
            '전체 입주자(소유자) 과반수 서면동의서 징구',
            '계획서 반영 후 장기수선충당금 사용계획서 의결 및 집행'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-01')
        };
      } else {
        return {
          fundType: '수선유지비 (소모성 유지보수)',
          badgeClass: 'badge-success',
          badgeIcon: '✅',
          payerName: '실거주자 (임차인 포함 관리비 부담)',
          procedureAuth: '입주자대표회의 의결 또는 관리사무소 일상 결재',
          riskLevel: '적법 집행 (감사 리스크 없음)',
          conclusion: '관리비(수선유지비) 집행 가능',
          summaryText: `[${customWorkName || '해당 공사'}]는 법정 [별표 1]에 없으며 단순 소모성·원상회복 성격의 공사입니다. 관리규약 및 입주자대표회의 의결에 따라 관리비 중 '수선유지비' 비목으로 집행할 수 있습니다.`,
          legalBasis: '공동주택관리법 시행령 [별표 2] 관리비 비목(수선유지비) 및 국토교통부 유권해석',
          guidelineRule: '별표 1에 없는 경미한 유지보수, 단순 소모품 교체는 관리규약에 정한 바에 따라 수선유지비로 부과 가능',
          auditWarning: '단, 공사 금액이 크거나 자산 가치를 증가시키는 시설물 신설의 경우 수선유지비 집행 시 감사 지적을 받을 수 있으므로 주의가 필요합니다.',
          actionChecklist: [
            '해당 연도 관리비 수선유지비 예산 범위 확인',
            '입주자대표회의 의결(또는 소액지출 규약 준수)',
            '세금계산서 및 검수조서 작성 후 관리비 정산 부과'
          ],
          auditCase: null
        };
      }
    }

    // STEP 3: Category matched - Detailed Rule Evaluation
    const isFullScope = (scopeType === 'full_min_unit');
    const minUnitDesc = rule ? rule.min_unit : '1개소 또는 전체 단위';
    const typeName = rule ? rule.type_name : '규정 단위';
    const guidelineNote = rule ? rule.guideline_note : '';

    // Check emergency
    if (isEmergency) {
      return {
        fundType: '장기수선충당금 (긴급 선집행 대상)',
        badgeClass: 'badge-primary',
        badgeIcon: '🚨',
        payerName: '주택 소유자 (구분소유자 부담)',
        procedureAuth: '관리규약 긴급공사 조항으로 선집행 ➔ 사후 계획조정',
        riskLevel: '선집행 후 사후 계획조정 누락 시 감사 지적 주의',
        conclusion: '긴급 장기수선충당금 선집행 (사후 계획조정 필수)',
        summaryText: `[${category.name}] 공사는 안전사고 및 재난 예방을 위한 긴급 보수 상황입니다. 관리규약의 긴급공사 조항에 따라 선(先) 장충금 집행 후 차기 정기/수시조정 시 사후(後) 장기수선계획서에 반영할 수 있습니다.`,
        legalBasis: '공동주택관리법 시행령 제31조 및 시·도 공동주택 관리규약 준칙(긴급수선 특례)',
        guidelineRule: `최소단위 기준: [${minUnitDesc}]. 긴급 조치라 하더라도 주요 시설 공사는 수선유지비가 아닌 장충금으로 선집행해야 합니다.`,
        auditWarning: '긴급 선집행 후 입대의 사후 보고 및 장기수선계획 수시조정 이력 관리를 누락하면 감사에서 절차 위반으로 지적받습니다.',
        actionChecklist: [
          '긴급 수선 필요성 입증 자료(현장 사진, 소견서, 긴급 결재문서) 확보',
          '입주자대표회의 긴급 보고 및 장기수선충당금 선집행 의결',
          '공사 완료 후 차기 장기수선계획 조정 시 실적 반영'
        ],
        auditCase: this.auditCases.find(c => c.id === 'AUDIT-05')
      };
    }

    // Evaluate based on Scope (전면 vs 부분)
    if (isFullScope) {
      // Full replacement
      if (!inPlan) {
        return {
          fundType: '장기수선계획 조정 후 장충금 집행',
          badgeClass: 'badge-warning',
          badgeIcon: '⏳',
          payerName: '주택 소유자 (구분소유자 부담)',
          procedureAuth: '입주자 과반수 서면동의 ➔ 수시조정 선행 필수',
          riskLevel: '계획 미조정 선지출 시 과태료 1,000만 원 (법 제29조)',
          conclusion: '장기수선계획 수시조정 선행 후 장기수선충당금 집행',
          summaryText: `[${category.name}]의 전면교체(${typeName})는 법정 필수 장충금 공사입니다. 그러나 현재 단지 장기수선계획서에 반영되어 있지 않거나 계획 연도가 도래하지 않았다면, 먼저 입주자 과반수 서면동의로 계획을 조정한 후 장충금을 지출해야 합니다.`,
          legalBasis: `공동주택관리법 제29조 제3항(수시조정) 및 시행규칙 [별표 1] (${category.main_category} - ${category.name})`,
          guidelineRule: `국토부 가이드라인 최소단위: ${minUnitDesc}. 수선주기: ${category.cycle}년.`,
          auditWarning: '계획서 미조정 상태에서 장충금을 임의 선지출하거나, 절차가 번거롭다고 수선유지비로 처리하면 1,000만 원 이하 과태료 처분을 받습니다.',
          actionChecklist: [
            '장기수선계획 조정안 작성 (공사시기, 금액)',
            '전체 입주자(소유자) 과반수 서면동의서 징구',
            '입주자대표회의 의결 및 계획 확정',
            '장기수선충당금 사용계획서 승인 후 공사 발주'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-02')
        };
      } else {
        return {
          fundType: '장기수선충당금 (정규 집행)',
          badgeClass: 'badge-primary',
          badgeIcon: '🏛️',
          payerName: '주택 소유자 (구분소유자 부담)',
          procedureAuth: '입주자대표회의 의결 + 사업자 선정지침 경쟁입찰',
          riskLevel: '수선유지비로 편법 전가 시 과태료 500만 원 (단골 1순위)',
          conclusion: '장기수선충당금 집행 대상 (소유자 부담)',
          summaryText: `[${category.name}]의 교체 공사는 국토부 가이드라인상 전면수선 최소단위(${typeName}: ${minUnitDesc})를 충족하는 명백한 장기수선충당금 집행 공사입니다. 관리비(수선유지비)로 집행할 수 없습니다.`,
          legalBasis: `공동주택관리법 제30조 및 시행규칙 [별표 1] (${category.main_category} > ${category.name}, 수선주기 ${category.cycle}년, 수선율 ${category.rate}%)`,
          guidelineRule: guidelineNote || `국토교통부 실무 가이드라인 전면수선 최소단위: ${minUnitDesc}`,
          auditWarning: '장기수선충당금 잔액이 부족하다는 이유로 입대의 의결을 거쳐 수선유지비로 편법 집행 시 즉시 지자체 감사 적발 및 과태료 500만 원 부과 대상입니다.',
          actionChecklist: [
            '장기수선계획서상 해당 연도 계획 및 배정 예산 일치 여부 확인',
            '장기수선충당금 사용계획서 작성 및 입주자대표회의 의결',
            '공동주택 주택관리업자 및 사업자 선정지침에 따른 입찰 공고',
            '공사 완료 및 준공 검수 후 장기수선충당금 전용 통장에서 인출'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-01')
        };
      }
    } else {
      // Partial repair (최소단위 미달 / 부분수리)
      if (rule && rule.below_min_unit_fund === '수선유지비') {
        return {
          fundType: '수선유지비 (소모성 유지보수)',
          badgeClass: 'badge-success',
          badgeIcon: '🛠️',
          payerName: '실거주자 (임차인 포함 관리비 부담)',
          procedureAuth: '관리사무소 일상 집행 또는 입대의 경미 결재',
          riskLevel: '장충금 지출 시 오히려 목적 외 사용 지적 (수선비가 적법)',
          conclusion: '관리비(수선유지비) 집행 대상 (국토부 가이드라인 권장)',
          summaryText: `[${category.name}]의 이번 보수는 국토부 실무 가이드라인상 전면수선 최소단위(${minUnitDesc}) 미만의 경미한 소모성 보수입니다. ${guidelineNote} 따라서 장기수선충당금이 아닌 관리비 중 '수선유지비'로 집행하는 것이 적법합니다.`,
          legalBasis: `국토교통부 「장기수선계획 실무 가이드라인」 전면수선 최소단위 기준 및 시행령 [별표 2] 수선유지비`,
          guidelineRule: guidelineNote || `전면수선 최소단위 미만의 국소 부위 보수는 수선유지비 집행 권장.`,
          auditWarning: '단순 소모성 부품 수리에 무리하게 장기수선충당금을 집행하면 오히려 "목적 외 사용"으로 감사 지적을 받을 수 있으므로 수선유지비로 적정 부과하십시오.',
          actionChecklist: [
            '해당 월 관리비 수선유지비 계정 예산 범위 내 집행',
            '견적서 및 세금계산서 첨부하여 일상 유지보수 결재',
            '입주자 관리비 고지서에 수선유지비 비목으로 정산 부과'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-04')
        };
      } else if (category.has_partial_repair) {
        return {
          fundType: '장기수선충당금 (법정 부분수리 항목)',
          badgeClass: 'badge-primary',
          badgeIcon: '🔧',
          payerName: '주택 소유자 (구분소유자 부담)',
          procedureAuth: '입주자대표회의 의결 후 장충금 집행',
          riskLevel: '수선유지비 부과 시 임차인 부당 전가 지적 주의',
          conclusion: '장기수선충당금 집행 대상 (법정 부분수리 명시 공종)',
          summaryText: `[${category.name}] 공사는 최소단위 미만의 부분 보수이지만, 공동주택관리법 시행규칙 [별표 1]에 명시적으로 '부분수리'가 규정되어 있는 핵심 부품/공종입니다. 따라서 소규모 수리라도 원칙적으로 장기수선충당금으로 집행해야 합니다.`,
          legalBasis: `공동주택관리법 시행규칙 [별표 1] (${category.main_category} > ${category.name}: 전면 및 부분수리 병행 명시)`,
          guidelineRule: `가이드라인: 별표 1에 부분수리가 명시된 항목은 해당 부분수선 기준에 따라 장충금을 사용하는 것이 원칙입니다.`,
          auditWarning: '법령상 부분수리가 명시된 항목의 수리를 임의로 수선유지비로 부과할 경우 감사에서 "임차인 부당 전가"로 지적될 수 있습니다.',
          actionChecklist: [
            '단지 장기수선계획서에 해당 부분수리 항목 및 주기/예산 포함 여부 확인',
            '장기수선충당금 사용계획서 의결 후 집행',
            '경미한 소모품성 금액인 경우 관리규약의 소액수선비 특례 해당 여부 검토'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-03')
        };
      } else {
        return {
          fundType: '수선유지비 (소모성 유지보수)',
          badgeClass: 'badge-success',
          badgeIcon: '🛠️',
          payerName: '실거주자 (임차인 포함 관리비 부담)',
          procedureAuth: '관리사무소 일상 집행',
          riskLevel: '적법 집행 (감사 리스크 없음)',
          conclusion: '관리비(수선유지비) 집행 대상 (거주자 부담)',
          summaryText: `[${category.name}]의 이번 보수는 국토부 가이드라인상 전면수선 최소단위(${minUnitDesc}) 미만의 경미한 부분 수선이며, 법정 [별표 1]에도 '부분수리'가 명시되어 있지 않습니다. 따라서 장충금이 아닌 관리비 중 '수선유지비'로 집행하는 것이 적법합니다.`,
          legalBasis: `국토교통부 「장기수선계획 실무 가이드라인」 부분수선 집행 기준 및 시행령 [별표 2] 수선유지비`,
          guidelineRule: guidelineNote || `전면수선 최소단위 미만의 국소 부위 보수는 수선유지비 집행 권장.`,
          auditWarning: '이 공사는 오히려 장기수선충당금을 쓰면 "목적 외 사용(경미한 소모품에 장충금 집행)"으로 감사 지적을 받을 수 있습니다. 수선유지비로 적정 부과하십시오.',
          actionChecklist: [
            '해당 월 관리비 수선유지비 계정 예산 범위 내 집행',
            '견적서 및 세금계산서 첨부하여 일상 유지보수 결재',
            '입주자 관리비 고지서에 수선유지비 비목으로 정산 부과'
          ],
          auditCase: this.auditCases.find(c => c.id === 'AUDIT-04')
        };
      }
    }
  }

  /**
   * Format a crisp 3-line KakaoTalk message for Board Members (동대표 설득용)
   */
  formatKakaoSummary(res, workName) {
    return `[🏢 공사 재원 검토 알림]
• 공사명: ${workName}
• 최종 판정: ${res.fundType}
• 부담 주체: ${res.payerName}
• 법적 근거: ${res.legalBasis}
• 행정 절차: ${res.procedureAuth}
※ 국토교통부 실무 가이드라인 기준`;
  }

  /**
   * Format official document full text (공문서 전문)
   */
  formatFullDocText(res, workName) {
    return `[공동주택 시설물 유지보수 재원 검토의견서]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 공사 개요
  • 대상 공사명: ${workName}
  • 최종 판정 재원: ${res.fundType}
  • 비용 부담 주체: ${res.payerName}

2. 법률 및 행정 기준
  • 법적 근거: ${res.legalBasis}
  • 가이드라인 최소단위: ${res.guidelineRule}
  • 집행 절차: ${res.procedureAuth}

3. 검토 종합 의견
  ${res.summaryText}

4. 지자체 감사 적발 주의사항
  ⚠️ ${res.auditWarning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
※ 본 검토서는 공동주택관리법 및 국토교통부 장기수선계획 실무 가이드라인을 준거하여 작성되었습니다.`;
  }
}

// Global Export
window.RepairDecisionEngine = RepairDecisionEngine;
