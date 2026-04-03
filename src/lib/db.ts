// D1 HTTP API client — server-side only
const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const dbId = process.env.D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !dbId || !token) {
    throw new Error("Missing CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, or CLOUDFLARE_API_TOKEN env vars");
  }
  return { accountId, dbId, token };
}

interface D1Result<T> {
  results: T[];
  meta: { changes: number; last_row_id: number; duration: number };
}

async function rawQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<D1Result<T>> {
  const { accountId, dbId, token } = getConfig();
  const res = await fetch(
    `${API_BASE}/${accountId}/d1/database/${dbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    }
  );
  const data = await res.json() as {
    success: boolean;
    errors?: { message: string }[];
    result: D1Result<T>[];
  };
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message ?? "D1 query failed");
  }
  return data.result[0];
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await rawQuery<T>(sql, params);
  return result.results;
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; last_row_id: number }> {
  const result = await rawQuery(sql, params);
  return { changes: result.meta.changes, last_row_id: result.meta.last_row_id };
}

// Helper to generate UUIDs
export function uuid(): string {
  return crypto.randomUUID();
}
