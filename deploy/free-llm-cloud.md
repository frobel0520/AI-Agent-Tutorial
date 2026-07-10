# 零預算雲端真實 LLM（Render `/ask`）

鮪魚決策：**預算 0、實境教學、全部使用真實 LLM**。  
Render 無法連本機 Ollama，建議雲端 RAG 使用 **Google Gemini 免費 API**（單一 Key 同時支援 chat + embedding）。

---

## 1. 取得 Google API Key（免費）

1. 開啟 https://aistudio.google.com/apikey  
2. 建立 API Key（不需信用卡）  
3. 複製 Key（勿 commit 到 Git）

---

## 2. Render 環境變數

Render Dashboard → **ai-agent-tutorial** → **Environment**：

| 變數 | 值 |
|------|-----|
| `LLM_PROVIDER` | `gemini` |
| `GOOGLE_API_KEY` | 你的 Google AI Studio Key |
| `GEMINI_MODEL` | `gemini-2.0-flash`（可省略，預設同此） |

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

- `llm_provider`: `gemini`
- `llm_ready`: `true`
- 回答**不應**出現 `[Mock LLM]`

在 https://ai-agent-tutorial.onrender.com/learn **Step 2** 提問，應為自然語句且仍有 `sources`。

---

## 4. Dify（Step 4）用 Groq（另一把免費 Key）

Dify 後台不跑在本專案程式內；在 Dify **Model Provider** 新增 **OpenAI-API-compatible**：

| 欄位 | 值 |
|------|-----|
| Base URL | `https://api.groq.com/openai/v1` |
| API Key | 從 https://console.groq.com 取得（免費、免信用卡） |
| Model | `llama-3.3-70b-versatile` |

詳見 `deploy/dify-cloud-setup.md`。

---

## 5. 本機對照

| 環境 | Step 2 `/ask` | Step 4 `/dify/ask` |
|------|----------------|---------------------|
| 本機 | `LLM_PROVIDER=ollama` | 本機 Dify + Ollama |
| Render | `LLM_PROVIDER=gemini` | 公網 Dify + Groq |

---

## 常見問題

| 症狀 | 解法 |
|------|------|
| `llm_ready: false` | 確認 `GOOGLE_API_KEY` 已設且 redeploy 完成 |
| 400 / 配額錯誤 | 檢查 AI Studio 配額；免費 tier 有 RPM 限制 |
| 仍見 Mock 回答 | `LLM_PROVIDER` 是否仍為 `mock` |
| Chroma 維度錯誤 | 換 provider 後刪容器內 `data/chroma` 或等 Postgres 重建筆記 |
