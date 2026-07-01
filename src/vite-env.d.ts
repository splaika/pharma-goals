/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" in .env.local to use live Dataverse instead of mock data. */
  readonly VITE_USE_DATAVERSE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
