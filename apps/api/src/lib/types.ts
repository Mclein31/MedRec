/** Row-level security context applied to a query (see migrations/002_rls.sql). */
export type DbContext = { userId: string } | { system: true };

export interface Db {
  /** Runs one statement inside a transaction with app.user_id / app.role set. */
  query<T = Record<string, unknown>>(ctx: DbContext, text: string, params?: unknown[]): Promise<T[]>;
}

export const SYSTEM: DbContext = { system: true };
export const asUser = (userId: string): DbContext => ({ userId });

export interface Mailer {
  send(message: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

/** Minimal R2 surface the API uses, so tests can supply an in-memory bucket. */
export interface Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; size: number; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(keys: string | string[]): Promise<void>;
}

export interface Bindings {
  APP_NAME: string;
  PUBLIC_URL: string;
  ALLOWED_ORIGINS: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  FILE_SIGNING_SECRET: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  GEMINI_FALLBACK_MODEL: string;
  ENVIRONMENT: 'development' | 'production' | 'test';
  /** Gmail address and App Password used to send sign-in codes. */
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  MAIL_FROM?: string;
  VAULT: Bucket;
}

export interface Services {
  db: Db;
  mailer: Mailer;
  fetch: typeof fetch;
  now: () => Date;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: { services: Services; userId: string; sessionId: string };
};

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}
