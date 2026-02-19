# 部品マスタ管理システム

Next.js + Prisma + SQLite + Auth.js で構築された部品マスタ管理システムです。

## 機能

### 認証機能
- メールアドレス・パスワードによるログイン
- Auth.js (NextAuth v5) による認証管理
- セキュアなパスワードハッシング (bcryptjs)

### 部品マスタ管理
- **一覧表示**: 登録された部品の一覧表示
- **新規登録**: 部品の新規登録
- **編集**: 既存部品の情報更新
- **削除**: 部品の削除（確認ダイアログ付き）

## 技術スタック

- **Next.js 15** (App Router)
- **TypeScript**
- **Prisma ORM 6** + **SQLite**
- **Auth.js** (NextAuth v5)
- **Zod** (バリデーション)
- **shadcn/ui** + **Tailwind CSS**
- **pnpm** (パッケージマネージャー)

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. データベースのセットアップ

```bash
# Prisma Clientの生成とデータベースの作成
pnpm prisma generate
pnpm prisma db push

# テストデータの投入
pnpm db:seed
```

### 3. 環境変数の設定

`.env.local` ファイルが作成されます。本番環境では `AUTH_SECRET` を変更してください。

### 4. 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 でアプリケーションが起動します。

## テストユーザー

シードデータで作成されるテストユーザー:

- **メールアドレス**: admin@example.com
- **パスワード**: password123

## プロジェクト構造

```
app/
  ├── api/auth/[...nextauth]/  # Auth.js APIルート
  ├── login/                    # ログインページ
  ├── parts/                    # 部品マスタ管理
  │   ├── new/                  # 新規登録ページ
  │   ├── edit/[id]/           # 編集ページ
  │   ├── actions.ts           # Server Actions (CRUD操作)
  │   ├── parts-list.tsx       # 一覧表示コンポーネント
  │   └── part-form.tsx        # 登録・編集フォーム
  ├── layout.tsx               # ルートレイアウト
  ├── page.tsx                 # ホームページ (リダイレクト)
  └── globals.css              # グローバルスタイル

components/
  └── ui/                      # shadcn/ui コンポーネント

lib/
  ├── auth.ts                  # Auth.js 設定
  ├── prisma.ts                # Prisma シングルトン
  └── utils.ts                 # ユーティリティ関数

prisma/
  ├── schema.prisma            # データベーススキーマ
  └── seed.ts                  # シードデータ
```

## データベーススキーマ

### User (ユーザー)
認証に使用するユーザー情報

### Part (部品)
- `code`: 部品コード (ユニーク)
- `name`: 部品名
- `description`: 説明
- `price`: 価格
- `stock`: 在庫数

## 開発

### ビルド

```bash
pnpm build
```

### 本番環境起動

```bash
pnpm start
```

### Prisma Studio (データベース管理GUI)

```bash
pnpm db:studio
```

## 開発時の注意事項

- Server Componentsをデフォルトで使用
- データベースアクセスはServer ComponentsまたはServer Actionsからのみ
- Prisma Clientは`lib/prisma.ts`のシングルトンを使用
- ユーザー入力はZodで必ずバリデーション
- UIは shadcn/ui を優先して使用

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
