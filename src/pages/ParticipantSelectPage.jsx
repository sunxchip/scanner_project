import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeData, encodeData } from '../utils/encoding';

export default function ParticipantSelectPage() {
  const [searchParams] = useSearchParams();
  const [receiptData, setReceiptData] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selections, setSelections] = useState({});
  const [resultCode, setResultCode] = useState('');

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded && decoded.items) setReceiptData(decoded);
    }
  }, [searchParams]);

  if (!receiptData) {
    return (
      <div style={{padding:'2rem', textAlign:'center', marginTop:'3rem'}}>
        <h2>앗, 유효하지 않은 링크입니다 🚫</h2>
        <p className="text-muted">올바른 공유 링크로 접속했는지 확인해주세요.</p>
      </div>
    );
  }

  const handleRatioChange = (itemId, ratio) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: ratio
    }));
  };

  const handleGenerateCode = () => {
    if (!selectedProfileId) return alert('본인 이름을 선택해주세요.');

    const mySelections = Object.keys(selections).map(itemId => ({
      itemId,
      ratio: selections[itemId]
    }));

    const selectionData = {
      participantId: selectedProfileId,
      selections: mySelections
    };

    const encoded = encodeData(selectionData);
    // 코드 대신 결제자가 클릭할 수 있는 정산 취합 페이지 링크로 변환
    const link = `${window.location.origin}/settle?addResponse=${encoded}`;
    setResultCode(link);
  };

  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(resultCode).then(() => alert('내 결과 링크가 복사되었습니다! 결제자 톡방에 보내주세요.'));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = resultCode;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('내 결과 링크가 복사되었습니다!');
      } catch (err) {
        alert('복사에 실패했습니다. 아래 링크를 길게 눌러서 복사해주세요.');
      }
      document.body.removeChild(textArea);
    }
  };

  const estimatedTotal = Object.keys(selections).reduce((sum, itemId) => {
    const item = receiptData?.items?.find(i => i.id === itemId);
    if (!item) return sum;
    const ratio = selections[itemId] || 0;
    return sum + (item.price * item.quantity * ratio);
  }, 0);

  const selectedItemsSummary = Object.keys(selections)
    .filter(itemId => selections[itemId] > 0)
    .map(itemId => {
      const item = receiptData?.items?.find(i => i.id === itemId);
      if (!item) return null;
      const ratio = selections[itemId];
      const ratioText = ratio === 0.5 ? '절반' : '전부';
      const cost = item.price * item.quantity * ratio;
      return {
        name: item.name,
        ratioText,
        cost
      };
    })
    .filter(Boolean);

  if (resultCode) {
    const participantName = receiptData.participants.find(p => p.id === selectedProfileId)?.name || '참여자';
    
    const shareMessage = `[N빵 계산기] 👤 ${participantName}님의 정산 응답 결과\n💵 예상 선택 합계: ${estimatedTotal.toLocaleString()}원\n\n결제자분은 아래 링크를 클릭해 정산 결과를 합산해주세요!`;

    const handleShare = () => {
      if (navigator.share) {
        navigator.share({
          title: '내 N빵 선택 결과',
          text: shareMessage,
          url: resultCode
        }).catch(console.error);
      } else {
        copyToClipboard();
      }
    };

    return (
      <div style={{textAlign:'center', marginTop:'2rem'}}>
        <h2 style={{fontSize:'1.8rem'}}>🎉<br/>응답 완료!</h2>
        <p className="text-muted mb-1">아래 선택 결과를 확인하고 결제자에게 공유해 주세요.</p>
        
        <div className="card" style={{textAlign:'left', margin:'1.5rem 0', padding:'1.25rem'}}>
          <h3 style={{fontSize:'1.1rem', marginBottom:'0.75rem', borderBottom:'1px solid var(--color-border)', paddingBottom:'0.5rem'}}>
            👤 {participantName}님의 선택 요약
          </h3>
          <ul style={{paddingLeft:'1.2rem', fontSize:'0.9rem', color:'var(--color-muted)', marginBottom:'1rem', listStyleType:'disc'}}>
            {selectedItemsSummary.map((item, idx) => (
              <li key={idx} style={{marginBottom:'0.4rem'}}>
                <span style={{color:'var(--color-text)', fontWeight:600}}>{item.name}</span> ({item.ratioText}) : {item.cost.toLocaleString()}원
              </li>
            ))}
          </ul>
          <div style={{borderTop:'1px solid var(--color-border)', paddingTop:'0.75rem', display:'flex', justifyContent:'space-between', fontWeight:'900', fontSize:'1.1rem'}}>
            <span>예상 정산 합계:</span>
            <span style={{color:'var(--color-primary)'}}>{estimatedTotal.toLocaleString()}원</span>
          </div>
        </div>

        <div className="card" style={{wordBreak:'break-all', fontSize:'0.85rem', color:'var(--color-muted)', marginBottom:'2rem', background:'#f8fafc', padding:'1rem', textAlign:'left'}}>
          <strong>결과 취합용 링크:</strong><br/>
          <span style={{color:'var(--color-primary-dark)'}}>{resultCode}</span>
        </div>

        <button className="btn btn-primary mb-1" onClick={copyToClipboard}>결과 링크 복사하기</button>
        <button className="btn btn-secondary" onClick={handleShare}>
          카카오톡 / 다른 앱으로 공유하기
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>내가 먹은 메뉴 선택하기</h2>
      <p className="text-muted mb-1">본인 이름을 선택하고 먹은 양을 체크하세요.</p>
      
      <div className="chips-container" style={{marginBottom:'2rem'}}>
        {receiptData.participants.map(p => (
          <button
            key={p.id}
            className={`btn ${selectedProfileId === p.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{flex:'1 1 auto', minHeight:'40px', borderRadius:'999px'}}
            onClick={() => setSelectedProfileId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selectedProfileId ? (
        <>
          <h3 style={{marginTop:'2rem'}}>메뉴 체크리스트</h3>
          {receiptData.items.map(item => (
            <div key={item.id} className="card" style={{padding:'1.25rem', marginBottom:'1rem'}}>
              <div style={{fontWeight:'700', fontSize:'1.1rem', marginBottom:'0.25rem'}}>{item.name}</div>
              <div className="text-muted" style={{marginBottom:'1rem'}}>{item.price.toLocaleString()}원</div>
              
              <div className="segmented-control">
                <div 
                  className={`segmented-btn ${selections[item.id] === 0 || selections[item.id] === undefined ? 'active' : ''}`}
                  onClick={() => handleRatioChange(item.id, 0)}
                >안 먹음</div>
                <div 
                  className={`segmented-btn ${selections[item.id] === 0.5 ? 'active' : ''}`}
                  onClick={() => handleRatioChange(item.id, 0.5)}
                >절반</div>
                <div 
                  className={`segmented-btn ${selections[item.id] === 1 ? 'active' : ''}`}
                  onClick={() => handleRatioChange(item.id, 1)}
                >전부</div>
              </div>
            </div>
          ))}
          
          <div className="bottom-cta" style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            <div style={{textAlign:'center', padding:'0.5rem', background:'var(--color-primary-light)', borderRadius:'8px', color:'var(--color-primary-dark)', fontWeight:700}}>
              예상 선택 금액: 약 {estimatedTotal.toLocaleString()}원
            </div>
            <button className="btn btn-primary" onClick={handleGenerateCode}>내 정산 결과 보내기</button>
          </div>
        </>
      ) : (
        <div className="card text-center" style={{padding:'3rem 1rem', marginTop:'2rem'}}>
          <p className="text-muted">위에 있는 내 이름을 먼저 골라주세요!</p>
        </div>
      )}
    </div>
  );
}
