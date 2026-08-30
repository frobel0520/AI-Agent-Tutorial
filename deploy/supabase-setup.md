# Supabase 設定

正式環境使用 Supabase Database + Supabase Edge Functions，不使用 Render。筆記、WebHook 訂閱與事件紀錄都直接保存於 Supabase；瀏覽器只呼叫 Edge Function，不接觸資料庫密碼或 service role key。

## 會持久化 vs 不會

| 資料 | Supabase Edge Function 版本 |
|------|-----------------------------|
| 筆記 `/notes` | ✅ 保留 |
| WebHook 訂閱 | ✅ 保留 |
| 事件紀錄 `/events` | ✅ 保留 |
| RAG 索引 | ✅ 以 Supabase 筆記做輕量文字檢索 |
| 本機 Chroma | ✅ 僅本機 FastAPI/Docker 使用 |

## Step 1 — 建立 Supabase 專案

1. 登入 https://supabase.com
2. **New project**（免費 tier 可先用於教學）
3. 記下 **Project ref**，稍後設定 GitHub Actions。

## Step 2 — 建立資料表與安全設定

1. Supabase Dashboard → **SQL Editor**
2. 貼上並執行本 repo 的 `supabase/schema.sql`
3. 若資料表原本已存在，再執行 `supabase/migrations/20260830000000_enable_rls_for_edge_api.sql`

RLS migration 會阻止 `anon` 與 `authenticated` 直接讀寫這四張表；Edge Function 使用 server-only service role key 執行資料庫操作。

## Step 3 — 設定 Function Secrets

在 Supabase Dashboard → **Edge Functions → Secrets** 設定：

```env
SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API 的 service role key>
LLM_PROVIDER=mock
WEBHOOK_SECRET=<一組隨機字串>
```

若要使用 Groq：

```env
LLM_PROVIDER=groq
GROQ_API_KEY=<Groq API key>
GROQ_MODEL=llama-3.3-70b-versatile
```

其他可選 provider：

```env
# OpenAI
OPENAI_API_KEY=<OpenAI API key>
OPENAI_MODEL=gpt-4o-mini

# Gemini
GOOGLE_API_KEY=<Google AI API key>
GEMINI_MODEL=<有效的 Gemini model 名稱>

# Dify
DIFY_API_BASE=https://<dify-host>/v1
DIFY_API_KEY=<Dify Chat App API key>
```

不要把任何上述 secret 寫進 `static/`、GitHub Pages 或 Git repository。

## Step 4 — 部署 Edge Function

安裝 Supabase CLI 後：

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy api
```

API URL：

```text
https://<your-project-ref>.supabase.co/functions/v1/api
```

`supabase/config.toml` 已設定公開教學 API 所需的 `verify_jwt = false`。若之後加入使用者登入，請改用 JWT 驗證並在 Function 內檢查權限。

## Step 5 — 設定 GitHub Pages

在 GitHub repository → **Settings → Secrets and variables → Actions**：

### Variables

| Name | Value |
|------|-------|
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `SUPABASE_FUNCTION_URL` | `https://<project-ref>.supabase.co/functions/v1/api` |

### Secrets

| Name | Value |
|------|-------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token |

再到 **Settings → Pages**，把 Source 設為 **GitHub Actions**。push 到 `main` 後：

- `pages.yml` 發布前端
- `supabase-functions.yml` 部署 Edge Function

## Step 6 — 驗收

```powershell
Invoke-RestMethod https://<your-project-ref>.supabase.co/functions/v1/api/health
Invoke-RestMethod https://<your-project-ref>.supabase.co/functions/v1/api/notes
```

預期 `/health`：

```json
{
  "status": "ok",
  "storage": "supabase",
  "persistent_data": true,
  "llm_provider": "mock"
}
```

完成後開啟：

```text
https://<github-owner>.github.io/<repository-name>/
```

在 Step 1 建立筆記，再到 Step 2 提問，確認 `sources` 能回傳 Supabase 中的筆記。

## 本機開發（可選）

本機 FastAPI 仍可使用 SQLite 或 Supabase Postgres：

```powershell
copy .env.example .env
pip install -r requirements.txt
python src\run.py
```

本機網址：`http://localhost:8000/learn`。本機 API 保留 Swagger：`http://localhost:8000/docs`。
