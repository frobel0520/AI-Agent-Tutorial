# AI-Agent-Tutorial — 專案進度交接

> 給新 Chat 用： `@deploy/PROGRESS.md` 或複製下方「新對話開場白」。

**專案路徑：** `C:\Users\ytwei\Projects\AI-Agent-Tutorial`  
**GitHub：** `frobel0520/AI-Agent-Tutorial`  
**Render 服務：** https://ai-agent-tutorial.onrender.com  
**學習台：** https://ai-agent-tutorial.onrender.com/learn  

**溝通語言：** 一律繁體中文（技術名詞可保留英文）。

---

## 專案目標

Hands-on 教學後端：RESTful API、LangChain RAG、WebHook、Dify（Phase 3）。  
方案 A（後端優先）+ 新手學習台 UI（`/learn`）。

---

## 已完成

| 項目 | 狀態 | 備註 |
|------|------|------|
| FastAPI + Swagger | ✅ | `/docs` |
| LangChain RAG | ✅ | `POST /ask`，Chroma 本機向量 |
| WebHook | ✅ | 註冊 / 事件；測試用 webhook.site（免費） |
| Render 部署 | ✅ | Blueprint `ai-agent-tutorial` |
| Supabase 持久化 | ✅ | 筆記、WebHook、事件紀錄；Render `DATABASE_URL` 已設 |
| 冷啟動優化 | ✅ | 種子資料背景初始化；Chroma 從 Postgres 重建 |
| 新手學習台 | ✅ | `/learn` 為首頁；Swagger 為進階 |
| Step A 持久化驗收 | ✅ | 重啟後筆記 / WebHook 仍保留 |
| 本機 Ollama | ✅ | `LLM_PROVIDER=ollama`；`llama3.2` |
| Chroma 維度修正 | ✅ | 各 provider 獨立 collection（mock=384, ollama=3072） |
| Dify Phase 3 | ✅ | Docker 自架；Ollama provider；`POST /dify/ask` 驗收通過 |
| 學習台 Step 4 | ✅ | `/learn` Dify 問答 UI |

---

## 環境與設定（勿寫入密碼）

### Render（雲端）

| 變數 | 值 |
|------|-----|
| `LLM_PROVIDER` | `mock`（雲端無法連本機 Ollama） |
| `DATABASE_URL` | Supabase Session/Transaction pooler URI（已驗證可用） |
| `CHROMA_DIR` | `./data/chroma` |
| `APP_ENV` | `production` |

`/health` 預期：`storage: postgres`，`persistent_data: true`。

### 本機 `.env`（Ollama + 可選 Supabase）

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=<與 Render 相同之 Supabase URI，或 sqlite 本機測試>
CHROMA_DIR=./data/chroma
APP_ENV=development
```

**Supabase 連線：** 從 Render Environment **整串複製** `DATABASE_URL`；勿用 README 範例的 `postgres.xxxxx` 占位符。  
**pooler 區域** 必須與 Supabase Connect 面板一致。

**Ollama：**

```powershell
docker compose up -d ollama
docker compose exec ollama ollama pull llama3.2
python src\run.py
```

若 Chroma 維度錯誤：刪除 `data\chroma` 後重啟 API。

---

## 重要文件

| 文件 | 用途 |
|------|------|
| `deploy/supabase-setup.md` | Supabase 設定 |
| `deploy/ollama-setup.md` | 本機 Ollama |
| `deploy/dify-setup.md` | 本機 Dify（Phase 3） |
| `deploy/github-setup.md` | GitHub push |
| `deploy/render-deploy.md` | Render 部署 |
| `docs/01`～`04` | REST / LangChain / WebHook / Dify 教學 |
| `supabase/schema.sql` | DB schema |

---

## 已知限制

1. **Render 免費 tier**：閒置冷啟動 30～60 秒；Chroma 在容器內非永久，但會從 Postgres 筆記重建。
2. **Ollama 僅本機**；雲端要真實 LLM 需 `openai` 或另架 Ollama 伺服器。
3. **mock vs ollama**：mock 回答含 `[Mock LLM]`；ollama 為自然語句；`sources` 邏輯相同。
4. **webhook.site**：WebHook 測試免費，不需付費。

---

## 下一步

**主要目標：線上 `/learn` Step 4（Dify）可用**

1. Dify **部署到公網**（VPS / 雲端 Docker；Render 無法連本機 `localhost`）
2. Render Dashboard 設定 `DIFY_API_BASE`、`DIFY_API_KEY`（雲端 Dify 的 API）
3. Dify 內建 **雲端 LLM provider**（OpenAI 等；不能用本機 Ollama）
4. 驗收 https://ai-agent-tutorial.onrender.com/learn Step 4

**目前上線狀態（2026-05-31）：**

- Step 4 UI 已部署；`/health` 的 `dify_configured: false`（Render 未設 DIFY_*）
- 本機 Step 4 + `/dify/ask` 已驗收通過

**可選：**

- 同一問題對照 `/ask` vs `/dify/ask`
- Dify Knowledge 與 LangChain Chroma 對照

---

## Context 交接（新對話用）

長對話或下一指令可能耗盡 context 時，Agent 會更新本檔並請你**開新 Chat**。

**新 Chat 開場白（複製貼上）：**

```
專案：C:\Users\ytwei\Projects\AI-Agent-Tutorial
請先讀 @deploy/PROGRESS.md

已完成：Render、Supabase、/learn Step 1–4 UI、本機 Ollama RAG、本機 Dify /dify/ask。
上線版 Step 4 尚未接通 Dify（dify_configured: false）。
請用繁體中文。

下一步：Dify 雲端部署 + Render 環境變數，讓線上 Step 4 可用。
```

規則詳見 `.cursor/rules/context-handoff.mdc`。

---

## 常用指令

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
.\.venv\Scripts\Activate.ps1
python src\run.py                    # 本機 http://localhost:8000/learn
pytest -q                            # 測試
git push origin main                 # 推送後 Render 自動 deploy
.\scripts\setup-ollama.ps1           # Ollama 一鍵設定
```

---

## 新對話開場白（複製貼上）

見上方 **Context 交接** 區塊（會隨 PROGRESS 更新）。

---

## Git 最近主題（參考）

- Supabase Postgres 持久化
- 新手學習台 UI（`/learn`）
- Ollama 健康檢查
- Chroma embedding 維度分 collection 修正

---

*最後更新：2026-05-31（push Step 4；設定 context 交接規則；下一步：線上 Dify）*
