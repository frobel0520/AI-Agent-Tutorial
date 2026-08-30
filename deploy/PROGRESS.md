# AI-Agent-Tutorial — 專案進度交接

> 給新 Chat 用：請先讀本檔。溝通語言一律繁體中文。

**專案路徑：** `C:\Users\ytwei\Projects\AI-Agent-Tutorial`  
**GitHub：** `frobel0520/AI-Agent-Tutorial`  
**正式架構：** GitHub Pages + Supabase Edge Functions + Supabase Database
**本機架構：** FastAPI + SQLite/ Supabase + LangChain + Ollama

---

## 目前狀態

| 項目 | 狀態 | 備註 |
|------|------|------|
| FastAPI + Swagger | ✅ | 本機教學使用 `/docs` |
| 本機 LangChain RAG | ✅ | `POST /ask`，Chroma |
| GitHub Pages 前端 | ✅ | `.github/workflows/pages.yml` |
| Supabase Edge Function API | ✅ | `supabase/functions/api/index.ts` |
| Supabase Database | ✅ | 筆記、WebHook、事件紀錄 |
| Supabase RLS migration | ✅ | `supabase/migrations/`；需在專案執行 |
| Edge Function 自動部署 | ✅ | `.github/workflows/supabase-functions.yml` |
| Render 部署 | ❌ | 已移除 Blueprint 與 keep-alive workflow |

---

## 正式環境設定

Supabase Function Secrets：

```env
SUPABASE_SERVICE_ROLE_KEY=<service role key>
LLM_PROVIDER=mock
WEBHOOK_SECRET=<random secret>
```

若使用 Groq：

```env
LLM_PROVIDER=groq
GROQ_API_KEY=<Groq key>
GROQ_MODEL=llama-3.3-70b-versatile
```

GitHub Actions Variables：

```text
SUPABASE_PROJECT_REF=<project ref>
SUPABASE_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/api
```

GitHub Actions Secret：

```text
SUPABASE_ACCESS_TOKEN=<Supabase personal access token>
```

不要把任何 secret 寫進 repo、`static/` 或 GitHub Pages。

---

## 重要文件

| 文件 | 用途 |
|------|------|
| `deploy/github-supabase-deploy.md` | GitHub Pages + Supabase 完整部署 |
| `deploy/supabase-setup.md` | Supabase schema、RLS、secrets |
| `deploy/free-llm-cloud.md` | Groq/OpenAI/Gemini 設定 |
| `deploy/ollama-setup.md` | 本機 Ollama |
| `deploy/dify-setup.md` | 本機 Dify |
| `deploy/dify-cloud-setup.md` | Dify 公網連線 |
| `supabase/schema.sql` | 資料表 schema |
| `supabase/functions/api/index.ts` | 正式 API Function |
| `static/learn.html` | 前端入口來源 |

---

## 已知限制

1. GitHub Pages 只負責靜態前端；正式 API 必須先部署 Supabase Edge Function。
2. Edge Function 的 RAG 使用輕量文字檢索，不等同本機 Python/Chroma 的向量檢索。
3. `verify_jwt = false` 是為了沿用目前公開教學 API；正式敏感資料應加入 Auth、JWT 與權限檢查。
4. Dify 必須提供 Supabase 可連線的公網 HTTPS URL；本機 `localhost` 不能直接使用。
5. Ollama 僅供本機 FastAPI 使用；正式環境使用 `mock`、Groq、Gemini 或 OpenAI。

---

## 下一步

1. Supabase SQL Editor 執行 `supabase/schema.sql` 與 RLS migration。
2. 設定 Function Secrets 並部署 `api`。
3. 設定 GitHub Actions variables/secret 與 Pages source。
4. 驗收 `/health`、`/notes`、建立筆記、`/ask`、Webhook。

---

## 常用指令

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
.\.venv\Scripts\Activate.ps1
pytest -q
python src\run.py

# Supabase CLI（需先安裝）
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy api
```

---

## 新對話開場白

```text
專案：C:\Users\ytwei\Projects\AI-Agent-Tutorial
請先讀 @deploy/PROGRESS.md，使用繁體中文。

正式架構是 GitHub Pages + Supabase Edge Functions + Supabase Database；Render 已移除。本機仍保留 FastAPI、Docker、Ollama、Dify 教學。
```

*最後更新：2026-08-30（完成無 Render 的 GitHub Pages + Supabase Edge Functions 遷移骨架）*
