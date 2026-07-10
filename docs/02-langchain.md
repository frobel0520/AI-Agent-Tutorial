# LangChain 教學（Phase 1）

## 這個專案怎麼用 LangChain

流程：

1. 筆記寫入 SQLite
2. `RagService.sync_note()` 把內容切成 Document 存入 Chroma
3. `POST /ask` 用 Retriever 找 top-k 片段
4. Prompt + Chat Model 產生答案

對應程式：

- `src/app/services/langchain_rag.py`
- `src/app/services/llm_factory.py`

## LLM 模式

| LLM_PROVIDER | 需要 API Key | 用途 |
|--------------|-------------|------|
| `mock` | 否 | 先學 REST + RAG 流程 |
| `ollama` | 否（本機 Docker） | 真實模型、無雲端費用 |
| `groq` | 是（[免費](https://console.groq.com/keys)） | Render 零預算真實 LLM（推薦，額度穩定） |
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

### 切到 Groq（Render 推薦）

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
