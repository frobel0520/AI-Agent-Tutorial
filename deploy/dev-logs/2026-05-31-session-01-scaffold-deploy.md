# 開發日誌 — Session 01（專案開案與上線基礎）

| 項目 | 內容 |
|------|------|
| **日期** | 2026-05-31（回溯整理；對話為專案第 1 個 Cursor 對話） |
| **紀錄** | Harper（HR） |
| **主導** | River（Tech Lead） |
| **實作** | Marcus（Backend）、Kai（Deploy）、Morgan（需求） |

---

## 一、本次摘要

- 鮪魚提出學習目標：**LangChain、RESTful API、Dify、WebHook**，希望有 hands-on App。
- 團隊建議 **方案 A（後端優先）**；鮪魚確認：無 API Key、有 Docker、要**上線**、專案名 **AI-Agent-Tutorial**。
- 完成專案 scaffold：FastAPI、LangChain RAG、SQLite、WebHook、Dify 端點占位、Swagger、`/learn` 學習台雛形、Render `render.yaml`、教學文件 `docs/01`～`04`。

---

## 二、關鍵決策

| 決策 | 內容 |
|------|------|
| 架構 | 方案 A；mock LLM 先通流程，Ollama/Dify 分 Phase |
| 專案路徑 | `C:\Users\ytwei\Projects\AI-Agent-Tutorial` |
| 部署 | Render Blueprint + GitHub |
| 語言 | 對鮪魚繁體中文；程式註解英文 |

---

## 三、已完成（技術）

- REST：`/notes`、`/ask`、`/health`
- LangChain + Chroma；`LLM_PROVIDER=mock` 預設
- WebHook 註冊與事件派送
- `POST /dify/ask` 骨架（待 Phase 3 設定 Key）
- CI pytest、Dockerfile、docker-compose（Ollama）
- 新手學習台與 Render 部署文件

---

## 四、遺留至 Session 02+

- Supabase 持久化、Ollama 真實 RAG、Render 正式驗收
- Dify Docker 自架與 Step 4 UI
- 雲端真實 LLM（當時 Render 為 mock）

---

## 五、下一對話銜接

Session 02 延續：Render + Supabase + 本機 Ollama 驗收，再進入 Dify Phase 3。

---

*Harper — 回溯整理自對話紀錄與 repo 初始 commit 內容*
