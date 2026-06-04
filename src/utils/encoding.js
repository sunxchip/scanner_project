// 학생 교육용 한글 주석: URL-safe Base64 데이터를 암/복호화 하는 유틸리티
// KISS 원칙에 따라 외장 라이브러리 없이 브라우저 내장 함수만 사용합니다.

// 키 압축 매핑 딕셔너리 (URL 길이 최소화용)
const KEY_MAP = {
  id: 'i', title: 't', items: 'it', participants: 'pt', options: 'o',
  name: 'n', price: 'p', quantity: 'q',
  tax: 'tx', serviceCharge: 'sc', discount: 'd', roundingUnit: 'r',
  participantId: 'pi', selections: 's', itemId: 'ii', ratio: 'rt'
};
const REVERSE_KEY_MAP = Object.fromEntries(Object.entries(KEY_MAP).map(([k, v]) => [v, k]));

const minifyJSON = (obj) => {
  if (Array.isArray(obj)) return obj.map(minifyJSON);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = KEY_MAP[key] || key;
      acc[newKey] = minifyJSON(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const unminifyJSON = (obj) => {
  if (Array.isArray(obj)) return obj.map(unminifyJSON);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const origKey = REVERSE_KEY_MAP[key] || key;
      acc[origKey] = unminifyJSON(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

export const encodeData = (data) => {
  try {
    const minifiedData = minifyJSON(data);
    const jsonString = JSON.stringify(minifiedData);
    // 한글 등 유니코드 지원을 위해 URI 인코딩 후 base64 변환
    const base64 = btoa(encodeURIComponent(jsonString));
    // URL-safe하게 문자 치환: + -> -, / -> _, = -> .
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '.');
  } catch (e) {
    console.error("인코딩 실패:", e);
    return null;
  }
};

export const decodeData = (encoded) => {
  if (!encoded) return null;
  try {
    // URL-safe 문자를 원래 Base64 문자로 복구
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\./g, '=');
    // 패딩(=) 길이 보정
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonString = decodeURIComponent(atob(base64));
    const parsedData = JSON.parse(jsonString);
    return unminifyJSON(parsedData);
  } catch (e) {
    console.error("디코딩 실패:", e);
    return null;
  }
};
