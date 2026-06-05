import { compressImage } from '../utils/imageCompressor';

// Vercel 서버 IP 차단(403/502 등) 시 클라이언트 브라우저에서 직접 API를 호출하기 위한 폴백 설정
const FALLBACK_API_KEY = 'K87931643388957';
const FALLBACK_API_URL = 'https://api.ocr.space/parse/image';

/**
 * 브라우저에서 서버리스 함수(/api/ocr)로 통신하여 OCR을 수행하는 클라이언트 래퍼
 * 서버리스 호출 실패 시 브라우저 직접 호출로 자동 폴백합니다.
 * @param {File} file 업로드된 이미지 파일
 */
export const recognizeReceiptImage = async (file) => {
  // 1MB 이하 / 1200px 이하로 압축
  const compressedFile = await compressImage(file);

  const formData = new FormData();
  formData.append('image', compressedFile);

  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData
    });

    // 404 에러의 경우 로컬 테스트 중 vercel dev 없이 npm run dev만 켰을 때 자주 발생
    if (response.status === 404) {
      throw new Error('서버리스(/api/ocr) 함수를 찾을 수 없습니다. (로컬 구동 시 vercel dev 로 켜야 합니다)');
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Vercel 서버 차단(403) 또는 외부 API 장애 발생 시 클라이언트 직접 호출로 우회
      console.warn('Vercel serverless OCR failed. Falling back to direct client-side OCR...', data.message);
      return await performDirectClientOcr(compressedFile);
    }

    return {
      rawText: data.rawText,
      rawResponse: data.rawResponse
    };
  } catch (error) {
    console.warn('OCR Serverless Error, trying direct client-side fallback:', error);
    try {
      return await performDirectClientOcr(compressedFile);
    } catch (fallbackError) {
      console.error('All OCR methods failed:', fallbackError);
      throw new Error(fallbackError.message || 'OCR 이미지 분석에 실패했습니다. (서버 및 클라이언트 직접 호출 모두 실패)');
    }
  }
};

/**
 * 브라우저에서 직접 OCR.space API 호출 (Vercel IP 차단 우회용)
 */
const performDirectClientOcr = async (compressedFile) => {
  const ocrFormData = new FormData();
  ocrFormData.append('apikey', FALLBACK_API_KEY);
  ocrFormData.append('file', compressedFile);
  ocrFormData.append('language', 'kor');
  ocrFormData.append('isOverlayRequired', 'false');
  ocrFormData.append('detectOrientation', 'true');
  ocrFormData.append('scale', 'true');
  ocrFormData.append('isTable', 'true');
  ocrFormData.append('OCREngine', '2');

  const response = await fetch(FALLBACK_API_URL, {
    method: 'POST',
    body: ocrFormData,
  });

  if (!response.ok) {
    throw new Error(`OCR.space API 직접 통신 실패 (상태코드: ${response.status})`);
  }

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || 'OCR 이미지 분석 중 오류가 발생했습니다.');
  }

  if (!data.ParsedResults || data.ParsedResults.length === 0) {
    throw new Error('텍스트 인식이 불가능합니다.');
  }

  return {
    rawText: data.ParsedResults[0].ParsedText || '',
    rawResponse: data
  };
};
