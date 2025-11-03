// FIX: Removed the reference to "vite/client" as it was causing a type definition error. The manual definitions below provide the necessary types for `import.meta.env`.

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
