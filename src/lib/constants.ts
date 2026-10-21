export interface CatalogItem {
  name: string;
  price: number;
}

export const PRODUCT_CATALOG: Record<string, CatalogItem> = {
  bofrot: {
    name: "Bofrot Mix",
    price: 35
  },
  pancake: {
    name: "Pancake Mix",
    price: 35
  }
};

export const WHATSAPP_ORDER_NUMBER = "233553774381";

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
