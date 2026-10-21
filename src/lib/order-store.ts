import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Order } from "./types";

const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(process.cwd(), "data"));
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = process.env.DATABASE_URL
  ? globalForPrisma.prisma ?? new PrismaClient()
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export async function loadOrders(): Promise<Order[]> {
  if (prisma) {
    const rows = await prisma.order.findMany({ select: { data: true } });
    return rows.map((row: { data: any }) => row.data as unknown as Order);
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, "[]\n", { mode: 0o600 });
    }
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Order store must contain an array.");
    return parsed as Order[];
  } catch (error) {
    console.error("Failed to load orders:", error);
    return [];
  }
}

export async function saveOrders(orders: Order[]): Promise<void> {
  if (prisma) {
    await prisma.$transaction(
      orders.map((order) =>
        prisma.order.upsert({
          where: { reference: order.reference },
          create: { reference: order.reference, data: order as any },
          update: { data: order as any }
        })
      )
    );
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${ORDERS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(orders, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryFile, ORDERS_FILE);
}
