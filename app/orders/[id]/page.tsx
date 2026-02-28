import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { ArrowLeft } from "lucide-react";
import { canApproveOrders } from "@/lib/roles";
import { OrderActions } from "../order-actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  PENDING: "承認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下",
  ORDERED: "発注済み",
  RECEIVED: "納品済み",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-foreground",
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  ORDERED: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-purple-100 text-purple-800",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          part: { select: { code: true, name: true } },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });

  if (!order) notFound();

  const isOwner = order.requestedBy.id === session.user.id;
  const userCanApprove = canApproveOrders(session.user.role ?? "user");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="発注管理" userEmail={session.user?.email} activePage="orders" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {order.orderNumber}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status] ?? ""}`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          </div>
          <OrderActions
            orderId={order.id}
            status={order.status}
            isOwner={isOwner}
            canApprove={userCanApprove}
          />
        </div>

        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">発注情報</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">依頼者</dt>
                  <dd className="font-medium">
                    {order.requestedBy.name ?? order.requestedBy.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">作成日</dt>
                  <dd className="font-medium">
                    {new Date(order.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
                {order.approvedBy && (
                  <>
                    <div>
                      <dt className="text-muted-foreground">
                        {order.status === "REJECTED" ? "却下者" : "承認者"}
                      </dt>
                      <dd className="font-medium">
                        {order.approvedBy.name ?? order.approvedBy.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {order.status === "REJECTED" ? "却下日" : "承認日"}
                      </dt>
                      <dd className="font-medium">
                        {order.approvedAt
                          ? new Date(order.approvedAt).toLocaleDateString(
                            "ja-JP",
                            { year: "numeric", month: "long", day: "numeric" }
                          )
                          : "-"}
                      </dd>
                    </div>
                  </>
                )}
                {order.orderedAt && (
                  <div>
                    <dt className="text-muted-foreground">発注日</dt>
                    <dd className="font-medium">
                      {new Date(order.orderedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                )}
                {order.receivedAt && (
                  <div>
                    <dt className="text-muted-foreground">納品日</dt>
                    <dd className="font-medium">
                      {new Date(order.receivedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
              {order.note && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-muted-foreground mb-1">備考</dt>
                  <dd className="text-sm">{order.note}</dd>
                </div>
              )}
              {order.rejectionReason && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-red-600 font-medium mb-1">
                    却下理由
                  </dt>
                  <dd className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    {order.rejectionReason}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">明細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        部品コード
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        部品名
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        数量
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        単価
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        小計
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {item.part.code}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.part.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          ¥{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          ¥{item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-sm font-semibold text-right"
                      >
                        合計金額
                      </td>
                      <td className="px-4 py-3 text-base font-bold text-right">
                        ¥{order.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
