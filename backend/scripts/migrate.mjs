// Applies pending SQL files from ../database/migrations in filename order.
// Each file runs in its own transaction and is recorded in schema_migrations.
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'database', 'migrations');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));
  const pending = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort();

  if (pending.length === 0) {
    console.log('Database is up to date.');
  }

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed on ${file}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
