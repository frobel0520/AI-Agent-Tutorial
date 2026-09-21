# System Design / ADR — AI-Agent-Tutorial

| 項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件狀態 | SD baseline |
| 更新日期 | 2026-09-09 |
| 對應文件 | docs/01-project-plan.md、docs/02-system-analysis.md |

## 1. 目標架構

~~~mermaid
flowchart LR
  Browser[React/Vite on GitHub Pages] --> Auth[Supabase Auth]
  Browser --> Edge[Supabase Edge Function]
  Auth --> Edge
  Edge --> DB[(Supabase Postgres + RLS)]
  Edge --> LLM[LLM provider]
  Edge --> Dify[Dify API]
  Local[Local FastAPI] --> SQLite[(SQLite)]
  Local --> Ollama[Optional Ollama]
~~~

### 邊界規則

1. Browser 只持有公開的 Supabase URL 與 anon key；不持有 service-role、Dify 或 LLM secret。
2. Edge Function 是正式 API 的授權、輸入驗證、下游 timeout 與錯誤轉換邊界。
3. Postgres RLS 不取代 Edge policy；兩者同時存在，避免未預期的 client access。
4. Local FastAPI 是教學與除錯路線，不能被正式 Pages workflow 當成 runtime dependency。

## 2. 元件責任

| 元件 | 責任 | 不負責 |
|---|---|---|
| frontend | route view、session UI、錯誤／載入狀態、API client | 保存 server secret、決定授權 |
| Supabase Auth | Google OAuth、session、JWT | Dify allowlist 的產品政策 |
| Edge api | auth、policy、schema validation、下游呼叫 | 在瀏覽器執行 UI |
| Postgres | durable data、RLS、audit/event records | 呼叫外部 webhook |
| Dify | workflow／knowledge／LLM orchestration | 判斷本專案哪個 user 被授權 |
| FastAPI | local teaching endpoints、legacy page fallback | 正式雲端託管 |
| GitHub Actions | build、deploy、release evidence | 保存 runtime secrets |

## 3. API 與錯誤設計

- 成功回應必須有穩定的 JSON shape；UI 不應依賴未文件化的欄位。
- 401 表示沒有有效 session；403 表示身份存在但沒有該能力。
- 4xx 表示輸入／政策拒絕；502／504 表示下游 provider 失敗或 timeout。
- 不把 Authorization、Dify key、webhook secret、完整 target secret 寫入 log。
- 每個外部 request 都要有 bounded timeout；webhook dispatch 不應無限等待。
- 後續 webhook hardening 需要 URL allowlist／IP policy、redirect policy、timestamp、nonce 與 idempotency key。

## 4. 資料與 secret 設計

| 類別 | 目前設計 | 目標 guardrail |
|---|---|---|
| notes | Supabase table + RLS | owner policy、欄位長度上限、必要索引 |
| dify_access | 授權 table | admin-only mutation、撤銷可追蹤 |
| webhook subscriptions | target、secret；目前無 owner 欄位 | 本次採共用操作員權限及可信目的地；secret 加密保存另案處理 |
| event logs | 接收／送出紀錄 | payload 大小上限、retention、去重 |
| runtime secrets | Supabase Function Secrets | CI／local 使用 env，禁止進 repo |

## 5. ADR

### ADR-001：正式前端使用 GitHub Pages + Supabase

- 狀態：accepted
- 決策：React/Vite 發布到 GitHub Pages，API 與資料使用 Supabase。
- 原因：符合零預算與靜態 hosting 約束，前後端邊界清楚。
- 代價：Edge runtime 有 timeout／quota；長駐 worker 與 background queue 不在這個 baseline。

### ADR-002：不使用 Render

- 狀態：accepted
- 決策：正式部署與文件不把 Render 當必要依賴。
- 原因：使用者明確要求移除 Render，且本方案可由 Pages + Supabase 完成。
- 代價：本機 FastAPI 與正式 Edge API 是兩條教學路線，需要保持契約一致。

### ADR-003：保留 React/Vite，不以原生 HTML 繼續擴張

- 狀態：accepted
- 決策：frontend/ 是正式 UI；static/ 僅保留本機 legacy fallback。
- 原因：元件、session、主題與錯誤狀態需要可維護的 UI 邊界。
- 代價：每次 release 必須驗證 React build 與 runtime，而不是只看 Python test。

### ADR-004：Dify 必須經 Supabase Auth + dify_access

- 狀態：accepted
- 決策：瀏覽器不直接打 Dify；Edge 先驗證 JWT，再查 allowlist，最後使用 server-side key 呼叫 Dify。
- 原因：避免訪客消耗 Dify 額度與暴露 API key。
- 代價：OAuth、授權 table 與 Edge secrets 都是部署前置條件。

### ADR-005：Webhook outbound 先視為高風險功能

- 狀態：accepted with follow-up
- 決策：在完成 SSRF、owner、replay、rate-limit、retry policy 前，不宣稱 webhook 是 production-safe。
- 原因：使用者可控制 target URL，而 Edge 會發出 outbound request。
- 代價：M2 前功能可作為教學示範，但 release gate 必須標示限制。

## 6. Task DAG

| Task | 內容 | depends_on | evidence path | 狀態 |
|---|---|---|---|---|
| SDLC-001 | 專案計畫、SA、SD/ADR、release gate | M0 baseline | docs/01~04 | 本分支 |
| SEC-001 | Auth matrix、CORS、輸入長度、quota | SDLC-001 | tests/security、PR evidence | 待辦 |
| SEC-002 | Webhook SSRF、owner、replay、idempotency | SEC-001 | webhook tests、smoke | 待辦 |
| QA-001 | React Error Boundary、runtime smoke、browser acceptance | SDLC-001 | frontend QA evidence | 待辦 |
| CI-001 | Python + frontend build + secret/config checks | SDLC-001 | GitHub Actions run | 待辦 |
| REL-001 | release note、production smoke、rollback drill | SEC-002、QA-001、CI-001 | release record | 待辦 |

每個待辦 task 開始前都要補齊 task contract；task 完成後才可由 dev 合併到 main。

## 7. SD Exit Criteria

- 元件責任與信任邊界已定義。
- ADR 已記錄 Pages、Supabase、React、Dify、Webhook 與 no-Render 決策。
- Task DAG 可直接拆成 feature branches。
- API、secret、error、timeout 與部署邊界未依賴前端自律。
- 未完成的安全工作已明確標示，不以「目前能跑」代替 production readiness。

## 8. SEC-QA：安全與前端可靠性增量（2026-09-09）

本次依使用者授權實作以下三個獨立驗收邊界；Luna 負責 coding，主代理負責契約、整合與驗證。以下是本次變更契約，不代表正式環境已部署。

| Task ID | Goal／Output artifact | Input contract／Fixture | Acceptance checks | depends_on |
|---|---|---|---|---|
| SEC-QA-01 | Edge Webhook 權限與目的地限制 | Supabase JWT、dify_access、可信 HTTPS URL allowlist、偽造 fetch／DB | 未登入 401、未授權 403；註冊及舊訂閱 dispatch 均驗證 URL；拒絕 redirect 與未允許目的地 | SDLC-001 |
| SEC-QA-02 | Dify 身分與共享 API 限流 | 經驗證的 auth UUID、原子 Postgres rate-limit RPC、假時鐘／RPC | Dify 不採信 body.user；超額 429 + Retry-After；限流儲存失敗 503；跨 instance 使用共同計數 | SDLC-001 |
| SEC-QA-03 | React Error Boundary 與瀏覽器 smoke | 真實 production build、模擬 API／Auth、測試專用拋錯元件 | 頁面可渲染；API 失敗仍有 UI；render 例外有 fallback；401/403/429 明確呈現 | SDLC-001 |

證據位置：supabase/functions/api/ 測試、frontend/ smoke 測試與 CI 執行紀錄；實際指令與結果記錄於 release gate。

### ADR-006：Webhook 管理限授權帳號與明確可信目的地

- 筆記與一般 RAG 維持共用教學沙盒，不在此增量改為個人資料空間。
- Webhook 管理及事件紀錄使用現有 dify_access allowlist 作為教學操作員權限；登入本身不代表有管理權。
- Webhook 目的地由管理者設定精確 HTTPS URL allowlist，空值禁止 outbound；每次送出重新檢查，禁止 redirect。清單只能放管理者信任且不會解析到內網的 endpoint。
- 這是共用操作員模型，不是各使用者分別擁有訂閱；若需多租戶隔離，再獨立設計 ownership migration。

### ADR-007：共享限流與不可偽造的 Dify 身分

- Dify user 取自驗證成功的 Supabase UUID，不採用瀏覽器提供的 user。
- 公開 API 以 Postgres 原子計數實作跨 instance 的全域路由額度，避免單一 instance 記憶體計數或可偽造 IP header 被繞過；Dify 可額外限制每帳號用量。
- 超額回 429 並提供等待秒數；限流資料庫不可用時 fail closed。全域額度意味某位訪客可能耗盡共享窗口，但能限制整體服務消耗。
- 不新增付費服務；仍消耗既有 Supabase 額度。migration 必須先於新 Edge Function 上線。

### Out of scope

本次不包含 webhook replay／outbox 重試、多租戶筆記隔離、FastAPI 本機安全改造、全面 CORS 重設及正式部署。前端 smoke 使用測試資料，不消耗真實 Dify 額度。Error Boundary 不保證攔截 JS bundle 下載或模組載入前的錯誤。
