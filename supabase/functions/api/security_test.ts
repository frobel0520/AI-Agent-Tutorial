import { assert, assertEquals } from "jsr:@std/assert@1";
import { RATE_LIMIT_ROUTE_KEYS, rateLimitRouteKey } from "./security.ts";

const MIGRATION_URL = new URL(
  "../../migrations/20260909000000_add_edge_rate_limit.sql",
  import.meta.url,
);
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
const ROUTES = [
  [],
  ["health"],
  ["notes"],
  ["notes", "1"],
  ["ask"],
  ["ask", "extra"],
  ["webhooks"],
  ["webhooks", "1"],
  ["events"],
  ["hooks", "incoming"],
  ["dify", "ask"],
  ["dify", "access"],
  ["unknown"],
];

async function migrationRouteKeys(): Promise<string[]> {
  const sql = await Deno.readTextFile(MIGRATION_URL);
  const list = sql.match(/p_route_key not in \(([^)]*)\)/)?.[1];
  assert(list, "consume_api_rate_limit route allowlist not found in the migration.");
  return [...list.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
}

Deno.test("RATE_LIMIT_ROUTE_KEYS matches the migration allowlist", async () => {
  assertEquals([...RATE_LIMIT_ROUTE_KEYS].sort(), await migrationRouteKeys());
});

Deno.test("every method and route maps to a key the database accepts", async () => {
  const allowed = new Set(await migrationRouteKeys());
  for (const method of METHODS) {
    for (const route of ROUTES) {
      const routeKey = rateLimitRouteKey(method, route);
      assert(
        routeKey === null || allowed.has(routeKey),
        `${method} /${route.join("/")} produced ${routeKey}, which the database rejects with a 503.`,
      );
    }
  }
});

Deno.test("a method the route does not serve falls back to the other class", () => {
  assertEquals(rateLimitRouteKey("GET", ["ask"]), "GET:other");
  assertEquals(rateLimitRouteKey("PUT", ["webhooks"]), "PUT:other");
  assertEquals(rateLimitRouteKey("PATCH", ["notes", "1"]), "OTHER:other");
  assertEquals(rateLimitRouteKey("POST", ["ask"]), "POST:ask");
  assertEquals(rateLimitRouteKey("GET", ["health"]), null);
});
