# AI-Agent-Tutorial

Hands-on tutorial project for learning **LangChain**, **RESTful API**, **Dify**, and **WebHooks**.

本機使用 FastAPI + LangChain + SQLite；正式網站使用 GitHub Pages + Supabase Edge Functions + Supabase Database。預設 `LLM_PROVIDER=mock`，**不需要 API Key** 就能開始練 REST 與 RAG 流程。

## 學習路徑

| Phase | 主題 | 文件 |
|-------|------|------|
| 1 | RESTful API + LangChain RAG | [docs/01-rest-api.md](docs/01-rest-api.md), [docs/02-langchain.md](docs/02-langchain.md) |
| 2 | WebHook | [docs/03-webhook.md](docs/03-webhook.md) |
| 3 | Dify 整合 | [docs/04-dify.md](docs/04-dify.md) |

## 需求

- Python 3.11+
- （選用）Docker Desktop — Ollama 本機模型、Dify 自架

## 快速開始（本機）

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src\run.py
```

開啟：

- **新手學習台（推薦）**: http://localhost:8000/learn
- Swagger UI（進階）: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 第一次實驗（5 分鐘）

1. `GET /health` — 確認服務正常
2. `GET /notes` — 看預載的三筆教學筆記
3. `POST /ask` — 問「LangChain 是什麼？」
4. `POST /webhooks` — 用 [webhook.site](https://webhook.site) URL 註冊
5. 再 `POST /notes`，到 webhook.site 看事件 payload

## API 一覽

| Method | Path | 說明 |
|--------|------|------|
| GET | `/health` | 健康檢查 |
| GET/POST | `/notes` | 筆記列表 / 建立 |
| GET/PUT/DELETE | `/notes/{id}` | 讀取 / 更新 / 刪除 |
| POST | `/ask` | LangChain RAG 問答 |
| POST/GET/DELETE | `/webhooks` | WebHook 訂閱管理 |
| POST | `/hooks/incoming` | 本專案自有 WebHook 接收端點 |
| GET | `/events` | 事件紀錄 |
| POST | `/dify/ask` | 呼叫 Dify（Phase 3） |

## LLM 模式

| `LLM_PROVIDER` | 說明 |
|----------------|------|
| `mock` | 預設；免 API Key，適合先學流程 |
| `ollama` | 本機 Docker 真實模型 |
| `groq` | Supabase Edge Function 可用的 OpenAI-compatible 雲端模型 |
| `gemini` | Supabase Edge Function 可用的 Google 雲端模型 |
| `openai` | Supabase Edge Function 可用；需 `OPENAI_API_KEY` |

### Docker（API + Ollama）

```powershell
copy .env.example .env
# 若要 Ollama：LLM_PROVIDER=ollama
docker compose up -d --build
docker exec -it ai-agent-tutorial-ollama-1 ollama pull llama3.2
```

API: http://localhost:8000/docs

## 測試

```powershell
pip install -r requirements.txt
pytest -q
```

## 上線部署（GitHub Pages + Supabase）

正式環境不使用 Render。架構如下：

- GitHub Pages：發布 `static/` 學習台
- Supabase Edge Function：提供 `/health`、`/notes`、`/ask`、`/webhooks`、`/events`、`/dify/ask`
- Supabase Database：保存筆記、WebHook 訂閱、事件紀錄

完整步驟見 [deploy/github-supabase-deploy.md](deploy/github-supabase-deploy.md)。簡要流程：

1. 在 Supabase SQL Editor 執行 `supabase/schema.sql`，再執行 RLS migration。
2. 設定 Supabase Function Secrets：`SUPABASE_SERVICE_ROLE_KEY`、`LLM_PROVIDER` 與對應的 LLM key。
3. 部署 `supabase/functions/api` Edge Function。
4. 在 GitHub repository variables 設定 `SUPABASE_PROJECT_REF` 與 `SUPABASE_FUNCTION_URL`。
5. 將 GitHub Pages 的 source 設為 **GitHub Actions**；push 到 `main` 後會自動發布前端與 Edge Function。

GitHub Pages 網站本身不存放任何 Supabase、LLM 或 Dify secret；前端只保存公開的 Function URL。

## Dify（Phase 3）

見 [docs/04-dify.md](docs/04-dify.md) 與 [deploy/dify-compose.note.md](deploy/dify-compose.note.md)。

## 專案結構

```
src/app/
  main.py              # 本機 FastAPI app
  routers/             # REST endpoints
  services/            # LangChain, WebHook, Dify
supabase/functions/api/
  index.ts              # 正式環境 Edge Function API
supabase/migrations/    # Supabase 安全設定
static/                 # GitHub Pages 前端
docs/                  # 分章教學
tests/                 # pytest
Dockerfile              # 本機 Docker API
docker-compose.yml
```

## 下一步

1. 完成 Phase 1 的本機 Swagger 練習
2. 用 webhook.site 完成 Phase 2
3. **本機 Ollama 真實 LLM**：見 [deploy/ollama-setup.md](deploy/ollama-setup.md)
4. Docker 跑 Dify，打通 `/dify/ask`
5. Supabase Edge Function 設定 Groq/OpenAI/Gemini 後切換 `LLM_PROVIDER`

## License

MIT
