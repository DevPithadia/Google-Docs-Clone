import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Path to your Prisma schema file
  schema: 'prisma/schema.prisma',

  // Database connection configuration for CLI (Migrate, Introspection)
  datasource: {
    url: env('DATABASE_URL'),
  },

  // Migration configuration
  migrations: {
    path: 'prisma/migrations',
  },
})
