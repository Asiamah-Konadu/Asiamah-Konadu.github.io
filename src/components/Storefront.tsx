"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import {
  PRODUCT_CATALOG,
  WHATSAPP_ORDER_NUMBER,
  formatPrice,
  normalizePhone
} from "@/lib/constants";

export default function Storefront() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const currentYear = new Date().getFullYear();

  const cartEntries = Object.entries(cart).filter(([, q]) => q > 0);
  const cartItemCount = cartEntries.reduce((sum, [, q]) => sum + q, 0);
  const cartTotal = cartEntries.reduce((sum, [key, q]) => sum + (PRODUCT_CATALOG[key]?.price || 35) * q, 0);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem("maxwellina-cart");
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Saved cart must be an object.");
        }

        const restoredCart: Record<string, number> = {};
        for (const [key, quantity] of Object.entries(parsed)) {
          if (
            Object.hasOwn(PRODUCT_CATALOG, key) &&
            typeof quantity === "number" &&
            Number.isInteger(quantity) &&
            quantity > 0 &&
            quantity <= 99
          ) {
            restoredCart[key] = quantity;
          }
        }
        setCart(restoredCart);
      }
    } catch (error) {
      console.error("Unable to restore the saved cart.", error);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      window.localStorage.setItem("maxwellina-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Unable to save the cart.", error);
    }
  }, [cart, cartLoaded]);

  function updateQuantity(key: string, diff: number) {
    setCart((prev) => {
      const current = prev[key] || 0;
      const next = current + diff;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      if (next > 99) return prev;
      return { ...prev, [key]: next };
    });
  }

  function handleAddToCart(key: string) {
    updateQuantity(key, 1);
    setIsCartOpen(true);
  }

  // Handle escape key to close cart or modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsCartOpen(false);
        setIsCheckoutOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when drawer or modal is open
  useEffect(() => {
    if (isCartOpen || isCheckoutOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isCartOpen, isCheckoutOpen]);

  function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cartEntries.length === 0) {
      setCheckoutError("Add a mix to your order before continuing.");
      return;
    }

    const name = customerName.trim();
    const phone = normalizePhone(customerPhone);
    if (name.length < 2 || !phone) {
      setCheckoutError("Enter your name and a valid Ghanaian mobile number to continue.");
      return;
    }

    const orderSummary = cartEntries
      .map(([key, quantity]) => {
        const product = PRODUCT_CATALOG[key];
        return product
          ? `• ${quantity} × ${product.name} — ${formatPrice(product.price * quantity)}`
          : "";
      })
      .filter(Boolean)
      .join("\n");
    const message = [
      "Hello Maxwellina Foods! I'd like to place an order:",
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
      ...(customerLocation.trim() ? [`Delivery location: ${customerLocation.trim()}`] : []),
      "",
      orderSummary,
      "",
      `Product total: ${formatPrice(cartTotal)}`,
      "Please confirm payment and delivery details. Thank you!"
    ].join("\n");

    window.location.assign(
      `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`
    );
  }

  return (
    <>
      <div className="announcement">
        <span>GOOD FOOD, MADE SIMPLE</span>
        <span>Order via WhatsApp · Confirm details with our team</span>
      </div>

      <header className="site-header">
        <Link className="brand" href="#home" aria-label="Maxwellina Foods home">
          <Image src="/logo.svg" alt="Maxwellina Foods" width={105} height={49} priority />
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#products">Our mixes</a>
          <Link href="/about">Our story</Link>
          <a href="#how-it-works">How to order</a>
        </nav>
        <MobileMenu
          links={[
            { label: "Our mixes", href: "#products" },
            { label: "Our story", href: "/about" },
            { label: "How to order", href: "#how-it-works" }
          ]}
        />
        <button
          className="cart-toggle"
          id="cart-open"
          type="button"
          onClick={() => setIsCartOpen(true)}
          aria-label={`Open your order, ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
          aria-expanded={isCartOpen}
        >
          Your order <span id="cart-count">{cartItemCount}</span>
        </button>
        <a className="header-order" href="#products">
          Shop the mixes <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line"></span> A little goodness goes a long way
            </p>
            <h1>
              Homemade<br />
              goodness,<br />
              <em>made easy.</em>
            </h1>
            <p className="hero-description">
              Make the moments around your table a little more delicious. Our ready-to-make mixes
              bring warm, homemade favourites within easy reach.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#products">
                Find your favourite <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#story">
                Get to know us <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="hero-note">
              <span className="note-sparkle">✳</span>
              <span>
                Thoughtfully made for breakfast, sharing<br />
                and all the little in-between moments.
              </span>
            </div>
          </div>
          <div className="hero-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hero-food"
              src="/IMG-20261020-WA0015.jpg"
              alt="Freshly made golden bofrot ready to share"
            />
            <div className="hero-sticker">
              <span>JUST</span>
              <strong>add<br />water</strong>
              <span>and enjoy ✳</span>
            </div>
            <div className="hero-caption">
              <span>MADE WITH LOVE</span>
              <span>FROM OUR KITCHEN TO YOURS</span>
            </div>
          </div>
          <div className="hero-side-label" aria-hidden="true">
            MAXWELLINA FOODS · GHANA
          </div>
        </section>

        {/* Promise Strip */}
        <section className="promise-strip" aria-label="Our promise">
          <span>GOOD FOOD, WITHOUT THE FUSS</span>
          <span className="strip-star">✳</span>
          <span>MADE FOR YOUR MOMENTS</span>
          <span className="strip-star">✳</span>
          <span>JUST ADD A LITTLE LOVE</span>
          <span className="strip-star">✳</span>
          <span>GOOD FOOD, WITHOUT THE FUSS</span>
        </section>

        {/* Products Section */}
        <section className="products section-wrap" id="products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line"></span> The good stuff
              </p>
              <h2>
                A mix for every<br />
                <em>kind of morning.</em>
              </h2>
            </div>
            <p>Two simple favourites. A little less prep, a lot more time to enjoy what you make.</p>
          </div>
          <div className="product-grid">
            {/* Bofrot Mix */}
            <article className="product-card product-bofrot">
              <div className="product-image">
                <span className="product-tag">THE GHANAIAN FAVOURITE</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/file_00000000407881f5a22c99385e36519a.png"
                  alt="Maxwellina Bofrot Mix, 500 grams"
                />
              </div>
              <div className="product-info">
                <div className="product-title-row">
                  <div>
                    <p className="product-kicker">SOFT · GOLDEN · DELICIOUS</p>
                    <h3>Bofrot Mix</h3>
                  </div>
                  <span className="product-price">GH₵35</span>
                </div>
                <p className="product-description">
                  Golden, fluffy bofrot made simple. Just add water, fry and share the goodness.
                </p>
                <div className="product-bottom">
                  <span className="product-weight">500 g · Just add water</span>
                  <button
                    className="add-button"
                    type="button"
                    onClick={() => handleAddToCart("bofrot")}
                  >
                    Add to order <span aria-hidden="true">＋</span>
                  </button>
                </div>
              </div>
            </article>

            {/* Pancake Mix */}
            <article className="product-card product-pancake">
              <div className="product-image">
                <span className="product-tag">A BRIGHTER BREAKFAST</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/file_00000000230881f4b29e4d285a91ba27.png"
                  alt="Maxwellina Pancake Mix, 500 grams"
                />
              </div>
              <div className="product-info">
                <div className="product-title-row">
                  <div>
                    <p className="product-kicker">LIGHT · FLUFFY · LOVELY</p>
                    <h3>Pancake Mix</h3>
                  </div>
                  <span className="product-price">GH₵35</span>
                </div>
                <p className="product-description">
                  A stack of soft, fluffy pancakes is never far away. Just add an egg and get flipping.
                </p>
                <div className="product-bottom">
                  <span className="product-weight">500 g · Just add egg</span>
                  <button
                    className="add-button"
                    type="button"
                    onClick={() => handleAddToCart("pancake")}
                  >
                    Add to order <span aria-hidden="true">＋</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
          <p className="price-note">One pack, GH₵35. Mix and match your favourites.</p>
        </section>

        {/* Story Section */}
        <section className="story-section" id="story">
          <div className="story-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/IMG-20261020-WA0016.jpg"
              alt="Pancakes and fresh fruit make a lovely breakfast"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">
              <span className="eyebrow-line"></span> A little about us
            </p>
            <h2>
              Good things<br />
              start <em>at home.</em>
            </h2>
            <p>
              At Maxwellina Foods, we believe making something delicious should feel simple,
              convenient and joyful. That&apos;s why we make quality bofrot and pancake mixes to
              help you spend less time preparing and more time enjoying.
            </p>
            <p>
              For slow breakfasts, family gatherings or a little treat just because — we&apos;re
              here to make homemade goodness easier.
            </p>
            <a className="text-link" href="#products">
              Bring home a mix <span aria-hidden="true">↗</span>
            </a>
            <div className="story-signoff">
              <span className="signoff-mark">✳</span>
              <span>
                MADE WITH CARE<br />
                <strong>Maxwellina Foods</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Steps / How It Works */}
        <section className="steps-section section-wrap" id="how-it-works">
          <div className="steps-intro">
            <p className="eyebrow">
              <span className="eyebrow-line"></span> Easy as one, two, yum
            </p>
            <h2>
              Your next favourite<br />
              is just <em>three steps away.</em>
            </h2>
          </div>
          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <span className="step-icon">✳</span>
              <h3>Pick your mix</h3>
              <p>Choose bofrot, pancakes or one of each. Every pack is GH₵35.</p>
            </article>
            <article className="step-card">
              <span className="step-number">02</span>
              <span className="step-icon">♡</span>
              <h3>Send your order on WhatsApp</h3>
              <p>Review your order details and send them to us on WhatsApp.</p>
            </article>
            <article className="step-card">
              <span className="step-number">03</span>
              <span className="step-icon">⌂</span>
              <h3>Enjoy the goodness</h3>
              <p>We’ll be in touch to confirm your order and delivery arrangements.</p>
            </article>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-main">
          <Link className="footer-brand" href="#home">
            <Image src="/logo.svg" alt="Maxwellina Foods" width={102} height={50} />
          </Link>
          <p>
            Making homemade goodness easier,<br />
            one delicious moment at a time.
          </p>
          <a className="footer-shop" href="#products">
            Shop our mixes <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="footer-contact">
          <a href="tel:+233553774381">Call us: 0553774381</a>
          <nav aria-label="Social media">
            <a href="https://www.tiktok.com/@maxwellinafoods" target="_blank" rel="noreferrer">
              TikTok: @maxwellinafoods
            </a>
            <a href="https://www.instagram.com/maxwellina_foods" target="_blank" rel="noreferrer">
              Instagram: @maxwellina_foods
            </a>
            <a href="https://www.facebook.com/search/top/?q=Maxwellina%20Owusu" target="_blank" rel="noreferrer">
              Facebook: Maxwellina Owusu
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>
            © {currentYear} Maxwellina Foods. Made with care in Ghana.
          </span>
          <Link href="/about">About us</Link>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>

      {/* Cart Drawer & Backdrop */}
      {isCartOpen && (
        <div
          className="cart-backdrop"
          onClick={() => setIsCartOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`cart-drawer ${isCartOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        aria-hidden={!isCartOpen}
      >
        <div className="cart-header">
          <div>
            <p className="eyebrow">A little goodness awaits</p>
            <h2 id="cart-title">Your order</h2>
          </div>
          <button
            className="close-cart"
            type="button"
            aria-label="Close order"
            onClick={() => setIsCartOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="cart-content">
          {cartEntries.length === 0 ? (
            <div className="empty-cart">
              <span>✳</span>
              <p>Your basket is waiting for something lovely.</p>
              <a href="#products" onClick={() => setIsCartOpen(false)}>
                Find a mix
              </a>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartEntries.map(([key, qty]) => {
                  const product = PRODUCT_CATALOG[key];
                  if (!product) return null;
                  return (
                    <div className="cart-item" key={key}>
                      <div>
                        <p className="cart-item-title">{product.name}</p>
                        <span className="cart-item-price">
                          {formatPrice(product.price)} each
                        </span>
                      </div>
                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, -1)}
                          aria-label={`Remove one ${product.name}`}
                        >
                          −
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, 1)}
                          aria-label={`Add one ${product.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="cart-summary">
                <div className="cart-total">
                  <span>Product total</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                <p>
                  Product total only. Delivery arrangements and any fee will be confirmed with you
                  separately.
                </p>
                <button
                  className="button button-dark checkout-button"
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutError("");
                    setIsCheckoutOpen(true);
                  }}
                >
                  Continue to WhatsApp <span aria-hidden="true">↗</span>
                </button>
                <p className="checkout-note">Payment and delivery details will be confirmed in WhatsApp.</p>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCheckoutOpen(false);
          }}
        >
          <div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
              <div className="dialog-header">
                <div>
                  <p className="eyebrow">Almost time for something delicious</p>
                  <h2 id="checkout-title">Your details for WhatsApp</h2>
                </div>
                <button
                  className="close-dialog"
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  aria-label="Close checkout"
                >
                  ×
                </button>
              </div>

              <div className="checkout-total">
                <span>Your product total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>

              <label htmlFor="customer-name">Your name</label>
              <input
                id="customer-name"
                name="name"
                type="text"
                maxLength={80}
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />

              <label htmlFor="customer-phone">Phone number</label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                maxLength={24}
                autoComplete="tel"
                placeholder="e.g. 024 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />

              <label htmlFor="customer-location">
                Town or delivery address <span>(optional)</span>
              </label>
              <textarea
                id="customer-location"
                name="location"
                rows={2}
                maxLength={240}
                autoComplete="street-address"
                placeholder="Where would you like your order?"
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
              />

              <p className="delivery-note">
                Your order details will be prepared in WhatsApp. Tap Send there to place your order;
                we’ll confirm payment and delivery arrangements in the chat.
              </p>

              {checkoutError && (
                <p className="checkout-error" role="alert" aria-live="assertive">
                  {checkoutError}
                </p>
              )}

              <button
                className="button checkout-submit"
                type="submit"
              >
                Send order on WhatsApp <span aria-hidden="true">↗</span>
              </button>
              <p className="checkout-note">WhatsApp will open with your order details ready to send.</p>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
