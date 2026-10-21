export interface OrderItem {
  product: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | "awaiting_payment"
  | "payment_failed"
  | "paid"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface Order {
  reference: string;
  name: string;
  phone: string;
  location?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicOrder {
  reference: string;
  status: OrderStatus;
  total: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
  updatedAt: string;
}
