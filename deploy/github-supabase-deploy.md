# GitHub Pages + Supabase 部署

正式環境不使用 Render。GitHub Pages 發布前端，Supabase Edge Function 提供 API，Supabase Database 保存資料。

## 架構

```text
瀏覽器
  ├─ GitHub Pages              frontend/dist（React + Vite）
  └─ Supabase Edge Function    /functions/v1/api
       ├─ Supabase Database    notes / webhooks / events
       ├─ Groq / OpenAI / Gemini（選用）
       └─ Dify（選用）
```

React 前端原始碼在 `frontend/src/`。GitHub Actions 會先執行 `npm ci` 與 `npm run build`，再將 `frontend/dist` 發布到 GitHub Pages；Supabase 的公開連線設定只在 build 時由 repository variables 注入。

## 1. 建立或確認 Supabase 專案

1. 在 Supabase 建立專案。
2. SQL Editor 執行 `supabase/schema.sql`。
3. 若資料表已存在，再執行 `supabase/migrations/20260830000000_enable_rls_for_edge_api.sql` 與 `20260831000000_add_dify_access.sql`。

這個專案的瀏覽器請求全部經過 Edge Function；RLS migration 會阻擋瀏覽器直接讀寫資料表。Edge Function 使用 server-only service role key，因此該 key 絕不能放在 GitHub Pages。

## 2. 設定 Edge Function Secrets

可在 Supabase Dashboard 的 **Edge Functions → Secrets** 設定，或使用 Supabase CLI。至少設定：

| Key | 必填 | 說明 |
|-----|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | Supabase Project Settings → API 的 service role key |
| `LLM_PROVIDER` | 否 | 預設 `mock`；可用 `groq`、`openai`、`gemini` |
| `GROQ_API_KEY` | 使用 Groq 時 | Groq API key |
| `GROQ_MODEL` | 否 | 預設 `llama-3.3-70b-versatile` |
| `OPENAI_API_KEY` | 使用 OpenAI 時 | OpenAI API key |
| `OPENAI_MODEL` | 否 | 預設 `gpt-4o-mini` |
| `GOOGLE_API_KEY` | 使用 Gemini 時 | Google AI API key |
| `GEMINI_MODEL` | 使用 Gemini 時 | 有效的 Gemini model 名稱 |
| `WEBHOOK_SECRET` | 否 | 訂閱未提供個別 secret 時使用 |
| `CORS_ORIGINS` | 否 | 逗號分隔的允許來源；空白時為公開教學模式 |
| `DIFY_API_BASE` | 使用 Dify 時 | Dify 的 `/v1` API URL |
| `DIFY_API_KEY` | 使用 Dify 時 | Dify Chat App API key |

`SUPABASE_URL` 通常由 Supabase 執行環境提供；程式不會把它寫進前端。若要使用 CLI：

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy api
```

本機測試可在 `supabase/functions/.env` 放入上述設定；該路徑已列入 `.gitignore`。

## 3. 部署 Edge Function

手動部署：

```powershell
supabase functions deploy api
```

部署後 API URL 是：

```text
https://<your-project-ref>.supabase.co/functions/v1/api
```

`supabase/config.toml` 維持 `verify_jwt = false`，因為同一個 Function 也接收外部 WebHook。Dify 路由會在 Function 內驗證 Supabase Auth JWT，並檢查 `dify_access` 授權表；WebHook 路由則維持 HMAC 驗證。

## 4. Google Auth 與 Dify 授權

正式頁面使用 Supabase Auth 的 Google OAuth。GitHub Pages 需要下列 repository variables：

| Name | Value |
|------|-------|
| `SUPABASE_PROJECT_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Project Settings → API 的 publishable/anon key |

Supabase Dashboard → Authentication → Providers → Google：

1. 在 Google Cloud 建立 Web OAuth Client。
2. Authorized JavaScript origins 加入 GitHub Pages 網址。
3. Authorized redirect URI 加入 `https://<project-ref>.supabase.co/auth/v1/callback`。
4. 將 Client ID 與 Client Secret 貼入 Supabase 的 Google provider 並啟用。
5. Authentication → URL Configuration 的 Site URL 設為 GitHub Pages 網址。

使用者登入後，管理者再到 SQL Editor 授權指定帳號：

```sql
insert into public.dify_access (user_id)
select id from auth.users where email = 'authorized@example.com'
on conflict (user_id) do update set enabled = true;
```

只有登入且 `dify_access.enabled = true` 的使用者能呼叫 `/dify/ask`；訪客會收到 `401`，未授權帳號會收到 `403`。

## 5. 設定 GitHub Actions

在 GitHub repository 的 **Settings → Secrets and variables → Actions** 設定：

### Variables

| Name | Value |
|------|-------|
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `SUPABASE_FUNCTION_URL` | `https://<project-ref>.supabase.co/functions/v1/api` |
| `SUPABASE_PROJECT_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |

### Secrets

| Name | Value |
|------|-------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token |

Repository 已包含：

- `.github/workflows/pages.yml`：將前端發布到 GitHub Pages
- `.github/workflows/supabase-functions.yml`：部署 Supabase Edge Function

接著到 **Settings → Pages**，將 **Source** 設為 **GitHub Actions**，再 push 到 `main`。兩條 workflow 會依檔案變更自動執行。

本機只想預覽 React 前端時：

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial\frontend
npm ci
npm run dev
```

## 6. 驗收

```powershell
Invoke-RestMethod https://<your-project-ref>.supabase.co/functions/v1/api/health
Invoke-RestMethod https://<your-project-ref>.supabase.co/functions/v1/api/notes
```

預期 `/health` 至少包含：

```json
{
  "status": "ok",
  "storage": "supabase",
  "persistent_data": true,
  "llm_provider": "mock"
}
```

GitHub Pages 的前端 URL 會依 repository 名稱產生，例如：

```text
https://<github-owner>.github.io/<repository-name>/
```

若頁面顯示無法連線，優先檢查 `SUPABASE_FUNCTION_URL` repository variable，以及 Edge Function 是否已部署。

## 與本機 FastAPI 的差異

- `src/app/` 與 Docker Compose 保留給本機教學與 Ollama 使用。
- GitHub Pages 正式入口是 `frontend/` 的 React 應用；`static/learn.html` 是本機 FastAPI 的舊版回退入口。
- 正式 Edge Function 不使用 Python LangChain/Chroma，改用 Supabase 筆記上的輕量文字檢索。
- `/docs` Swagger 只存在本機 FastAPI；正式環境請看 `docs/` 與本檔 API 路徑。
- WebHook、Dify 與 LLM 的秘密都只存在 Supabase Function Secrets。
