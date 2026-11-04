import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL")
  },
  migrations: {
    path: "prisma/migrations",
    seed: "node_modules/.bin/tsx.CMD prisma/seed.ts"
  }
});
