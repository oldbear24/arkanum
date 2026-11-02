import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const DevCards = lazy(() => import('./pages/DevCards').then((m) => ({ default: m.DevCards })));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/dev/karty" element={<DevCards />} />
          <Route path="*" element={<h1 style={{ fontFamily: 'var(--font-display)', padding: 48 }}>Arkánum</h1>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
