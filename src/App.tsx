import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { Navigation, ErrorBoundary } from '@/components/ui';
import { Onboarding } from '@/components/features';
import { Today, History, Insights, Habits, Settings } from '@/pages';
import { initDatabase } from '@/lib/db';

function App() {
  const useHashRouter =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const Router = useHashRouter ? HashRouter : BrowserRouter;

  // Initialize database and handle auto-sync
  useEffect(() => {
    let syncTimeout: ReturnType<typeof setTimeout>;

    const initAndSync = async () => {
      // Ask the browser to keep our IndexedDB data from being evicted under storage pressure
      if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => {});
      }

      await initDatabase();

      // Auto-pull on startup
      const autoSync = localStorage.getItem('utreker_auto_sync') === 'true';
      import('@/lib/googleDriveSync').then(async ({ GoogleDriveSync }) => {
        if (autoSync && GoogleDriveSync.isAuthenticated()) {
          try {
            await GoogleDriveSync.pullFromDrive();
          } catch (e) {
            console.error('Failed to auto-pull from drive', e);
          }
        }
      });
    };

    initAndSync();

    const handleDataChanged = () => {
      const autoSync = localStorage.getItem('utreker_auto_sync') === 'true';
      if (!autoSync) return;

      import('@/lib/googleDriveSync').then(({ GoogleDriveSync }) => {
        if (GoogleDriveSync.isAuthenticated()) {
          clearTimeout(syncTimeout);
          syncTimeout = setTimeout(async () => {
            try {
              await GoogleDriveSync.pushToDrive();
              console.log('Auto-synced to drive');
            } catch (e) {
              console.error('Failed to auto-push to drive', e);
            }
          }, 3000); // 3 second debounce
        }
      });
    };

    window.addEventListener('utreker-data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('utreker-data-changed', handleDataChanged);
      clearTimeout(syncTimeout);
    };
  }, []);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen min-h-dvh bg-background text-text">
        <Onboarding />
        <Navigation />
        <main className="md:pt-16">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/history" element={<History />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;
