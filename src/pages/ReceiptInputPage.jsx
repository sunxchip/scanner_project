import { useState, useRef } from 'react';
import { parseReceiptText, parseGrandTotal } from '../utils/receiptParser';
import { encodeData } from '../utils/encoding';
import { recognizeReceiptImage } from '../services/ocrClient';
import { useNavigate } from 'react-router-dom';

export default function ReceiptInputPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [participantNames, setParticipantNames] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);
  
  const cameraInputRef = useRef(null);
  const albumInputRef = useRef(null);

  const [options] = useState({
    tax: 0,
    serviceCharge: 0,
    discount: 0,
    roundingUnit: 10
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }

    setIsLoading(true);
    setText('');
    try {
      const result = await recognizeReceiptImage(file);
      if (!result.rawText.trim()) throw new Error('인식된 텍스트가 비어있습니다.');
      
      setText(result.rawText);
      const parsed = parseReceiptText(result.rawText);
      const detectedGrandTotal = parseGrandTotal(result.rawText);
      
      if (parsed.length === 0) {
        setIsRawTextOpen(true);
        if (items.length === 0) setItems([{ id: `item_${Date.now()}`, name: '', price: 0, quantity: 1 }]);
        alert('메뉴를 완벽히 찾지 못했습니다. 텍스트를 수정하거나 직접 입력해주세요.');
      } else {
        setItems(parsed);
        // 무결성 검증 추가
        if (detectedGrandTotal !== null) {
          const itemsSum = parsed.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
          if (itemsSum !== detectedGrandTotal) {
            alert(`⚠️ 영수증 총액 불일치 감지!\n\n영수증 전체 합계(${detectedGrandTotal.toLocaleString()}원)와 개별 메뉴의 총액 합계(${itemsSum.toLocaleString()}원)가 일치하지 않습니다. 다음 단계에서 가격 또는 수량을 꼭 확인해 주세요!`);
          }
        }
      }
      setStep(2);
    } catch (err) {
      console.error(err);
      setIsRawTextOpen(true);
      alert(err.message || '인식에 실패했습니다. 수동으로 진행합니다.');
      if (items.length === 0) setItems([{ id: `item_${Date.now()}`, name: '', price: 0, quantity: 1 }]);
      setStep(2);
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  const handleParseManual = () => {
    const parsed = parseReceiptText(text);
    if (parsed.length > 0) setItems(parsed);
    setIsRawTextOpen(false);
  };

  const loadMockData = () => {
    setItems([
      { id: 'm1', name: '김치찌개', price: 9000, quantity: 1 },
      { id: 'm2', name: '삼겹살', price: 36000, quantity: 1 },
      { id: 'm3', name: '공기밥', price: 1000, quantity: 2 },
      { id: 'm4', name: '콜라', price: 2000, quantity: 1 },
    ]);
    setStep(2);
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id) => setItems(prev => prev.filter(item => item.id !== id));
  const handleAddItem = () => setItems(prev => [...prev, { id: `item_${Date.now()}`, name: '', price: '', quantity: 1 }]);

  const handleGenerateLink = () => {
    const namesArray = participantNames.split(',').map(n => n.trim()).filter(Boolean);
    if (namesArray.length === 0) return alert('참석자를 최소 1명 이상 입력해주세요.');
    if (items.length === 0) return alert('입력된 메뉴가 없습니다.');

    const isValid = items.every(item => String(item.name).trim() !== '' && Number(item.price) >= 0 && Number(item.quantity) > 0);
    if (!isValid) return alert('메뉴명, 가격, 수량에 빈 칸이 없어야 합니다.');

    const participants = namesArray.map((name, idx) => ({ id: `p${idx + 1}`, name }));
    const receiptData = {
      id: `receipt_${Date.now()}`,
      title: '영수증 정산',
      items: items.map(item => ({ ...item, price: Number(item.price), quantity: Number(item.quantity) })),
      participants,
      options
    };

    const encoded = encodeData(receiptData);
    if (encoded) {
      setShareLink(`${window.location.origin}/select?data=${encoded}`);
      localStorage.setItem('lastReceiptCode', encoded);
      setStep(4);
    }
  };

  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareLink).then(() => alert('클립보드에 복사되었습니다!'));
    } else {
      // HTTP 환경 폴백 (임시 textarea 활용)
      const textArea = document.createElement("textarea");
      textArea.value = shareLink;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('클립보드에 복사되었습니다!');
      } catch (err) {
        alert('복사에 실패했습니다. 위 텍스트를 꾹 눌러서 직접 복사해주세요.');
      }
      document.body.removeChild(textArea);
    }
  };

  const renderStep1 = () => (
    <>
      <h2 style={{fontSize:'1.5rem', marginBottom:'0.5rem'}}>영수증 스캔</h2>
      <p className="text-muted mb-1">카메라로 영수증을 찍거나 앨범에서 선택하세요.</p>
      
      {isLoading ? (
        <div className="card text-center" style={{padding:'3rem 1rem'}}>
          <h3>영수증을 읽는 중...</h3>
          <p className="text-muted">잠시만 기다려주세요 (최대 10초)</p>
        </div>
      ) : (
        <>
          <input type="file" accept="image/*" capture="environment" className="hidden-file-input" ref={cameraInputRef} onChange={handleImageUpload} />
          <input type="file" accept="image/*" className="hidden-file-input" ref={albumInputRef} onChange={handleImageUpload} />
          
          <button className="btn btn-primary mb-1" onClick={() => cameraInputRef.current?.click()}>
            📸 영수증 촬영하기
          </button>
          <button className="btn btn-secondary mb-1" onClick={() => albumInputRef.current?.click()}>
            🖼 앨범에서 가져오기
          </button>

          <div style={{textAlign:'center', margin:'2rem 0'}}>
            <span className="text-muted" style={{fontSize:'0.8rem'}}>또는</span>
          </div>

          <button className="btn btn-outline" onClick={loadMockData}>
            ✨ 예시 영수증 직접 불러오기
          </button>
        </>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <h2>메뉴 확인 수정</h2>
      <p className="text-muted mb-1">스캔된 메뉴가 정확한지 확인하고 다듬어주세요.</p>
      
      <button className="btn btn-secondary mb-1" style={{minHeight:'40px', fontSize:'0.9rem'}} onClick={() => setIsRawTextOpen(!isRawTextOpen)}>
        {isRawTextOpen ? 'OCR 원문 닫기' : 'OCR 원문 보기 / 수정'}
      </button>

      {isRawTextOpen && (
        <div style={{marginBottom:'1rem'}}>
          <textarea className="input-base" rows="5" value={text} onChange={e => setText(e.target.value)} placeholder="OCR 원문 텍스트" />
          <button className="btn btn-primary" style={{minHeight:'44px'}} onClick={handleParseManual}>텍스트에서 변경사항 적용</button>
        </div>
      )}

      {items.map((item, index) => (
        <div key={item.id} className="card" style={{padding:'1rem', position:'relative'}}>
          <div style={{fontWeight:'700', color:'var(--color-primary)', marginBottom:'0.5rem', fontSize:'0.9rem'}}>메뉴 {index + 1}</div>
          <button style={{position:'absolute', top:'1rem', right:'1rem', background:'transparent', border:'none', color:'var(--color-danger)', fontWeight:700, fontSize:'0.9rem'}} onClick={() => handleRemoveItem(item.id)}>🗑 삭제</button>
          
          <input className="input-base" style={{marginBottom:'0.5rem'}} type="text" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} placeholder="메뉴 이름" />
          <div className="flex-row">
            <input className="input-base" style={{marginBottom:0, flex:2}} type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} placeholder="단가 (원)" />
            <input className="input-base" style={{marginBottom:0, flex:1, textAlign:'center'}} type="number" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="수량" />
          </div>
        </div>
      ))}

      <button className="btn btn-secondary mb-1" onClick={handleAddItem}>
        + 메뉴 수동 추가
      </button>

      <div className="bottom-cta">
        <button className="btn btn-primary" onClick={() => setStep(3)}>다음으로 (참석자 입력)</button>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <h2>함께한 참석자 입력</h2>
      <p className="text-muted mb-1">식사를 함께한 사람들의 이름을 알려주세요.</p>

      <input className="input-base" type="text" value={participantNames} onChange={e => setParticipantNames(e.target.value)} placeholder="예: 철수, 영희, 민수 (쉼표로 구분)" />
      
      {participantNames.trim() && (
        <div className="chips-container mt-1">
          {participantNames.split(',').map(n => n.trim()).filter(Boolean).map((name, i) => (
            <div key={i} className="chip">{name}</div>
          ))}
        </div>
      )}

      <div className="bottom-cta">
        <button className="btn btn-primary" disabled={!participantNames.trim()} onClick={handleGenerateLink}>
          공유 링크 굽기
        </button>
      </div>
    </>
  );

  const renderStep4 = () => {
    const receiptTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

    return (
      <>
        <div style={{textAlign:'center', marginTop:'2rem'}}>
          <h2 style={{fontSize:'1.8rem'}}>🎉<br/>링크 생성 완료!</h2>
          <p className="text-muted mb-1">참석자들에게 아래 링크를 보내주세요.</p>
        </div>

        <div className="card text-center" style={{padding:'1.5rem', background:'var(--color-primary-light)', color:'var(--color-primary-dark)', border:'none', marginTop:'1.5rem'}}>
          <p style={{margin:0, opacity:0.8, fontSize:'0.85rem', marginBottom:'0.25rem'}}>총 결제 금액</p>
          <div style={{fontSize:'1.8rem', fontWeight:'900'}}>{receiptTotal.toLocaleString()}원</div>
        </div>

        <div className="card" style={{marginTop:'1.5rem', wordBreak:'break-all', fontSize:'0.9rem', color:'var(--color-primary-dark)'}}>
          {shareLink}
        </div>

        <button className="btn btn-primary mb-1" onClick={copyToClipboard}>
          💳 링크 복사하기
        </button>

        {navigator.share && (
          <button className="btn btn-secondary" onClick={() => navigator.share({title:'정산', url: shareLink})}>
            카카오톡 / 시스템 포맷으로 공유
          </button>
        )}

        <div className="bottom-cta">
           <button className="btn btn-outline" style={{width:'100%'}} onClick={() => navigate('/')}>
            초기화 후 홈으로
          </button>
        </div>
      </>
    );
  };

  return (
    <div>
      {/* Top Progress Pills */}
      <div className="step-indicator">
        <div className={`step-pill ${step === 1 ? 'active' : ''}`}>1.영수증</div>
        <div className={`step-pill ${step === 2 ? 'active' : ''}`}>2.메뉴</div>
        <div className={`step-pill ${step === 3 ? 'active' : ''}`}>3.인원</div>
        <div className={`step-pill ${step === 4 ? 'active' : ''}`}>4.공유</div>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}
