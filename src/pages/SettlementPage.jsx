import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { decodeData } from '../utils/encoding';
import { calculateSettlement } from '../utils/calculator';

export default function SettlementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [receiptCode, setReceiptCode] = useState('');
  const [participantCodes, setParticipantCodes] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('lastReceiptCode');
    if (saved) setReceiptCode(saved);

    const savedParticipants = localStorage.getItem('participantCodes') || '';
    setParticipantCodes(savedParticipants);

    const addResponse = searchParams.get('addResponse');
    if (addResponse) {
      const newCodes = savedParticipants ? `${savedParticipants}\n${addResponse}` : addResponse;
      setParticipantCodes(newCodes);
      localStorage.setItem('participantCodes', newCodes);
      // Remove query param to clean URL
      searchParams.delete('addResponse');
      setSearchParams(searchParams);
      alert('새로운 친구의 응답이 추가되었습니다!');
    }
  }, [searchParams, setSearchParams]);

  const handleParticipantCodesChange = (e) => {
    const val = e.target.value;
    setParticipantCodes(val);
    localStorage.setItem('participantCodes', val);
  };

  const handleCalculate = () => {
    if (!receiptCode.trim()) return alert('원본 영수증 코드를 입력해주세요.');

    const decodedReceipt = decodeData(receiptCode.trim());
    if (!decodedReceipt || !decodedReceipt.items) return alert('유효하지 않은 원본 영수증 코드입니다.');

    const lines = participantCodes.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return alert('친구들의 응답 코드를 붙여넣어주세요.');

    const allSelections = lines.map(line => decodeData(line)).filter(Boolean);

    try {
      const settlementResult = calculateSettlement(decodedReceipt, allSelections);
      setResult(settlementResult);
    } catch (e) {
      alert('정산 중 오류가 발생했습니다. 코드 형태를 확인해주세요.');
    }
  };

  if (result) {
    const totalAmount = Object.values(result).reduce((acc, user) => acc + user.finalTotal, 0);

    return (
      <div>
        <div style={{textAlign:'center', marginTop:'1rem', marginBottom:'2rem'}}>
          <h2 style={{fontSize:'1.8rem', marginBottom:'0.5rem'}}>정산 완료 💸</h2>
          <p className="text-muted">모든 정산이 정확하게 계산되었습니다.</p>
        </div>

        <div className="card text-center" style={{padding:'2rem', background:'var(--color-primary-dark)', color:'white', border:'none'}}>
          <p style={{margin:0, opacity:0.8, fontSize:'0.9rem', marginBottom:'0.5rem'}}>이번 모임 총 금액</p>
          <div style={{fontSize:'2.5rem', fontWeight:'900'}}>{totalAmount.toLocaleString()}원</div>
        </div>

        <h3 style={{marginTop:'2rem', marginBottom:'1rem'}}>개별 입금 금액</h3>
        {Object.values(result).map((user) => (
          <div key={user.name} className="card" style={{borderLeft: user.finalTotal > 0 ? '6px solid var(--color-primary)' : '6px solid var(--color-border)', paddingLeft:'1rem'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
              <h4 style={{margin:0, fontSize:'1.2rem'}}>{user.name}</h4>
              <div style={{fontSize:'1.4rem', fontWeight:'900', color: user.finalTotal > 0 ? 'var(--color-primary)' : 'var(--color-muted)'}}>
                {user.finalTotal.toLocaleString()}원
              </div>
            </div>
            
            {user.finalTotal > 0 && (
              <details style={{fontSize:'0.85rem', color:'var(--color-muted)', cursor:'pointer'}}>
                <summary style={{outline:'none'}}>상세 내역 보기</summary>
                <ul style={{marginTop:'0.5rem', paddingLeft:'1.2rem'}}>
                  {user.items.map((it, idx) => (
                    <li key={idx} style={{marginBottom:'0.2rem'}}>{it.name}: {Math.round(it.cost).toLocaleString()}원</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        
        <div className="bottom-cta">
          <button className="btn btn-outline" onClick={() => setResult(null)}>다시 설정하기</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>결제자 정산 시작</h2>
      <p className="text-muted mb-1">취합한 코드들로 최종 금액을 계산합니다.</p>
      
      <div className="card" style={{marginBottom: '1rem'}}>
        <h3 style={{fontSize:'1.1rem'}}>1. 원본 영수증 코드</h3>
        <p className="text-muted" style={{fontSize: '0.8rem'}}>링크 생성 시 자동 저장된 내 코드입니다.</p>
        <textarea className="input-base" rows="2" value={receiptCode} onChange={e => setReceiptCode(e.target.value)} placeholder="원본 영수증 코드 입력" />
      </div>

      <div className="card">
        <h3 style={{fontSize:'1.1rem'}}>2. 친구들 응답 코드 모음</h3>
        <p className="text-muted" style={{fontSize: '0.8rem'}}>카톡으로 받은 친구들의 결과 코드를 한 줄씩 복사/붙여넣기 하세요.</p>
        <textarea className="input-base" rows="5" value={participantCodes} onChange={handleParticipantCodesChange} placeholder="친구1의 응답코드...&#13;&#10;친구2의 응답코드..." />
      </div>

      <div className="bottom-cta">
        <button className="btn btn-primary" onClick={handleCalculate}>정산 결과 모아보기</button>
      </div>
    </div>
  );
}
