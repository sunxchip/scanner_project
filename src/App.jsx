import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReceiptInputPage from './pages/ReceiptInputPage';
import ParticipantSelectPage from './pages/ParticipantSelectPage';
import SettlementPage from './pages/SettlementPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <Link to="/" className="app-header-title">🧾 N빵 계산기</Link>
        </header>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<ReceiptInputPage />} />
            <Route path="/select" element={<ParticipantSelectPage />} />
            <Route path="/settle" element={<SettlementPage />} />
            <Route path="/settlement" element={<SettlementPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
