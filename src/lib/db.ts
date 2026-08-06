import { Pool, type PoolClient, type QueryResultRow } from "pg"

const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres"

export const dbPool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  max: process.env.NODE_ENV === "production" ? 5 : 2,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
})

export function hasDatabaseEnv() {
  return Boolean(process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL)
}

export async function systemQuery<Row extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return dbPool.query<Row>(text, values)
}

export async function withRlsUser<T>(userId: string, callback: (client: PoolClient) => Promise<T>) {
  const client = await dbPool.connect()
  try {
    await client.query("begin")
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId])
    await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)")
    await client.query("set local role authenticated")
    const result = await callback(client)
    await client.query("commit")
    return result
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
}
