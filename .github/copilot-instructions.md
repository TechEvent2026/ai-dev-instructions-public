# Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM 7** + **SQLite** (driver adapter required)
- **shadcn/ui** + **Tailwind CSS**
- **Auth.js** (NextAuth v5)
- **Zod**
- **pnpm**

# Project Structure

```
app/           # App Router pages and layouts
components/    # Reusable UI components (shadcn/ui components here)
lib/           # Utilities, Prisma client, auth config, etc.
prisma/        # schema.prisma, migrations, seed.ts
generated/     # Prisma generated client (auto-generated, gitignored)
```

# Setup Workflow

When initializing the project from scratch, follow this exact order:

1. `pnpm create next-app@latest . --yes`
2. Delete `pnpm-workspace.yaml` if it was created (it breaks shadcn CLI)
3. `pnpm dlx shadcn@latest init -y` (package name is `shadcn`, not `shadcn-ui`)
4. Install dependencies:
   ```
   pnpm add @prisma/adapter-better-sqlite3 next-auth@beta @auth/prisma-adapter bcryptjs zod
   pnpm add -D prisma @types/bcryptjs tsx
   ```
5. `npx prisma init --datasource-provider sqlite`
6. Create schema (see Prisma section below), then `npx prisma migrate dev --name init`
7. Create seed script, then `npx prisma db seed`
8. Generate AUTH_SECRET: `npx auth secret` (writes to `.env.local`)
9. Set up `next.config.ts` with `allowedOrigins` (see Development Environment section)

# Conventions

- Use Server Components by default. Add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Access the database in Server Components or Server Actions only. Never call Prisma from client components.
- Use a singleton pattern for Prisma Client (`lib/prisma.ts`) to prevent multiple instances during dev hot reload.
- Validate all user input with Zod schemas before processing in Server Actions.
- Prefer shadcn/ui components over custom UI. Customize via Tailwind CSS.
- Configure Auth.js in `lib/auth.ts`. Use Prisma Adapter for session/user persistence.
- Use `pnpm` for all package management commands.
- Adding shadcn components: `pnpm dlx shadcn@latest add <component-name>`

# Prisma 7 + SQLite

## Critical Rules

- **Prisma 7 requires a driver adapter.** Do NOT use `new PrismaClient()` without an adapter — it will fail at runtime.
- **SQLite does NOT support `@db.Text` or any `@db.*` native type annotations.** Remove them from any schema examples.
- Generator must output to a local directory:
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../generated/prisma"
  }
  ```

## Schema (SQLite + Auth.js)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@id([identifier, token])
}
```

Add application-specific models (e.g., Part, Category) below the Auth.js models.

## Prisma Client Singleton (`lib/prisma.ts`)

```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

# Auth.js v5

## Critical Rule

**When using Credentials provider WITH Prisma Adapter, you MUST set `session: { strategy: "jwt" }`.** Without this, Auth.js defaults to database sessions which are incompatible with Credentials provider, and login will silently fail.

## File Structure

- `lib/auth.ts` — main config, exports `{ auth, handlers, signIn, signOut }`
- `app/api/auth/[...nextauth]/route.ts` — must export `{ GET, POST }` from handlers

## Minimal `lib/auth.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },  // REQUIRED with Credentials + Adapter
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }).safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
```

## Route Handler (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

## Required `.env`

```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="<generated by: npx auth secret>"
AUTH_TRUST_HOST=true
```

# Seed Data

For development, create test users with hashed passwords.

Add to `package.json`:
```json
{ "prisma": { "seed": "npx tsx prisma/seed.ts" } }
```

Seed script pattern (`prisma/seed.ts`):
```typescript
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", password: hash },
  });
}

main();
```

Run: `npx prisma db seed`

# Development Environment

- This project is developed in **GitHub Codespaces**. The dev server is accessed via `https://<codespace-name>-<port>.app.github.dev` (not `localhost`).
- All origin-based configurations (CORS, allowed origins, CSRF, Auth.js callbacks, etc.) must include `*.app.github.dev` in addition to `localhost`.
- `AUTH_TRUST_HOST=true` must be set in `.env` for Auth.js to work in Codespaces.
- `next.config.ts` must include:
  ```typescript
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.app.github.dev"],
    },
  },
  ```
