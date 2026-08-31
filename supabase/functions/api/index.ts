import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const FUNCTION_NAME = "api";
const DEFAULT_APP_NAME = "AI-Agent-Tutorial";
const DEFAULT_TOP_K = 3;
const MAX_RETRIEVAL_NOTES = 500;
const MAX_WEBHOOK_RESPONSE_BODY = 2000;
const MAX_INCOMING_WEBHOOK_BODY = 100_000;
const WEBHOOK_TIMEOUT_MS = 10_000;
const LLM_TIMEOUT_MS = 60_000;
const DOCS_URL = "https://github.com/frobel0520/AI-Agent-Tutorial/tree/main/docs";
const NOTE_COLUMNS = "id,title,content,created_at,updated_at";
const SYSTEM_PROMPT =
  "You are a patient tutor. Answer using only the provided context. " +
  "If the answer is not in the context, say you do not know.";

type JsonObject = Record<string, unknown>;

type NoteRow = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type WebhookSubscriptionRow = {
  id: number;
  url: string;
  event_types: string;
  secret: string | null;
  created_at: string;
};

type EventRow = {
  id: number;
  event_type: string;
  payload: string;
  created_at: string;
};

type EventInsertRow = {
  id: number;
  created_at: string;
};

type DifyAccessRow = {
  enabled: boolean;
};

type AuthenticatedUser = {
  id: string;
};

type RouteResult = {
  status: number;
  body: unknown;
};

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "HttpError";
  }
}

function env(name: string, fallback = ""): string {
  return (Deno.env.get(name) ?? fallback).trim();
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getServiceRoleKey(): string {
  const legacyKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) {
    return legacyKey;
  }

  const secretKeys = env("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
      for (const keyName of ["service_role", "service-role", "serviceRole"]) {
        const candidate = parsed[keyName];
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch (error) {
      console.error("Unable to parse SUPABASE_SECRET_KEYS", error);
    }
  }

  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
}

const supabaseUrl = requiredEnv("SUPABASE_URL");
const supabaseServiceRoleKey = getServiceRoleKey();
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function databaseError(error: { message?: string } | null, operation: string): never {
  console.error(`Supabase ${operation} failed`, error?.message ?? error);
  throw new HttpError(500, "Database operation failed.");
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("Authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match?.[1]?.trim()) {
    throw new HttpError(401, "Login is required to use Dify.");
  }
  return match[1].trim();
}

async function authenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const token = bearerToken(request);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    console.error("Dify authentication failed", error?.message ?? "user not found");
    throw new HttpError(401, "Your login session is invalid or expired.");
  }
  return { id: data.user.id };
}

async function difyAccessEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("dify_access")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    databaseError(error, "Dify access check");
  }
  return (data as DifyAccessRow | null)?.enabled === true;
}

async function requireDifyAccess(request: Request): Promise<void> {
  const user = await authenticatedUser(request);
  if (!await difyAccessEnabled(user.id)) {
    throw new HttpError(403, "Your account is not authorized to use Dify.");
  }
}

async function readDifyAccess(request: Request): Promise<RouteResult> {
  try {
    const user = await authenticatedUser(request);
    return {
      status: 200,
      body: {
        authenticated: true,
        authorized: await difyAccessEnabled(user.id),
      },
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return {
        status: 200,
        body: { authenticated: false, authorized: false },
      };
    }
    throw error;
  }
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const configuredOrigins = env("CORS_ORIGINS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let allowOrigin = "*";
  if (configuredOrigins.length > 0) {
    allowOrigin = origin
      ? configuredOrigins.includes(origin)
        ? origin
        : "null"
      : configuredOrigins[0];
  }

  return {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-event-type, x-webhook-signature",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  request: Request,
): Response {
  const headers = corsHeaders(request);
  if (status === 204) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function parseJsonObject(rawBody: string): JsonObject {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(422, "Request body must be a JSON object.");
  }
  return body as JsonObject;
}

async function readJsonBody(request: Request): Promise<JsonObject> {
  return parseJsonObject(await request.text());
}

async function readRawBody(request: Request, maxLength: number): Promise<string> {
  const rawBody = await request.text();
  if (rawBody.length > maxLength) {
    throw new HttpError(413, "Request body is too large.");
  }
  return rawBody;
}

function requiredString(
  body: JsonObject,
  field: string,
  minLength = 1,
  maxLength = Number.MAX_SAFE_INTEGER,
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw new HttpError(422, `${field} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new HttpError(
      422,
      `${field} must contain between ${minLength} and ${maxLength} characters.`,
    );
  }
  return normalized;
}

function optionalString(
  body: JsonObject,
  field: string,
  minLength = 1,
  maxLength = Number.MAX_SAFE_INTEGER,
): string | null {
  const value = body[field];
  if (value === undefined || value === null) {
    return null;
  }
  return requiredString(body, field, minLength, maxLength);
}

function parseId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(422, "The id must be a positive integer.");
  }
  return id;
}

function parseTopK(body: JsonObject): number {
  const value = body.top_k ?? DEFAULT_TOP_K;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10) {
    throw new HttpError(422, "top_k must be an integer between 1 and 10.");
  }
  return value;
}

async function listNotes(): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .order("id", { ascending: false });
  if (error) {
    databaseError(error, "note listing");
  }
  return (data ?? []) as NoteRow[];
}

async function findNote(noteId: number): Promise<NoteRow> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("id", noteId)
    .maybeSingle();
  if (error) {
    databaseError(error, "note lookup");
  }
  if (!data) {
    throw new HttpError(404, "Note not found");
  }
  return data as NoteRow;
}

async function createNote(request: Request): Promise<RouteResult> {
  const body = await readJsonBody(request);
  const title = requiredString(body, "title", 1, 200);
  const content = requiredString(body, "content");
  const { data, error } = await supabase
    .from("notes")
    .insert({ title, content })
    .select(NOTE_COLUMNS)
    .single();
  if (error) {
    databaseError(error, "note creation");
  }

  const note = data as NoteRow;
  await dispatchEvent("note.created", { note_id: note.id, title: note.title });
  return { status: 201, body: note };
}

async function updateNote(request: Request, noteId: number): Promise<RouteResult> {
  await findNote(noteId);
  const body = await readJsonBody(request);
  const title = optionalString(body, "title", 1, 200);
  const content = optionalString(body, "content");
  if (title === null && content === null) {
    throw new HttpError(422, "At least one of title or content is required.");
  }

  const changes: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (title !== null) {
    changes.title = title;
  }
  if (content !== null) {
    changes.content = content;
  }

  const { data, error } = await supabase
    .from("notes")
    .update(changes)
    .eq("id", noteId)
    .select(NOTE_COLUMNS)
    .single();
  if (error) {
    databaseError(error, "note update");
  }

  const note = data as NoteRow;
  await dispatchEvent("note.updated", { note_id: note.id, title: note.title });
  return { status: 200, body: note };
}

async function deleteNote(noteId: number): Promise<RouteResult> {
  await findNote(noteId);
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    databaseError(error, "note deletion");
  }
  await dispatchEvent("note.deleted", { note_id: noteId });
  return { status: 204, body: null };
}

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function scoreNote(note: NoteRow, terms: string[]): number {
  const title = note.title.toLowerCase();
  const content = note.content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) {
      score += 4;
    }
    if (content.includes(term)) {
      score += 1;
    }
  }
  return score;
}

function selectRelevantNotes(notes: NoteRow[], question: string, topK: number): NoteRow[] {
  const terms = tokenize(question).filter((term) => term.length > 1);
  return notes
    .slice(0, MAX_RETRIEVAL_NOTES)
    .map((note) => ({ note, score: scoreNote(note, terms) }))
    .sort((left, right) => right.score - left.score || right.note.id - left.note.id)
    .slice(0, topK)
    .map(({ note }) => note);
}

function formatContext(notes: NoteRow[]): string {
  if (notes.length === 0) {
    return "No notes yet.";
  }
  return notes.map((note) => `[${note.title}] ${note.content}`).join("\n\n");
}

function configuredProvider(): string {
  return env("LLM_PROVIDER", "mock").toLowerCase();
}

function llmReady(provider: string): boolean {
  switch (provider) {
    case "mock":
      return true;
    case "openai":
      return Boolean(env("OPENAI_API_KEY"));
    case "groq":
      return Boolean(env("GROQ_API_KEY"));
    case "gemini":
      return Boolean(env("GOOGLE_API_KEY") && env("GEMINI_MODEL"));
    case "ollama":
      return false;
    default:
      return false;
  }
}

function requireConfiguration(name: string): string {
  const value = env(name);
  if (!value) {
    throw new HttpError(503, `${name} is required for the configured provider.`);
  }
  return value;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseData(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const message = (data as JsonObject).error;
    if (typeof message === "string") {
      return message;
    }
    if (message && typeof message === "object") {
      const nested = (message as JsonObject).message;
      if (typeof nested === "string") {
        return nested;
      }
    }
  }
  return fallback;
}

async function callOpenAiCompatible(
  provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  question: string,
  context: string,
): Promise<string> {
  const response = await fetchWithTimeout(
    `${endpoint.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { content: SYSTEM_PROMPT, role: "system" },
          { content: `Context:\n${context}\n\nQuestion: ${question}`, role: "user" },
        ],
        model,
        temperature: 0.2,
      }),
    },
    LLM_TIMEOUT_MS,
  );
  const data = await responseData(response);
  if (!response.ok) {
    console.error(`${provider} request failed`, response.status, errorMessage(data, "unknown error"));
    throw new HttpError(502, `${provider} request failed.`);
  }

  const answer = (data as JsonObject | null)?.choices;
  const content = Array.isArray(answer)
    ? (answer[0] as JsonObject | undefined)?.message
    : undefined;
  const text = content && typeof content === "object"
    ? (content as JsonObject).content
    : undefined;
  if (typeof text !== "string" || !text.trim()) {
    throw new HttpError(502, `${provider} returned no answer.`);
  }
  return text.trim();
}

async function callGemini(
  apiKey: string,
  model: string,
  question: string,
  context: string,
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }],
          role: "user",
        }],
        generationConfig: { temperature: 0.2 },
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      }),
    },
    LLM_TIMEOUT_MS,
  );
  const data = await responseData(response);
  if (!response.ok) {
    console.error("Gemini request failed", response.status, errorMessage(data, "unknown error"));
    throw new HttpError(502, "Gemini request failed.");
  }

  const candidates = (data as JsonObject | null)?.candidates;
  const parts = Array.isArray(candidates)
    ? ((candidates[0] as JsonObject | undefined)?.content as JsonObject | undefined)?.parts
    : undefined;
  const text = Array.isArray(parts)
    ? parts
      .map((part) => (part as JsonObject).text)
      .filter((part): part is string => typeof part === "string")
      .join("")
    : "";
  if (!text.trim()) {
    throw new HttpError(502, "Gemini returned no answer.");
  }
  return text.trim();
}

async function generateAnswer(
  provider: string,
  question: string,
  context: string,
): Promise<string> {
  if (provider === "mock") {
    return (
      "[Mock LLM] Based on your notes, here is a tutorial-style answer. " +
      `Question: ${question}. ` +
      "Switch LLM_PROVIDER to groq, gemini, or openai when you are ready for real models."
    );
  }

  if (provider === "groq") {
    return callOpenAiCompatible(
      provider,
      "https://api.groq.com/openai/v1",
      requireConfiguration("GROQ_API_KEY"),
      env("GROQ_MODEL", "llama-3.3-70b-versatile"),
      question,
      context,
    );
  }

  if (provider === "openai") {
    return callOpenAiCompatible(
      provider,
      "https://api.openai.com/v1",
      requireConfiguration("OPENAI_API_KEY"),
      env("OPENAI_MODEL", "gpt-4o-mini"),
      question,
      context,
    );
  }

  if (provider === "gemini") {
    return callGemini(
      requireConfiguration("GOOGLE_API_KEY"),
      requireConfiguration("GEMINI_MODEL"),
      question,
      context,
    );
  }

  if (provider === "ollama") {
    throw new HttpError(503, "Ollama is local-only and cannot run inside a hosted Edge Function.");
  }

  throw new HttpError(503, `Unsupported LLM_PROVIDER: ${provider}`);
}

function matchesEvent(subscription: WebhookSubscriptionRow, eventType: string): boolean {
  if (subscription.event_types.trim() === "*") {
    return true;
  }
  return subscription.event_types
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(eventType);
}

async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function receiveIncomingWebhook(request: Request): Promise<RouteResult> {
  const secret = env("WEBHOOK_SECRET");
  if (!secret) {
    throw new HttpError(503, "WEBHOOK_SECRET is not configured.");
  }

  const rawBody = await readRawBody(request, MAX_INCOMING_WEBHOOK_BODY);
  const receivedSignature = request.headers.get("X-Webhook-Signature")?.trim().toLowerCase() ?? "";
  const expectedSignature = await signPayload(secret, rawBody);
  if (!receivedSignature || !constantTimeEqual(receivedSignature, expectedSignature)) {
    throw new HttpError(401, "Invalid webhook signature.");
  }

  const body = parseJsonObject(rawBody);
  const sourceEventType = request.headers.get("X-Event-Type")?.trim() || "unknown";
  const eventPayload = {
    body,
    received_at: new Date().toISOString(),
    source: "supabase-self-webhook",
    source_event_type: sourceEventType,
  } satisfies JsonObject;
  const eventResult = await supabase
    .from("event_logs")
    .insert({ event_type: "webhook.received", payload: JSON.stringify(eventPayload) })
    .select("id,created_at")
    .single();
  if (eventResult.error) {
    databaseError(eventResult.error, "incoming webhook recording");
  }

  return {
    status: 202,
    body: {
      accepted: true,
      event_id: (eventResult.data as EventInsertRow).id,
      source_event_type: sourceEventType,
    },
  };
}

async function dispatchEvent(eventType: string, payload: JsonObject): Promise<void> {
  const serialized = JSON.stringify(payload);
  const eventResult = await supabase
    .from("event_logs")
    .insert({ event_type: eventType, payload: serialized })
    .select("id,created_at")
    .single();
  if (eventResult.error) {
    databaseError(eventResult.error, "event creation");
  }

  const event = eventResult.data as EventInsertRow;
  const subscriptionsResult = await supabase
    .from("webhook_subscriptions")
    .select("id,url,event_types,secret,created_at")
    .order("id", { ascending: true });
  if (subscriptionsResult.error) {
    databaseError(subscriptionsResult.error, "webhook subscription listing");
  }

  for (const subscription of (subscriptionsResult.data ?? []) as WebhookSubscriptionRow[]) {
    if (!matchesEvent(subscription, eventType)) {
      continue;
    }

    const body = {
      id: event.id,
      type: eventType,
      created_at: event.created_at,
      data: payload,
    };
    const bodyText = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Event-Type": eventType,
    };
    const secret = subscription.secret?.trim() || env("WEBHOOK_SECRET");
    if (secret) {
      headers["X-Webhook-Signature"] = await signPayload(secret, bodyText);
    }

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let success = 0;
    try {
      const response = await fetchWithTimeout(
        subscription.url,
        { method: "POST", headers, body: bodyText },
        WEBHOOK_TIMEOUT_MS,
      );
      statusCode = response.status;
      responseBody = (await response.text()).slice(0, MAX_WEBHOOK_RESPONSE_BODY);
      success = response.status < 400 ? 1 : 0;
    } catch (error) {
      responseBody = error instanceof Error ? error.message : String(error);
    }

    const deliveryResult = await supabase.from("webhook_deliveries").insert({
      created_at: new Date().toISOString(),
      event_id: event.id,
      response_body: responseBody,
      status_code: statusCode,
      subscription_id: subscription.id,
      success,
    });
    if (deliveryResult.error) {
      databaseError(deliveryResult.error, "webhook delivery recording");
    }
  }
}

async function askQuestion(request: Request): Promise<RouteResult> {
  const body = await readJsonBody(request);
  const question = requiredString(body, "question");
  const topK = parseTopK(body);
  const notes = await listNotes();
  const sources = selectRelevantNotes(notes, question, topK);
  const provider = configuredProvider();
  const answer = await generateAnswer(provider, question, formatContext(sources));
  await dispatchEvent("ask.completed", {
    provider,
    question,
    source_count: sources.length,
  });
  return {
    status: 200,
    body: { answer, provider, question, sources },
  };
}

async function listWebhooks(): Promise<RouteResult> {
  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .select("id,url,event_types,created_at")
    .order("id", { ascending: false });
  if (error) {
    databaseError(error, "webhook listing");
  }
  return { status: 200, body: data ?? [] };
}

async function createWebhook(request: Request): Promise<RouteResult> {
  const body = await readJsonBody(request);
  const url = requiredString(body, "url", 1, 500);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new HttpError(422, "url must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new HttpError(422, "url must be a valid HTTP or HTTPS URL.");
  }

  const eventTypes = typeof body.event_types === "undefined"
    ? "*"
    : requiredString(body, "event_types", 1, 200);
  const secret = optionalString(body, "secret", 1, 200);
  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .insert({ event_types: eventTypes, secret, url })
    .select("id,url,event_types,created_at")
    .single();
  if (error) {
    databaseError(error, "webhook creation");
  }
  return { status: 201, body: data };
}

async function deleteWebhook(webhookId: number): Promise<RouteResult> {
  const { data, error: lookupError } = await supabase
    .from("webhook_subscriptions")
    .select("id")
    .eq("id", webhookId)
    .maybeSingle();
  if (lookupError) {
    databaseError(lookupError, "webhook lookup");
  }
  if (!data) {
    throw new HttpError(404, "Webhook not found");
  }

  const { error } = await supabase.from("webhook_subscriptions").delete().eq("id", webhookId);
  if (error) {
    databaseError(error, "webhook deletion");
  }
  return { status: 204, body: null };
}

async function listEvents(): Promise<RouteResult> {
  const { data, error } = await supabase
    .from("event_logs")
    .select("id,event_type,payload,created_at")
    .order("id", { ascending: false })
    .limit(50);
  if (error) {
    databaseError(error, "event listing");
  }
  return { status: 200, body: (data ?? []) as EventRow[] };
}

async function askDify(request: Request): Promise<RouteResult> {
  await requireDifyAccess(request);
  const body = await readJsonBody(request);
  const question = requiredString(body, "question");
  const user = typeof body.user === "undefined" ? "tutorial-user" : requiredString(body, "user");
  const baseUrl = requireConfiguration("DIFY_API_BASE").replace(/\/$/, "");
  const apiKey = requireConfiguration("DIFY_API_KEY");
  const response = await fetchWithTimeout(
    `${baseUrl}/chat-messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: "",
        inputs: {},
        query: question,
        response_mode: "blocking",
        user,
      }),
    },
    LLM_TIMEOUT_MS,
  );
  const data = await responseData(response);
  if (!response.ok) {
    console.error("Dify request failed", response.status, errorMessage(data, "unknown error"));
    throw new HttpError(502, "Dify request failed.");
  }

  const objectData: JsonObject = data && typeof data === "object" && !Array.isArray(data)
    ? data as JsonObject
    : {};
  const answer = objectData.answer ?? objectData.message;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new HttpError(502, "Dify returned no answer.");
  }

  const result = { answer: answer.trim(), provider: "dify", question, raw: data };
  await dispatchEvent("dify.ask.completed", { provider: "dify", question });
  return { status: 200, body: result };
}

function getRoute(request: Request): string[] {
  const pathname = new URL(request.url).pathname.replace(/\/$/, "") || "/";
  const prefixes = [
    `/functions/v1/${FUNCTION_NAME}`,
    `/${FUNCTION_NAME}`,
    "/api",
  ];
  for (const prefix of prefixes) {
    if (pathname === prefix) {
      return [];
    }
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length + 1).split("/").filter(Boolean);
    }
  }
  return pathname.split("/").filter(Boolean);
}

async function routeRequest(request: Request): Promise<RouteResult> {
  const route = getRoute(request);
  const [resource, identifier, action] = route;

  if (route.length === 0 || (resource === "health" && request.method === "GET")) {
    const provider = configuredProvider();
    const ready = llmReady(provider);
    return {
      status: 200,
      body: {
        app_name: env("APP_NAME", DEFAULT_APP_NAME),
        dify_configured: Boolean(env("DIFY_API_BASE") && env("DIFY_API_KEY")),
        docs_url: DOCS_URL,
        llm_provider: provider,
        llm_ready: ready,
        ollama_base_url: provider === "ollama" ? env("OLLAMA_BASE_URL", "http://localhost:11434") : null,
        ollama_model: provider === "ollama" ? env("OLLAMA_MODEL", "llama3.2") : null,
        persistent_data: true,
        status: ready ? "ok" : "degraded",
        storage: "supabase",
      },
    };
  }

  if (resource === "notes") {
    if (!identifier && request.method === "GET") {
      return { status: 200, body: await listNotes() };
    }
    if (!identifier && request.method === "POST") {
      return createNote(request);
    }
    if (!identifier) {
      throw new HttpError(405, "Method not allowed for /notes.");
    }
    const noteId = parseId(identifier);
    if (!action && request.method === "GET") {
      return { status: 200, body: await findNote(noteId) };
    }
    if (!action && request.method === "PUT") {
      return updateNote(request, noteId);
    }
    if (!action && request.method === "DELETE") {
      return deleteNote(noteId);
    }
  }

  if (resource === "ask" && !identifier && request.method === "POST") {
    return askQuestion(request);
  }

  if (resource === "hooks" && identifier === "incoming" && request.method === "POST") {
    return receiveIncomingWebhook(request);
  }

  if (resource === "webhooks") {
    if (!identifier && request.method === "GET") {
      return listWebhooks();
    }
    if (!identifier && request.method === "POST") {
      return createWebhook(request);
    }
    if (identifier && request.method === "DELETE") {
      return deleteWebhook(parseId(identifier));
    }
  }

  if (resource === "events" && !identifier && request.method === "GET") {
    return listEvents();
  }

  if (resource === "dify" && identifier === "ask" && request.method === "POST") {
    return askDify(request);
  }

  if (resource === "dify" && identifier === "access" && request.method === "GET") {
    return readDifyAccess(request);
  }

  throw new HttpError(404, "Endpoint not found.");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse(null, 204, request);
  }

  try {
    const result = await routeRequest(request);
    return jsonResponse(result.body, result.status, request);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ detail: error.detail }, error.status, request);
    }
    console.error("Unhandled API error", error);
    return jsonResponse({ detail: "Internal server error." }, 500, request);
  }
});
