import { getParts, getCategories } from "./actions";
import { PartsTable } from "./parts-table";

export default async function PartsPage() {
  const [parts, categories] = await Promise.all([getParts(), getCategories()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">部品マスタ管理</h1>
        <p className="text-muted-foreground mt-1">
          部品の登録・編集・削除を行います
        </p>
      </div>
      <PartsTable initialParts={parts} categories={categories} />
    </div>
  );
}
