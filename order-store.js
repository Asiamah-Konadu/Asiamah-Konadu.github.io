"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

async function loadOrders() {
  if (prisma) {
    const rows = await prisma.order.findMany({ select: { data: true } });
    return rows.map((row) => row.data);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]\n", { mode: 0o600 });
  }
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  if (!Array.isArray(orders)) throw new Error("Order store must contain an array.");
  return orders;
}

async function saveOrders(orders) {
  if (prisma) {
    await prisma.$transaction(
      orders.map((order) =>
        prisma.order.upsert({
          where: { reference: order.reference },
          create: { reference: order.reference, data: order },
          update: { data: order }
        })
      )
    );
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${ORDERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(orders, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryFile, ORDERS_FILE);
}

module.exports = { loadOrders, saveOrders };
