import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// The database schema is owned by the SQL files in ../database/migrations.
// `npm run db:pull` refreshes prisma/schema.prisma from the running database.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
