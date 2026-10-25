# LangChain 教學（Phase 1）

## 這個專案怎麼用 LangChain

流程：

1. 筆記寫入 SQLite
2. `POST /ask` 從 SQLite 筆記重建 LangChain Core 的 `InMemoryVectorStore`
3. 在該次查詢的記憶體索引找 top-k 片段，同一批片段供 prompt 與 sources 使用
4. Prompt + Chat Model 產生答案

對應程式：

- `src/app/services/langchain_rag.py`
- `src/app/services/llm_factory.py`

### 本機索引與資料保留（2026-10-25）

Chroma 及其整合套件已移除。SQLite 是筆記唯一持久資料來源，新增／更新／刪除只寫 SQLite；每次問答重建索引，因此重啟、更新與刪除後不會讀到舊向量。舊 `CHROMA_DIR` 設定仍可解析，但不讀寫或清除該目錄，不需搬移既有筆記。

代價是每次問答都要為現有筆記產生向量，適合小型本機教學，不能直接外推大量資料或遠端模型延遲。預設 mock 使用固定的合成向量，方便重現；不是語意檢索或答案品質證明。實際模型與資料集品質另驗，測試不呼叫付費服務。

## LLM 模式

| LLM_PROVIDER | 需要 API Key | 用途 |
|--------------|-------------|------|
| `mock` | 否 | 先學 REST + RAG 流程 |
| `ollama` | 否（本機 Docker） | 真實模型、無雲端費用 |
| `groq` | 是（[免費](https://console.groq.com/keys)） | Supabase Edge Function 的雲端真實 LLM（推薦） |
| `gemini` | 是（[AI Studio 免費](https://aistudio.google.com/apikey)） | 備用；Google 常異動免費 model／額度 |
| `openai` | 是（付費） | 正式商用 |

### 切到 Ollama

```powershell
# docker compose up -d ollama
docker exec -it ai-agent-tutorial-ollama-1 ollama pull llama3.2
```

`.env`：

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 切到 Groq（Edge Function 推薦）

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

檢索（embeddings）用簡易向量，非語意搜尋；Groq 不提供 embeddings API。詳見 `deploy/free-llm-cloud.md`。

### 切到 Gemini（備用）

```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

詳見 `deploy/free-llm-cloud.md`。Google 免費 model 名稱／額度變動頻繁，新申請的 key 可能連不上文件寫的 model，需自行去 https://ai.dev/rate-limit 確認目前可用額度。

### 切到 OpenAI

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## 建議實驗

1. 用 `mock` 問「LangChain 是什麼？」看 `sources` 欄位
2. 新增筆記後再問一次，觀察 `sources` 是否改變
3. 切換 provider 比較回答差異
