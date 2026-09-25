# Project Plan — AI-Agent-Tutorial

| 項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件狀態 | SDLC baseline |
| 更新日期 | 2026-09-09 |
| 產品定位 | 給初學者的 LangChain、REST API、WebHook、Dify 實作教學 |
| 預算約束 | 以 USD 0 的託管方案為預設，付費服務只能是明確的選配 |
| 正式部署 | GitHub Pages + Supabase |

## 1. 目標與成功條件

本專案要讓沒有先備程式經驗的學習者，能沿著學習路徑完成：

1. 建立與測試 REST API。
2. 建立筆記並理解簡易 RAG 問答。
3. 建立 WebHook、觀察事件 payload，理解簽章與事件紀錄。
4. 使用 Google 登入後，讓被授權的帳號呼叫 Dify。
5. 在不使用 Render 的前提下，從 GitHub Pages 完成正式網站部署。

成功條件不是只有「頁面能開」，而是每個學習步驟都有可重現的輸入、輸出、驗收方式與失敗說明。

## 2. 範圍

### In scope

- React + Vite 學習台，部署到 GitHub Pages。
- Supabase Auth、Postgres、RLS 與 Edge Function API。
- 本機 FastAPI 路線，作為 REST／LangChain／Dify 的教學與除錯環境。
- Google SSO、Dify 存取授權與伺服器端密鑰邊界。
- WebHook 註冊、簽章、事件接收與事件紀錄。
- 可在免費額度內運作的 LLM／Dify 整合方式。
- 可由 CI 與 release gate 重複執行的驗收流程。

### Out of scope

- Render、長駐付費 VM 或自建高可用 Dify 叢集。
- 把 Dify API key、Supabase service-role key 或 LLM key 放進前端。
- 以本專案取代正式企業級 webhook broker、queue 或 SIEM。
- 在沒有需求與驗收條件前，先做大型前端重構或資料庫換代。

## 3. 現況基線

| 層 | 目前責任 | 主要位置 |
|---|---|---|
| 學習台 | React/Vite UI、Google 登入、教學步驟 | frontend/ |
| 正式 API | Supabase Edge Function，提供 health、notes、ask、webhooks、events、dify/ask | supabase/functions/api/ |
| 正式資料 | Supabase Postgres、RLS、Dify access table | supabase/ |
| 本機 API | FastAPI、SQLite、LangChain、本機 Dify/Ollama 教學路線 | src/、static/ |
| 部署 | GitHub Actions 發布 Pages 與 Supabase Edge Function | .github/workflows/ |

正式網站不依賴 Render。static/ 保留為本機 FastAPI 的舊版回退頁面與教學素材，不等於正式網站的第二套部署目標。

## 4. 需求基線

| ID | 需求 | 驗收結果 |
|---|---|---|
| FR-01 | 訪客可開啟學習台並看到目前學習步驟 | 頁面載入成功，API 狀態可辨識 |
| FR-02 | 使用者可建立、查詢共用教學筆記 | 明確標示共用沙盒、受共享額度限制；不宣稱個人資料隔離 |
| FR-03 | 使用者可送出問題並看到 RAG 回答與來源 | 失敗時顯示可理解的錯誤 |
| FR-04 | WebHook 事件可被送出、接收、驗證並留下紀錄 | 簽章錯誤與逾時可觀察 |
| FR-05 | Google 登入後，只有被授權帳號可以呼叫 Dify | 未登入為 401，未授權為 403 |
| FR-06 | push 到 main 可觸發正式部署 | Pages 與 Edge Function workflow 各自可驗證 |
| FR-07 | 文件與實際路由、環境變數、部署方式一致 | release gate 不允許明顯過時說明 |

## 5. 非功能需求

| 類別 | 基線要求 |
|---|---|
| 成本 | 預設不需要 Render；服務選擇需符合目前免費額度 |
| 安全 | 前端只拿公開 URL；敏感 key 只存在 Supabase secrets 或本機環境 |
| 身分 | 受保護功能使用 Supabase Auth；授權判斷在伺服器端完成 |
| 可用性 | API 失敗、Dify 未設定、tunnel 中斷都要有明確狀態 |
| 效能 | 教學資料量小時保持簡單；超過基線前不引入不必要的基礎設施 |
| 可測試性 | Python 測試、前端 build、部署設定檢查可在 CI 重跑 |
| 可維運性 | 每次 release 有 smoke、rollback 方式與已知限制 |

## 6. 里程碑

| Milestone | 內容 | 狀態 |
|---|---|---|
| M0 | GitHub Pages + Supabase baseline、React runtime、Dify access | 已完成，基準為 origin/main |
| M1 | 建立本文件、SA、SD/ADR、Task DAG、Release Gate | 本分支進行中 |
| M2 | 收斂 Auth、CORS、輸入限制與 webhook SSRF／replay 風險 | 待排程 |
| M3 | 補齊前端 runtime smoke、CI frontend gate 與 secrets 檢查 | 待排程 |
| M4 | 依驗收證據發布下一個可教學版本 | 待排程 |

## 7. 風險與處置

| 風險 | 影響 | 處置 |
|---|---|---|
| Edge API 的公開路由可能被濫用 | 資料、LLM 額度與 webhook 受影響 | M2 定義訪客／登入者／管理者權限矩陣並實作 |
| WebHook 目標 URL 可能形成 SSRF | 伺服器被利用存取內網 | 只允許安全目標，阻擋 private／link-local／metadata 位址並限制 redirect |
| Dify 使用免費方案或本機 tunnel | URL／額度不穩定 | UI 顯示狀態；文件記錄 tunnel 生命週期與替代路線 |
| React build 通過但瀏覽器白屏 | 使用者無法學習 | 加入 runtime smoke、錯誤邊界與部署後 smoke |
| 依賴未鎖定或 workflow 使用 latest | build 漂移 | 固定 Node／Supabase CLI／Python 依賴版本 |

## 8. Git 與交付規則

- production branch：main；只接受通過 gate 的變更。
- integration branch：dev；需要跨功能整合或 preview 時使用。
- task branch：feature/<task-id>-<slug>；修 bug 用 fix/<slug>，測試用 test/<slug>。
- 變更流程：feature → dev → main → GitHub Pages／Supabase deploy。
- 每個 task contract 必須有 Goal、Input contract、Output artifact、Out of scope、Acceptance checks、depends_on 與 evidence path。
- 不直接在 main 上開發；不使用 reset --hard 丟棄工作。
- secrets 不進 Git；本機與 CI 都以範例檔提供名稱，不提供真值。

## 9. Definition of Done

一個功能只有在下列條件都成立時才算完成：

- 需求、SA、SD 或 ADR 已更新，且與實作一致。
- 驗收案例至少涵蓋成功、未授權／錯誤與邊界情境。
- 相關 Python test、frontend build、必要的 browser smoke 與設定檢查通過。
- 沒有未處理的 critical／high 風險；若有明確 waiver，需記錄期限與 owner。
- release note、部署步驟、rollback 與已知限制已更新。
- PR 只包含單一可理解的 task，並保留可追溯的 evidence path。
