import { generateSyncPayload, mergeSyncPayload, type SyncPayload } from './sync';

// OAuth Client ID берётся из переменной окружения (инжектится при сборке).
// Для GitHub Pages — через secret VITE_GOOGLE_CLIENT_ID в GitHub Actions.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Доступ только к скрытой папке приложения (пользователь её не видит,
// мы не получаем доступ к остальным файлам на Drive).
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const BACKUP_FILE_NAME = 'utreker-backup.json';

const TOKEN_KEY = 'utreker_google_token';
const FILE_ID_KEY = 'utreker_google_file_id';
const LAST_SYNC_KEY = 'utreker_last_sync';

interface StoredToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// Минимальные типы для google.accounts.oauth2 (GIS)
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export class GoogleDriveSync {
  private static tokenClient: TokenClient | null = null;
  private static gisPromise: Promise<void> | null = null;

  /** Настроен ли Client ID на этапе сборки */
  static isConfigured(): boolean {
    return Boolean(CLIENT_ID);
  }

  private static markSynced(): void {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  /** Время последней успешной синхронизации (или null) */
  static getLastSync(): Date | null {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
  }

  // --- Загрузка GIS-скрипта ---
  private static loadGis(): Promise<void> {
    if (this.gisPromise) return this.gisPromise;
    this.gisPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'));
      document.head.appendChild(script);
    });
    return this.gisPromise;
  }

  private static async getTokenClient(): Promise<TokenClient> {
    if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID не задан');
    await this.loadGis();
    if (!this.tokenClient) {
      this.tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {}, // переопределяется в requestToken
      });
    }
    return this.tokenClient;
  }

  // --- Управление токеном ---
  private static getStoredToken(): StoredToken | null {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredToken;
    } catch {
      return null;
    }
  }

  private static isTokenValid(token: StoredToken | null): token is StoredToken {
    // 60 секунд запаса до истечения
    return Boolean(token && token.expiresAt - 60_000 > Date.now());
  }

  /** Запросить новый access token. prompt: '' — тихо, если согласие уже дано. */
  private static requestToken(prompt: '' | 'consent'): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const client = await this.getTokenClient();
      client.callback = (resp: TokenResponse) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Не удалось получить токен Google'));
          return;
        }
        const stored: StoredToken = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
        resolve(resp.access_token);
      };
      client.requestAccessToken({ prompt });
    });
  }

  /** Вернуть валидный токен: из кэша, тихим запросом или ошибкой (нужен вход). */
  private static async getValidToken(): Promise<string> {
    const stored = this.getStoredToken();
    if (this.isTokenValid(stored)) return stored.accessToken;
    // Пытаемся обновить тихо (без всплывающего окна), если согласие уже было
    return this.requestToken('');
  }

  /** Авторизован ли пользователь (есть валидный токен) */
  static isAuthenticated(): boolean {
    return this.isTokenValid(this.getStoredToken());
  }

  /** Явный вход — открывает окно согласия Google */
  static async authenticate(): Promise<void> {
    await this.requestToken('consent');
  }

  /** Выход — отзыв токена и очистка локального состояния */
  static async signOut(): Promise<void> {
    const stored = this.getStoredToken();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(FILE_ID_KEY);
    if (stored?.accessToken && window.google?.accounts?.oauth2) {
      await new Promise<void>((resolve) => {
        window.google!.accounts.oauth2.revoke(stored.accessToken, () => resolve());
      });
    }
  }

  // --- Работа с файлом бэкапа в appDataFolder ---
  private static async findBackupFileId(token: string): Promise<string | null> {
    const cached = localStorage.getItem(FILE_ID_KEY);
    if (cached) return cached;

    const url =
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder' +
      `&q=${encodeURIComponent(`name='${BACKUP_FILE_NAME}'`)}` +
      '&fields=files(id,name)';
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Drive API: ${resp.status}`);
    const json = (await resp.json()) as { files?: { id: string }[] };
    const id = json.files?.[0]?.id ?? null;
    if (id) localStorage.setItem(FILE_ID_KEY, id);
    return id;
  }

  /** Выгрузка данных в скрытую папку Google Drive (Push) */
  static async pushToDrive(): Promise<void> {
    const token = await this.getValidToken();
    const payload = await generateSyncPayload();
    const body = JSON.stringify(payload);

    const fileId = await this.findBackupFileId(token);
    const boundary = 'utreker_boundary_' + payload.timestamp.replace(/\D/g, '');
    const metadata = fileId
      ? {} // при обновлении метаданные не меняем
      : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };

    const multipartBody =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${body}\r\n` +
      `--${boundary}--`;

    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const resp = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });
    if (!resp.ok) throw new Error(`Drive upload: ${resp.status}`);

    if (!fileId) {
      const created = (await resp.json()) as { id?: string };
      if (created.id) localStorage.setItem(FILE_ID_KEY, created.id);
    }

    this.markSynced();
  }

  /** Загрузка данных из Google Drive и merge с локальными (Pull) */
  static async pullFromDrive(): Promise<void> {
    const token = await this.getValidToken();
    const fileId = await this.findBackupFileId(token);
    if (!fileId) return; // бэкапа в облаке ещё нет

    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`Drive download: ${resp.status}`);

    const payload = (await resp.json()) as SyncPayload;
    await mergeSyncPayload(payload);
    this.markSynced();
  }
}
