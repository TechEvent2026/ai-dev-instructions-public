# Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM 6** + **SQLite**
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
```

# Setup Workflow

When initializing the project from scratch, follow this exact order:

1. `pnpm create next-app@latest . --yes`
2. Delete `pnpm-workspace.yaml` if it was created (it breaks shadcn CLI)
3. `pnpm dlx shadcn@latest init -y` (package name is `shadcn`, not `shadcn-ui`)
4. Install dependencies:
   ```
   pnpm add prisma@6 @prisma/client@6 next-auth@beta @auth/prisma-adapter bcryptjs zod
   pnpm add -D @types/bcryptjs tsx
   ```
5. `npx prisma init --datasource-provider sqlite`
6. Add `DATABASE_URL="file:./dev.db"` to `.env` (created by prisma init)
7. Create schema (see Prisma section below), then `npx prisma migrate dev --name init`
8. Create seed script, add `prisma.seed` to `package.json`, then `npx prisma db seed`
9. Generate AUTH_SECRET: `npx auth secret` (writes to `.env.local`)
10. Set up `next.config.ts` with `allowedOrigins` (see Development Environment section)

# Conventions

- Use Server Components by default. Add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Access the database in Server Components or Server Actions only. Never call Prisma from client components.
- Use a singleton pattern for Prisma Client (`lib/prisma.ts`) to prevent multiple instances during dev hot reload.
- Validate all user input with Zod schemas before processing in Server Actions.
- Prefer shadcn/ui components over custom UI. Customize via Tailwind CSS.
- Configure Auth.js in `lib/auth.ts`. Use Prisma Adapter for session/user persistence.
- Use `pnpm` for all package management commands.
- Adding shadcn components: `pnpm dlx shadcn@latest add <component-name>`

# Prisma 6 + SQLite

## Critical Rules

- **Use Prisma 6 (`prisma@6`, `@prisma/client@6`).** Do NOT use Prisma 7.
- **SQLite does NOT support `@db.Text` or any `@db.*` native type annotations.** Remove them from any schema examples.
- **Define `DATABASE_URL` only in `.env` (not `.env.local`).** If both files define it, Prisma CLI and runtime may point to different SQLite files, causing login failures.

## Schema (SQLite + Auth.js)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
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
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

# Auth.js v5

## Critical Rules

- **`session: { strategy: "jwt" }` is required.** When using Credentials provider + Prisma Adapter, Auth.js defaults to database sessions without this, and login will silently fail.
- **Do NOT use `getToken()` directly.** Auth.js v5 changed the cookie name to `authjs.session-token`, but `getToken()` looks for `next-auth.session-token` by default, causing a login redirect loop even for authenticated users. Use the `auth()` wrapper instead.
- **Exclude the login page and API auth routes in `proxy.ts`.** Otherwise the login page itself requires authentication, creating a redirect loop.

## File Structure

- `lib/auth.ts` — main config, exports `{ auth, handlers, signIn, signOut }`
- `app/api/auth/[...nextauth]/route.ts` — must export `{ GET, POST }` from handlers
- `proxy.ts` (Next.js 16+) — route protection using `auth()` wrapper

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
  pages: { signIn: "/login" },   // custom login page path
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

## Route Protection (`proxy.ts`)

Next.js 16 uses `proxy.ts` instead of `middleware.ts`. **Use the `auth()` wrapper, NOT `getToken()`.**

```typescript
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    const newUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Required `.env`

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generated by: npx auth secret>"
AUTH_TRUST_HOST=true
```

> ⚠️ Do not define `DATABASE_URL` in `.env.local`. If both files define it, runtime/CLI can point to different SQLite files and cause login failures.

# Seed Data

For development, create test users with hashed passwords.

Add to `package.json`:
```json
{ "prisma": { "seed": "npx tsx prisma/seed.ts" } }
```

Seed script (`prisma/seed.ts`):
```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
