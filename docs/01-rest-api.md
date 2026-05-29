# RESTful API 教學（Phase 1）

## 你會練到的 endpoint

| Method | Path | 說明 |
|--------|------|------|
| GET | `/health` | 健康檢查 |
| GET | `/notes` | 列出筆記 |
| POST | `/notes` | 建立筆記 |
| GET | `/notes/{id}` | 讀取單筆 |
| PUT | `/notes/{id}` | 更新 |
| DELETE | `/notes/{id}` | 刪除 |
| POST | `/ask` | LangChain RAG 問答 |

## 建議練習順序

1. 開啟 `http://localhost:8000/docs`
2. 先打 `GET /health`
3. `POST /notes` 建立一筆
4. `GET /notes` 確認列表
5. `POST /ask` 用問題查筆記

## curl 範例

```powershell
curl http://localhost:8000/health
curl -X POST http://localhost:8000/notes -H "Content-Type: application/json" -d "{\"title\":\"Webhook\",\"content\":\"事件發生時 POST 到 URL\"}"
curl -X POST http://localhost:8000/ask -H "Content-Type: application/json" -d "{\"question\":\"WebHook 是什麼？\"}"
```

## REST 重點

- 資源是 `notes`，用 URI 表示
- HTTP 動詞對應 CRUD
- 狀態碼：`201 Created`、`404 Not Found`、`204 No Content`
