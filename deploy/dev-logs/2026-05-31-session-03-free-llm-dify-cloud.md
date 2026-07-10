# 開發日誌 — Session 03（零預算雲端 LLM + Dify 上線方案）

| 項目 | 內容 |
|------|------|
| **日期** | 2026-05-31 |
| **對話** | 第 3 個 Cursor 對話 |
| **紀錄** | Harper（HR） |
| **主導** | Kai（Deploy）；Marcus（gemini provider） |

---

## 一、鮪魚決策（已關閉待辦）

| # | 決策 |
|---|------|
| 1 | 免付費、方便開發 → **Cloudflare Quick Tunnel** + 本機 Dify |
| 2 | 預算 0 → **Gemini**（Render `/ask`）+ **Groq**（Dify 內） |
| 3 | 實境教學全真實 LLM → Render `LLM_PROVIDER=gemini` |
| 4 | 日誌副本 → 同步至 `~/.cursor/team/meetings/` |

---

## 二、本次完成

- `LLM_PROVIDER=gemini` + `GOOGLE_API_KEY`（`langchain-google-genai`）
- `deploy/free-llm-cloud.md`、`deploy/dify-cloud-setup.md`
- `scripts/setup-dify-tunnel.ps1`
- 學習台 Step 2/4 雲端說明文案
- Harper 補 **Session 01、02** 回溯日誌
- `deploy/PROGRESS.md` 更新

---

## 三、待鮪魚操作（無法代填 secrets）

1. Render：`GOOGLE_API_KEY`、`LLM_PROVIDER=gemini`
2. Groq Key → Dify Model Provider
3. 本機：`setup-dify-tunnel.ps1` → Render `DIFY_API_BASE` + `DIFY_API_KEY`
4. 驗收線上 Step 2 + Step 4

---

## 四、下一對話建議

若 Tunnel URL 常變導致困擾，可評估 Oracle Cloud 24/7 Dify；或 Named Cloudflare Tunnel。

---

*Harper — Session 03 進行中紀錄*
