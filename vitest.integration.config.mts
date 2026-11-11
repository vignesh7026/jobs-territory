import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Needs the local Supabase stack running (npm run db:start).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", testTimeout: 20000 },
});
