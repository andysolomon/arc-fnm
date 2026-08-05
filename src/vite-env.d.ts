/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Convex deployment URL. Absent in local demo mode — the app must still run. */
  readonly VITE_CONVEX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
