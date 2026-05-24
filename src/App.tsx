import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from '@/components/ui';
import { Today, History, Insights, Habits } from '@/pages';
import { initDatabase } from '@/lib/db';

function App() {
  const useHashRouter =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const Router = useHashRouter ? HashRouter : BrowserRouter;

  // Initialize database on first load
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Router basename={import.meta.env.BASE_URL}>
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
    </Router>
  );
}

export default App;
