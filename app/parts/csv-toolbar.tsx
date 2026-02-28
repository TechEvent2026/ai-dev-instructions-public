"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, X, FileText, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { importParts, type ImportResult } from "./csv-actions";
import { importPartsExcel, type ExcelImportResult } from "./excel-actions";

type AnyImportResult = ImportResult | ExcelImportResult;

export function CsvToolbar() {
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<AnyImportResult | null>(null);
  const [importFormat, setImportFormat] = useState<"csv" | "excel">("excel");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setImporting(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);

    let res: AnyImportResult;
    if (importFormat === "excel") {
      res = await importPartsExcel(formData);
    } else {
      res = await importParts(formData);
    }

    setResult(res);
    setImporting(false);

    if (res.success || res.created > 0 || res.updated > 0) {
      router.refresh();
    }
  };

  const fileAccept =
    importFormat === "excel"
      ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : ".csv,text/csv";

  return (
    <>
      <div className="flex gap-2">
        {/* Export dropdown */}
        <div className="relative group">
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            エクスポート
          </Button>
          <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block bg-card border rounded-md shadow-lg min-w-[160px]">
            <a
              href="/api/parts/export-excel"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-t-md"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel (.xlsx)
            </a>
            <a
              href="/api/parts/export"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-b-md"
            >
              <FileText className="h-4 w-4 text-blue-600" />
              CSV (.csv)
            </a>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowImport(!showImport);
            setResult(null);
          }}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          インポート
        </Button>
      </div>

      {showImport && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ファイルインポート</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowImport(false);
                setResult(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={importFormat === "excel" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setImportFormat("excel");
                    setResult(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  variant={importFormat === "csv" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setImportFormat("csv");
                    setResult(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  CSV
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1">
                  {importFormat === "excel" ? (
                    <FileSpreadsheet className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  カラム: 部品コード, 部品名, 説明, 価格, 在庫数
                </p>
                <p>
                  部品コードが既存の場合は更新、新規の場合は作成されます。
                </p>
              </div>
            </div>
            <form onSubmit={handleImport} className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept={fileAccept}
                required
                className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
              />
              <Button type="submit" size="sm" disabled={importing}>
                {importing ? (
                  <>
                    <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-4 w-4" />
                    取込実行
                  </>
                )}
              </Button>
            </form>

            {result && (
              <div
                className={`mt-3 rounded-md border p-3 ${result.errors.length > 0
                    ? "border-orange-200 bg-orange-50"
                    : "border-green-200 bg-green-50"
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.errors.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium">
                    新規作成: {result.created}件 / 更新: {result.updated}件
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
