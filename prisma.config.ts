import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Project convention is a single .env.local (see AGENTS.md) rather than Prisma's
// default .env — load it explicitly since Prisma CLI doesn't read .env.local itself.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
