import { compressImage } from '../utils/imageCompressor';

/**
 * 브라우저에서 서버리스 함수(/api/ocr)로 통신하여 OCR을 수행하는 클라이언트 래퍼
 * @param {File} file 업로드된 이미지 파일
 */
export const recognizeReceiptImage = async (file) => {
  try {
    // 1MB 이하 / 1200px 이하로 압축
    const compressedFile = await compressImage(file);

    const formData = new FormData();
    formData.append('image', compressedFile);

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
      throw new Error(data.message || 'OCR 전송 중 오류가 발생했습니다.');
    }

    return {
      rawText: data.rawText,
      rawResponse: data.rawResponse
    };
  } catch (error) {
    console.error('OCR Client Error:', error);
    throw new Error(error.message || '예기치 않은 네트워크 오류가 발생했습니다.');
  }
};
