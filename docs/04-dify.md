# Dify 教學（Phase 3）

## 前置：用 Docker 跑 Dify

你已具備 Docker Desktop，建議用官方 docker 目錄：

```powershell
git clone https://github.com/langgenius/dify.git C:\Users\ytwei\Projects\dify
cd C:\Users\ytwei\Projects\dify\docker
copy .env.example .env
docker compose up -d
```

瀏覽器開啟 `http://localhost/install` 完成初始化。

## 在 Dify 建立 Chat App

1. 建立「聊天助手」應用
2. 設定簡單 system prompt（例如：你是教學助教）
3. 發布後到 **API Access** 複製 API Key

## 接到本專案

`.env` 範例：

```env
DIFY_API_BASE=http://localhost/v1
DIFY_API_KEY=app-xxxxxxxx
```

重啟 API 後，Swagger 呼叫：

- `POST /dify/ask`
- body: `{"question": "REST 的 GET 是做什麼？"}`

或開啟學習台 **Step 4** 直接操作。

一鍵安裝腳本：`.\scripts\setup-dify.ps1`  
詳細步驟見 `deploy/dify-setup.md`。

## 與 LangChain 路線對照

| 項目 | LangChain（本專案 `/ask`） | Dify（`/dify/ask`） |
|------|---------------------------|---------------------|
| 編排 | Python 程式碼 | 視覺化 workflow |
| 知識庫 | Chroma + 自建 | Dify Knowledge |
| 適合 | 深度客製、版本控管 | 快速原型、非工程師協作 |

## 常見問題

- **502 Dify request failed**：確認 Dify containers 都在跑、`DIFY_API_BASE` 正確
- **401**：API Key 錯誤或 app 未發布
- **本機 OK、上線失敗**：雲端 API 無法連到你電腦的 `localhost`，需改連已部署的 Dify 網域

詳細安裝說明見 `deploy/dify-compose.note.md`。
