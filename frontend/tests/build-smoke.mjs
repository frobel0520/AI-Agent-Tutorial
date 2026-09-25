import { build } from "vite";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
process.env.VITE_SUPABASE_URL = "https://mock.supabase.test";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "mock-publishable-key";
process.env.VITE_API_BASE_URL = "";

await build({
  configFile: `${frontendRoot}/vite.smoke.config.js`,
  mode: "smoke",
});
