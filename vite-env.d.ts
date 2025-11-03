/// <reference types="vite/client" />

// FIX: Manually define ImportMeta and ImportMetaEnv to resolve issues
// where `vite/client` types are not being picked up. This makes properties
// like `import.meta.env.DEV` available to TypeScript without needing
// to modify tsconfig.json or package.json.
interface ImportMetaEnv {
  readonly DEV: boolean;
  // Add other environment variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
