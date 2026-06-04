# 🧾 N빵 계산기

영수증 사진을 찍으면 OCR로 항목을 자동 인식하고, 참여자별 정산 금액을 계산해줌

---

## 기능

- 영수증 이미지 업로드 → OCR로 텍스트 자동 추출
- 항목별 참여자 지정
- 1/N 혹은 개별 금액 정산 계산
- 최종 인당 결제 금액 정리

---

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사해서 `.env.local` 파일을 만들고 OCR API 키를 입력함

```bash
cp .env.example .env.local
```

`.env.local` 열어서 아래 값 채워넣음:

```
OCR_SPACE_API_KEY=여기에_본인_API_키_입력
OCR_SPACE_API_URL=https://api.ocr.space/parse/image
```

> OCR API 키는 [ocr.space](https://ocr.space/ocrapi) 에서 무료로 발급받을 수 있음

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속하면 됨

### 4. 빌드

```bash
npm run build
```

---

## 배포 (Vercel)

Vercel에 배포할 경우 `.env.local`의 환경변수를 Vercel 대시보드 → Settings → Environment Variables 에서 직접 등록해야 함

`OCR_SPACE_API_KEY`, `OCR_SPACE_API_URL` 두 항목 추가하면 됨

---

## 기술 스택

- React 18
- Vite
- React Router v6
- OCR.space API
- Vercel (서버리스 함수 + 정적 호스팅)
