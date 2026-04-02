// Runtime config: in dev, use '' (Vite proxy handles it).
// In production, read from window.__RUNTIME_CONFIG__ injected by docker-entrypoint.sh,
// falling back to VITE_API_URL (baked at build time) for non-Docker deploys.
const runtimeConfig = (window as any).__RUNTIME_CONFIG__ ?? {}

export const backendUrl = import.meta.env.DEV
  ? ''
  : (runtimeConfig.VITE_API_URL || import.meta.env.VITE_API_URL || '')
