# GitHub 登入與 Push（Windows 一次搞定）

本機狀態（已確認）：

- Git：`2.53.0` ✓
- GitHub CLI (`gh`)：`2.92.0` ✓
- Git 使用者：`ytwei` / `frobel0520@gmail.com` ✓
- **尚未登入 GitHub CLI** ← 目前唯一卡關點

---

## 方法一（推薦）：`gh auth login` 瀏覽器登入

### Step 1 — 開 PowerShell，執行

```powershell
gh auth login
```

### Step 2 — 依序選這些選項

| 問題 | 選 |
|------|-----|
| What account do you want to log into? | **GitHub.com** |
| What is your preferred protocol? | **HTTPS**（最簡單） |
| Authenticate Git with your GitHub credentials? | **Yes** |
| How would you like to authenticate? | **Login with a web browser** |

### Step 3 — 瀏覽器完成授權

1. 終端機會顯示 **one-time code**（例如 `ABCD-1234`）
2. 按 Enter 後瀏覽器會開啟 GitHub
3. 貼上 code → **Authorize github**
4. 回到 PowerShell，應看到 `✓ Authentication complete`

### Step 4 — 確認登入成功

```powershell
gh auth status
```

預期輸出含：`Logged in to github.com as ytwei`（或你的 GitHub 帳號）

---

## Step 5 — 建立 repo 並 push

專案已有 initial commit，在專案目錄執行：

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial

gh repo create AI-Agent-Tutorial --public --source=. --remote=origin --push
```

若 GitHub 上 **已有同名 repo**，改用：

```powershell
git remote add origin https://github.com/ytwei/AI-Agent-Tutorial.git
git branch -M main
git push -u origin main
```

> 若 `remote origin already exists`：

```powershell
git remote set-url origin https://github.com/ytwei/AI-Agent-Tutorial.git
git push -u origin main
```

---

## 方法二：Personal Access Token（不用 gh）

若 `gh auth login` 瀏覽器有問題：

1. 開啟 https://github.com/settings/tokens
2. **Generate new token (classic)** → 勾選 **`repo`**
3. 複製 token（只顯示一次）

Push 時：

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
git remote add origin https://github.com/ytwei/AI-Agent-Tutorial.git
git branch -M main
git push -u origin main
```

- Username：`ytwei`
- Password：**貼 token**（不是你的 GitHub 密碼）

---

## 常見錯誤

| 錯誤 | 解法 |
|------|------|
| `You are not logged into any GitHub hosts` | 重跑 `gh auth login` |
| `Repository not found` | 確認 repo 已建立、URL 帳號正確 |
| `remote origin already exists` | `git remote set-url origin ...` 再 push |
| 瀏覽器沒開 | 手動開終端機顯示的 URL，貼 one-time code |
| `Permission denied` | 用 PAT 或確認 GitHub 帳號有 repo 權限 |

---

## Push 成功後 → Render 上線

見 [render-deploy.md](./render-deploy.md) Step 2。

完成 push 後回覆 **「已 push」**，River 可協助 Render 驗收 checklist。
