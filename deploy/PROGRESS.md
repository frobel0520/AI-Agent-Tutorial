# AI-Agent-Tutorial — 專案進度交接

> 給新 Chat 用： `@deploy/PROGRESS.md` 或複製下方「新對話開場白」。

**專案路徑：** `C:\Users\ytwei\Projects\AI-Agent-Tutorial`  
**GitHub：** `frobel0520/AI-Agent-Tutorial`  
**Render 服務：** https://ai-agent-tutorial.onrender.com  
**學習台：** https://ai-agent-tutorial.onrender.com/learn  

**溝通語言：** 一律繁體中文（技術名詞可保留英文）。

---

## 專案目標

Hands-on 教學後端：RESTful API、LangChain RAG、WebHook、Dify（Phase 3，**本機示範功能**）。  
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
| Render 零預算真實 LLM | ✅ | `LLM_PROVIDER=groq` 已上線驗收，`/ask` 回答非 mock、`sources` 正確 |
| Render + Supabase 自動喚醒 | ✅ | `.github/workflows/keep-alive.yml` 每 10 分鐘 ping `/health` + `/notes` |

---

## 環境與設定（勿寫入密碼）

### Render（雲端）

| 變數 | 值 |
|------|-----|
| `LLM_PROVIDER` | **`groq`**（零預算真實 LLM；需設 `GROQ_API_KEY`） |
| `GROQ_API_KEY` | Groq 免費 Key（見 `deploy/free-llm-cloud.md`；跟 Dify Model Provider 同一把） |
| `GROQ_MODEL` | `llama-3.3-70b-versatile`（可省略） |
| `GOOGLE_API_KEY` / `GEMINI_MODEL` | 備用（Gemini 免費 model／額度變動頻繁，見 `deploy/free-llm-cloud.md` 備用段落） |
| `DIFY_API_BASE` / `DIFY_API_KEY` | **刻意不設定**——Dify（Step 4）定位為本機示範，見下方「已知限制」 |
| `DATABASE_URL` | Supabase Session/Transaction pooler URI（已驗證可用） |
| `CHROMA_DIR` | `./data/chroma` |
| `APP_ENV` | `production` |

> `LLM_PROVIDER`/`GROQ_API_KEY` 已在 Render Dashboard 設定並驗收通過（2026-07-10）。`DIFY_*` 尚未設定。

`/health` 目前實際回應：`llm_provider: groq`、`llm_ready: true`、`storage: postgres`、`persistent_data: true`、`dify_configured: false`。

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
| `deploy/dify-cloud-setup.md` | Dify 公網 + Render Step 4（選用，目前決定不追求線上常駐） |
| `deploy/free-llm-cloud.md` | Render Groq 零預算 LLM（備用 Gemini） |
| `deploy/dev-logs/` | 各對話開發日誌 |
| `deploy/github-setup.md` | GitHub push |
| `deploy/render-deploy.md` | Render 部署 |
| `docs/01`～`04` | REST / LangChain / WebHook / Dify 教學 |
| `supabase/schema.sql` | DB schema |

---

## 已知限制

1. **Render 免費 tier**：閒置冷啟動 30～60 秒；Chroma 在容器內非永久，但會從 Postgres 筆記重建。
2. **Ollama 僅本機**；雲端真實 LLM 用 **`groq`**（免費、額度穩定）或付費 `openai`。
3. **Dify（Step 4）刻意定位為本機示範功能**：程式碼／UI／文件都保留，但線上 Render **不**設定 `DIFY_*`，不追求 Step 4 隨時可用（本機 Dify + Cloudflare Tunnel 才能跑，太依賴個人電腦，決定不投入維護）。想要的話可參考 `deploy/dify-cloud-setup.md` 的 Oracle Cloud 24/7 自架方案。
4. **mock vs ollama vs groq/gemini**：mock 含 `[Mock LLM]`；其餘為自然語句；`sources` 邏輯相同。`groq` 的檢索用簡易向量（Groq 無 embeddings API），教學筆記數量少不影響示範。
5. **webhook.site**：WebHook 測試免費，不需付費。
6. **Gemini 不穩定**：Google 免費 model 名稱／額度變動頻繁（`embedding-001`/`text-embedding-004` 已除役、`gemini-2.0-flash` 除役、新 key 連不上 `gemini-2.5-flash`、`gemini-3.5-flash` 免費只有 20 次/天）。已改用 `groq` 為預設，`gemini` 保留為備用選項。

---

## 下一步

**Session 04（2026-07-10～11）已完成：** Render/Supabase 自動喚醒、Groq 零預算真實 LLM（`/ask` 線上驗收通過）、開發日誌簡化為一般工程風格。

**Dify（Step 4）決策：不追求線上常駐**，本機 Dify + Cloudflare Tunnel 太依賴個人電腦開機，決定保留程式碼／UI／文件但不投入維護 Render 的 `DIFY_*`。想在本機示範時再照 `docs/04-dify.md` 臨時跑起來即可。

**目前沒有阻塞性的下一步。** 若之後想讓 Step 4 常駐上線，`deploy/dify-cloud-setup.md` 有 Oracle Cloud 24/7 自架方案可參考。

---

## Context 交接（新對話用）

**觸發時機：** context 約 **70%～80%** 即交接（使用者偏好保險區間）。

**新 Chat 開場白（複製貼上）：**

```
專案：C:\Users\ytwei\Projects\AI-Agent-Tutorial
請先讀 @deploy/PROGRESS.md

已完成：Render、Supabase、/learn、本機 Ollama/Dify；Session 04 改用 groq provider 並線上驗收通過（Gemini 免費層一路踩雷，保留為備用）；Render/Supabase 自動喚醒 workflow 已加；Dify（Step 4）決定不追求線上常駐，定位為本機示範功能。
請用繁體中文。

下一步：目前沒有阻塞性待辦，可討論其他功能或優化方向。
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

- Groq provider（取代不穩定的 Gemini 免費層）
- Render + Supabase 自動喚醒 workflow
- Gemini embedding/chat model 除役修正過程（保留為備用 provider）
- 開發日誌簡化為一般工程風格
- Supabase Postgres 持久化
- 新手學習台 UI（`/learn`）
- Ollama 健康檢查
- Chroma embedding 維度分 collection 修正

---

*最後更新：2026-07-11（Session 04：Groq 已上線驗收通過；Render/Supabase 自動喚醒已加；Dify 決定不追求線上常駐，定位為本機示範）*
