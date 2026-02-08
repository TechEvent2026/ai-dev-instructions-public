# Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM 7** + **SQLite**
- **shadcn/ui** + **Tailwind CSS**
- **Auth.js** (NextAuth v5)
- **Zod**
- **pnpm**

# Project Structure

```
app/           # App Router pages and layouts
components/    # Reusable UI components (shadcn/ui components here)
lib/           # Utilities, Prisma client, etc.
prisma/        # schema.prisma and migrations
```

# Conventions

- Use Server Components by default. Add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Access the database in Server Components or Server Actions only. Never call Prisma from client components.
- Use a singleton pattern for Prisma Client (`lib/prisma.ts`) to prevent multiple instances during dev hot reload.
- Validate all user input with Zod schemas before processing in Server Actions.
- Prefer shadcn/ui components over custom UI. Customize via Tailwind CSS.
- Configure Auth.js in `lib/auth.ts`. Use Prisma Adapter for session/user persistence.
- Use `pnpm` for all package management commands.
