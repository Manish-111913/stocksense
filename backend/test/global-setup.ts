import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

// Integration tests run against a throwaway database (the ledger is append-only, so tests must
// never write to the real one). It's created fresh from the migrations and dropped afterwards.
const TEST_DB = 'stocksense_test';

function urlFor(database: string) {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${database}`;
  return url.toString();
}

async function admin(sql: string) {
  const client = new pg.Client({ connectionString: urlFor('postgres') });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function setup(project: TestProject) {
  await admin(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin(`CREATE DATABASE ${TEST_DB}`);
  execFileSync(process.execPath, ['scripts/migrate.mjs'], {
    env: { ...process.env, DATABASE_URL: urlFor(TEST_DB) },
    stdio: 'ignore',
  });
  project.provide('databaseUrl', urlFor(TEST_DB));
}

export async function teardown() {
  await admin(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
