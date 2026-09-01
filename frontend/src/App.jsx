import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const STEP_DEFINITIONS = [
  { id: "start", number: "0", title: "開始", meta: "先認識操作介面" },
  { id: "notes", number: "1", title: "建立筆記", meta: "REST · POST /notes" },
  { id: "rag", number: "2", title: "RAG 問答", meta: "LangChain · POST /ask" },
  { id: "webhook", number: "3", title: "WebHook 事件", meta: "事件註冊與紀錄" },
  { id: "dify", number: "4", title: "Dify 問答", meta: "登入後才能呼叫" },
];

const OWN_WEBHOOK_PATH = "/hooks/incoming";
const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = (configuredApiBase || (isLocalDevelopment ? window.location.origin : ""))
  .replace(/\/$/, "");
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
const authClient = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true },
    })
  : null;

function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem("ai-agent-tutorial-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  } catch {
    // Fall back to the browser preference when storage is unavailable.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatEventPayload(payload) {
  return typeof payload === "string" ? payload : prettyJson(payload);
}

function Icon({ name }) {
  if (name === "moon") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20.2 15.4A8.8 8.8 0 0 1 8.6 3.8 9 9 0 1 0 20.2 15.4Z" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6m11 11 1.6 1.6M2 12h2.2m15.6 0H22M4.9 19.1l1.6-1.6m11-11 1.6-1.6" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M10 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20H10" />
        <path d="M13 8l4 4-4 4M17 12H8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

function AccountMenu({
  accountRef,
  authReady,
  authClientConfigured,
  currentUser,
  theme,
  isOpen,
  isSigningIn,
  onToggle,
  onThemeToggle,
  onSignIn,
  onSignOut,
}) {
  if (!authClientConfigured) {
    return (
      <div className="auth-panel auth-panel-unavailable">
        <span className="auth-status">Google 登入尚未設定</span>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="auth-panel auth-panel-unavailable">
        <span className="auth-status">登入狀態載入中…</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="auth-panel">
        <button className="secondary auth-signin" type="button" onClick={onSignIn} disabled={isSigningIn}>
          {isSigningIn ? "登入中…" : "使用 Google 登入"}
        </button>
      </div>
    );
  }

  return (
    <div className="account-menu-wrap" ref={accountRef}>
      <button
        className="account-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="開啟帳號選單"
        onClick={onToggle}
      >
        <UserAvatar user={currentUser} />
        <span className="account-trigger-copy">
          <span className="auth-status">{currentUser.email || "Google 帳號"}</span>
          <span className="account-trigger-label">已登入</span>
        </span>
        <span className="account-chevron" aria-hidden="true">
          <Icon name="chevron" />
        </span>
      </button>

      {isOpen && (
        <div className="account-menu" role="menu" aria-label="帳號選單">
          <div className="account-menu-header">
            <span className="menu-eyebrow">ACCOUNT</span>
            <strong>{currentUser.email || "Google 帳號"}</strong>
          </div>
          <div className="menu-divider" />
          <button className="menu-item" type="button" role="menuitem" onClick={onThemeToggle}>
            <span className="menu-item-label">
              <span className="menu-item-icon"><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
              <span>切換佈景主題</span>
            </span>
            <span className="menu-item-value">{theme === "dark" ? "淺色" : "深色"}</span>
          </button>
          <button className="menu-item menu-item-danger" type="button" role="menuitem" onClick={onSignOut}>
            <span className="menu-item-label">
              <span className="menu-item-icon"><Icon name="logout" /></span>
              <span>登出</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function UserAvatar({ user, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const displayName = user?.user_metadata?.full_name || user?.email || "G";
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  return (
    <span className={`auth-avatar ${className}`.trim()}>
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function Topbar({
  activeStep,
  connection,
  sidebarOpen,
  authProps,
  onBrandClick,
  onToggleSidebar,
}) {
  const connectionClass = [
    "connection-pill",
    connection.state === "loading" ? "is-loading" : "",
    connection.state === "error" ? "is-error" : "",
  ].filter(Boolean).join(" ");

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#step-start" aria-label="回到新手學習台開始" onClick={onBrandClick}>
          <span className="brand-mark" aria-hidden="true">
            <img src="./favicon.svg" alt="" width="32" height="32" />
          </span>
          <span className="brand-copy">
            <span className="brand-eyebrow">AI AGENT TUTORIAL</span>
            <span className="brand-name">新手學習台</span>
          </span>
        </a>

        <div className="topbar-context" aria-live="polite">
          <span className="topbar-context-label">目前位置</span>
          <span className="topbar-context-title">{activeStep.title}</span>
        </div>

        <div className="topbar-actions">
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            onClick={onToggleSidebar}
          >
            <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
            <span>選單</span>
          </button>
          <div className={connectionClass} aria-live="polite">
            <span className="connection-dot" aria-hidden="true" />
            <span>{connection.label}</span>
          </div>
          <AccountMenu {...authProps} />
        </div>
      </div>
    </header>
  );
}

function Sidebar({ activeStepId, sidebarOpen, sidebarHealthLabel, sidebarHealthError, onStepClick, onClose }) {
  return (
    <>
      <aside className="sidebar" id="sidebar" aria-label="學習路徑">
        <div className="sidebar-heading">
          <div>
            <span className="sidebar-eyebrow">COURSE MAP</span>
            <h2>學習路徑</h2>
          </div>
          <span className="sidebar-count">05 STEPS</span>
        </div>

        <nav className="steps-nav" aria-label="教學步驟">
          {STEP_DEFINITIONS.map((step) => (
            <a
              className={`step-link ${activeStepId === step.id ? "active" : ""}`.trim()}
              href={`#step-${step.id}`}
              data-step={step.id}
              aria-current={activeStepId === step.id ? "step" : undefined}
              key={step.id}
              onClick={(event) => onStepClick(step.id, event)}
            >
              <span className="step-marker"><span className="num">{step.number}</span></span>
              <span className="step-copy">
                <span className="step-title">{step.title}</span>
                <span className="step-meta">{step.meta}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-health ${sidebarHealthError ? "is-error" : ""}`.trim()} id="sidebarHealth">
            <span className="sidebar-health-dot" aria-hidden="true" />
            <span><strong>服務狀態</strong><small>{sidebarHealthLabel}</small></span>
          </div>
          <a
            className="sidebar-resource"
            href="https://github.com/frobel0520/AI-Agent-Tutorial"
            target="_blank"
            rel="noreferrer"
          >
            <span className="resource-icon" aria-hidden="true">↗</span>
            <span><strong>查看 GitHub 專案</strong><small>對照原始碼與文件</small></span>
          </a>
        </div>
      </aside>
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "" : "hidden"}`.trim()}
        aria-hidden="true"
        onClick={onClose}
      />
    </>
  );
}

function ProviderCallout({ health, error }) {
  if (error) {
    return (
      <>
        <strong>連線失敗</strong>：{error}。請確認 Supabase Edge Function 已部署，且 Pages 的設定已完成。
      </>
    );
  }
  if (!health) {
    return <>正在連線到後端 API…</>;
  }
  const storageMessage = health.persistent_data ? "（Supabase 持久化已啟用）" : "（目前使用本機儲存）";
  return (
    <>
      <strong>連線 OK</strong> · 服務：<code>{health.app_name}</code> · LLM 模式：<code>{health.llm_provider}</code>
      · 資料儲存：<code>{health.storage}</code> {storageMessage}
    </>
  );
}

function ProviderExplanation({ health }) {
  if (!health) {
    return <>正在讀取 LLM 設定…</>;
  }
  const provider = health.llm_provider;
  if (provider === "mock") {
    return <>你會看到 <code>[Mock LLM]</code> 開頭的回答；請重點觀察 <code>sources</code> 是否正確。</>;
  }
  if (provider === "ollama") {
    return health.llm_ready
      ? <>Ollama 已就緒（模型 <code>{health.ollama_model || "unknown"}</code>）。回答應為自然語句，且仍有 <code>sources</code>。</>
      : <>Ollama 尚未就緒。請在本機執行 <code>docker compose up -d ollama</code> 並 <code>ollama pull llama3.2</code>。</>;
  }
  if (provider === "gemini") {
    return health.llm_ready
      ? <>Gemini 雲端 LLM 已就緒。回答應為自然語句，且仍有 <code>sources</code>。</>
      : <>Gemini 尚未設定，請在 Supabase Edge Function Secrets 設定必要金鑰。</>;
  }
  if (provider === "groq") {
    return health.llm_ready
      ? <>Groq 雲端 LLM 已就緒。回答應為自然語句，且仍有 <code>sources</code>。</>
      : <>Groq 尚未設定，請在 Supabase Edge Function Secrets 設定必要金鑰。</>;
  }
  return <>你應會看到較自然的 LLM 回答；仍請確認 <code>sources</code>。</>;
}

function NoteCard({ note, source = false }) {
  return (
    <article className="note-card">
      <h3>{source ? "來源" : ""} #{note.id} {note.title}</h3>
      <p>{note.content}</p>
    </article>
  );
}

function App() {
  const [theme, setTheme] = useState(readStoredTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeStepId, setActiveStepId] = useState("start");
  const [connection, setConnection] = useState({ state: "loading", label: "檢查中…" });
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesError, setNotesError] = useState("");
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [noteResult, setNoteResult] = useState("尚未建立筆記。");
  const [askResult, setAskResult] = useState("尚未提問。");
  const [webhookResult, setWebhookResult] = useState("尚未註冊 WebHook。");
  const [difyResult, setDifyResult] = useState("尚未呼叫 Dify。");
  const [banner, setBanner] = useState({ message: "", error: false });
  const [currentSession, setCurrentSession] = useState(null);
  const [authReady, setAuthReady] = useState(!authClient);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [difyAccessState, setDifyAccessState] = useState({ authenticated: false, authorized: false });
  const [difyAccessError, setDifyAccessError] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState("3");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [eventTypes, setEventTypes] = useState("note.created,ask.completed");
  const [difyQuestion, setDifyQuestion] = useState("");
  const sectionRefs = useRef({});
  const accountRef = useRef(null);

  const activeStep = useMemo(
    () => STEP_DEFINITIONS.find((step) => step.id === activeStepId) || STEP_DEFINITIONS[0],
    [activeStepId],
  );
  const currentUser = currentSession?.user || null;
  const ownWebhookEndpoint = API_BASE ? `${API_BASE}${OWN_WEBHOOK_PATH}` : "尚未設定 Supabase Edge Function URL";
  const difyButtonDisabled = !(health?.dify_configured && difyAccessState.authorized);

  const showBanner = useCallback((message, error = false) => {
    setBanner({ message, error });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#111827" : "#f6f4ef",
    );
    try {
      window.localStorage.setItem("ai-agent-tutorial-theme", theme);
    } catch {
      // The theme still applies for the current session when storage is blocked.
    }
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    if (!banner.message) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setBanner({ message: "", error: false }), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [banner]);

  useEffect(() => {
    if (!accountOpen) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setAccountOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getAuthHeaders = useCallback(async () => {
    if (!authClient) {
      return {};
    }
    const { data, error } = await authClient.auth.getSession();
    if (error) {
      throw error;
    }
    if (!data.session?.access_token) {
      return {};
    }
    return { Authorization: `Bearer ${data.session.access_token}` };
  }, []);

  const api = useCallback(async (path, options = {}) => {
    if (!API_BASE || API_BASE === "null") {
      throw new Error("尚未設定 Supabase Edge Function URL。請檢查 Pages 的 repository variable。");
    }
    const { headers: optionHeaders = {}, ...requestOptions } = options;
    const response = await fetch(`${API_BASE}${path}`, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
        ...optionHeaders,
      },
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
      throw new Error(`${response.status} ${response.statusText}: ${detail || "請稍後再試"}`);
    }
    return data;
  }, [getAuthHeaders]);

  const refreshDifyAccess = useCallback(async (session = currentSession) => {
    setDifyAccessError("");
    if (!session) {
      setDifyAccessState({ authenticated: false, authorized: false });
      return;
    }
    try {
      const access = await api("/dify/access");
      setDifyAccessState({
        authenticated: access.authenticated === true,
        authorized: access.authorized === true,
      });
    } catch (error) {
      setDifyAccessState({ authenticated: true, authorized: false });
      setDifyAccessError(`授權狀態讀取失敗：${error.message}`);
    }
  }, [api, currentSession]);

  useEffect(() => {
    if (!authClient) {
      return undefined;
    }
    let disposed = false;
    const applySession = (session) => {
      if (disposed) {
        return;
      }
      setCurrentSession(session);
      setAuthReady(true);
      window.setTimeout(() => {
        if (!disposed) {
          refreshDifyAccess(session).catch(() => undefined);
        }
      }, 0);
    };

    authClient.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }
        applySession(data.session);
      })
      .catch((error) => {
        if (!disposed) {
          setAuthReady(true);
          setDifyAccessError(`登入狀態初始化失敗：${error.message}`);
        }
      });

    const { data: authSubscription } = authClient.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => {
      disposed = true;
      authSubscription.subscription.unsubscribe();
    };
  }, [refreshDifyAccess]);

  const loadHealth = useCallback(async () => {
    setConnection({ state: "loading", label: "檢查中…" });
    try {
      const nextHealth = await api("/health");
      setHealth(nextHealth);
      setHealthError("");
      setConnection({ state: "online", label: "連線 OK" });
      showBanner("已連線到後端 API，可以開始 Step 1。");
      return nextHealth;
    } catch (error) {
      setHealth(null);
      setHealthError(error.message);
      setConnection({ state: "error", label: "連線失敗" });
      showBanner(`無法連線：${error.message}`, true);
      return null;
    }
  }, [api, showBanner]);

  const loadNotes = useCallback(async () => {
    try {
      const nextNotes = await api("/notes");
      setNotes(nextNotes);
      setNotesError("");
      return nextNotes;
    } catch (error) {
      setNotesError(error.message);
      throw error;
    }
  }, [api]);

  useEffect(() => {
    let active = true;
    loadHealth().then(() => loadNotes().catch((error) => {
      if (active) {
        showBanner(error.message, true);
      }
    }));
    return () => {
      active = false;
    };
  }, [loadHealth, loadNotes, showBanner]);

  const scrollToStep = useCallback((stepId, behavior = "smooth") => {
    const target = sectionRefs.current[stepId];
    if (!target) {
      return;
    }
    const topbarHeight = Number.parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue("--topbar-height"),
    ) || 74;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - topbarHeight - 24;
    window.scrollTo({ top: Math.max(0, targetTop), behavior });
  }, []);

  const handleStepClick = useCallback((stepId, event) => {
    event.preventDefault();
    setActiveStepId(stepId);
    setSidebarOpen(false);
    window.history.replaceState(null, "", `#step-${stepId}`);
    scrollToStep(stepId);
  }, [scrollToStep]);

  useEffect(() => {
    const hashStepId = window.location.hash.replace(/^#step-/, "");
    if (STEP_DEFINITIONS.some((step) => step.id === hashStepId)) {
      setActiveStepId(hashStepId);
      window.requestAnimationFrame(() => scrollToStep(hashStepId, "auto"));
    }
  }, [scrollToStep]);

  useEffect(() => {
    let frameId = 0;
    const syncActiveStep = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const readingAnchor = Math.min(280, Math.max(120, window.innerHeight * 0.28));
        let visibleStep = STEP_DEFINITIONS[0];
        STEP_DEFINITIONS.forEach((step) => {
          const section = sectionRefs.current[step.id];
          if (section && section.getBoundingClientRect().top <= readingAnchor) {
            visibleStep = step;
          }
        });
        setActiveStepId((previous) => previous === visibleStep.id ? previous : visibleStep.id);
      });
    };
    window.addEventListener("scroll", syncActiveStep, { passive: true });
    window.addEventListener("resize", syncActiveStep);
    syncActiveStep();
    return () => {
      window.removeEventListener("scroll", syncActiveStep);
      window.removeEventListener("resize", syncActiveStep);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const handleBrandClick = useCallback((event) => {
    event.preventDefault();
    handleStepClick("start", event);
  }, [handleStepClick]);

  const handleSignIn = useCallback(async () => {
    if (!authClient) {
      showBanner("Google 登入尚未設定。", true);
      return;
    }
    setIsSigningIn(true);
    try {
      const { error } = await authClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      setIsSigningIn(false);
      showBanner(`Google 登入失敗：${error.message}`, true);
    }
  }, [showBanner]);

  const handleSignOut = useCallback(async () => {
    setAccountOpen(false);
    if (!authClient) {
      return;
    }
    const { error } = await authClient.auth.signOut();
    if (error) {
      showBanner(`登出失敗：${error.message}`, true);
      return;
    }
    setDifyAccessState({ authenticated: false, authorized: false });
    showBanner("已登出 Google 帳號。");
  }, [showBanner]);

  const handleNoteSubmit = async (event) => {
    event.preventDefault();
    try {
      const created = await api("/notes", {
        method: "POST",
        body: JSON.stringify({ title: noteTitle.trim(), content: noteContent.trim() }),
      });
      setNoteResult(prettyJson(created));
      await loadNotes();
      showBanner(`筆記建立成功（id=${created.id}）。下一步到 Step 2 提問。`);
    } catch (error) {
      setNoteResult(error.message);
      showBanner(error.message, true);
    }
  };

  const handleAskSubmit = async (event) => {
    event.preventDefault();
    try {
      const answer = await api("/ask", {
        method: "POST",
        body: JSON.stringify({ question: question.trim(), top_k: Number(topK || 3) }),
      });
      setAskResult(prettyJson(answer));
      setSources(Array.isArray(answer.sources) ? answer.sources : []);
      showBanner(`問答完成（provider=${answer.provider}，sources=${answer.sources?.length ?? 0}）。`);
    } catch (error) {
      setAskResult(error.message);
      showBanner(error.message, true);
    }
  };

  const handleWebhookSubmit = async (event) => {
    event.preventDefault();
    try {
      const created = await api("/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: webhookUrl.trim(), event_types: eventTypes.trim() || "*" }),
      });
      setWebhookResult(prettyJson(created));
      showBanner("WebHook 註冊成功。建立筆記後即可測試事件接收。");
    } catch (error) {
      setWebhookResult(error.message);
      showBanner(error.message, true);
    }
  };

  const handleLoadEvents = async () => {
    try {
      const nextEvents = await api("/events");
      setEvents(Array.isArray(nextEvents) ? nextEvents : []);
      showBanner(`已載入 ${nextEvents.length} 筆事件。`);
    } catch (error) {
      showBanner(error.message, true);
    }
  };

  const handleDifySubmit = async (event) => {
    event.preventDefault();
    try {
      const answer = await api("/dify/ask", {
        method: "POST",
        body: JSON.stringify({ question: difyQuestion.trim() }),
      });
      setDifyResult(prettyJson(answer));
      showBanner(`Dify 問答完成（provider=${answer.provider}）。`);
    } catch (error) {
      setDifyResult(error.message);
      showBanner(error.message, true);
    }
  };

  const difyAuthMessage = !authClient
    ? <><strong>Google 登入尚未設定</strong>，請完成 Supabase Auth 與 Pages 設定。</>
    : !currentSession
      ? <><strong>請先使用 Google 登入</strong>。訪客不能呼叫 Dify。</>
      : !difyAccessState.authorized
        ? <><strong>已登入，但尚未取得 Dify 授權</strong>。請由管理者把你的帳號加入授權名單。</>
        : !health?.dify_configured
          ? <><strong>帳號已授權</strong>，但 Dify 尚未完成 API 設定。</>
          : <><strong>已登入且已授權</strong>，現在可以呼叫 Dify。</>;

  const authProps = {
    accountRef,
    authReady,
    authClientConfigured: Boolean(authClient),
    currentUser,
    theme,
    isOpen: accountOpen,
    isSigningIn,
    onToggle: () => setAccountOpen((open) => !open),
    onThemeToggle: () => setTheme((value) => value === "dark" ? "light" : "dark"),
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
  };

  return (
    <>
      <div className={`status-banner ${banner.error ? "error" : ""} ${banner.message ? "" : "hidden"}`.trim()} role="status">
        {banner.message}
      </div>

      <div className="layout">
        <Topbar
          activeStep={activeStep}
          connection={connection}
          sidebarOpen={sidebarOpen}
          authProps={authProps}
          onBrandClick={handleBrandClick}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        <div className="app-frame">
          <Sidebar
            activeStepId={activeStepId}
            sidebarOpen={sidebarOpen}
            sidebarHealthLabel={healthError ? "請檢查部署設定" : health ? `${health.llm_provider || "API"} · ${health.storage || "服務正常"}` : "正在檢查 API…"}
            sidebarHealthError={Boolean(healthError)}
            onStepClick={handleStepClick}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="content" id="mainContent">
            <section className="hero">
              <div className="hero-kicker"><span>GET STARTED</span><span className="hero-count">5 個步驟 · 約 10 分鐘</span></div>
              <h1>從這裡開始學 RAG</h1>
              <p>
                你<strong>不需要先會寫程式</strong>。這個頁面會帶你一步一步操作：先建立筆記，再問問題，最後看 LLM
                如何根據筆記回答。左側會告訴你現在在哪一步，以及按下按鈕後會發生什麼。
              </p>
              <div className="callout info" id="providerCallout"><ProviderCallout health={health} error={healthError} /></div>
            </section>

            <section className="panel" id="step-start" ref={(node) => { sectionRefs.current.start = node; }}>
              <h2>Step 0 · 我該從哪裡輸入？</h2>
              <p className="lead">
                在這裡，每個步驟都有<strong>輸入框 + 按鈕</strong>。你按「送出」後，畫面下方會顯示 API 回傳結果，並解釋每個欄位代表什麼。
              </p>
              <div className="grid-2">
                <div className="callout success">
                  <strong>你現在要做的事</strong><br />
                  1. 確認上方連線狀態是 OK<br />
                  2. 到 Step 1 建立一筆筆記<br />
                  3. 到 Step 2 輸入問題並看 RAG 回答
                </div>
                <dl className="glossary">
                  <dt>這頁的角色</dt>
                  <dd>這是一個新手導覽，將每個 REST 操作拆成可以直接按下的步驟。</dd>
                  <dt>我寫 code 在哪裡？</dt>
                  <dd>後端在 GitHub repo 的 <code>src/app/services/langchain_rag.py</code>。先用 UI 理解流程，再對照程式碼。</dd>
                </dl>
              </div>
            </section>

            <section className="panel" id="step-notes" ref={(node) => { sectionRefs.current.notes = node; }}>
              <h2>Step 1 · 建立筆記（REST POST /notes）</h2>
              <p className="lead">
                RAG 需要「你的資料」。在這一步，你先新增筆記；後端會存進 Supabase，並在 Edge Function 內做輕量文字檢索。
              </p>

              <form id="noteForm" onSubmit={handleNoteSubmit}>
                <div className="field">
                  <label htmlFor="noteTitle">筆記標題</label>
                  <input id="noteTitle" name="title" placeholder="例如：我的 RAG 第一課" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="noteContent">筆記內容（LLM 之後會從這裡找答案）</label>
                  <textarea id="noteContent" name="content" placeholder="例如：RAG 會先檢索相關筆記，再交給 LLM 組織回答。" value={noteContent} onChange={(event) => setNoteContent(event.target.value)} required />
                </div>
                <div className="actions">
                  <button className="primary" type="submit">建立筆記</button>
                  <button className="secondary" type="button" onClick={() => loadNotes().then(() => showBanner("筆記列表已更新。")).catch((error) => showBanner(error.message, true))}>重新載入筆記列表</button>
                </div>
              </form>

              <div className="callout info"><strong>預期結果：</strong>成功後會看到 <code>201 Created</code> 的 JSON，包含 <code>id</code>。這代表 REST API 建立資源成功。</div>
              <h3>目前筆記</h3>
              <div id="notesList" className="note-list">
                {notesError ? <p className="lead">筆記載入失敗：{notesError}</p> : notes.length ? notes.map((note) => <NoteCard key={note.id} note={note} />) : <p className="lead">目前沒有筆記。請先在上方建立一筆。</p>}
              </div>
              <div id="noteResult" className="result-box">{noteResult}</div>
            </section>

            <section className="panel" id="step-rag" ref={(node) => { sectionRefs.current.rag = node; }}>
              <h2>Step 2 · RAG 問答（LangChain POST /ask）</h2>
              <p className="lead">
                在這裡輸入你的問題。後端會：① 從筆記中檢索最相關片段 → ② 組成 Prompt → ③ 呼叫 LLM → ④ 回傳答案與來源。
              </p>
              <div className="flow">
                <div className="node">你的問題</div><div className="arrow">→</div>
                <div className="node">Retriever 找 top-k 筆記</div><div className="arrow">→</div>
                <div className="node">Prompt + LLM</div><div className="arrow">→</div>
                <div className="node">answer + sources</div>
              </div>
              <div className="callout warn" id="mockExplain">
                目前 LLM 模式：<strong>{health?.llm_provider || "讀取中…"}</strong>。<ProviderExplanation health={health} />
              </div>

              <form id="askForm" onSubmit={handleAskSubmit}>
                <div className="field">
                  <label htmlFor="questionInput">在這裡輸入問題</label>
                  <input id="questionInput" name="question" placeholder="例如：LangChain 是什麼？" value={question} onChange={(event) => setQuestion(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="topKInput">檢索筆記數 (top_k)</label>
                  <input id="topKInput" name="top_k" type="number" min="1" max="10" value={topK} onChange={(event) => setTopK(event.target.value)} />
                </div>
                <div className="actions">
                  <button className="primary" type="submit">送出問題</button>
                  <button className="secondary" type="button" onClick={() => { setQuestion("LangChain 是什麼？"); setTopK("3"); }}>使用範例問題</button>
                </div>
              </form>

              <div className="grid-2">
                <dl className="glossary">
                  <dt>answer</dt><dd>LLM 生成的回答。mock 模式是固定教學模板，不是真模型推理。</dd>
                  <dt>sources</dt><dd>RAG 檢索到的筆記列表。若為空，代表目前沒有相關資料。</dd>
                  <dt>provider</dt><dd>目前 LLM 提供者：<code>mock</code> / <code>ollama</code> / <code>openai</code></dd>
                </dl>
                <div className="callout success">
                  <strong>新手檢查清單</strong><br />
                  ✓ sources 是否包含相關筆記？<br />
                  ✓ 新建筆記後，再問同一主題，sources 是否變化？<br />
                  ✓ 切換到雲端 LLM 後，answer 會更像自然語言
                </div>
              </div>
              <h3>API 回傳（原始 JSON）</h3>
              <div id="askResult" className="result-box">{askResult}</div>
              <h3>來源筆記（sources）</h3>
              <div id="sourcesList" className="note-list">
                {sources.length ? sources.map((note) => <NoteCard key={note.id} note={note} source />) : <p className="lead">沒有檢索到來源筆記。請先建立相關內容的筆記，或調整問題。</p>}
              </div>
            </section>

            <section className="panel" id="step-webhook" ref={(node) => { sectionRefs.current.webhook = node; }}>
              <h2>Step 3 · WebHook（POST /webhooks）</h2>
              <p className="lead">
                當你建立筆記或完成問答，後端會把事件 POST 到你註冊的 URL。你可以直接使用本專案的 Supabase 接收端點，資料會留在自己的資料庫。
              </p>
              <div className="callout info">
                <strong>本專案自有接收端點：</strong> <code>{ownWebhookEndpoint}</code><br />
                這個端點會驗證 WebHook 簽章，再把收到的事件寫入 <code>event_logs</code>。
              </div>

              <form id="webhookForm" onSubmit={handleWebhookSubmit}>
                <div className="field">
                  <label htmlFor="webhookUrl">WebHook 接收 URL</label>
                  <input id="webhookUrl" name="url" placeholder="https://你的接收服務/endpoint" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="eventTypes">事件類型（逗號分隔，或 * 代表全部）</label>
                  <input id="eventTypes" name="event_types" value={eventTypes} onChange={(event) => setEventTypes(event.target.value)} />
                </div>
                <div className="actions">
                  <button className="primary" type="submit">註冊 WebHook</button>
                  <button className="secondary" type="button" onClick={() => { setWebhookUrl(ownWebhookEndpoint); setEventTypes("note.created,ask.completed"); showBanner("已填入本專案的 WebHook endpoint，請按註冊完成設定。"); }}>使用本專案 endpoint</button>
                  <button className="secondary" type="button" onClick={handleLoadEvents}>查看事件紀錄</button>
                </div>
              </form>

              <div className="callout info"><strong>預期結果：</strong>註冊後建立一筆筆記，再按「查看事件紀錄」確認送出與接收事件。</div>
              <div id="webhookResult" className="result-box">{webhookResult}</div>
              <h3>最近事件（GET /events）</h3>
              <div id="eventsList" className="event-list">
                {events.length ? events.map((event) => <article className="event-card" key={event.id}><h3>{event.event_type} · #{event.id}</h3><p>{formatEventPayload(event.payload)}</p></article>) : <p className="lead">尚無事件。請先註冊 WebHook 並觸發 note/ask。</p>}
              </div>
            </section>

            <section className="panel" id="step-dify" ref={(node) => { sectionRefs.current.dify = node; }}>
              <h2>Step 4 · Dify 問答（POST /dify/ask）</h2>
              <p className="lead">
                Dify 是<strong>視覺化 LLM 平台</strong>：在後台拖 workflow、建知識庫，再透過 API 呼叫。本步驟與 Step 2 的 LangChain <code>/ask</code> 對照——前者走 Supabase Edge Function + 筆記檢索，後者走 Dify 後台編排。
              </p>
              <div className="callout warn" id="difyExplain">
                {health?.dify_configured
                  ? <><strong>Dify API 已設定</strong>。仍需 Google 登入並取得授權才能呼叫。</>
                  : <><strong>Step 4 尚未設定</strong>，請先在 Supabase Secrets 設定 Dify Cloud API。</>}
              </div>
              <div className="callout info" id="difyAuthExplain">
                {difyAuthMessage}
                {difyAccessError && <><br /><small>{difyAccessError}</small></>}
              </div>

              <div className="grid-2">
                <dl className="glossary">
                  <dt>LangChain /ask</dt><dd>本專案 Edge Function 編排，回傳 <code>sources</code>（筆記文字檢索結果）。</dd>
                  <dt>Dify /dify/ask</dt><dd>轉發到 Dify Chat App，回傳 <code>answer</code> 與 <code>raw</code>（Dify 原始 JSON）。</dd>
                  <dt>前置</dt><dd>免費 Dify Cloud 使用 <code>https://api.dify.ai/v1</code>；API Key 放在 Supabase Secrets。另需使用 Google 登入並取得 Dify 授權。</dd>
                </dl>
                <div className="callout info"><strong>免費 Dify Cloud（首次）</strong><br />建立 Chat App → Publish → API Access → 複製 App API Key</div>
              </div>

              <form id="difyForm" onSubmit={handleDifySubmit}>
                <div className="field">
                  <label htmlFor="difyQuestionInput">問題（會送到 Dify，不經 Chroma）</label>
                  <input id="difyQuestionInput" name="question" placeholder="例如：REST 的 GET 是做什麼？" value={difyQuestion} onChange={(event) => setDifyQuestion(event.target.value)} required />
                </div>
                <div className="actions">
                  <button className="primary" type="submit" id="difySubmitBtn" disabled={difyButtonDisabled}>送到 Dify</button>
                  <button className="secondary" type="button" onClick={() => setDifyQuestion("REST 的 GET 是做什麼？")}>使用範例問題</button>
                </div>
              </form>
              <h3>API 回傳（原始 JSON）</h3>
              <div id="difyResult" className="result-box">{difyResult}</div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
