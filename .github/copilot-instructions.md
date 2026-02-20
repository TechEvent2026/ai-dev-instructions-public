# 技術スタック

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM** + **SQLite**
- **shadcn/ui** + **Tailwind CSS**
- **Auth.js** (NextAuth v5)
- **Zod**
- **pnpm**

# プロジェクト構成

```
app/           # App Router のページとレイアウト
components/    # 再利用可能な UI コンポーネント（shadcn/ui コンポーネント）
lib/           # ユーティリティ、Prisma クライアントなど
prisma/        # schema.prisma とマイグレーション
```

# 規約

- デフォルトで Server Components を使用する。`"use client"` はイベントハンドラ、フック、ブラウザ API が必要な場合のみ付与する。
- データベースへのアクセスは Server Components または Server Actions 内でのみ行う。クライアントコンポーネントから Prisma を呼び出さない。
- Prisma Client はシングルトンパターン（`lib/prisma.ts`）で使用し、開発時のホットリロードで複数インスタンスが生成されるのを防ぐ。
- Server Actions で処理する前に、すべてのユーザー入力を Zod スキーマでバリデーションする。
- カスタム UI よりも shadcn/ui コンポーネントを優先する。カスタマイズは Tailwind CSS で行う。
- Auth.js の設定は `lib/auth.ts` に記述する。セッション・ユーザーの永続化には Prisma Adapter を使用する。
- パッケージ管理コマンドにはすべて `pnpm` を使用する。

# データベース (Prisma + SQLite)

- データベースには **SQLite** を使用する。`schema.prisma` の `datasource` は以下のように設定する：
  ```prisma
  datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
  }
  ```
- `DATABASE_URL` は `.env` ファイルで `file:./dev.db` のように指定する。
- マイグレーションは `pnpm prisma migrate dev` で実行する。
- スキーマ変更後は `pnpm prisma generate` で Prisma Client を再生成する。

# Next.js 設定

- `next.config.ts` で Server Actions の `allowedOrigins` に `*.app.github.dev` を含める（GitHub Codespaces 対応）：
  ```ts
  const nextConfig: NextConfig = {
    experimental: {
      serverActions: {
        allowedOrigins: [
          "localhost:3000",
          "*.app.github.dev",
        ],
      },
    },
  };
  ```
