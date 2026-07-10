# 零預算雲端真實 LLM（Render `/ask`）

決策：**預算 0、實境教學、全部使用真實 LLM**。
Render 無法連本機 Ollama；雲端 `/ask` 建議用 **Groq 免費 API**（OpenAI 相容、額度穩定，且跟 Dify Step 4 共用同一把 key）。

> Gemini 曾是第一選擇，但 Google 的免費 model 名稱／額度變動非常頻繁（`embedding-001`、`text-embedding-004`、`gemini-2.0-flash` 陸續除役；新申請的 key 連 `gemini-2.5-flash` 都被擋，`gemini-3.5-flash` 免費額度只有 20 次/天）。仍想用可參考本檔最後的「備用：Gemini」。

---

## 1. 取得 Groq API Key（免費）

1. 開啟 https://console.groq.com/keys
2. 建立 API Key（不需信用卡）
3. 複製 Key（勿 commit 到 Git）

---

## 2. Render 環境變數

Render Dashboard → **ai-agent-tutorial** → **Environment**：

| 變數 | 值 |
|------|-----|
| `LLM_PROVIDER` | `groq` |
| `GROQ_API_KEY` | 你的 Groq Key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile`（可省略，預設同此） |

保留既有：

- `DATABASE_URL`（Supabase）
- `CHROMA_DIR=./data/chroma`
- `APP_ENV=production`

儲存後會自動 redeploy。

---

## 3. 驗收

```powershell
Invoke-RestMethod https://ai-agent-tutorial.onrender.com/health
```

預期：

- `llm_provider`: `groq`
- `llm_ready`: `true`
- 回答**不應**出現 `[Mock LLM]`

在 https://ai-agent-tutorial.onrender.com/learn **Step 2** 提問，應為自然語句且仍有 `sources`（此模式的檢索用簡易向量，非語意搜尋——教學筆記數量少，不影響示範）。

---

## 4. Dify（Step 4）共用同一把 Groq Key

Dify 後台不跑在本專案程式內；在 Dify **Model Provider** 新增 **OpenAI-API-compatible**：

| 欄位 | 值 |
|------|-----|
| Base URL | `https://api.groq.com/openai/v1` |
| API Key | 跟上面 `GROQ_API_KEY` 同一把 |
| Model | `llama-3.3-70b-versatile` |

詳見 `deploy/dify-cloud-setup.md`。

---

## 5. 本機對照

| 環境 | Step 2 `/ask` | Step 4 `/dify/ask` |
|------|----------------|---------------------|
| 本機 | `LLM_PROVIDER=ollama` | 本機 Dify + Ollama |
| Render | `LLM_PROVIDER=groq` | 公網 Dify + Groq |

---

## 常見問題

| 症狀 | 解法 |
|------|------|
| `llm_ready: false` | 確認 `GROQ_API_KEY` 已設且 redeploy 完成 |
| 429 / 配額錯誤 | 檢查 https://console.groq.com 的用量；免費 tier 有 RPM/RPD 限制 |
| 仍見 Mock 回答 | `LLM_PROVIDER` 是否仍為 `mock` |
| Chroma 維度錯誤 | 換 provider 後刪容器內 `data/chroma` 或等 Postgres 重建筆記 |

---

## 備用：Gemini

```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

1. https://aistudio.google.com/apikey 建立 Key
2. Render 設 `LLM_PROVIDER=gemini`、`GOOGLE_API_KEY`、`GEMINI_MODEL`
3. 若 404／429，先去 https://ai.dev/rate-limit 確認這把 key 目前哪個 model 有額度，再更新 `GEMINI_MODEL`
