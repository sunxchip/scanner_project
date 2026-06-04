/**
 * 이미지 압축 유틸리티 (Canvas 사용)
 * OCR.space бесплат 플랜의 용량 제한을 우회하기 위해 전송 전 이미지를 Resize & 압축합니다.
 */

export const compressImage = (file, options = { maxSizeMB: 1, maxWidthOrHeight: 1200 }) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = options.maxWidthOrHeight;

        // 크기 조정 (리사이징)
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // 투명 배경일 수 있는 경우 (PNG 등) 하얀색으로 채움
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Blob 변환 시도 (quality 자동 조절 로직)
        let quality = 0.8;
        const attemptCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            if (blob.size / 1024 / 1024 > options.maxSizeMB && quality > 0.1) {
              // 용량이 너무 크면 quality를 낮춰 재시도
              quality -= 0.1;
              attemptCompress();
            } else {
              // file-like 객체로 만들어 반환 (서버 전송 용이)
              const newFile = new File([blob], `compressed_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            }
          }, 'image/jpeg', quality);
        };
        attemptCompress();
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
    };
    reader.onerror = () => reject(new Error('File read failed.'));
  });
};
