import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontendRoot,
  // Match the production build (`vite build --base ./`) so assets resolve under /smoke/.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        app: `${frontendRoot}/index.html`,
        "tests/error-boundary": `${frontendRoot}/tests/error-boundary.html`,
      },
    },
  },
});
