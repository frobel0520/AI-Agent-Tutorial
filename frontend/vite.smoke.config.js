import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontendRoot,
  build: {
    rollupOptions: {
      input: {
        app: `${frontendRoot}/index.html`,
        "tests/error-boundary": `${frontendRoot}/tests/error-boundary.html`,
      },
    },
  },
});
