export class SecurityError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

export type RateLimitRpcResult = {
  allowed: boolean;
  retry_after_seconds: number;
};

export type RateLimitRpc = (args: {
  p_route_key: string;
  p_bucket_key: string;
  p_limit: number;
  p_window_seconds: number;
}) => Promise<RateLimitRpcResult | null>;

const IPV4_OCTET_COUNT = 4;

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== IPV4_OCTET_COUNT ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first, second, third] = octets;
  return first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && second >= 18 && second <= 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  const firstHextet = normalized.split(":").find(Boolean);
  if (!firstHextet) {
    return false;
  }
  const firstValue = Number.parseInt(firstHextet, 16);
  if (!Number.isInteger(firstValue)) {
    return false;
  }

  // fc00::/7 is unique-local and fe80::/10 is link-local.
  if ((firstValue & 0xfe00) === 0xfc00 || (firstValue & 0xffc0) === 0xfe80) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4[1]) : false;
}

function canonicalizeWebhookUrl(rawUrl: string): string {
  if (rawUrl.includes("#")) {
    throw new SecurityError(422, "Webhook URL must not contain a fragment.");
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new SecurityError(422, "Webhook URL must be a valid HTTPS URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new SecurityError(422, "Webhook URL must use HTTPS.");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new SecurityError(422, "Webhook URL must not contain credentials.");
  }
  if (parsedUrl.port) {
    throw new SecurityError(422, "Webhook URL must use the standard HTTPS port.");
  }

  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) {
    throw new SecurityError(422, "Webhook URL must contain a hostname.");
  }
  if (
    hostname.endsWith(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    !hostname.includes(".") ||
    isPrivateIpv4(hostname) ||
    hostname.includes(":")
  ) {
    throw new SecurityError(422, "Webhook URL must not target a private, loopback, or link-local address.");
  }

  return parsedUrl.href;
}

export function parseWebhookAllowedUrls(rawValue: string): readonly string[] {
  const entries = rawValue.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    return [];
  }
  return [...new Set(entries.map(canonicalizeWebhookUrl))];
}

export function validateWebhookDestination(rawUrl: string, rawAllowlist: string): string {
  const allowedUrls = parseWebhookAllowedUrls(rawAllowlist);
  if (allowedUrls.length === 0) {
    throw new SecurityError(503, "Webhook delivery is disabled because WEBHOOK_ALLOWED_URLS is empty.");
  }

  const canonicalUrl = canonicalizeWebhookUrl(rawUrl);
  if (!allowedUrls.includes(canonicalUrl)) {
    throw new SecurityError(422, "Webhook URL is not in the exact WEBHOOK_ALLOWED_URLS allowlist.");
  }
  return canonicalUrl;
}

export function webhookRequestInit(
  body: string,
  headers: Record<string, string>,
): RequestInit {
  return {
    body,
    headers,
    method: "POST",
    redirect: "error",
  };
}

export type VerifiedUser = { id: string };

export function authorizeDifyUser(
  user: VerifiedUser | null,
  accessEnabled: boolean,
): string {
  if (!user?.id) {
    throw new SecurityError(401, "Your login session is invalid or expired.");
  }
  if (!accessEnabled) {
    throw new SecurityError(403, "Your account is not authorized to use Dify.");
  }
  return user.id;
}

export function buildDifyPayload(question: string, verifiedUserId: string): Record<string, unknown> {
  return {
    conversation_id: "",
    inputs: {},
    query: question,
    response_mode: "blocking",
    user: verifiedUserId,
  };
}

export type DifyGatewayDependencies = {
  authenticate: () => Promise<VerifiedUser | null>;
  accessEnabled: (userId: string) => Promise<boolean>;
  readBody: () => Promise<Record<string, unknown>>;
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  baseUrl: string;
  apiKey: string;
  maxQuestionLength: number;
  onAuthorized: (userId: string) => Promise<void>;
};

export async function executeDifyRequest(
  dependencies: DifyGatewayDependencies,
): Promise<{ question: string; userId: string; data: unknown }> {
  const verifiedUser = await dependencies.authenticate();
  const userId = authorizeDifyUser(
    verifiedUser,
    verifiedUser ? await dependencies.accessEnabled(verifiedUser.id) : false,
  );
  await dependencies.onAuthorized(userId);

  const body = await dependencies.readBody();
  const question = body.question;
  if (
    typeof question !== "string" ||
    question.trim().length < 1 ||
    question.trim().length > dependencies.maxQuestionLength
  ) {
    throw new SecurityError(422, "question must contain a valid bounded string.");
  }

  const response = await dependencies.fetch(
    `${dependencies.baseUrl.replace(/\/$/, "")}/chat-messages`,
    {
      body: JSON.stringify(buildDifyPayload(question.trim(), userId)),
      headers: {
        Authorization: `Bearer ${dependencies.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const rawResponse = await response.text();
  let data: unknown = null;
  if (rawResponse) {
    try {
      data = JSON.parse(rawResponse);
    } catch {
      data = rawResponse;
    }
  }
  if (!response.ok) {
    throw new SecurityError(502, "Dify request failed.");
  }
  return { data, question: question.trim(), userId };
}

export async function consumeRateLimit(
  rpc: RateLimitRpc,
  args: Parameters<RateLimitRpc>[0],
): Promise<void> {
  let result: RateLimitRpcResult | null;
  try {
    result = await rpc(args);
  } catch (error) {
    console.error("Rate limit RPC failed", error instanceof Error ? error.message : error);
    throw new SecurityError(503, "Rate limiting is temporarily unavailable.");
  }

  if (!result || typeof result.allowed !== "boolean") {
    throw new SecurityError(503, "Rate limiting is temporarily unavailable.");
  }
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil(Number(result.retry_after_seconds) || 1));
    throw new SecurityError(429, "Rate limit exceeded.", { "Retry-After": String(retryAfter) });
  }
}
