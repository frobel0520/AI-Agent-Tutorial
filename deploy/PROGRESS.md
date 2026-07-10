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
| `LLM_PROVIDER` | **`gemini`**（零預算真實 LLM；需設 `GOOGLE_API_KEY`） |
| `GOOGLE_API_KEY` | Google AI Studio 免費 Key（見 `deploy/free-llm-cloud.md`） |
| `GEMINI_MODEL` | `gemini-2.5-flash`（可省略；`2.0-flash` 已於 2026-03 除役） |
| `DIFY_API_BASE` | Cloudflare Tunnel URL + `/v1`（見 `deploy/dify-cloud-setup.md`） |
| `DIFY_API_KEY` | Dify Chat App `app-...` |
| `DATABASE_URL` | Supabase Session/Transaction pooler URI（已驗證可用） |
| `CHROMA_DIR` | `./data/chroma` |
| `APP_ENV` | `production` |

> 若尚未在 Dashboard 設定，目前可能仍為舊值 `mock` / 未設 `DIFY_*`。

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
| `deploy/dify-cloud-setup.md` | Dify 公網 + Render Step 4 |
| `deploy/free-llm-cloud.md` | Render Gemini 零預算 LLM |
| `deploy/dev-logs/` | 各對話開發日誌 |
| `deploy/github-setup.md` | GitHub push |
| `deploy/render-deploy.md` | Render 部署 |
| `docs/01`～`04` | REST / LangChain / WebHook / Dify 教學 |
| `supabase/schema.sql` | DB schema |

---

## 已知限制

1. **Render 免費 tier**：閒置冷啟動 30～60 秒；Chroma 在容器內非永久，但會從 Postgres 筆記重建。
2. **Ollama 僅本機**；雲端真實 LLM 用 **`gemini`**（免費 Key）或付費 `openai`。
3. **Dify 公網**：教學預設 Cloudflare Tunnel 暴露本機 Dify；Tunnel 關閉則線上 Step 4 會 502。
4. **mock vs ollama vs gemini**：mock 含 `[Mock LLM]`；ollama/gemini 為自然語句；`sources` 邏輯相同。
5. **webhook.site**：WebHook 測試免費，不需付費。

---

## 下一步

**Session 04 決策（2026-07-10）：零預算、全真實 LLM，Render 常駐 + 自動喚醒**

**需在本機 + Render Dashboard 操作（無法代做）：**

1. **Google AI Studio** 建立 Key → Render：`LLM_PROVIDER=gemini`、`GOOGLE_API_KEY`（見 `deploy/free-llm-cloud.md`）
2. **Groq** 建立 Key → Dify 後台 Model Provider（OpenAI 相容 `https://api.groq.com/openai/v1`）
3. 本機跑 Dify + `.\scripts\setup-dify-tunnel.ps1` → 複製 Tunnel URL
4. Render：`DIFY_API_BASE=https://<tunnel-host>/v1`、`DIFY_API_KEY=app-...`（見 `deploy/dify-cloud-setup.md`）
5. 驗收 https://ai-agent-tutorial.onrender.com/learn Step 2（Gemini）與 Step 4（Dify）

**程式已就緒：** `LLM_PROVIDER=gemini`、Tunnel 腳本、文件；**尚未**代設 Render secrets（需你貼 Key）。

**已加：** `.github/workflows/keep-alive.yml` 每 10 分鐘 ping `/health`，避免 Render 免費 tier 閒置後需手動 Activate。

**可選：** Oracle Cloud 24/7 自架 Dify（`deploy/dify-cloud-setup.md` 進階章節）

---

## Context 交接（新對話用）

**觸發時機：** context 約 **70%～80%** 即交接（使用者偏好保險區間）。

**新 Chat 開場白（複製貼上）：**

```
專案：C:\Users\ytwei\Projects\AI-Agent-Tutorial
請先讀 @deploy/PROGRESS.md

已完成：Render、Supabase、/learn、本機 Ollama/Dify；Session 03 已加 gemini provider 與雲端部署文件。
請用繁體中文。

下一步：依 deploy/free-llm-cloud.md 與 deploy/dify-cloud-setup.md 在 Render 設 env；
本機開 Tunnel 後驗收線上 Step 2 + Step 4。
```

規則：`~/.cursor/skills/context-handoff/SKILL.md`、`.cursor/rules/context-handoff.mdc`。

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

*最後更新：2026-07-10（Session 04：確認 gemini + Dify tunnel 方案；新增 Render keep-alive workflow；開發日誌簡化為一般工程風格）*
