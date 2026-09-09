# MVP Release Gate — AI-Agent-Tutorial

| 項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件狀態 | release gate baseline |
| 更新日期 | 2026-09-09 |
| 適用分支 | dev → main |

## 1. 開發與 PR gate

- [ ] 分支符合 feature/<task-id>-<slug>、fix/<slug> 或 test/<slug>。
- [ ] PR 連到一個 task contract，包含 goal、scope、depends_on、acceptance 與 evidence。
- [ ] 變更沒有把 secrets、.env 真值、token 或完整 webhook secret 放入 Git。
- [ ] 相關 SA／SD／ADR 與 README 已同步。
- [ ] 沒有無關的大型重構或未解釋的 generated files。
- [ ] git diff --check 通過。

## 2. 自動化檢查

在 repo root 執行：

~~~powershell
.\.venv\Scripts\python.exe -m pytest -q
npm ci --prefix frontend
npm run build --prefix frontend
git diff --check
~~~

CI 至少要覆蓋 Python test 與 frontend build。當新增 Supabase／Deno 檢查或 browser smoke 後，必須把指令與版本固定到 workflow，而不是只在本機手動驗證。

## 3. Acceptance smoke

### 前端

- [ ] GitHub Pages 開啟不是白屏，favicon、標題、側欄與上方欄正常。
- [ ] 未登入時 Dify 入口顯示登入要求，不會直接呼叫 Dify。
- [ ] Google 登入 callback 成功，右上角可看到使用者狀態。
- [ ] 主題切換、登出與頁面重新整理後的狀態符合設計。
- [ ] API timeout／401／403／502 都有可理解的 UI fallback。

### Supabase／Dify

- [ ] /health 回應 provider 與 Dify 設定狀態，且不暴露 secret。
- [ ] 無 token 呼叫受保護路由得到 401。
- [ ] 有效 token 但不在 dify_access 得到 403。
- [ ] 授權帳號的 Dify request 成功或得到可診斷的下游錯誤。
- [ ] notes、events、webhooks 的 RLS／owner 行為符合 SA。

### WebHook

- [ ] 合法簽章可被接受。
- [ ] 錯誤簽章被拒絕。
- [ ] timeout、重送、重播、private target 與過大 payload 有明確 policy。
- [ ] event log 不含可重放的敏感 secret。

## 4. 部署 gate

- [ ] GitHub Actions 的 Pages workflow 綠燈。
- [ ] Supabase Edge Function workflow 綠燈。
- [ ] repository／environment secrets 已設定，名稱與 deploy 文件一致。
- [ ] Pages 使用的公開 API URL 指向目前 Supabase project。
- [ ] deploy 後完成至少一次 production smoke，記錄 URL、時間與 workflow run。

## 5. Rollback

1. 先停止繼續發布，保留失敗 workflow run 與錯誤訊息。
2. 若是前端回歸，將 main 回復到上一個已驗收 commit，透過正常 PR／revert 重新部署。
3. 若是 Edge Function 回歸，使用上一個已驗收 commit 重新執行 Supabase deploy workflow。
4. 若涉及資料 migration，不直接刪資料；先執行相容性修復或明確的 rollback migration。
5. 在 release note 記錄 root cause、影響範圍、修復與再次驗收證據。

禁止用 reset --hard 或手動覆蓋遠端 branch 來做 rollback。

## 6. 目前 baseline 的明確限制

以下項目在完成對應 task 前，不得標記為 production-hardened：

- Edge API 的訪客／登入者路由政策仍需逐一收斂。
- webhook target 的 SSRF、owner、replay、rate-limit 與 retry policy 仍需補強。
- FastAPI 與 Edge Function 的 CORS／輸入限制需統一。
- 前端尚需把 build gate 擴展成 runtime smoke，避免再次出現「build 綠燈但瀏覽器白屏」。
- 依賴與 CLI 版本需要固定，避免 workflow 使用浮動版本。

## 7. Release DoD

- [ ] 所有 acceptance checks 通過，或有明確、限期、可追蹤的 waiver。
- [ ] 沒有未處理的 critical／high defect。
- [ ] 文件、環境變數、migration、部署與 rollback 說明一致。
- [ ] CI run、production smoke 與 browser evidence 已保存。
- [ ] main 的 commit 可追溯到 PR、task contract 與 release note。
