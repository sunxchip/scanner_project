// MVP 단계: OCR 결과 텍스트 구조화 (엄격한 파싱)
export const parseReceiptText = (text) => {
  const lines = text.split('\n');
  const items = [];
  let idCounter = 1;
  let pendingName = null;

  // --- 정제 유틸리티 ---
  const cleanName = (name) => {
    // 상품명에 붙은 불필요한 키워드 제거 (행사, 결제금액 등)
    let cleaned = name.replace(/(행사|상품명|상품|수량|금액|합계|결제금액|부가세|과세|면세|단가)/g, ' ').trim();
    // 영수증의 무의미한 특수문자들(괄호, 콜론 등)을 공백으로 치환하여 단어 결합
    cleaned = cleaned.replace(/[)\]\-\*:\(]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  const isIgnoredLine = (line) => {
    // 전화번호/사업자번호 패턴
    if (/\d{2,3}-\d{3,4}-\d{4}/.test(line)) return true; 
    if (/[0-9]{3,4}-[0-9]{4}/.test(line)) return true;
    // 날짜 및 시간
    if (/\d{4}[-/.년]\s*\d{1,2}[-/.월]\s*\d{1,2}/.test(line)) return true;
    if (/\d{2}:\d{2}/.test(line)) return true;
    // 주소 패턴
    if (/[가-힣]+[구동로길]\s*\d+/.test(line)) return true;
    if (/[가-힣\d]+(번지|층|호)/.test(line)) return true;
    // 의미 불명 영수증 헤더/푸터 키워드
    if (/(사업자|대표자|주문|승인|카드|할부|합계|결제|현금|거스름|포인트|영수증|받을금액|받은금액|총액|거스름돈|할인)/.test(line)) return true;
    return false;
  };

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // 배제 조건 필터 통과시 펜딩 상태도 리셋
    if (isIgnoredLine(line)) {
      pendingName = null;
      continue;
    }

    // 라인을 토큰(띄어쓰기) 단위로 분리
    const tokens = line.split(/\s+/);
    
    // 이 줄에 "가격" 형태의 토큰이 제일 마지막 무렵에 있는지 확인
    let priceCandidate = -1;
    let priceTokenIndex = -1;

    for (let i = tokens.length - 1; i >= 0; i--) {
      let cleanNum = tokens[i].replace(/,/g, '');
      if (/^\d+$/.test(cleanNum)) {
        let num = parseInt(cleanNum, 10);
        // 가격 범위 (500원 ~ 300,000원) 검사
        if (num >= 500 && num <= 300000) {
          // 바코드(8자리 이상)는 가격 아님
          if (cleanNum.length >= 8) continue;
          
          priceCandidate = num;
          priceTokenIndex = i;
          break;
        }
      }
    }

    if (priceCandidate !== -1) {
      // --- 가격이 발견된 줄 (수량, 바코드, 메뉴명 추출) ---
      let quantity = 1;
      let nameTokens = [];

      for (let i = 0; i < priceTokenIndex; i++) {
        let token = tokens[i];
        let cleanToken = token.replace(/,/g, '');
        
        // 바코드
        if (/^\d{8,}$/.test(cleanToken)) {
          continue;
        } 
        // 1개~2개짜리 숫자나 "2x", "x3" 형태의 수량
        else if (/^\d{1,2}$/.test(cleanToken) || /^\d{1,2}[xX\*]$/.test(cleanToken) || /^[xX\*]\d{1,2}$/.test(cleanToken)) {
          let parsedQty = parseInt(cleanToken.replace(/[xX\*]/g, ''), 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            quantity = parsedQty;
          }
        } 
        // 나머지는 이름으로 간주
        else {
          nameTokens.push(token);
        }
      }

      // nameTokens에서 단가 후보 찾기
      let unitPriceCandidate = -1;
      for (let i = 0; i < nameTokens.length; i++) {
        let cleanToken = nameTokens[i].replace(/,/g, '');
        if (/^\d+$/.test(cleanToken)) {
          let num = parseInt(cleanToken, 10);
          // 단가는 총액(priceCandidate)보다 작고 500원 이상이어야 함
          if (num >= 500 && num < priceCandidate) {
            unitPriceCandidate = num;
            nameTokens.splice(i, 1); // 이름에서 단가 토큰 제거
            break;
          }
        }
      }

      let finalUnitPrice = priceCandidate;
      if (quantity > 1) {
        // 단가 * 수량 === 총액이 맞는지 검증
        if (unitPriceCandidate !== -1 && unitPriceCandidate * quantity === priceCandidate) {
          finalUnitPrice = unitPriceCandidate;
        } else {
          // 정보가 누락되었거나 계산이 맞지 않는 경우 금액을 우선시하여 단가 역산
          finalUnitPrice = Math.round(priceCandidate / quantity);
        }
      }

      let name = cleanName(nameTokens.join(' '));

      // 이름이 비어있거나 너무 짧으면, 아까 기억해둔 윗줄(pendingName)을 사용
      if (name.length < 2) {
        if (pendingName) {
          name = pendingName;
          pendingName = null; // 사용 후 소비
          
          items.push({
            id: `item_${idCounter++}`,
            name,
            price: finalUnitPrice,
            quantity
          });
        }
      } else {
        // 이름이 멀쩡하면 (김치찌개 1 9000 형태의 정상 줄)
        pendingName = null;
        items.push({
          id: `item_${idCounter++}`,
          name,
          price: finalUnitPrice,
          quantity
        });
      }
    } else {
      // --- 가격이 없는 줄 (다음 줄을 위한 메뉴명 후보 판단) ---
      let name = cleanName(line);
      // 너무 짧거나, 한글/알파벳이 하나라도 없는 완전히 무의미한 줄은 무시
      if (name.length >= 2 && /[가-힣A-Za-z]/.test(name)) {
        pendingName = name;
      } else {
        pendingName = null;
      }
    }
  }

  // 요구사항: 추출 결과 콘솔 디버깅 로직 추가 (개인정보보호 및 최소 출력)
  if (items.length > 0) {
    console.log('💡 [OCR Parser] 메뉴 추출 성공 내역:');
    items.forEach(it => console.log(`   - ${it.name} | ${it.quantity}개 | ${it.price}원`));
  } else {
    console.log('💡 [OCR Parser] 추출된 메뉴가 없습니다.');
  }
  
  return items;
};

// 영수증 텍스트 전체에서 최종 합계 금액(Grand Total) 키워드를 매칭하여 파싱하는 보조 함수
export const parseGrandTotal = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  for (let line of lines) {
    // 공백 및 콤마 제거
    let trimmed = line.replace(/\s+/g, '').replace(/,/g, '');
    if (/(합계|결제금액|총금액|총액|받을금액|합계금액|승인금액)/.test(trimmed)) {
      const match = trimmed.match(/\d+/g);
      if (match) {
        // 가장 크거나 마지막에 나타나는 숫자를 금액으로 추출
        const num = parseInt(match[match.length - 1], 10);
        if (num >= 1000 && num <= 1000000) {
          return num;
        }
      }
    }
  }
  return null;
};
