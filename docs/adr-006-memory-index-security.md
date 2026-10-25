# ADR-006：以 SQLite 重建本機記憶體索引

- 日期：2026-10-25；狀態：使用者已核准替換 Chroma、驗證後合併。
- Task：SEC-P2-20261025；輸入為既有 SQLite notes schema、原問答 API 與合成筆記；交付為無 Chroma 的本機 RAG 路線及去敏驗證證據。
- 背景：Chroma 1.5.9 有4個無修補版公告，嵌入模式路由不可達不等於套件已修補。
- 決策：使用既有 LangChain Core 的 InMemoryVectorStore；SQLite 是唯一持久來源。每次 ask 重建該次索引，只檢索一次，使答案上下文與 sources 一致；保留來源排序。CRUD 不建立第二份持久索引。
- 保留：既有 SQLite 資料與舊 Chroma 目錄不讀寫、不移位、不刪除；CHROMA_DIR 僅相容舊設定。
- 取捨：每次查詢需重建向量，避免全域快取失效與跨程序舊索引。這是本機小型教材範圍，遠端 provider 的花費與延遲不能由此證據推論；本次只用免費 mock／注入向量fixture。
- Out of scope：重啟已停用雲端後端、實際 LLM 品質、搬移私人資料、啟用付費 API 或大型向量服務。
- 驗收：SQLite 真實讀寫後跨新RagService查詢、更新／刪除／空資料、來源順序與上下文一致、舊目錄位元組保留；全套既有API與前端煙霧；乾淨環境安裝不含Chroma且解析依賴公告0。
- 效能門檻（量測前固定）：同硬體Python3.12、384維固定mock，100與1000合成筆記，各2次暖身及20次問答（包含SQLite讀取、重建、檢索及mock回答）；暖p95分別<500ms／<2000ms，1000筆冷重建<5000ms。記錄舊Chroma基線及新索引結果，不把測試耗時當正式API延遲，也不以合成題庫評真實語意品質。
- 證據：security/reports/2026-10-25-p2-remediation.md/.json；本機原始量測由跨專案安全工作保留，不提交私人路徑或資料。
