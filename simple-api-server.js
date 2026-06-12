// Thin launcher for `npm run dev:server` / `npm start`.
// All real logic lives in dev-server.cjs (proxy to Vite + RSS news endpoint).
// Kept as a separate file so the npm script name stays stable.
import('./dev-server.cjs');
