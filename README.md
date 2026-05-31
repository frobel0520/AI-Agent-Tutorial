# AI-Agent-Tutorial

Hands-on tutorial backend for learning **LangChain**, **RESTful API**, **Dify**, and **WebHooks**.

方案 A（後端優先）：FastAPI + LangChain RAG + SQLite + Swagger UI。預設 `LLM_PROVIDER=mock`，**不需要 API Key** 就能開始練 REST 與 RAG 流程。

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
| GET | `/events` | 事件紀錄 |
| POST | `/dify/ask` | 呼叫 Dify（Phase 3） |

## LLM 模式

| `LLM_PROVIDER` | 說明 |
|----------------|------|
| `mock` | 預設；免 API Key，適合先學流程 |
| `ollama` | 本機 Docker 真實模型 |
| `openai` | 上線建議；需 `OPENAI_API_KEY` |

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

## 上線部署（Render）

本 repo 含 `render.yaml`，可用 [Render](https://render.com) 一鍵部署 Docker 服務。

1. 把 repo push 到 GitHub
2. Render → **New Blueprint** → 選此 repo
3. 環境變數建議：
   - 先上線 demo：`LLM_PROVIDER=mock`
   - **持久化（推薦）**：`DATABASE_URL` = Supabase Postgres URI（見 `deploy/supabase-setup.md`）
   - 正式問答：`LLM_PROVIDER=openai` + `OPENAI_API_KEY`
4. 部署完成後開 `https://<your-service>.onrender.com/docs`

### Render 免費 tier 與 Supabase

- Render 本機磁碟為 **ephemeral**；請接 **Supabase Postgres** 持久化筆記與 WebHook
- 設定步驟見 [deploy/supabase-setup.md](deploy/supabase-setup.md)
- 未接 Supabase 時，`/health` 會顯示 `storage: sqlite`、`persistent_data: false`

### 其他平台

- **Railway / Fly.io**：使用根目錄 `Dockerfile`
- **Health check path**：`/health`

## Dify（Phase 3）

見 [docs/04-dify.md](docs/04-dify.md) 與 [deploy/dify-compose.note.md](deploy/dify-compose.note.md)。

## 專案結構

```
src/app/
  main.py              # FastAPI app
  routers/             # REST endpoints
  services/            # LangChain, WebHook, Dify
docs/                  # 分章教學
tests/                 # pytest
Dockerfile
docker-compose.yml
render.yaml
```

## 下一步

1. 完成 Phase 1 的 Swagger 練習
2. 用 webhook.site 完成 Phase 2
3. **本機 Ollama 真實 LLM**：見 [deploy/ollama-setup.md](deploy/ollama-setup.md)
4. Docker 跑 Dify，打通 `/dify/ask`
5. 雲端取得 OpenAI key 後切 `LLM_PROVIDER=openai` 並 redeploy

## License

MIT
