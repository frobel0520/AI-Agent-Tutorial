# WebHook 教學（Phase 2）

## 概念

當 App 內發生事件（建立筆記、完成問答），伺服器會 `POST` JSON 到你註冊的 URL。

## API

| Method | Path | 說明 |
|--------|------|------|
| POST | `/webhooks` | 註冊 callback URL |
| GET | `/webhooks` | 列出訂閱 |
| DELETE | `/webhooks/{id}` | 移除 |
| GET | `/events` | 查看事件紀錄 |

## 事件類型

- `note.created`
- `note.updated`
- `note.deleted`
- `ask.completed`
- `dify.ask.completed`

`event_types` 可設 `*` 或逗號分隔，例如 `note.created,ask.completed`。

## 本機測試（推薦 webhook.site）

1. 打開 https://webhook.site 複製你的 unique URL
2. 註冊：

```powershell
curl -X POST http://localhost:8000/webhooks -H "Content-Type: application/json" -d "{\"url\":\"https://webhook.site/你的-id\",\"event_types\":\"*\"}"
```

3. 建立一筆筆記或呼叫 `/ask`
4. 在 webhook.site 看收到的 payload

## 簽章

若設定 `WEBHOOK_SECRET`，回應 header 會帶：

`X-Webhook-Signature: <hmac-sha256-hex>`

驗證方式：對 raw JSON body 用同一 secret 做 HMAC-SHA256。

## ngrok（進階）

若要把本機 API 暴露給外部 WebHook 來源測試：

```powershell
ngrok http 8000
```
