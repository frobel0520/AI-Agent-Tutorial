# Dify 本機自架（Phase 3）

Dify 是**視覺化 LLM 應用平台**，與本專案 LangChain `/ask` 路線對照教學。  
Dify 跑在**獨立 Docker stack**（不併入主 repo 的 `docker-compose.yml`），避免與 Ollama / API 服務衝突。

---

## 前置

- Docker Desktop 已啟動（與 Ollama 相同）
- 本機約需 **4GB+ 可用 RAM**（Dify 含 Postgres、Redis、Weaviate 等）
- 首次 pull 映像需數分鐘

---

## 一鍵安裝（Windows）

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
.\scripts\setup-dify.ps1
```

腳本會：

1. Clone `https://github.com/langgenius/dify.git` 到 `C:\Users\ytwei\Projects\dify`
2. 複製 `docker/.env.example` → `docker/.env`
3. 執行 `docker compose up -d`

---

## 手動安裝

```powershell
git clone https://github.com/langgenius/dify.git C:\Users\ytwei\Projects\dify
cd C:\Users\ytwei\Projects\dify\docker
copy .env.example .env
docker compose up -d
```

---

## Dify 後台初始化

1. 瀏覽器開啟 **http://localhost/install**
2. 建立管理員帳號
3. 登入後 → **建立應用** → 選 **Chatbot**（聊天助手）
4. 設定簡單 system prompt，例如：`你是 AI-Agent-Tutorial 的教學助教，用繁體中文簡短回答。`
5. **發布** 應用
6. 左側 **API 存取** → **API Key** → **Create new Secret key** → 複製（格式 `app-...`）

### 設定 Ollama 模型（本機已有 Ollama 時）

Dify 跑在 Docker 內，連本機 Ollama 請用 **`http://host.docker.internal:11434`**（Windows Docker Desktop）。

1. **Plugins** → **Explore Marketplace** → 搜尋 `Ollama` → 安裝 **langgenius/ollama**
2. **Settings（齒輪）** → **Model Provider** → **Ollama** → **Add model**，欄位如下：

| 欄位 | 正確值 | 常見錯誤 |
|------|--------|----------|
| Model Name | `llama3.2` | ~~Ollama~~（這是 provider 名稱，不是模型名） |
| Base URL | `http://host.docker.internal:11434` | `localhost`（Docker 內無法連 host） |
| Model Type | LLM | — |
| Completion mode | Chat | — |

可用模型請在本機查：`curl http://localhost:11434/api/tags`（本專案預設已 pull `llama3.2`）。

3. 回到 **Chat App 編輯頁** 選模型並發布（見下方「找不到 Orchestrate？」）

> Dify 預設走 nginx 反向代理，API base 為 `http://localhost/v1`（不是 8000 port）。

### 找不到 Orchestrate？

**Orchestrate（編排）** 在「某個 Chat App 裡面」，不在 Settings / Model Provider 頁。

路徑：

1. 頂部選 **Studio**（工作室）
2. 點卡片 **AI-Agent-Tutorial**（不要點 Plugins 或 Settings）
3. 進入 app 後，**左側選單**第一項就是 **Orchestrate**（中文介面可能顯示「编排」）

或直接開：

```
http://localhost/app/0f07a718-1717-44b0-a8b1-dfd42a828a8a/configuration
```

在 app 編輯頁要做的事：

1. **右上角**模型下拉（目前可能顯示 `gpt-4o Incompatible`）→ 改選 **llama3.2**
2. 左側 **INSTRUCTIONS** 可填：`你是 AI-Agent-Tutorial 教學助教，用繁體中文簡短回答。`
3. 右上角 **Publish**（發布）

---

## 接到本專案

編輯 `AI-Agent-Tutorial/.env`：

```env
DIFY_API_BASE=http://localhost/v1
DIFY_API_KEY=app-xxxxxxxx
```

重啟 API：

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
.\.venv\Scripts\Activate.ps1
python src\run.py
```

---

## 驗收

### 1. Health

```powershell
curl http://localhost:8000/health
```

預期：`dify_configured: true`（已設定 `DIFY_API_KEY` 時）

### 2. Swagger

http://localhost:8000/docs → `POST /dify/ask`

```json
{"question": "REST 的 GET 是做什麼？"}
```

### 3. 學習台

http://localhost:8000/learn → **Step 4 · Dify 問答**

### 4. 與 LangChain 對照

| | `/ask` (LangChain) | `/dify/ask` (Dify) |
|---|-------------------|-------------------|
| 編排 | Python 程式碼 | Dify 後台 workflow |
| 知識庫 | Chroma + 本專案筆記 | Dify Knowledge（需另建） |
| 回傳 | `answer` + `sources` | `answer` + `raw` |
| 適合 | 深度客製、版控 | 快速原型、非工程協作 |

---

## 常見問題

| 症狀 | 解法 |
|------|------|
| `http://localhost/install` 打不開 | `docker compose ps` 確認容器都在跑；等 1～2 分鐘再試 |
| `400 DIFY_API_KEY must be configured` | 在 `.env` 填入 API Key 並重啟 `python src\run.py` |
| `502 Dify request failed` | 確認 Dify 容器正常、`DIFY_API_BASE=http://localhost/v1` |
| `401 Unauthorized` | API Key 錯誤，或 app 未發布 |
| `model 'Ollama' not found`（404） | **Model Name** 填成 provider 名稱了；應填 `llama3.2` 等已 pull 的模型名 |
| Render 雲端 `/dify/ask` 失敗 | 雲端無法連你電腦的 `localhost`；需另架可公網存取的 Dify |
| 與 Ollama 衝突？ | 不衝突；Ollama 用 11434，Dify 用 80/443（nginx） |

---

## 停止 / 重啟 Dify

```powershell
cd C:\Users\ytwei\Projects\dify\docker
docker compose down      # 停止
docker compose up -d     # 重啟
```

---

## 相關文件

- 教學：`docs/04-dify.md`
- 進度：`deploy/PROGRESS.md`
