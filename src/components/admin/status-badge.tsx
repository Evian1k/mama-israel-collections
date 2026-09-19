import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/order-utils";
import type { OrderStatus, PaymentStatus } from "@/types";

/** Consistent order/payment status pills across admin + order confirmation */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", ORDER_STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", PAYMENT_STATUS_STYLES[status], className)}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
