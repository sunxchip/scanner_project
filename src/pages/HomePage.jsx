import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '2rem 0', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', lineHeight: '1.4', marginBottom: '1rem' }}>
          영수증 찍고,<br />
          <span style={{ color: 'var(--color-primary)' }}>먹은 만큼만 정산</span>
        </h1>
        <p className="text-muted" style={{ marginBottom: '3rem' }}>
          OCR로 메뉴를 불러오고<br />친구별 선택으로 정확하게 나눠요.
        </p>
      </div>

      <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>📸</div>
          <div style={{ fontWeight: 700 }}>1. OCR 영수증 인식</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>🔗</div>
          <div style={{ fontWeight: 700 }}>2. URL 링크 공유</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>✨</div>
          <div style={{ fontWeight: 700 }}>3. 먹은 만큼 정밀 계산</div>
        </div>
      </div>

      <div className="bottom-cta">
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          정산 시작하기
        </button>
        <button className="btn btn-secondary mt-1" onClick={() => navigate('/create')}>
          예시로 체험하기
        </button>
      </div>
    </div>
  );
}
