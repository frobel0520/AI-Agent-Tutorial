import assert from "node:assert/strict";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createApiHandler } from "./handler.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
type Row = Record<string, unknown>;
function fixture(config: Record<string, string> = {}) {
  const rows: Record<string, Row[]> = {
    notes: [{ id: 1, user_id: A, title: "Alice", content: "private A" }, {
      id: 2,
      user_id: B,
      title: "Bob",
      content: "private B",
    }, { id: 3, user_id: null, title: "Legacy", content: "unassigned" }],
    webhook_subscriptions: [],
    event_logs: [],
    webhook_deliveries: [],
    dify_access: [{ user_id: A, enabled: true }],
  };
  let queries = 0;
  let quotaAvailable = true;
  let quotaError = false;
  const fetches: { url: string; init: RequestInit }[] = [];
  const client = {
    auth: {
      getUser: (token: string) =>
        Promise.resolve({
          data: {
            user: token === "alice"
              ? { id: A }
              : token === "bob"
              ? { id: B }
              : null,
          },
          error: null,
        }),
    },
    rpc: () =>
      Promise.resolve({
        data: quotaAvailable,
        error: quotaError ? { message: "unavailable" } : null,
      }),
    from(table: string) {
      queries++;
      let action = "read", payload: Row = {}, columns = "*", single = false;
      const filters: [string, unknown][] = [];
      const q = {
        select(value: string) {
          columns = value;
          return q;
        },
        eq(key: string, value: unknown) {
          filters.push([key, value]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        single() {
          single = true;
          return q;
        },
        insert(value: Row) {
          action = "insert";
          payload = value;
          return q;
        },
        update(value: Row) {
          action = "update";
          payload = value;
          return q;
        },
        delete() {
          action = "delete";
          return q;
        },
        then(resolve: (result: { data: unknown; error: null }) => unknown) {
          let found = rows[table].filter((row) =>
            filters.every(([k, v]) => row[k] === v)
          );
          if (action === "insert") {
            const id = Math.max(
              0,
              ...rows[table].map((r) => Number(r.id) || 0),
            ) + 1;
            found = [{ id, created_at: new Date().toISOString(), ...payload }];
            rows[table].push(...found);
          }
          if (action === "update") {
            found.forEach((row) => Object.assign(row, payload));
          }
          if (action === "delete") {
            rows[table] = rows[table].filter((row) => !found.includes(row));
          }
          const projected = found.map((row) =>
            columns === "*"
              ? row
              : Object.fromEntries(columns.split(",").map((k) => [k, row[k]]))
          );
          return Promise.resolve(
            resolve({
              data: single ? projected[0] ?? null : projected,
              error: null,
            }),
          );
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  const handler = createApiHandler(
    client,
    (name) => config[name],
    ((url: string, init: RequestInit) => {
      fetches.push({ url, init });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            answer: "answer",
            choices: [{ message: { content: "answer" } }],
          }),
          { status: 200 },
        ),
      );
    }) as typeof fetch,
  );
  async function request(
    path: string,
    method = "GET",
    token = "alice",
    body?: Row,
    headers: Record<string, string> = {},
  ) {
    return handler(
      new Request(`https://example.supabase.co/functions/v1/api${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  }
  return {
    rows,
    fetches,
    request,
    get queries() {
      return queries;
    },
    exhaustQuota() {
      quotaAvailable = false;
    },
    failQuota() {
      quotaError = true;
    },
  };
}

Deno.test("unauthenticated and invalid tokens cannot access any data route", async () => {
  const f = fixture();
  for (const token of ["", "invalid", "anon-project-key"]) {
    for (
      const [path, method] of [
        ["/notes", "GET"],
        ["/notes", "POST"],
        ["/notes/1", "GET"],
        ["/notes/1", "PUT"],
        ["/notes/1", "DELETE"],
        ["/ask", "POST"],
        ["/events", "GET"],
        ["/webhooks", "GET"],
        ["/webhooks", "POST"],
        ["/webhooks/1", "DELETE"],
        ["/dify/ask", "POST"],
      ]
    ) {
      assert.equal(
        (await f.request(
          path,
          method,
          token,
          method === "POST" ? {} : undefined,
        )).status,
        401,
        path,
      );
    }
  }
  assert.equal(f.queries, 0);
  assert.equal(f.fetches.length, 0);
});

Deno.test("health, access probe and preflight stay public; extra path segments are rejected", async () => {
  const f = fixture();
  assert.equal((await f.request("/health", "GET", "")).status, 200);
  assert.equal((await f.request("/notes", "OPTIONS", "")).status, 204);
  assert.deepEqual(await (await f.request("/dify/access", "GET", "")).json(), {
    authenticated: false,
    authorized: false,
  });
  assert.equal((await f.request("/notes/1/extra")).status, 404);
  assert.equal(
    (await f.request("/dify/ask/extra", "POST", "alice", {})).status,
    404,
  );
});

Deno.test("notes and RAG sources only include the verified owner; legacy rows remain hidden", async () => {
  const f = fixture();
  const list = await (await f.request("/notes")).json();
  assert.deepEqual(list.map((n: Row) => n.id), [1]);
  const answer = await (await f.request("/ask", "POST", "alice", {
    question: "private",
    user_id: B,
  })).json();
  assert.deepEqual(answer.sources.map((n: Row) => n.id), [1]);
  assert.equal(f.rows.event_logs[0].user_id, A);
});

Deno.test("cross-user note reads, updates and deletes return 404 without mutation", async () => {
  const f = fixture();
  for (const id of [2, 3]) {
    for (const method of ["GET", "PUT", "DELETE"]) {
      assert.equal(
        (await f.request(
          `/notes/${id}`,
          method,
          "alice",
          method === "PUT" ? { content: "changed", user_id: A } : undefined,
        )).status,
        404,
      );
    }
  }
  assert.equal(f.rows.notes[1].content, "private B");
  assert.equal(f.rows.notes.length, 3);
});

Deno.test("owner can create, update and delete notes; submitted owner IDs are ignored", async () => {
  const f = fixture();
  const created = await f.request("/notes", "POST", "alice", {
    title: "new",
    content: "mine",
    user_id: B,
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  assert.equal(f.rows.notes.find((n) => n.id === id)?.user_id, A);
  assert.equal(
    (await f.request(`/notes/${id}`, "PUT", "alice", { content: "edited" }))
      .status,
    200,
  );
  assert.equal((await f.request(`/notes/${id}`, "DELETE")).status, 204);
});

Deno.test("events, webhook listing, deletion and dispatch are isolated", async () => {
  const url = "https://webhook.site/approved";
  const f = fixture({ WEBHOOK_ALLOWED_URLS: url });
  f.rows.webhook_subscriptions.push({
    id: 1,
    user_id: A,
    url,
    event_types: "*",
    secret: null,
  }, {
    id: 2,
    user_id: B,
    url: "https://webhook.site/bob",
    event_types: "*",
    secret: null,
  });
  f.rows.event_logs.push({
    id: 1,
    user_id: B,
    event_type: "secret",
    payload: "Bob's event",
  });
  assert.deepEqual(
    (await (await f.request("/webhooks")).json()).map((r: Row) => r.id),
    [1],
  );
  assert.equal((await f.request("/webhooks/2", "DELETE")).status, 404);
  await f.request("/notes", "POST", "alice", { title: "new", content: "mine" });
  assert.equal(f.fetches.length, 1);
  assert.equal(f.fetches[0].url, url);
  assert.equal(f.fetches[0].init.redirect, "error");
  assert.equal(JSON.parse(String(f.fetches[0].init.body)).user_id, A);
  assert.equal(f.rows.webhook_deliveries[0].user_id, A);
  assert.ok(
    (await (await f.request("/events")).json()).every((r: Row) =>
      r.event_type !== "secret"
    ),
  );
});

Deno.test("webhook URLs require exact approved HTTPS destinations at registration AND delivery", async () => {
  const url = "https://webhook.site/approved";
  const f = fixture({ WEBHOOK_ALLOWED_URLS: url });
  for (
    const rejected of [
      "http://webhook.site/approved",
      "https://webhook.site/other",
      "https://webhook.site/approved?extra=1",
      "https://127.0.0.1/",
      "https://user:pass@webhook.site/approved",
      url + "#fragment",
      "https://webhook.site.evil.test/approved",
    ]
  ) {
    assert.equal(
      (await f.request("/webhooks", "POST", "alice", { url: rejected })).status,
      422,
    );
  }
  assert.equal(
    (await f.request("/webhooks", "POST", "alice", { url, user_id: B })).status,
    201,
  );
  assert.equal(f.rows.webhook_subscriptions[0].user_id, A);
  f.rows.webhook_subscriptions[0].url = "http://127.0.0.1/legacy";
  await f.request("/notes", "POST", "alice", {
    title: "test",
    content: "test",
  });
  assert.equal(f.fetches.length, 0);
  assert.equal(f.rows.webhook_deliveries[0].success, 0);
  const disabled = fixture();
  assert.equal(
    (await disabled.request("/webhooks", "POST", "alice", { url })).status,
    503,
  );
});

Deno.test("hosted models require allowlist; quota failures block calls; Dify identity is server-owned", async () => {
  const f = fixture({
    LLM_PROVIDER: "openai",
    OPENAI_API_KEY: "test",
    DIFY_API_BASE: "https://api.dify.ai/v1",
    DIFY_API_KEY: "test",
  });
  assert.equal(
    (await f.request("/ask", "POST", "bob", { question: "hello" })).status,
    403,
  );
  assert.equal(
    (await f.request("/dify/ask", "POST", "bob", { question: "hello" })).status,
    403,
  );
  assert.equal(f.fetches.length, 0);
  assert.equal(
    (await f.request("/dify/ask", "POST", "alice", {
      question: "hello",
      user: B,
    })).status,
    200,
  );
  assert.equal(JSON.parse(String(f.fetches[0].init.body)).user, A);
  f.exhaustQuota();
  assert.equal(
    (await f.request("/ask", "POST", "alice", { question: "hello" })).status,
    429,
  );
  assert.equal(
    (await f.request("/dify/ask", "POST", "alice", { question: "hello" }))
      .status,
    429,
  );
  assert.equal(f.fetches.length, 1);
  f.failQuota();
  assert.equal(
    (await f.request("/ask", "POST", "alice", { question: "hello" })).status,
    500,
  );
  assert.equal(f.fetches.length, 1);
});

Deno.test("incoming webhook needs HMAC and signed owner, never a browser bearer token", async () => {
  const f = fixture({ WEBHOOK_SECRET: "test-shared-secret" });
  const body = { user_id: A, type: "note.created", data: { title: "example" } };
  assert.equal(
    (await f.request("/hooks/incoming", "POST", "alice", body)).status,
    401,
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("test-shared-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(JSON.stringify(body)),
      ),
    ),
  ).map((v) => v.toString(16).padStart(2, "0")).join("");
  assert.equal(
    (await f.request("/hooks/incoming", "POST", "", body, {
      "X-Webhook-Signature": signature,
    })).status,
    202,
  );
  assert.equal(f.rows.event_logs[0].user_id, A);
  assert.equal(
    (await f.request("/hooks/incoming", "POST", "", { ...body, user_id: B }, {
      "X-Webhook-Signature": signature,
    })).status,
    401,
  );
});
