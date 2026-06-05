import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // formidable로 파싱하기 위해 기본 바디파서 비활성화
  },
};

/**
 * 로컬 개발 환경용 fallback 환경변수 로더
 * Vercel 플랫폼에서는 이 과정 없이도 Dashboard에서 환경변수를 로드합니다.
 */
function loadLocalEnv() {
  if (process.env.OCR_SPACE_API_KEY || process.env.OCR_API_KEY) return;

  try {
    const envPath = path.join(process.cwd(), ".env.local");

    if (!fs.existsSync(envPath)) return;

    const envContent = fs.readFileSync(envPath, "utf-8");

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1) return;

      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();

      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn("Failed to load local env file:", error.message);
  }
}

export default async function handler(req, res) {
  // 1. 환경변수 폴백 호출
  loadLocalEnv();

  // 2. 환경변수 로딩 여부 체크 로그 (보안을 위해 키값 자체는 출력하지 않음)
  console.log("OCR env check", {
    hasOCRSpaceKey: Boolean(process.env.OCR_SPACE_API_KEY),
    hasOCRApiKey: Boolean(process.env.OCR_API_KEY),
    hasOCRSpaceUrl: Boolean(process.env.OCR_SPACE_API_URL),
    hasOCRApiUrl: Boolean(process.env.OCR_API_URL),
    cwd: process.cwd()
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 메소드만 허용됩니다.' });
  }

  // 3. API 키 획득
  const API_KEY = process.env.OCR_SPACE_API_KEY || process.env.OCR_API_KEY;
  const API_URL =
    process.env.OCR_SPACE_API_URL ||
    process.env.OCR_API_URL ||
    "https://api.ocr.space/parse/image";

  if (!API_KEY) {
    return res.status(500).json({ 
      success: false, 
      message: "서버 환경변수 오류: OCR API Key가 설정되지 않았습니다." 
    });
  }

  // 4. Formidable 파싱 및 통신
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: '서버리스 오류: 폼 데이터를 파싱할 수 없습니다.' });
    }

    const fileArray = files.image || files.file;
    if (!fileArray) {
      return res.status(400).json({ success: false, message: '업로드된 파일이 전달되지 않았습니다.' });
    }
    
    // 버전에 따라 file이 배열이 아닐 수 있음
    const expectedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    try {
      // 5. OCR.space 전송용 FormData 재조립
      const fileData = fs.readFileSync(expectedFile.filepath);
      // FormData를 위해 Blob 객체를 생성
      const fileBlob = new Blob([fileData], { type: expectedFile.mimetype || 'image/jpeg' });
      
      const ocrFormData = new FormData();
      ocrFormData.append('apikey', API_KEY);
      ocrFormData.append('file', fileBlob, expectedFile.originalFilename || 'image.jpg');
      ocrFormData.append('language', 'kor');
      ocrFormData.append('isOverlayRequired', 'false');
      ocrFormData.append('detectOrientation', 'true');
      ocrFormData.append('scale', 'true');
      ocrFormData.append('isTable', 'true');
      ocrFormData.append('OCREngine', '2');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: ocrFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OCR.space API error (status: ${response.status}):`, errorText);
        return res.status(502).json({ 
          success: false, 
          message: `OCR.space API 통신에 실패했습니다. (상태코드: ${response.status})`,
          detail: errorText 
        });
      }

      const data = await response.json();

      // 6. 결과 검증
      if (data.IsErroredOnProcessing) {
        return res.status(400).json({ success: false, message: data.ErrorMessage?.[0] || 'OCR 이미지 분석 도중 오류가 발생했습니다.' });
      }

      if (!data.ParsedResults || data.ParsedResults.length === 0) {
        return res.status(400).json({ success: false, message: '텍스트 인식이 불가능합니다.' });
      }

      const parsedText = data.ParsedResults[0].ParsedText || '';

      // 성공 응답 포맷
      return res.status(200).json({
        success: true,
        rawText: parsedText,
        rawResponse: data
      });

    } catch (apiErr) {
      console.error("OCR Fetch Error:", apiErr);
      return res.status(500).json({ success: false, message: '분석 요청 중 알 수 없는 서버 에러가 발생했습니다.' });
    }
  });
}
