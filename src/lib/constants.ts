export interface CatalogItem {
  name: string;
  price: number;
  description: string;
  tag: string;
  kicker: string;
  weight: string;
  prep: string;
  image: string;
}

export const PRODUCT_CATALOG: Record<string, CatalogItem> = {
  bofrot: {
    name: "Bofrot Mix",
    price: 35,
    description: "Golden, fluffy bofrot made simple. Just add water, fry and share the goodness.",
    tag: "THE GHANAIAN FAVOURITE",
    kicker: "SOFT · GOLDEN · DELICIOUS",
    weight: "500 g · Just add water",
    prep: "Just add water",
    image: "/file_00000000407881f5a22c99385e36519a.png"
  },
  pancake: {
    name: "Pancake Mix",
    price: 35,
    description: "A stack of soft, fluffy pancakes is never far away. Just add an egg and get flipping.",
    tag: "A BRIGHTER BREAKFAST",
    kicker: "LIGHT · FLUFFY · LOVELY",
    weight: "500 g · Just add egg",
    prep: "Just add egg",
    image: "/file_00000000230881f4b29e4d285a91ba27.png"
  }
};

export const WHATSAPP_ORDER_NUMBER = "233553774381";

export const ADMIN_STATUS_KEYS = [
  "preparing",
  "ready",
  "dispatched",
  "delivered",
  "cancelled"
] as const;

export const ADMIN_STATUS_OPTIONS = [
  { value: "preparing", label: "Being prepared" },
  { value: "ready", label: "Ready for collection" },
  { value: "dispatched", label: "On its way" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
] as const;

export const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Waiting for payment",
  payment_failed: "Payment needs attention",
  paid: "Payment confirmed",
  preparing: "Being prepared",
  ready: "Ready for collection",
  dispatched: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export function normalizePhone(value: unknown): string {
  let digits = String(value || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = `+233${digits.slice(1)}`;
  else if (digits.startsWith("233")) digits = `+${digits}`;
  return /^\+233[235]\d{8}$/.test(digits) ? digits : "";
}

export function formatPrice(amount: number): string {
  return `GH₵${amount.toFixed(2).replace(/\.00$/, "")}`;
}
