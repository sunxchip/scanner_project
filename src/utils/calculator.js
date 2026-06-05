// 핵심 정산 로직: SSOT, 어떤 상태도 직접 변경하지 않는 순수 함수 형태
export const calculateSettlement = (receiptData, allSelections) => {
  // allSelections = [{ participantId: 'p1', selections: [{itemId: 'item_1', ratio: 1}, ...] }]
  const { items, participants, options = { roundingUnit: 10 } } = receiptData;
  const result = {};

  // 1. 초기화
  participants.forEach(p => {
    result[p.id] = { name: p.name, total: 0, items: [] };
  });

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

  // 3. 반올림 처리
  const unit = options.roundingUnit || 10;
  Object.values(result).forEach(userResult => {
    userResult.finalTotal = Math.round(userResult.total / unit) * unit;
  });

  return result;
};
