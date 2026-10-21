"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/lib/types";

const fulfillmentStatuses: [OrderStatus, string][] = [
  ["preparing", "Being prepared"],
  ["ready", "Ready for collection"],
  ["dispatched", "On its way"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"]
];

function formatPrice(amount: number): string {
  return "GH₵" + Number(amount).toFixed(2).replace(/\.00$/, "");
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("maxwellina-admin-token") : null;
    if (saved) {
      setToken(saved);
      setIsAuthenticated(true);
      fetchOrders(saved);
    }
  }, []);

  async function fetchOrders(authToken: string) {
    setIsLoading(true);
    setMessage("Loading orders…");
    try {
      const response = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load orders.");
      }
      setOrders(data.orders || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load orders.");
      if (err.message?.includes("Sign in")) {
        setIsAuthenticated(false);
        setToken("");
        sessionStorage.removeItem("maxwellina-admin-token");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!inputToken.trim()) return;

    setLoginMessage("Checking token…");
    try {
      const response = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${inputToken.trim()}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid owner access token.");
      }
      setToken(inputToken.trim());
      setIsAuthenticated(true);
      sessionStorage.setItem("maxwellina-admin-token", inputToken.trim());
      setOrders(data.orders || []);
      setLoginMessage("");
    } catch (err: any) {
      setLoginMessage(err.message || "Sign in failed.");
    }
  }

  function handleLogout() {
    setToken("");
    setInputToken("");
    setIsAuthenticated(false);
    setOrders([]);
    sessionStorage.removeItem("maxwellina-admin-token");
  }

  async function handleStatusChange(reference: string, newStatus: OrderStatus) {
    setUpdatingRef(reference);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(reference)}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update order status.");
      }
      // Update local orders list
      setOrders((prev) =>
        prev.map((o) => (o.reference === reference ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally {
      setUpdatingRef(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Maxwellina Foods home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Maxwellina Foods" />
        </Link>
        <Link className="header-order" href="/">
          Back to shop <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main className="admin-main">
        <section className="admin-heading">
          <p className="eyebrow">
            <span className="eyebrow-line"></span> Maxwellina Foods
          </p>
          <h1>
            Order <em>desk.</em>
          </h1>
          <p>Review incoming orders and keep customers up to date.</p>
        </section>

        {!isAuthenticated ? (
          <section className="admin-panel" id="admin-login">
            <h2>Owner sign in</h2>
            <p>Use the private owner access token configured for this site.</p>
            <form onSubmit={handleLogin}>
              <label htmlFor="admin-token">Owner access token</label>
              <input
                id="admin-token"
                type="password"
                autoComplete="current-password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                required
              />
              <button className="button button-dark" type="submit">
                View orders <span aria-hidden="true">↗</span>
              </button>
            </form>
            {loginMessage && (
              <p className="admin-message" role="alert">
                {loginMessage}
              </p>
            )}
          </section>
        ) : (
          <section className="admin-orders">
            <div className="admin-orders-heading">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-line"></span> Your shop
                </p>
                <h2>Recent orders</h2>
              </div>
              <div className="admin-actions">
                <button
                  className="button admin-refresh"
                  type="button"
                  onClick={() => fetchOrders(token)}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  className="button admin-logout"
                  type="button"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            </div>

            {message && <p className="admin-message">{message}</p>}

            <div className="order-list">
              {orders.length === 0 && !isLoading && (
                <p className="empty-orders">
                  No orders yet. New customer orders will appear here.
                </p>
              )}

              {orders.map((order) => {
                const canChangeStatus =
                  !["awaiting_payment", "payment_failed"].includes(order.status);

                return (
                  <article className="order-card" key={order.reference}>
                    <div className="order-card-header">
                      <div>
                        <h3>{order.reference}</h3>
                        <p>{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="order-total">{formatPrice(order.total)}</p>
                    </div>

                    <div className="order-card-details">
                      <p>
                        {order.name} · {order.phone}
                      </p>
                      <p>
                        {order.items
                          .map((it) => `${it.quantity} × ${it.name}`)
                          .join(", ")}
                      </p>
                      {order.location && <p>Location: {order.location}</p>}
                    </div>

                    <div className="status-row">
                      <span className="status-pill">
                        {order.paymentStatus} · {order.status.replaceAll("_", " ")}
                      </span>

                      {canChangeStatus && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <label htmlFor={`status-${order.reference}`}>Fulfillment:</label>
                          <select
                            id={`status-${order.reference}`}
                            value={order.status}
                            disabled={updatingRef === order.reference}
                            onChange={(e) =>
                              handleStatusChange(order.reference, e.target.value as OrderStatus)
                            }
                          >
                            <option value={order.status}>
                              {order.status.replaceAll("_", " ")}
                            </option>
                            {fulfillmentStatuses
                              .filter(([val]) => val !== order.status)
                              .map(([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer admin-footer">
        <div className="footer-bottom">
          <span>
            © {currentYear} Maxwellina Foods. Made with care in Ghana.
          </span>
          <Link href="/">Back to shop</Link>
        </div>
      </footer>
    </div>
  );
}
