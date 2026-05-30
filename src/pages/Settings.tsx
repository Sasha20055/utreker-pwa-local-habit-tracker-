import { useState, useRef, useEffect } from 'react';
import { exportDataToFile, importDataFromFile } from '@/lib/sync';
import { GoogleDriveSync } from '@/lib/googleDriveSync';

export function Settings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('utreker_auto_sync') === 'true');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConfigured = GoogleDriveSync.isConfigured();

  useEffect(() => {
    setIsAuthenticated(GoogleDriveSync.isAuthenticated());
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportDataToFile();
    } catch (e) {
      alert('Ошибка при экспорте данных');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      await importDataFromFile(file);
      alert('Данные успешно импортированы!');
      // Опционально: можно перезагрузить страницу или обновить контекст
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Ошибка импорта');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAuthToggle = async () => {
    try {
      setIsSyncing(true);
      if (isAuthenticated) {
        await GoogleDriveSync.signOut();
        setIsAuthenticated(false);
      } else {
        await GoogleDriveSync.authenticate();
        setIsAuthenticated(true);
      }
    } catch (e: any) {
      alert(e?.message || 'Ошибка авторизации Google');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = () => {
    const newVal = !autoSync;
    setAutoSync(newVal);
    localStorage.setItem('utreker_auto_sync', String(newVal));
  };

  const handlePush = async () => {
    try {
      setIsSyncing(true);
      await GoogleDriveSync.pushToDrive();
      alert('Данные успешно выгружены в Google Drive!');
    } catch (e) {
      alert('Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    try {
      setIsSyncing(true);
      await GoogleDriveSync.pullFromDrive();
      alert('Данные успешно загружены из Google Drive!');
      window.location.reload();
    } catch (e) {
      alert('Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6 slide-up">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Настройки</h1>
        <p className="text-text-muted">Управление данными и синхронизация</p>
      </header>

      <section className="glass rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>📁</span> Локальный экспорт / импорт
        </h2>
        <p className="text-sm text-text-muted">
          Вы можете скачать резервную копию всех ваших данных в виде JSON файла и восстановить их на любом устройстве.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 btn-primary py-3 px-4 flex justify-center items-center gap-2"
          >
            {isExporting ? 'Экспорт...' : 'Скачать JSON'}
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex-1 bg-surface text-text hover:bg-surface-active rounded-xl font-medium transition-colors py-3 px-4 flex justify-center items-center gap-2"
          >
            {isImporting ? 'Загрузка...' : 'Загрузить JSON'}
          </button>
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      </section>

      <section className="glass rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>☁️</span> Google Drive Sync
          </h2>
          {isConfigured && (
            <button
              onClick={handleAuthToggle}
              disabled={isSyncing}
              className={`text-sm px-3 py-1 rounded-full ${
                isAuthenticated ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
              }`}
            >
              {isAuthenticated ? 'Выйти' : 'Войти'}
            </button>
          )}
        </div>
        <p className="text-sm text-text-muted">
          Синхронизируйте свои привычки и историю через скрытую папку в вашем Google Drive.
        </p>

        {!isConfigured ? (
          <div className="bg-surface/50 p-4 rounded-xl text-sm text-text-muted space-y-2">
            <p>
              Синхронизация с Google Drive не настроена в этой сборке (не задан
              <code className="mx-1">VITE_GOOGLE_CLIENT_ID</code>).
            </p>
            <p>
              Используйте локальный экспорт/импорт выше, либо разверните свою копию,
              указав свой OAuth Client ID.
            </p>
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-4 pt-2">
            <label className="flex items-center justify-between bg-surface/50 p-4 rounded-xl cursor-pointer">
              <span className="font-medium text-sm">Автоматическая синхронизация</span>
              <div className="relative inline-block w-12 h-6 rounded-full bg-surface-active">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={autoSync}
                  onChange={handleAutoSyncToggle}
                />
                <span className="absolute inset-y-1 left-1 w-4 h-4 bg-text-muted rounded-full transition-all peer-checked:left-7 peer-checked:bg-primary"></span>
              </div>
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePush}
                disabled={isSyncing}
                className="flex-1 bg-surface text-text hover:bg-surface-active rounded-xl font-medium transition-colors py-3 px-4 flex justify-center items-center gap-2"
              >
                Выгрузить (Push)
              </button>
              <button
                onClick={handlePull}
                disabled={isSyncing}
                className="flex-1 bg-surface text-text hover:bg-surface-active rounded-xl font-medium transition-colors py-3 px-4 flex justify-center items-center gap-2"
              >
                Загрузить (Pull)
              </button>
            </div>
            {isSyncing && <p className="text-xs text-center text-primary mt-2 animate-pulse">Синхронизация...</p>}
          </div>
        ) : (
          <div className="bg-surface/50 p-4 rounded-xl text-center">
            <p className="text-sm text-text-muted mb-3">Войдите, чтобы включить облачную синхронизацию</p>
            <button
              onClick={handleAuthToggle}
              disabled={isSyncing}
              className="btn-primary py-2 px-6"
            >
              Войти с Google
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
