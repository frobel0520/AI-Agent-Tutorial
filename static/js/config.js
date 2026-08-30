// This file is intentionally secret-free. The Pages workflow can replace the
// value from the SUPABASE_FUNCTION_URL repository variable at build time.
// Leave it empty for local FastAPI development so same-origin API calls work.
window.APP_CONFIG = Object.freeze({
  apiBaseUrl: "",
});
