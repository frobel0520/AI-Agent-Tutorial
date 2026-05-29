# 上線部署（Render）

## 前置

1. GitHub 帳號
2. [Render](https://render.com) 帳號（可用 GitHub 登入）
3. 本機已 commit 並 push 到 GitHub

## Step 1 — Push 到 GitHub

在專案目錄：

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial

# 若尚未登入 GitHub CLI
gh auth login

# 建立遠端 repo 並 push（repo 名稱需與 GitHub 一致）
gh repo create AI-Agent-Tutorial --public --source=. --remote=origin --push
```

若 repo 已在 GitHub 手動建立：

```powershell
git remote add origin https://github.com/<你的帳號>/AI-Agent-Tutorial.git
git branch -M main
git push -u origin main
```

## Step 2 — Render Blueprint 部署

1. 登入 https://dashboard.render.com
2. **New** → **Blueprint**
3. 連接 GitHub，選 `AI-Agent-Tutorial` repo
4. Render 會讀取根目錄 `render.yaml` 並建立 `ai-agent-tutorial` Web Service
5. 確認環境變數（預設即可）：
   - `LLM_PROVIDER=mock`
   - `APP_ENV=production`
6. **Apply** / **Create**

## Step 3 — 上線驗收

部署完成後（約 5～10 分鐘）：

| 檢查 | URL |
|------|-----|
| Health | `https://ai-agent-tutorial.onrender.com/health` |
| Swagger | `https://ai-agent-tutorial.onrender.com/docs` |

PowerShell：

```powershell
Invoke-RestMethod https://ai-agent-tutorial.onrender.com/health
```

預期 JSON：

```json
{
  "status": "ok",
  "app_name": "AI-Agent-Tutorial",
  "llm_provider": "mock",
  "docs_url": "/docs"
}
```

> Render 免費方案服務閒置會 sleep，第一次開啟可能等 30～60 秒。

## 常見問題

| 症狀 | 處理 |
|------|------|
| Build 失敗 | Render Logs → 看 pip / Docker 錯誤 |
| Health check 失敗 | 確認 `healthCheckPath: /health`；容器需聽 `PORT` |
| 502 / 無回應 | 免費 tier 冷啟動，稍等再試 |
| 資料消失 | 免費 tier disk 非永久；demo 可接受，正式可改 Postgres |

## 之後切換真實 LLM

Render Dashboard → Environment：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

儲存後會自動 redeploy。
