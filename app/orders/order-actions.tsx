"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle,
  XCircle,
  ShoppingCart,
  PackageCheck,
  Edit,
  Trash2,
} from "lucide-react";
import {
  submitOrder,
  approveOrder,
  rejectOrder,
  markOrdered,
  receiveOrder,
  deleteOrder,
} from "./actions";

interface OrderActionsProps {
  orderId: string;
  status: string;
  isOwner: boolean;
  canApprove: boolean;
}

export function OrderActions({
  orderId,
  status,
  isOwner,
  canApprove,
}: OrderActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const router = useRouter();

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("却下理由を入力してください");
      return;
    }
    setLoading(true);
    try {
      await rejectOrder(orderId, rejectReason);
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この発注依頼を削除してもよろしいですか？")) return;
    handleAction(() => deleteOrder(orderId));
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && isOwner && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => router.push(`/orders/edit/${orderId}`)}
            >
              <Edit className="mr-1.5 h-4 w-4" />
              編集
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => handleAction(() => submitOrder(orderId))}
            >
              <Send className="mr-1.5 h-4 w-4" />
              承認申請
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              削除
            </Button>
          </>
        )}

        {status === "PENDING" && canApprove && (
          <>
            <Button
              size="sm"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleAction(() => approveOrder(orderId))}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              承認
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              却下
            </Button>
          </>
        )}

        {status === "APPROVED" && (
          <Button
            size="sm"
            disabled={loading}
            onClick={() => handleAction(() => markOrdered(orderId))}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            発注済みにする
          </Button>
        )}

        {status === "ORDERED" && (
          <Button
            size="sm"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => handleAction(() => receiveOrder(orderId))}
          >
            <PackageCheck className="mr-1.5 h-4 w-4" />
            納品受入
          </Button>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-3">発注を却下</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">
                  却下理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="却下理由を入力してください"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading}
                >
                  却下する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
