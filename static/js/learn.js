const API_BASE = window.location.origin;

const statusBanner = document.getElementById("statusBanner");
const providerCallout = document.getElementById("providerCallout");
const mockExplain = document.getElementById("mockExplain");

function showBanner(message, isError = false) {
  statusBanner.textContent = message;
  statusBanner.classList.toggle("error", isError);
  statusBanner.classList.remove("hidden");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === "object" && data?.detail ? JSON.stringify(data.detail) : text;
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }
  return data;
}

function renderNotes(container, notes) {
  container.innerHTML = "";
  if (!notes?.length) {
    container.innerHTML = "<p class='lead'>目前沒有筆記。請先在上方建立一筆。</p>";
    return;
  }
  notes.forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card";
    card.innerHTML = `<h3>#${note.id} ${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content)}</p>`;
    container.appendChild(card);
  });
}

function renderSources(container, sources) {
  container.innerHTML = "";
  if (!sources?.length) {
    container.innerHTML = "<p class='lead'>沒有檢索到來源筆記。請先建立相關內容的筆記，或調整問題。</p>";
    return;
  }
  sources.forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card";
    card.innerHTML = `<h3>來源 #${note.id} ${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content)}</p>`;
    container.appendChild(card);
  });
}

function renderEvents(container, events) {
  container.innerHTML = "";
  if (!events?.length) {
    container.innerHTML = "<p class='lead'>尚無事件。請先註冊 WebHook 並觸發 note/ask。</p>";
    return;
  }
  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `<h3>${escapeHtml(event.event_type)} · #${event.id}</h3><p>${escapeHtml(event.payload)}</p>`;
    container.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

async function loadHealth() {
  try {
    const health = await api("/health");
    providerCallout.innerHTML = `
      <strong>連線 OK</strong> · 服務：<code>${escapeHtml(health.app_name)}</code>
      · LLM 模式：<code>${escapeHtml(health.llm_provider)}</code>
      · 資料儲存：<code>${escapeHtml(health.storage)}</code>
      ${health.persistent_data ? "（Supabase 持久化已啟用）" : "（本機 SQLite，Render 重啟後資料可能消失）"}
      · 進階 API 文件：<a href="${health.docs_url}" target="_blank" rel="noreferrer">${health.docs_url}</a>
    `;
    mockExplain.innerHTML = `
      目前 LLM 模式：<strong>${escapeHtml(health.llm_provider)}</strong>。
      ${
        health.llm_provider === "mock"
          ? "你會看到 <code>[Mock LLM]</code> 開頭的回答；請重點觀察 <code>sources</code> 是否正確。"
          : "你應會看到較自然的 LLM 回答；仍請確認 <code>sources</code>。"
      }
    `;
    showBanner("已連線到後端 API，可以開始 Step 1。");
  } catch (error) {
    providerCallout.innerHTML = `<strong>連線失敗</strong>：${escapeHtml(error.message)}。Render 冷啟動請等 30～60 秒後再按「重新檢查連線」。`;
    showBanner(`無法連線：${error.message}`, true);
  }
}

async function loadNotes() {
  const notes = await api("/notes");
  renderNotes(document.getElementById("notesList"), notes);
  return notes;
}

document.getElementById("refreshHealthBtn").addEventListener("click", loadHealth);

document.getElementById("noteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();
  const resultBox = document.getElementById("noteResult");

  try {
    const created = await api("/notes", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    resultBox.textContent = prettyJson(created);
    await loadNotes();
    showBanner(`筆記建立成功（id=${created.id}）。下一步到 Step 2 提問。`);
  } catch (error) {
    resultBox.textContent = error.message;
    showBanner(error.message, true);
  }
});

document.getElementById("loadNotesBtn").addEventListener("click", async () => {
  try {
    await loadNotes();
    showBanner("筆記列表已更新。");
  } catch (error) {
    showBanner(error.message, true);
  }
});

document.getElementById("askForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = document.getElementById("questionInput").value.trim();
  const top_k = Number(document.getElementById("topKInput").value || 3);
  const askResult = document.getElementById("askResult");

  try {
    const answer = await api("/ask", {
      method: "POST",
      body: JSON.stringify({ question, top_k }),
    });
    askResult.textContent = prettyJson(answer);
    renderSources(document.getElementById("sourcesList"), answer.sources);
    showBanner(`問答完成（provider=${answer.provider}，sources=${answer.sources?.length ?? 0}）。`);
  } catch (error) {
    askResult.textContent = error.message;
    showBanner(error.message, true);
  }
});

document.getElementById("sampleAskBtn").addEventListener("click", () => {
  document.getElementById("questionInput").value = "LangChain 是什麼？";
  document.getElementById("topKInput").value = "3";
});

document.getElementById("webhookForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = document.getElementById("webhookUrl").value.trim();
  const event_types = document.getElementById("eventTypes").value.trim() || "*";
  const webhookResult = document.getElementById("webhookResult");

  try {
    const created = await api("/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, event_types }),
    });
    webhookResult.textContent = prettyJson(created);
    showBanner("WebHook 註冊成功。請到 webhook.site 查看事件。");
  } catch (error) {
    webhookResult.textContent = error.message;
    showBanner(error.message, true);
  }
});

document.getElementById("loadEventsBtn").addEventListener("click", async () => {
  try {
    const events = await api("/events");
    renderEvents(document.getElementById("eventsList"), events);
    showBanner(`已載入 ${events.length} 筆事件。`);
  } catch (error) {
    showBanner(error.message, true);
  }
});

document.querySelectorAll(".step-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".step-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

loadHealth()
  .then(loadNotes)
  .catch(() => {
    /* handled in loadHealth */
  });
