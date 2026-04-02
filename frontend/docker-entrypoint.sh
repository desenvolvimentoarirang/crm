#!/bin/sh
# Inject runtime environment variables into the built frontend.
# VITE_ vars are normally baked at build time — this makes them available at runtime.
cat > /app/dist/env-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}"
};
EOF

exec serve dist -l "$PORT" -s
