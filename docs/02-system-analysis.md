# System Analysis — AI-Agent-Tutorial

| 項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件狀態 | SA baseline |
| 更新日期 | 2026-09-09 |
| 對應計畫 | docs/01-project-plan.md |

## 1. 系統邊界

~~~text
學習者瀏覽器
  ├─ GitHub Pages React/Vite
  │    ├─ Supabase Auth（Google）
  │    └─ Supabase Edge Function API
  │          ├─ Postgres + RLS
  │          ├─ LLM provider
  │          └─ Dify API（只有授權帳號）
  └─ 本機 FastAPI（教學／除錯路線，不是正式託管）
~~~

瀏覽器是不可信的 client。任何「只有登入者可以」或「只有被授權者可以」的規則，都必須在 Supabase Edge Function 或資料庫 RLS 再判斷一次。

## 2. Actors

| Actor | 目標 | 信任等級 |
|---|---|---|
| 訪客 | 閱讀教學、查看公開狀態 | 不可信 |
| Google 使用者 | 建立筆記、使用受保護的學習功能 | 已驗證但仍不可信 |
| Dify 授權使用者 | 呼叫 Dify workflow | 已驗證且通過 allowlist |
| WebHook sender | 向接收端送出簽章事件 | 以 secret／簽章驗證 |
| Maintainer | 管理 secrets、授權帳號、發布版本 | 受控管理者 |
| GitHub Actions | 建置與部署 | CI workload identity／repository secrets |

## 3. 主要用例與驗收

| Use case | 前置條件 | 主要流程 | 失敗驗收 |
|---|---|---|---|
| UC-01 開啟學習台 | Pages 可用 | 載入 React，取得 API health | API 失敗時不得白屏，顯示目前狀態 |
| UC-02 Google 登入 | Supabase Auth provider 已設定 | 登入、回到 callback、保存 session | 取消登入可返回教學台，不洩漏 token |
| UC-03 建立筆記 | 共用教學沙盒額度可用 | POST notes、回傳 note id、刷新列表 | 欄位超限 4xx、額度超限 429 |
| UC-04 RAG 問答 | 有可檢索的筆記 | POST ask、回傳 answer 與 sources | LLM timeout／額度耗盡顯示可理解錯誤 |
| UC-05 WebHook | 有安全且允許的 target | 建立訂閱、送事件、驗證簽章、寫 event log | 無效簽章、逾時、重播可被拒絕或去重 |
| UC-06 Dify 問答 | Google session + dify_access | Edge 驗證 JWT、查 allowlist、伺服器端呼叫 Dify | 401／403 與 Dify 502 分開呈現 |
| UC-07 發布 | PR 通過 gate | merge main、Pages／Edge workflows 部署 | 必要設定缺失時 workflow fail fast |

## 4. 介面與資料契約

| 介面 | Client | 認證基線 | 輸出重點 |
|---|---|---|---|
| GET /health | Pages／維運 | 公開狀態可接受 | API、provider、Dify 設定狀態 |
| GET/POST/PUT/DELETE /notes | Pages | 共用公開教學沙盒，Edge 共享限流 | 筆記資料與 note id |
| POST /ask | Pages | 公開但有共享額度 | answer、sources、錯誤碼 |
| GET/POST/DELETE /webhooks | Pages | Supabase JWT + dify_access 操作員 | subscription id；不回傳 secret |
| GET /events | Pages | Supabase JWT + dify_access 操作員 | 共用教學事件紀錄 |
| POST /hooks/incoming | sender／Edge | HMAC；timestamp／nonce 防重播仍待實作 | accepted event、拒絕原因 |
| POST /dify/ask | Pages | Supabase JWT + dify_access | Dify answer、provider error |

所有 request body 都需要長度、格式與數量上限。錯誤回應應保持一致，至少包含可供 UI 顯示的 code 與不含 secret 的 message。

## 5. 身分與授權矩陣

| 能力 | 訪客 | 已登入 | Dify allowlist | Maintainer |
|---|---:|---:|---:|---:|
| 看公開教學與 health | ✓ | ✓ | ✓ | ✓ |
| 讀取／寫入共用教學筆記 | 依 quota | 依 quota | 依 quota | 依 quota |
| 呼叫一般 RAG | 依 quota | 依 quota | 依 quota | 依 quota |
| 管理 webhook subscription／查看事件 | ✗ | ✗ | ✓ | 需列入 allowlist |
| 呼叫 Dify | ✗ | ✗ | ✓ | ✓ |
| 授權 Dify 帳號 | ✗ | ✗ | ✗ | ✓ |
| 讀取 secrets | ✗ | ✗ | ✗ | 僅 Supabase／CI secret store |

此矩陣描述 SEC-QA 增量的目標行為，只有部署並驗收後才能宣稱線上已生效。一般筆記與 RAG 刻意保留公開沙盒政策，不具使用者資料隔離；勿放私人資料。所有操作員共用訂閱與事件紀錄。

## 6. 資料與所有權

| 資料 | 儲存處 | owner／保護規則 |
|---|---|---|
| auth user | Supabase Auth | Supabase 管理 |
| notes | Postgres notes | 共用教學資料；RLS 阻止瀏覽器直連，Edge service role 依路由政策存取 |
| dify_access | Postgres dify_access | 只有管理流程可新增／撤銷 |
| webhook_subscriptions | Postgres | allowlist 操作員共用管理；target 需通過可信 URL policy |
| event_logs | Postgres | 僅 allowlist 操作員查閱 |
| Dify／LLM key | Supabase Function Secrets | 永不回傳前端或寫入 log |

## 7. 邊界、威脅與非功能案例

| 情境 | 期待行為 |
|---|---|
| 沒有 Authorization header | 受保護路由回 401，不進入下游服務 |
| JWT 有效但沒有 dify_access | Dify 回 403，不消耗 Dify 額度 |
| 使用者提供內網 webhook URL | 建立請求回 4xx，不發出 outbound request |
| webhook 重送相同 event | 以 idempotency／nonce policy 去重或明確拒絕 |
| Dify／LLM timeout | bounded timeout、可辨識的 502／504，不卡住 request |
| 超長 note 或 question | 4xx，不把未限制輸入送到 LLM |
| CORS 來自未知 origin | 不授權 credentialed request |
| 前端 JS runtime exception | Error Boundary／fallback 顯示診斷，不呈現全白頁 |

## 8. SA Exit Criteria

- Actors、trust boundary、route contract、auth matrix 已被 SD 引用。
- 每個高風險流程至少有一個拒絕案例。
- 未決定的公開／登入策略被列入 task，而不是默認為安全。
- 資料 owner、RLS、secret boundary 已有明確責任位置。
- 能從本文件產出 feature task contract 與可重跑的 acceptance checks。
