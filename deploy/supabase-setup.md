# Supabase 持久化設定

讓 **筆記、WebHook 訂閱、事件紀錄** 在 Render 冷啟動後仍保留。  
向量索引（Chroma）仍在容器本機，但啟動時會 **自動從 Postgres 重建**。

---

## 會持久化 vs 不會

| 資料 | Supabase 接上後 |
|------|-----------------|
| 筆記 `/notes` | ✅ 保留 |
| WebHook 訂閱 | ✅ 保留 |
| 事件紀錄 `/events` | ✅ 保留 |
| Chroma 向量檔 | ⚠️ 重啟後重建（從筆記同步，RAG 仍可用） |

---

## Step 1 — 建立 Supabase 專案

1. 登入 https://supabase.com
2. **New project**（免費 tier 即可）
3. 記下 **Database password**（只顯示一次）

---

## Step 2 — 執行 SQL Schema

1. Supabase Dashboard → **SQL Editor**
2. 貼上本 repo 的 `supabase/schema.sql` 全文
3. **Run**

---

## Step 3 — 取得 DATABASE_URL

Dashboard → **Project Settings** → **Database** → **Connection string**

建議選 **URI** + **Session pooler**（port **6543**，適合 Render）：

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

> 若密碼含特殊字元，需 URL encode（例如 `@` → `%40`）。

---

## Step 4 — 設定 Render 環境變數

Render Dashboard → `ai-agent-tutorial` → **Environment**：

| Key | Value |
|-----|--------|
| `DATABASE_URL` | 上一步的 Supabase URI |
| `LLM_PROVIDER` | `mock`（或 `openai`） |
| `CHROMA_DIR` | `./data/chroma` |

儲存後會 **自動 redeploy**。

---

## Step 5 — 本機開發（可選）

```powershell
cd C:\Users\ytwei\Projects\AI-Agent-Tutorial
copy .env.example .env
# 編輯 .env，把 DATABASE_URL 改成 Supabase URI
pip install -r requirements.txt
python src\run.py
```

開啟 http://localhost:8000/health 應看到：

```json
{
  "storage": "postgres",
  "persistent_data": true
}
```

---

## Step 6 — 驗收

1. `/learn` 頂部顯示 **資料儲存：postgres（Supabase 持久化已啟用）**
2. 建立筆記、註冊 WebHook
3. 等 Render 閒置 sleep 後再回來
4. 冷啟動完成後，筆記與 WebHook **應仍在**
5. `POST /ask` 的 `sources` 仍正常（Chroma 已自動重建）

---

## 常見問題

| 症狀 | 解法 |
|------|------|
| `connection refused` | 確認用 pooler URI（6543）或允許 IP |
| `password authentication failed` | 重設 DB 密碼；檢查 URL encode |
| `relation "notes" does not exist` | 重新執行 `supabase/schema.sql` |
| health 仍顯示 `sqlite` | Render 的 `DATABASE_URL` 未設定或未 redeploy |

---

## 安全提醒

- **DATABASE_URL 含密碼**，只放在 Render Secrets / 本機 `.env`
- 不要 commit 到 GitHub
- 此教學 API 無登入，請勿公開敏感資料
