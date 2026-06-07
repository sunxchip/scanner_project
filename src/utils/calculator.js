// 핵심 정산 로직: SSOT, 어떤 상태도 직접 변경하지 않는 순수 함수 형태
export const calculateSettlement = (receiptData, allSelections) => {
  // allSelections = [{ participantId: 'p1', completedAt: 1717721500000, selections: [{itemId: 'item_1', ratio: 1}, ...] }]
  // 또는 실시간 DB 구조인 경우 객체 매핑 형태: { p1: { item_1: 1, item_2: 0.5 } }
  const { items, participants, options = { roundingUnit: 10 } } = receiptData;
  const unit = options.roundingUnit || 10;
  const result = {};

  // 1. 결과 데이터 구조 초기화
  participants.forEach(p => {
    result[p.id] = { 
      name: p.name, 
      total: 0, 
      finalTotal: 0,
      items: [],
      adjustment: 0
    };
  });

  // 2. selections 데이터 표준화 (참여자 ID -> { 메뉴 ID -> 수량/비율 })
  const normalizedSelections = {};
  const completedAtMap = {};

  if (Array.isArray(allSelections)) {
    allSelections.forEach(sd => {
      normalizedSelections[sd.participantId] = {};
      completedAtMap[sd.participantId] = sd.completedAt || 0;
      if (Array.isArray(sd.selections)) {
        sd.selections.forEach(sel => {
          normalizedSelections[sd.participantId][sel.itemId] = Number(sel.ratio || sel.selectedQuantity || 0);
        });
      }
    });
  } else if (typeof allSelections === 'object' && allSelections !== null) {
    Object.entries(allSelections).forEach(([pId, pSelection]) => {
      normalizedSelections[pId] = {};
      if (typeof pSelection === 'object' && pSelection !== null) {
        Object.entries(pSelection).forEach(([itemId, val]) => {
          normalizedSelections[pId][itemId] = Number(val || 0);
        });
      }
    });
  }

  // 영수증 총합 구하기
  // ocrQuantity가 있으면 price는 총액, 없으면 price * quantity가 총액
  const grandTotal = items.reduce((sum, item) => {
    const ocrQty = Number(item.ocrQuantity || item.quantity || 1);
    const hasOcrQty = typeof item.ocrQuantity !== 'undefined';
    const totalLinePrice = Number(item.price || 0) * (hasOcrQty ? 1 : ocrQty);
    return sum + totalLinePrice;
  }, 0);

  // 3. 메뉴별 분배
  items.forEach(item => {
    const ocrQty = Number(item.ocrQuantity || item.quantity || 1);
    const hasOcrQty = typeof item.ocrQuantity !== 'undefined';
    const totalLinePrice = Number(item.price || 0) * (hasOcrQty ? 1 : ocrQty);
    
    // 1개당 단가 계산
    const unitPrice = totalLinePrice / ocrQty;

    // 각 참가자의 수량에 맞춰 분배
    Object.entries(normalizedSelections).forEach(([pId, pSelection]) => {
      const selectedQuantity = Number(pSelection[item.id] || 0);
      if (selectedQuantity > 0 && result[pId]) {
        const costToPay = unitPrice * selectedQuantity;
        result[pId].total += costToPay;
        result[pId].items.push({
          name: item.name,
          cost: costToPay,
          unitPrice: unitPrice,
          selectedQuantity: selectedQuantity
        });
      }
    });
  });

  // 4. 1차 반올림 처리
  let roundedSum = 0;
  Object.values(result).forEach(userResult => {
    userResult.finalTotal = Math.round(userResult.total / unit) * unit;
    roundedSum += userResult.finalTotal;
  });

  // 5. 오차(낙전) 산출 및 마지막 체크 완료 유저에게 귀속
  const difference = grandTotal - roundedSum;

  let lastParticipantId = null;
  let maxTimestamp = -1;

  participants.forEach(p => {
    // allSelections에 누적된 completedAt 또는 participant 객체 자체의 completedAt 사용
    const completedAt = completedAtMap[p.id] || p.completedAt || 0;

    if (completedAt > maxTimestamp) {
      maxTimestamp = completedAt;
      lastParticipantId = p.id;
    }
  });

  // 대상자를 찾지 못했다면 참여자 리스트의 마지막 사람으로 백업
  if (!lastParticipantId && participants.length > 0) {
    lastParticipantId = participants[participants.length - 1].id;
  }

  if (lastParticipantId && result[lastParticipantId]) {
    result[lastParticipantId].finalTotal += difference;
    result[lastParticipantId].adjustment = difference;
  }

  return result;
};
