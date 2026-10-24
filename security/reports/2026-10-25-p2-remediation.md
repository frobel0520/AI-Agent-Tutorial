# SEC-P2-20261025：AI-Agent-Tutorial

日期：2026-10-25。基準：4e48de1da3ae00be475e8fc18ccf006b797be8a8（dev）。

狀態：前端已修補；後端不用、退役另議。未推送／合併／部署；原始工作目錄保留。

Vite 7.3.7、Playwright 1.64.1、Supabase 2.50.0（auth-js 2.70.0）；公開 npm 公告歸零。Python 132 個解析版本加約束，Chroma 另列未解決。

- Python mock／SQLite／嵌入 Chroma 7 tests
- 既有瀏覽器互動與錯誤處理 5 tests
- Chroma 管理路由 GET／POST／PATCH 均404，僅證明此 API 未暴露該路由

npm公告：{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}。
Python公告：4個獨立命中／132個解析版本。

Chroma1.5.9有4個獨立公告（2critical／2high），官方目前無修補版。嵌入模式且受測FastAPI管理路由404，不能外推所有啟動方式安全。使用者已表示此後端不用、退役另議；不再進行儲存架構遷移，未封存或刪除，也不將4個公告標為已修復。

效能：{"beforeGzipBytes":89026,"afterGzipBytes":92037,"growth":0.033821580212522184,"thresholdGrowth":0.05,"result":"pass","scope":"Local gzip bundle size, not production latency"}。

範圍與成本：只跑本機及合成fixture，不啟用付費API或遠端CI。沒有完整正式安全或發布驗收；未評項目not_scored。

- 原始工作目錄、未提交修改與分支全部保留；本報告僅適用此隔離分支。
- 完整history／秘密輪替／正式服務與二進位鑑識不在此輪驗收，未評項目not_scored。

Task契約：輸入為固定基準及既有測試；交付為獨立修補分支、manifest/lockfile或來源修補與此去敏證據；無跨專案依賴。驗收是原生工具成功、已知發現逐項處置、適當真實回歸及影響範圍效能門檻；未完成項目明記，不以fixture代表正式環境。
