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
| POST | `/hooks/incoming` | 本專案自有 WebHook 接收端點 |

## 事件類型

- `note.created`
- `note.updated`
- `note.deleted`
- `ask.completed`
- `dify.ask.completed`

`event_types` 可設 `*` 或逗號分隔，例如 `note.created,ask.completed`。

## 雲端測試（不需要 webhook.site）

本專案的 Supabase Edge Function 可以同時當作事件發送端與接收端：

```text
https://<project-ref>.supabase.co/functions/v1/api/hooks/incoming
```

前置條件：在 Supabase Edge Function Secrets 設定 `WEBHOOK_SECRET`。系統會用同一個 secret 產生 `X-Webhook-Signature`，接收端驗證成功後才把 payload 寫入 `event_logs`。

1. 在學習台 Step 3 按「使用本專案 endpoint」
2. 按「註冊 WebHook」
3. 建立一筆筆記或呼叫 `/ask`
4. 按「查看事件紀錄」，確認同時出現原始事件與 `webhook.received`

也可以用 API 註冊：

```powershell
curl -X POST https://<project-ref>.supabase.co/functions/v1/api/webhooks `
  -H "Content-Type: application/json" `
  -d "{\"url\":\"https://<project-ref>.supabase.co/functions/v1/api/hooks/incoming\",\"event_types\":\"note.created,ask.completed\"}"
```

若要接第三方服務，仍可把 `/webhooks` 的 `url` 換成對方提供的 callback URL；`webhook.site` 只適合短期除錯。

## 簽章

若設定 `WEBHOOK_SECRET`，發送事件時會帶：

`X-Webhook-Signature: <hmac-sha256-hex>`

驗證方式：對 raw JSON body 用同一 secret 做 HMAC-SHA256。

## ngrok（進階）

若要把本機 API 暴露給外部 WebHook 來源測試：

```powershell
ngrok http 8000
```
