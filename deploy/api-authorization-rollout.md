# API 授權修復：部署與驗收

這次變更把正式 Edge API 改為每帳號隔離，不改本機 FastAPI 教學服務。

## 行為

- `GET /health`、`GET /dify/access` 和 CORS preflight 可不登入。
- 筆記 CRUD、RAG、事件與 webhook 管理驗證 Supabase Auth access token；anon/publishable project key 不能代替使用者登入。
- 讀取、修改、刪除與事件投遞都依伺服器驗證的 user_id；跨帳號 ID 回 404。
- `/dify/ask` 與非 mock `/ask` 沿用 `dify_access.enabled=true` 名單。Dify user 固定使用已驗證的 UUID。
- `/ask` 和 `/dify/ask` 共用每帳號每 UTC 小時 30 次配額，包含 mock；失敗嘗試也計數。配額由 PostgreSQL 原子更新，查詢失敗時不呼叫模型。
- webhook URL 必須精確符合管理者設定的完整 HTTPS URL；拒絕 credentials、fragment、非 443 port，且投遞不跟隨 HTTP redirect。此清單只能放管理者信任、解析到公開網路的目的地，不能加入內部服務或使用者可控制的 DNS。
- `POST /hooks/incoming` 使用既有 WEBHOOK_SECRET HMAC；JSON body 必須包含被簽章覆蓋的 user_id。前端不能取得此 secret。

## 部署順序

1. 備份資料庫。在維護時段套用既有 migrations，再執行 `supabase/migrations/20260912000000_scope_api_data_to_users.sql`。新 ownership constraints 保護新寫入；舊版本 API 的無 owner 寫入會暫時失敗，因此接著立即更新 Function。
2. 設定 Function Secret `WEBHOOK_ALLOWED_URLS`：以逗號分隔完整 HTTPS URL，例如自己 Function 的 `/hooks/incoming` 與個別 webhook.site 接收 URL。留空會停用 webhook 註冊與外送，筆記／問答仍可使用。不支援 wildcard。
3. 部署新 Function，接著發布前端。GitHub 的 Function 部署 workflow 會先檢查資料隔離 migration，缺少時拒絕發布。
4. 確認 Google 登入與既有 dify_access 名單。登入後新帳號看到空筆記列表是正常的。
5. 原有 rows 的 user_id 仍為 NULL，API 不會顯示、修改或投遞它們。由管理者核對歸屬後，在 SQL Editor 逐筆指定正確 UUID；不要將所有歷史資料給第一個登入者。webhook_deliveries 的 owner 必須與 event_logs、webhook_subscriptions 相同，更新時先處理父資料。不能確認歸屬就維持隔離保存。
6. 如果保留自有 webhook 接收器，外部簽署端必須把 user_id 放入 JSON 後再以 WEBHOOK_SECRET 計算 HMAC；本 API 外送會自動包含 owner。

不應回退至沒有授權的舊 Function。回復服務時保留驗證邊界；不要移除 ownership constraints 來恢復匿名寫入。

## 驗收

- 未登入、過期 token、project anon key：notes CRUD、webhooks、events、ask 回 401。
- A、B 帳號各建一筆筆記：列表與 RAG sources 各自可見；互相 GET/PUT/DELETE 回 404。
- 登出／換帳號：畫面清除筆記、結果、來源、輸入資料；舊請求回應不會重新顯示前帳號資料。
- B 訂閱不會收到 A 事件；非核准 URL 註冊失敗；已儲存但被移出清單的 URL 不再投遞。
- 未授權帳號不能呼叫付費模型；超過每小時額度回 429。
- incoming 缺簽章／改 user_id 後沿用舊簽章回 401；正確簽章記錄在指定 owner 下。

CI 執行真實 handler + 隔離資料庫介面的 API 測試，以及 PGlite PostgreSQL migration／配額測試。PGlite 不等同正式 Supabase/PostgREST，部署後仍需以上雙帳號驗收。
