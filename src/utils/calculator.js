// 핵심 정산 로직: SSOT, 어떤 상태도 직접 변경하지 않는 순수 함수 형태
export const calculateSettlement = (receiptData, allSelections) => {
  // allSelections = [{ participantId: 'p1', completedAt: 1717721500000, selections: [{itemId: 'item_1', ratio: 1}, ...] }]
  const { items, participants, options = { roundingUnit: 10 } } = receiptData;
  const unit = options.roundingUnit || 10;
  const result = {};

  // 1. 초기화
  participants.forEach(p => {
    result[p.id] = { 
      name: p.name, 
      total: 0, 
      finalTotal: 0,
      items: [],
      adjustment: 0
    };
  });

  // 영수증 총합 구하기
  const grandTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

  // 2. 메뉴별 분배
  items.forEach(item => {
    let totalRatio = 0;
    const itemSelections = [];

    // 메뉴를 먹은 사람들 찾기
    allSelections.forEach(sd => {
      const sel = sd.selections.find(s => s.itemId === item.id);
      if (sel && sel.ratio > 0) {
        totalRatio += sel.ratio;
        itemSelections.push({ participantId: sd.participantId, ratio: sel.ratio });
      }
    });

    // 비율에 맞게 분배 금액 계산
    if (totalRatio > 0) {
      itemSelections.forEach(is => {
        const itemTotalCost = item.price * (item.quantity || 1);
        const costToPay = itemTotalCost * (is.ratio / totalRatio);
        if (result[is.participantId]) {
          result[is.participantId].total += costToPay;
          result[is.participantId].items.push({
            name: item.name,
            cost: costToPay
          });
        }
      });
    }
  });

  // 3. 1차 반올림 처리
  let roundedSum = 0;
  Object.values(result).forEach(userResult => {
    userResult.finalTotal = Math.round(userResult.total / unit) * unit;
    roundedSum += userResult.finalTotal;
  });

  // 4. 오차(낙전) 산출 및 마지막 체크 완료 유저에게 귀속
  const difference = grandTotal - roundedSum;

  let lastParticipantId = null;
  let maxTimestamp = -1;

  participants.forEach(p => {
    // allSelections에 누적된 completedAt 또는 participant 객체 자체의 completedAt 사용
    const selectionInfo = allSelections.find(sel => sel.participantId === p.id);
    const completedAt = (selectionInfo && selectionInfo.completedAt) || p.completedAt || 0;

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
