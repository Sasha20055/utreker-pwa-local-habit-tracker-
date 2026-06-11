import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportDataToFile } from '@/lib/sync';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Top-level safety net: a render crash should never white-screen the whole PWA
// and trap the user's local data. We show a recovery screen with an export escape hatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info);
  }

  handleExport = async () => {
    try {
      await exportDataToFile();
    } catch (e) {
      console.error('Export from error screen failed', e);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 bg-background text-text">
        <div className="glass rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">😕</div>
          <h1 className="text-xl font-bold">Что-то пошло не так</h1>
          <p className="text-sm text-text-muted">
            Произошла ошибка интерфейса. Ваши данные хранятся локально и не потеряны — на всякий
            случай можно скачать резервную копию, а затем перезагрузить приложение.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleExport}
              className="flex-1 bg-surface text-text hover:bg-surface-hover rounded-xl font-medium transition-colors py-3 px-4"
            >
              Скачать данные
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 btn-primary py-3 px-4"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      </div>
    );
  }
}
