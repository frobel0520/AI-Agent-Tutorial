# Ollama 本機真實 LLM 設定

Ollama 在**你的電腦**跑免費開源模型，**不用 API Key**。  
Render 雲端版無法連到你電腦的 Ollama；雲端請維持 `mock` 或改用 `openai`。

---

## 方案 A（推薦）：Docker 只跑 Ollama + 本機 Python API

適合：已用 Supabase、想在本機測真實 LLM。

### 1. 啟動 Docker Desktop

確認右下角 Docker 圖示為 Running。

### 2. 只啟動 Ollama 容器

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
docker compose up -d ollama
```

### 3. 下載模型（首次約 2GB，需幾分鐘）

```powershell
docker compose exec ollama ollama pull llama3.2
```

可改用較小模型：`ollama pull llama3.2:1b`

### 4. 設定 `.env`

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# 若要用 Supabase 持久化（可選）
# DATABASE_URL=postgresql://...
```

### 5. 啟動 API

```powershell
.\.venv\Scripts\Activate.ps1
python src\run.py
```

### 6. 驗收

- http://localhost:8000/health  
  - `llm_provider: ollama`  
  - `llm_ready: true`  
- http://localhost:8000/learn → Step 2 提問  
  - `answer` **不應**再出現 `[Mock LLM]`  
  - 回答應為自然語句  

---

## 方案 B：Docker Compose 一次跑 API + Ollama

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
copy .env.example .env
# 編輯 .env：DATABASE_URL 可填 Supabase URI

docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

API：`http://localhost:8000/learn`

> Compose 內 API 會用 `OLLAMA_BASE_URL=http://ollama:11434`（已在 docker-compose.yml 設定）。

---

## 常見問題

| 症狀 | 解法 |
|------|------|
| `llm_ready: false` | 確認 `docker compose ps` 中 ollama 在跑；執行 `ollama pull` |
| Docker 連線失敗 | 開啟 Docker Desktop |
| 第一次 `/ask` 很慢 | 模型載入中，等 30～60 秒再試 |
| Render 想用 Ollama | 不行連本機；請用 OpenAI 或另架 Ollama 伺服器 |
| 記憶體不足 | 改用小模型 `llama3.2:1b` |

---

## 一鍵腳本（Windows）

```powershell
.\scripts\setup-ollama.ps1
```

會檢查 Docker、啟動 Ollama、pull 模型，並提示 `.env` 設定。

---

## mock vs ollama 對照

| | mock | ollama |
|---|------|--------|
| 費用 | 免費 | 免費（本機算力） |
| 回答 | 固定模板 | 真模型生成 |
| sources | 有 | 有 |
| 適用 | 雲端 demo | 本機深度學習 |
