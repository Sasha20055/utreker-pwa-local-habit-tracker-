import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from '@/components/ui';
import { Today, History, Insights, Habits } from '@/pages';
import { initDatabase } from '@/lib/db';

function App() {
  // Initialize database on first load
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen min-h-dvh bg-background text-text">
        <Navigation />
        <main className="md:pt-16">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/history" element={<History />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
