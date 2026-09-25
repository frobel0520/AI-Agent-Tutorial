import { assert, assertEquals } from "jsr:@std/assert@1";
import postgres from "npm:postgres@3.4.5";

// Applies the rate-limit migration to a throwaway Postgres database and calls
// the RPC directly. Skipped locally without RATE_LIMIT_TEST_DATABASE_URL; CI must set it.
const DATABASE_URL = Deno.env.get("RATE_LIMIT_TEST_DATABASE_URL");
const MIGRATION_URL = new URL(
  "../../migrations/20260909000000_add_edge_rate_limit.sql",
  import.meta.url,
);
// Supabase provides these roles; a plain Postgres database does not.
const SUPABASE_ROLES = ["anon", "authenticated", "service_role"];

type RateLimitRow = { allowed: boolean; retry_after_seconds: number };

const databaseTest = {
  ignore: !DATABASE_URL && Deno.env.get("CI") !== "true",
};

async function withMigratedDatabase(
  run: (sql: postgres.Sql) => Promise<void>,
): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error("RATE_LIMIT_TEST_DATABASE_URL is required in CI.");
  }
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    for (const role of SUPABASE_ROLES) {
      const [existing] = await sql`select 1 from pg_roles where rolname = ${role}`;
      if (!existing) {
        await sql.unsafe(`create role ${role}`);
      }
    }
    await sql`drop table if exists public.api_rate_limits`;
    await sql.unsafe(await Deno.readTextFile(MIGRATION_URL));
    await run(sql);
  } finally {
    await sql.end();
  }
}

async function consume(sql: postgres.Sql, limit: number): Promise<RateLimitRow> {
  const [row] = await sql<RateLimitRow[]>`
    select * from public.consume_api_rate_limit('POST:ask', 'global', ${limit}, 60)
  `;
  return row;
}

async function storedCount(sql: postgres.Sql): Promise<number> {
  const [row] = await sql<{ request_count: number }[]>`
    select request_count from public.api_rate_limits
    where route_key = 'POST:ask' and bucket_key = 'global'
  `;
  return row.request_count;
}

Deno.test({
  ...databaseTest,
  name: "consume_api_rate_limit denies calls past the limit and keeps the count bounded",
  fn: () =>
    withMigratedDatabase(async (sql) => {
      const results: RateLimitRow[] = [];
      for (let call = 0; call < 5; call++) {
        results.push(await consume(sql, 3));
      }

      assertEquals(results.map((result) => result.allowed), [true, true, true, false, false]);
      assert(results[3].retry_after_seconds >= 1);
      assertEquals(await storedCount(sql), 4);
    }),
});

Deno.test({
  ...databaseTest,
  name: "consume_api_rate_limit opens a new window after the old one expires",
  fn: () =>
    withMigratedDatabase(async (sql) => {
      await consume(sql, 1);
      assertEquals((await consume(sql, 1)).allowed, false);

      await sql`
        update public.api_rate_limits
        set window_started_at = now() - interval '61 seconds'
      `;

      assertEquals((await consume(sql, 1)).allowed, true);
      assertEquals(await storedCount(sql), 1);
    }),
});
