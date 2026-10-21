"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");

const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
let tableReady;

function ensureOrdersTable() {
  if (!tableReady) {
    tableReady = sql`CREATE TABLE IF NOT EXISTS orders (
      reference TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )`.catch((error) => {
      tableReady = undefined;
      throw error;
    });
  }
  return tableReady;
}

async function loadOrders() {
  if (sql) {
    await ensureOrdersTable();
    const rows = await sql`SELECT data FROM orders`;
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
  if (sql) {
    await ensureOrdersTable();
    for (const order of orders) {
      await sql`INSERT INTO orders (reference, data)
        VALUES (${order.reference}, ${JSON.stringify(order)}::jsonb)
        ON CONFLICT (reference) DO UPDATE SET data = EXCLUDED.data`;
    }
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${ORDERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(orders, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryFile, ORDERS_FILE);
}

module.exports = { loadOrders, saveOrders };
