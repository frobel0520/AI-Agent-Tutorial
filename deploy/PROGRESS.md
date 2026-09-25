# AI-Agent-Tutorial — 專案進度交接

> 給新 Chat 用：請先讀本檔。溝通語言一律繁體中文。

**專案路徑：** `C:\Users\ytwei\Projects\AI-Agent-Tutorial`  
**GitHub：** `frobel0520/AI-Agent-Tutorial`  
**正式架構：** GitHub Pages（線上 API 已停用，見下方「目前狀態」）
**本機架構：** FastAPI + SQLite/ Supabase + LangChain + Ollama

---

## 目前狀態

> **2026-09-21：線上後端已退役。** Supabase 專案 `fwcerljlhfzgfhfdjliv` 已不存在（DNS 查不到），決定不重建。
> 線上只剩 GitHub Pages 前端，頁面顯示「線上 API 已停用」且不再呼叫 API；教學請用本機 FastAPI。

| 項目 | 狀態 | 備註 |
|------|------|------|
| FastAPI + Swagger | ✅ | 本機教學使用 `/docs` |
| 本機 LangChain RAG | ✅ | `POST /ask`，Chroma |
| GitHub Pages 前端 | ✅ | `.github/workflows/pages.yml`；沒有 API URL 時顯示停用說明（`9f2bd0c`），已線上確認 |
| Harbor 維護畫面 | ✅ | 2026-09-15 接上 Harbor 主控台的前端維護腳本（`cadca8a`） |
| SEC-QA 強化 | ✅ | 2026-09-21 PR #2：Webhook 權限、共享限流、前端 Error Boundary、422/413 錯誤訊息 |
| SDLC 基線文件 | ✅ | 2026-09-21 `docs/01-project-plan.md`～`docs/04-mvp-release-gate.md` |
| Supabase Edge Function API | ⏸️ | 程式碼保留在 `supabase/functions/api/index.ts`；線上專案已刪除 |
| Supabase Database | ⏸️ | 專案已刪除；限流 migration `20260909000000_add_edge_rate_limit.sql` 從未套用到任何線上 DB |
| Edge Function 自動部署 | ⏸️ | `Deploy Supabase Edge Function` workflow 已停用；`SUPABASE_*` repo variables 已刪除 |
| Render 部署 | ❌ | 2026-08-30 移除 Blueprint；殘留的 `ai-agent-tutorial` 服務 2026-09-21 已在 Render 關閉。若再收到 Render 失敗信，來源就是它 |

---

## 正式環境設定（重建線上版時才需要）

目前沒有線上後端。要恢復線上 demo，照 `deploy/github-supabase-deploy.md` 重建：新 Supabase 專案 → schema 與所有 migration → Function Secrets（含 `WEBHOOK_ALLOWED_URLS`）→ `SUPABASE_ACCESS_TOKEN` secret → 重建 4 個 repo variables → `gh workflow enable supabase-functions.yml`。前端的停用說明會自動消失。

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
| `docs/01-project-plan.md`～`docs/04-mvp-release-gate.md` | SDLC 基線：專案計畫、系統分析、系統設計、MVP release gate |

---

## 已知限制

1. GitHub Pages 只負責靜態前端；正式 API 必須先部署 Supabase Edge Function。
2. Edge Function 的 RAG 使用輕量文字檢索，不等同本機 Python/Chroma 的向量檢索。
3. `verify_jwt = false` 是為了沿用目前公開教學 API；正式敏感資料應加入 Auth、JWT 與權限檢查。
4. Dify 必須提供 Supabase 可連線的公網 HTTPS URL；本機 `localhost` 不能直接使用。
5. Ollama 僅供本機 FastAPI 使用；正式環境使用 `mock`、Groq、Gemini 或 OpenAI。

---

## 下一步

線上後端已退役，目前沒有排定的工作。本機教學可直接使用（`python src\run.py`，開 `/learn`）。

要恢復線上 demo 時：

1. 建新的 Supabase 專案，SQL Editor 執行 `supabase/schema.sql` 與 `supabase/migrations/` 全部 migration（含限流）。
2. 設定 Function Secrets（含 `WEBHOOK_ALLOWED_URLS`）並部署 `api`。
3. 設定 `SUPABASE_ACCESS_TOKEN` secret 與 4 個 repo variables，`gh workflow enable supabase-functions.yml`。
4. 驗收 `/health`、`/notes`、建立筆記、`/ask`、Webhook，確認前端停用說明消失。

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

線上後端（Supabase）已於 2026-09-21 退役，GitHub Pages 只顯示停用說明；Render 已移除。本機仍保留 FastAPI、Docker、Ollama、Dify 教學。
```

*最後更新：2026-09-22（線上後端退役、SEC-QA 強化、SDLC 基線文件、Harbor 維護畫面）*
